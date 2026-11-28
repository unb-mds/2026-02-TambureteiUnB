from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.api.schemas.notificacao import (
    ListaNotificacoesResponse,
    MarcarTodasLidasResponse,
    NotificacaoResponse,
)
from app.models.notificacao import Notificacao
from app.repositories.notificacao_repo import notificacao_repo


class NotificacaoService:
    def registrar(
        self,
        db: Session,
        usuario_id: UUID | None,
        tipo: str,
        titulo: str,
        mensagem: str,
        link: str | None = None,
    ) -> Notificacao | None:
        """Enfileira uma notificação na transação atual (o commit fica sob responsabilidade do chamador)."""
        if usuario_id is None:
            return None
        notificacao = Notificacao(
            usuario_id=usuario_id,
            tipo=tipo[:40],
            titulo=titulo.strip()[:200],
            mensagem=mensagem.strip(),
            link=link[:300] if link else None,
            lida=False,
        )
        notificacao_repo.adicionar(db, notificacao)
        return notificacao

    def listar(self, db: Session, usuario_id: UUID, limite: int = 30) -> ListaNotificacoesResponse:
        itens = notificacao_repo.listar_do_usuario(db, usuario_id, limite=limite)
        nao_lidas = notificacao_repo.contar_nao_lidas(db, usuario_id)
        return ListaNotificacoesResponse(
            items=[NotificacaoResponse.model_validate(item) for item in itens],
            nao_lidas=nao_lidas,
        )

    def marcar_lida(self, db: Session, notificacao_id: int, usuario_id: UUID) -> NotificacaoResponse:
        notificacao = notificacao_repo.obter_do_usuario(db, notificacao_id, usuario_id)
        if notificacao is None:
            raise HTTPException(404, "Notificação não encontrada.")
        if not notificacao.lida:
            notificacao.lida = True
            db.commit()
            db.refresh(notificacao)
        return NotificacaoResponse.model_validate(notificacao)

    def marcar_todas_lidas(self, db: Session, usuario_id: UUID) -> MarcarTodasLidasResponse:
        marcadas = notificacao_repo.marcar_todas_lidas(db, usuario_id)
        db.commit()
        return MarcarTodasLidasResponse(marcadas=marcadas)


notificacao_service = NotificacaoService()
