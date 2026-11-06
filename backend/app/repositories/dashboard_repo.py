from sqlalchemy.orm import Session, selectinload

from app.models.curso import Curso
from app.repositories.base import BaseRepository


class DashboardRepository(BaseRepository[Curso]):
    def __init__(self) -> None:
        super().__init__(Curso)

    def get_curso_com_metricas(self, db: Session, curso_id: int) -> Curso | None:
        return (
            db.query(Curso)
            .options(selectinload(Curso.metricas))
            .filter(Curso.id == curso_id)
            .first()
        )


dashboard_repo = DashboardRepository()
