from sqlalchemy.orm import Session, joinedload

from app.models.curso import Curso
from app.repositories.base import BaseRepository


class CursoRepository(BaseRepository[Curso]):
    def __init__(self) -> None:
        super().__init__(Curso)

    def listar(self, db: Session) -> list[Curso]:
        return db.query(Curso).order_by(Curso.nome, Curso.id).all()

    def get_by_slug(self, db: Session, slug: str) -> Curso | None:
        return (
            db.query(Curso)
            .options(joinedload(Curso.metricas))
            .filter(Curso.slug == slug)
            .first()
        )


curso_repo = CursoRepository()
