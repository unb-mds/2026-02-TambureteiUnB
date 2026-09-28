from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.curso import Curso, CursoDisciplina
from app.repositories.base import BaseRepository


class CursoRepository(BaseRepository[Curso]):
    def __init__(self) -> None:
        super().__init__(Curso)

    def listar(self, db: Session, q: str | None = None, campus: str | None = None) -> list[Curso]:
        query = db.query(Curso).options(
            selectinload(Curso.metricas),
            selectinload(Curso.curso_disciplinas),
        )
        if campus and campus.lower() not in ("todos", "todos os campi"):
            query = query.filter(Curso.campus.ilike(f"%{campus}%"))
        if q:
            query = query.filter(Curso.nome.ilike(f"%{q}%"))
        return query.order_by(Curso.nome, Curso.id).all()

    def get_by_slug(self, db: Session, slug: str) -> Curso | None:
        return (
            db.query(Curso)
            .options(
                joinedload(Curso.metricas),
                joinedload(Curso.curso_disciplinas).joinedload(CursoDisciplina.disciplina),
            )
            .filter(Curso.slug == slug)
            .first()
        )


curso_repo = CursoRepository()
