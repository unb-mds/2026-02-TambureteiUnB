from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.models.notificacao import Notificacao
from app.repositories.base import BaseRepository


class NotificacaoRepository(BaseRepository[Notificacao]):
    def __init__(self) -> None:
        super().__init__(Notificacao)

    def adicionar(self, db: Session, notificacao: Notificacao) -> None:
        db.add(notificacao)
        db.flush()

    def listar_do_usuario(self, db: Session, usuario_id: UUID, limite: int = 30) -> list[Notificacao]:
        consulta = (
            select(Notificacao)
            .where(Notificacao.usuario_id == usuario_id)
            .order_by(Notificacao.created_at.desc(), Notificacao.id.desc())
            .limit(limite)
        )
        return list(db.scalars(consulta))

    def contar_nao_lidas(self, db: Session, usuario_id: UUID) -> int:
        return (
            db.scalar(
                select(func.count())
                .select_from(Notificacao)
                .where(Notificacao.usuario_id == usuario_id, Notificacao.lida.is_(False))
            )
            or 0
        )

    def obter_do_usuario(self, db: Session, notificacao_id: int, usuario_id: UUID) -> Notificacao | None:
        return db.scalar(
            select(Notificacao).where(
                Notificacao.id == notificacao_id,
                Notificacao.usuario_id == usuario_id,
            )
        )

    def marcar_todas_lidas(self, db: Session, usuario_id: UUID) -> int:
        resultado = db.execute(
            update(Notificacao)
            .where(Notificacao.usuario_id == usuario_id, Notificacao.lida.is_(False))
            .values(lida=True)
        )
        return int(resultado.rowcount or 0)


notificacao_repo = NotificacaoRepository()
