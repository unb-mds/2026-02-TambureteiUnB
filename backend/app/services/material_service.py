import logging
from pathlib import Path
from typing import BinaryIO
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.schemas.material import MaterialPage, MaterialResponse
from app.domain.materiais import ArquivoMuitoGrande, ArquivoVazio, FormatoNaoSuportado
from app.models.material import Material
from app.repositories.disciplina_repo import disciplina_repo
from app.repositories.material_repo import material_repo
from app.services.armazenamento_material import ArmazenamentoMaterial

logger = logging.getLogger(__name__)


class MaterialService:
    def __init__(self, armazenamento: ArmazenamentoMaterial):
        self.armazenamento = armazenamento

    def verificar_disciplina(self, db: Session, disciplina_id: int) -> None:
        if disciplina_repo.get_by_id(db, disciplina_id) is None:
            raise HTTPException(404, "Cadeira não encontrada.")

    def enviar(
        self, db: Session, usuario_id: UUID, disciplina_id: int, titulo: str,
        arquivo: BinaryIO, nome: str, tipo_mime: str,
    ) -> MaterialResponse:
        self.verificar_disciplina(db, disciplina_id)
        titulo = titulo.strip()
        if not 1 <= len(titulo) <= 200:
            raise HTTPException(422, "O título deve conter entre 1 e 200 caracteres.")
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
            material = Material(
                usuario_id=usuario_id, disciplina_id=disciplina_id, titulo=titulo,
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
        self, db: Session, disciplina_id: int, titulo: str | None, pagina: int, tamanho_pagina: int
    ) -> MaterialPage:
        self.verificar_disciplina(db, disciplina_id)
        materiais, total = material_repo.listar_ativos(
            db, disciplina_id, titulo.strip() if titulo else None, pagina, tamanho_pagina
        )
        return MaterialPage(items=materiais, total=total, pagina=pagina, tamanho_pagina=tamanho_pagina)

    def baixar(self, db: Session, material_id: int) -> tuple[Material, Path]:
        material = material_repo.get_by_id(db, material_id)
        if material is None or material.status_moderacao == "excluido":
            raise HTTPException(404, "Material não encontrado.")
        if material.status_moderacao != "ativo":
            raise HTTPException(403, "Material indisponível por moderação.")
        try:
            caminho = self.armazenamento.localizar(material.caminho_arquivo)
        except (OSError, ValueError) as exc:
            raise HTTPException(404, "Arquivo do material não encontrado.") from exc
        return material, caminho
