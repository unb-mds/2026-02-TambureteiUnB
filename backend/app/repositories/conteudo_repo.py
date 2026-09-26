from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.conteudo import Conteudo
from app.repositories.base import BaseRepository

class ConteudoRepository(BaseRepository[Conteudo]):
    def __init__(self):
        super().__init__(Conteudo)

    def get_aprovados_by_disciplina(
        self, db: Session, disciplina_id: int, tipo: Optional[str] = None
    ) -> List[Conteudo]:
        query = db.query(Conteudo).filter(
            Conteudo.disciplina_id == disciplina_id,
            Conteudo.status_curadoria == "APROVADO"
        )
        if tipo:
            query = query.filter(Conteudo.tipo == tipo)
        return query.order_by(Conteudo.created_at.desc()).all()

    def get_pendentes_moderacao(self, db: Session, limit: int = 50) -> List[Conteudo]:
        return (
            db.query(Conteudo)
            .filter(Conteudo.status_curadoria == "PENDENTE")
            .order_by(Conteudo.created_at.asc())
            .limit(limit)
            .all()
        )

conteudo_repo = ConteudoRepository()
