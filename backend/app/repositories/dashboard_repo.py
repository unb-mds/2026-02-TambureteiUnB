from sqlalchemy.orm import Session, selectinload

from app.models.curso import Curso
from app.repositories.base import BaseRepository


class DashboardRepository(BaseRepository[Curso]):
    def __init__(self) -> None:
        super().__init__(Curso)

    def _get_curso_com_metricas_por_filtro(self, db: Session, criterio) -> Curso | None:
        return (
            db.query(Curso)
            .options(selectinload(Curso.metricas))
            .filter(criterio)
            .first()
        )

    def get_curso_com_metricas(self, db: Session, curso_id: int) -> Curso | None:
        return self._get_curso_com_metricas_por_filtro(db, Curso.id == curso_id)

    def get_curso_com_metricas_por_slug(self, db: Session, slug: str) -> Curso | None:
        return self._get_curso_com_metricas_por_filtro(db, Curso.slug == slug)


dashboard_repo = DashboardRepository()
