import logging
from pathlib import Path
from typing import BinaryIO
from uuid import UUID

from fastapi import HTTPException
from pydantic_core import PydanticCustomError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.schemas.material import MaterialPage, MaterialResponse, validar_titulo
from app.domain.materiais import ArquivoMuitoGrande, ArquivoVazio, FormatoNaoSuportado
from app.models.conteudo import Conteudo
from app.models.disciplina import Disciplina
from app.repositories.disciplina_repo import disciplina_repo
from app.repositories.material_repo import material_repo
from app.services.armazenamento_material import ArmazenamentoMaterial

logger = logging.getLogger(__name__)


class MaterialService:
    TIPOS_PERMITIDOS = {"ARQUIVO", "RESUMO", "PROVA_ANTIGA", "DICA"}

    def __init__(self, armazenamento: ArmazenamentoMaterial):
        self.armazenamento = armazenamento

    def resolver_disciplina(self, db: Session, id_ou_slug: int | str) -> Disciplina:
        if isinstance(id_ou_slug, int) or (isinstance(id_ou_slug, str) and id_ou_slug.isdigit()):
            disciplina = disciplina_repo.get_by_id(db, int(id_ou_slug))
        else:
            disciplina = disciplina_repo.get_by_slug(db, str(id_ou_slug))
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
        if tipo not in self.TIPOS_PERMITIDOS:
            raise HTTPException(422, f"Tipo inválido. Tipos permitidos: {sorted(self.TIPOS_PERMITIDOS)}")
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
        self, db: Session, id_ou_slug: int | str, titulo: str | None, pagina: int, tamanho_pagina: int, tipo: str | None = None
    ) -> MaterialPage:
        disciplina = self.resolver_disciplina(db, id_ou_slug)
        tipo_filtro = tipo.strip().upper() if tipo else None
        if tipo_filtro and tipo_filtro not in self.TIPOS_PERMITIDOS:
            raise HTTPException(422, f"Tipo inválido. Tipos permitidos: {sorted(self.TIPOS_PERMITIDOS)}")
        materiais, total = material_repo.listar_ativos(
            db, disciplina.id, titulo.strip() if titulo else None, pagina, tamanho_pagina, tipo=tipo_filtro
        )
        return MaterialPage(items=materiais, total=total, pagina=pagina, tamanho_pagina=tamanho_pagina)

    def baixar(self, db: Session, material_id: int) -> tuple[Conteudo, Path]:
        material = material_repo.get_by_id(db, material_id)
        if material is None or material.status_moderacao == "excluido":
            raise HTTPException(404, "Material não encontrado.")
        if material.status_moderacao != "ativo" or material.status_curadoria != "APROVADO":
            raise HTTPException(403, "Material indisponível por moderação.")
        try:
            caminho = self.armazenamento.localizar(material.caminho_arquivo)
        except (OSError, ValueError) as exc:
            raise HTTPException(404, "Arquivo do material não encontrado.") from exc
        return material, caminho
