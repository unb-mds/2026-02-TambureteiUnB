from sqlalchemy.orm import Session
from app.models.relato_bug import RelatoBug
from app.repositories.base import BaseRepository


class RelatoBugRepository(BaseRepository[RelatoBug]):
    def __init__(self):
        super().__init__(RelatoBug)

    def adicionar(self, db: Session, relato: RelatoBug) -> None:
        db.add(relato)
        db.flush()

    def pendentes(self, db: Session, pagina: int, tamanho: int):
        query = db.query(RelatoBug).filter(RelatoBug.status == "PENDENTE")
        total = query.count()
        items = query.order_by(RelatoBug.created_at, RelatoBug.id).offset((pagina - 1) * tamanho).limit(tamanho).all()
        return items, total

    def para_decisao(self, db: Session, relato_id: int):
        return db.query(RelatoBug).filter(RelatoBug.id == relato_id).with_for_update().first()


relato_bug_repo = RelatoBugRepository()
