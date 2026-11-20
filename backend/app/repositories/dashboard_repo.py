from sqlalchemy import RowMapping, func, select, text
from sqlalchemy.orm import Session, selectinload

from app.models.curso import Curso
from app.models.evasao_campus_view import mv_evasao_campus
from app.models.metrica import MetricaCurso
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

    def contar_cursos(self, db: Session) -> int:
        return int(db.scalar(select(func.count(Curso.id))) or 0)

    def listar_fluxo_institucional(self, db: Session) -> list[RowMapping]:
        stmt = (
            select(
                MetricaCurso.ano.label("ano"),
                func.coalesce(func.sum(MetricaCurso.ingressantes), 0).label("ingressantes"),
                func.coalesce(func.sum(MetricaCurso.matriculados), 0).label("matriculados"),
                func.coalesce(func.sum(MetricaCurso.concluintes), 0).label("concluintes"),
                func.coalesce(func.sum(MetricaCurso.trancados), 0).label("trancados"),
                func.coalesce(func.sum(MetricaCurso.desvinculados), 0).label("evadidos"),
            )
            .group_by(MetricaCurso.ano)
            .order_by(MetricaCurso.ano.asc())
        )
        return list(db.execute(stmt).mappings().all())


dashboard_repo = DashboardRepository()
