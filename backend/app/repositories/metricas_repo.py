from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.metrica import MetricaAcademica
from app.repositories.base import BaseRepository

class MetricasRepository(BaseRepository[MetricaAcademica]):
    def __init__(self):
        super().__init__(MetricaAcademica)

    def get_by_disciplina(self, db: Session, disciplina_id: int) -> List[MetricaAcademica]:
        return (
            db.query(MetricaAcademica)
            .filter(MetricaAcademica.disciplina_id == disciplina_id)
            .order_by(MetricaAcademica.ano.desc(), MetricaAcademica.semestre.desc())
            .all()
        )

    def get_by_disciplina_e_periodo(
        self, db: Session, disciplina_id: int, ano_inicio: int, ano_fim: int
    ) -> List[MetricaAcademica]:
        return (
            db.query(MetricaAcademica)
            .filter(
                MetricaAcademica.disciplina_id == disciplina_id,
                MetricaAcademica.ano >= ano_inicio,
                MetricaAcademica.ano <= ano_fim
            )
            .order_by(MetricaAcademica.ano.asc(), MetricaAcademica.semestre.asc())
            .all()
        )

metricas_repo = MetricasRepository()
