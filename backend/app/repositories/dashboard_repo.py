from sqlalchemy import RowMapping, select, text
from sqlalchemy.orm import Session, selectinload

from app.models.curso import Curso
from app.models.evasao_campus_view import mv_evasao_campus
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

    def listar_campi(self, db: Session, termo: str | None = None) -> list[str]:
        stmt = select(Curso.campus).distinct().order_by(Curso.campus.asc())
        if termo:
            stmt = stmt.where(Curso.campus.icontains(termo, autoescape=True))
        return list(db.scalars(stmt).all())

    def listar_evasao_campus(
        self, db: Session, campi: list[str] | None = None
    ) -> list[RowMapping]:
        stmt = select(mv_evasao_campus).order_by(
            mv_evasao_campus.c.campus.asc(),
            mv_evasao_campus.c.ano.asc(),
        )
        if campi is not None:
            stmt = stmt.where(mv_evasao_campus.c.campus.in_(campi))
        return list(db.execute(stmt).mappings().all())

    def atualizar_evasao_campus(self, db: Session) -> None:
        db.execute(text("REFRESH MATERIALIZED VIEW mv_evasao_campus"))


dashboard_repo = DashboardRepository()
