from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from app.models.disciplina import Disciplina
from app.repositories.base import BaseRepository

class DisciplinaRepository(BaseRepository[Disciplina]):
    def __init__(self):
        super().__init__(Disciplina)

    def get_by_slug(self, db: Session, slug: str) -> Optional[Disciplina]:
        return db.query(Disciplina).filter(Disciplina.slug == slug).first()

    def get_by_codigo(self, db: Session, codigo: str) -> Optional[Disciplina]:
        return db.query(Disciplina).filter(Disciplina.codigo == codigo).first()

    def get_with_details(self, db: Session, slug: str) -> Optional[Disciplina]:
        """Recupera a disciplina com seus relacionamentos de métricas, conteúdos e comentários."""
        return (
            db.query(Disciplina)
            .options(
                joinedload(Disciplina.metricas),
                joinedload(Disciplina.conteudos),
                joinedload(Disciplina.comentarios)
            )
            .filter(Disciplina.slug == slug)
            .first()
        )

    def search_by_name(self, db: Session, query: str, limit: int = 20) -> List[Disciplina]:
        return (
            db.query(Disciplina)
            .filter(Disciplina.nome.ilike(f"%{query}%"))
            .limit(limit)
            .all()
        )

disciplina_repo = DisciplinaRepository()
