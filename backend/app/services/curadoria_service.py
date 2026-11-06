import logging
from pathlib import Path
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.schemas.curadoria import (
    ComentarioPendente,
    DecisaoComentarioCuradoria,
    DecisaoCuradoria,
    FilaComentariosCuradoria,
    FilaCuradoria,
    RegistroCuradoria,
)
from app.models.curadoria import Curadoria
from app.models.conteudo import Conteudo
from app.models.usuario import Usuario
from app.repositories.curadoria_repo import curadoria_repo
from app.services.armazenamento_material import ArmazenamentoMaterial

logger = logging.getLogger(__name__)


class CuradoriaService:
    def __init__(self, armazenamento: ArmazenamentoMaterial) -> None:
        self.armazenamento = armazenamento

    def listar(self, db: Session, pagina: int, tamanho: int) -> FilaCuradoria:
        itens, total = curadoria_repo.listar_pendentes(db, pagina, tamanho)
        return FilaCuradoria(items=itens, total=total, pagina=pagina, tamanho_pagina=tamanho)

    def obter(self, db: Session, conteudo_id: int, bloquear: bool = False) -> Conteudo:
        conteudo = curadoria_repo.obter_arquivo(db, conteudo_id, bloquear)
        if conteudo is None or conteudo.status_moderacao == "excluido":
            raise HTTPException(404, "Material não encontrado.")
        return conteudo

    def decidir(self, db: Session, conteudo_id: int, dados: DecisaoCuradoria, moderador: Usuario) -> RegistroCuradoria:
        try:
            conteudo = self.obter(db, conteudo_id, bloquear=True)
            if conteudo.status_curadoria != "PENDENTE":
                raise HTTPException(409, "Este material já foi avaliado. Atualize a fila.")
            if conteudo.status_moderacao not in {"ativo", "em_analise"}:
                raise HTTPException(409, "O material não está disponível para curadoria.")
            registro = Curadoria(
                conteudo_id=conteudo.id, moderador_id=moderador.id, perfil_moderador=moderador.role,
                status_anterior=conteudo.status_curadoria, status_novo=dados.status,
                justificativa=dados.justificativa,
            )
            conteudo.status_curadoria = dados.status
            conteudo.moderado_por = moderador.role
            if dados.justificativa:
                conteudo.motivo_moderacao = dados.justificativa
            if dados.status == "APROVADO":
                conteudo.status_moderacao = "ativo"
            curadoria_repo.registrar(db, registro)
            resposta = RegistroCuradoria.model_validate(registro)
            db.commit()
            return resposta
        except HTTPException:
            db.rollback()
            raise
        except SQLAlchemyError as exc:
            db.rollback()
            logger.exception("Falha ao registrar curadoria.")
            raise HTTPException(503, "Não foi possível registrar a decisão. Tente novamente.") from exc

    def listar_comentarios(self, db: Session, pagina: int, tamanho: int) -> FilaComentariosCuradoria:
        itens, total = curadoria_repo.listar_comentarios_pendentes(db, pagina, tamanho)
        return FilaComentariosCuradoria(items=itens, total=total, pagina=pagina, tamanho_pagina=tamanho)

    def decidir_comentario(
        self, db: Session, comentario_id: int, dados: DecisaoComentarioCuradoria, moderador: Usuario
    ) -> ComentarioPendente:
        try:
            comentario = curadoria_repo.obter_comentario(db, comentario_id, bloquear=True)
            if comentario is None:
                raise HTTPException(404, "Comentário não encontrado.")
            if comentario.status_moderacao != "PENDENTE":
                raise HTTPException(409, "Este comentário já foi avaliado. Atualize a fila.")
            comentario.status_moderacao = dados.status
            comentario.moderado_por = moderador.role
            if dados.justificativa:
                comentario.motivo_moderacao = dados.justificativa
            db.flush()
            resposta = ComentarioPendente.model_validate(comentario)
            db.commit()
            return resposta
        except HTTPException:
            db.rollback()
            raise
        except SQLAlchemyError as exc:
            db.rollback()
            logger.exception("Falha ao registrar curadoria de comentário.")
            raise HTTPException(503, "Não foi possível registrar a decisão. Tente novamente.") from exc

    def baixar(self, db: Session, conteudo_id: int) -> tuple[Conteudo, Path]:
        conteudo = self.obter(db, conteudo_id)
        if conteudo.status_curadoria != "PENDENTE" or conteudo.status_moderacao not in {"ativo", "em_analise"}:
            raise HTTPException(409, "O material não está mais pendente. Atualize a fila.")
        try:
            caminho = self.armazenamento.localizar(conteudo.caminho_arquivo)
        except (OSError, ValueError) as exc:
            raise HTTPException(404, "Arquivo não encontrado.") from exc
        return conteudo, caminho

    def historico(self, db: Session, conteudo_id: int) -> list[RegistroCuradoria]:
        self.obter(db, conteudo_id)
        return [RegistroCuradoria.model_validate(item) for item in curadoria_repo.historico(db, conteudo_id)]
