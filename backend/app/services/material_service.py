import logging
from pathlib import Path
from typing import BinaryIO
from uuid import UUID

from fastapi import HTTPException
from pydantic_core import PydanticCustomError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.schemas.material import (
    MaterialPage,
    MaterialResponse,
    MaterialVotoResponse,
    validar_titulo,
    validar_url_externa,
)
from app.domain.materiais import ArquivoMuitoGrande, ArquivoVazio, FormatoNaoSuportado
from app.models.conteudo import Conteudo
from app.models.disciplina import Disciplina
from app.models.usuario import Usuario
from app.repositories.disciplina_repo import disciplina_repo
from app.repositories.material_repo import material_repo
from app.repositories.voto_repo import (
    alternar_voto_target,
    contar_votos_por_target,
    listar_votos_usuario_por_target,
)
from app.services.armazenamento_material import ArmazenamentoMaterial

logger = logging.getLogger(__name__)


class MaterialService:
    TIPOS_ARQUIVO = {"ARQUIVO", "RESUMO", "PROVA_ANTIGA", "DICA"}
    TIPOS_LINK = {"RESUMO", "PROVA_ANTIGA", "DICA", "LINK_UTIL"}
    TIPOS_PERMITIDOS = TIPOS_ARQUIVO | TIPOS_LINK

    def __init__(self, armazenamento: ArmazenamentoMaterial):
        self.armazenamento = armazenamento

    def resolver_disciplina(self, db: Session, id_ou_slug: int | str) -> Disciplina:
        if isinstance(id_ou_slug, int) or (isinstance(id_ou_slug, str) and id_ou_slug.isdigit()):
            disciplina = disciplina_repo.get_by_id(db, int(id_ou_slug))
        else:
            termo = str(id_ou_slug).strip()
            disciplina = disciplina_repo.get_by_slug(db, termo)
            if disciplina is None:
                disciplina = disciplina_repo.get_by_codigo(db, termo.upper())
        if disciplina is None:
            raise HTTPException(404, "Cadeira não encontrada.")
        return disciplina

    def verificar_disciplina(self, db: Session, id_ou_slug: int | str) -> Disciplina:
        return self.resolver_disciplina(db, id_ou_slug)

    def enviar(
        self, db: Session, usuario_id: UUID, id_ou_slug: int | str, titulo: str,
        arquivo: BinaryIO, nome: str, tipo_mime: str, tipo: str = "ARQUIVO",
    ) -> MaterialResponse:
        disciplina = self.resolver_disciplina(db, id_ou_slug)
        tipo = tipo.strip().upper() if tipo else "ARQUIVO"
        if tipo not in self.TIPOS_ARQUIVO:
            raise HTTPException(422, f"Tipo inválido. Tipos permitidos: {sorted(self.TIPOS_ARQUIVO)}")
        try:
            titulo = validar_titulo(titulo)
        except PydanticCustomError as exc:
            raise HTTPException(422, str(exc)) from exc
        try:
            chave, formato, tamanho = self.armazenamento.salvar(arquivo, nome, tipo_mime)
        except FormatoNaoSuportado as exc:
            raise HTTPException(415, str(exc)) from exc
        except ArquivoMuitoGrande as exc:
            raise HTTPException(413, str(exc)) from exc
        except ArquivoVazio as exc:
            raise HTTPException(400, str(exc)) from exc
        except OSError as exc:
            logger.exception("Falha ao armazenar material.")
            raise HTTPException(503, "Armazenamento temporariamente indisponível.") from exc

        try:
            material = Conteudo(
                tipo=tipo, status_curadoria="PENDENTE",
                usuario_id=usuario_id, disciplina_id=disciplina.id, titulo=titulo,
                caminho_arquivo=chave, formato=formato, tamanho_bytes=tamanho,
                status_moderacao="ativo",
            )
            material_repo.adicionar(db, material)
            resposta = MaterialResponse.model_validate(material)
            db.commit()
            return resposta
        except Exception as exc:
            db.rollback()
            try:
                self.armazenamento.remover(chave)
            except OSError:
                logger.exception("Falha ao limpar arquivo após rollback.")
            if isinstance(exc, SQLAlchemyError):
                logger.exception("Falha ao persistir material.")
                raise HTTPException(503, "Não foi possível salvar o material. Tente novamente.") from exc
            raise

    def listar(
        self,
        db: Session,
        id_ou_slug: int | str,
        titulo: str | None,
        pagina: int,
        tamanho_pagina: int,
        tipo: str | None = None,
        tipos: list[str] | None = None,
        current_user_id: UUID | None = None,
    ) -> MaterialPage:
        disciplina = self.resolver_disciplina(db, id_ou_slug)
        tipo_filtro = tipo.strip().upper() if tipo else None
        tipos_filtro = sorted({item.strip().upper() for item in tipos}) if tipos else None
        if tipo_filtro and tipos_filtro:
            raise HTTPException(422, "Informe apenas tipo ou tipos para filtrar os materiais.")
        informados = tipos_filtro or ([tipo_filtro] if tipo_filtro else [])
        if any(item not in self.TIPOS_PERMITIDOS for item in informados):
            raise HTTPException(422, "Tipo de material inválido.")
        materiais, total = material_repo.listar_ativos(
            db,
            disciplina.id,
            titulo.strip() if titulo else None,
            pagina,
            tamanho_pagina,
            tipo=tipo_filtro,
            tipos=tipos_filtro,
        )
        material_ids = [item.id for item in materiais]
        votos_por_id = contar_votos_por_target(db, "CONTEUDO", material_ids)
        votados_usuario = (
            listar_votos_usuario_por_target(db, "CONTEUDO", material_ids, current_user_id)
            if current_user_id is not None
            else set()
        )
        items_resposta = [
            MaterialResponse.model_validate(item).model_copy(
                update={
                    "upvotes": votos_por_id.get(item.id, 0),
                    "liked_by_me": item.id in votados_usuario,
                }
            )
            for item in materiais
        ]
        return MaterialPage(items=items_resposta, total=total, pagina=pagina, tamanho_pagina=tamanho_pagina)

    def enviar_link(
        self,
        db: Session,
        usuario_id: UUID,
        id_ou_slug: int | str,
        titulo: str,
        url_origem: str,
        tipo: str = "RESUMO",
    ) -> MaterialResponse:
        """Persiste um link externo na fila de curadoria humana da disciplina."""
        disciplina = self.resolver_disciplina(db, id_ou_slug)
        tipo_norm = tipo.strip().upper() if tipo else "RESUMO"
        if tipo_norm not in self.TIPOS_LINK:
            raise HTTPException(422, f"Tipo de link inválido. Tipos permitidos: {sorted(self.TIPOS_LINK)}")
        try:
            titulo_limpo = validar_titulo(titulo)
            url_limpa = validar_url_externa(url_origem)
        except PydanticCustomError as exc:
            raise HTTPException(422, str(exc)) from exc

        try:
            material = Conteudo(
                tipo=tipo_norm,
                status_curadoria="PENDENTE",
                usuario_id=usuario_id,
                disciplina_id=disciplina.id,
                titulo=titulo_limpo,
                url_origem=url_limpa,
                caminho_arquivo=None,
                formato=None,
                tamanho_bytes=None,
                status_moderacao=None,
            )
            material_repo.adicionar(db, material)
            resposta = MaterialResponse.model_validate(material)
            db.commit()
            return resposta
        except SQLAlchemyError as exc:
            db.rollback()
            logger.exception("Falha ao persistir link externo.")
            raise HTTPException(503, "Não foi possível salvar o link. Tente novamente.") from exc

    def alternar_voto(
        self, db: Session, material_id: int, usuario: Usuario
    ) -> MaterialVotoResponse:
        """Alterna o voto útil (curtida) de um usuário autenticado em um material publicado."""
        material = material_repo.get_by_id(db, material_id)
        eh_link = material is not None and material.caminho_arquivo is None and material.url_origem is not None
        publicado = material is not None and material.status_curadoria == "APROVADO" and (
            material.status_moderacao is None if eh_link else material.status_moderacao == "ativo"
        )
        if not publicado:
            raise HTTPException(404, "Material não encontrado ou ainda não publicado.")
        upvotes, liked_by_me = alternar_voto_target(db, "CONTEUDO", material_id, usuario.id)
        return MaterialVotoResponse(
            material_id=material_id,
            upvotes=upvotes,
            liked_by_me=liked_by_me,
        )

    def baixar(self, db: Session, material_id: int) -> tuple[Conteudo, Path]:
        material = material_repo.get_by_id(db, material_id)
        if material is None or material.caminho_arquivo is None or material.status_moderacao == "excluido":
            raise HTTPException(404, "Material não encontrado.")
        if material.status_moderacao != "ativo" or material.status_curadoria != "APROVADO":
            raise HTTPException(403, "Material indisponível por moderação.")
        try:
            caminho = self.armazenamento.localizar(material.caminho_arquivo)
        except (OSError, ValueError) as exc:
            raise HTTPException(404, "Arquivo do material não encontrado.") from exc
        return material, caminho
