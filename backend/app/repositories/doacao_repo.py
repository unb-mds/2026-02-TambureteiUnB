from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.doacao import DoacaoEstatistica
from app.repositories.base import BaseRepository


class DoacaoRepository(BaseRepository[DoacaoEstatistica]):
    def __init__(self):
        super().__init__(DoacaoEstatistica)

    def get_duplicada(
        self,
        db: Session,
        usuario_id: UUID,
        turma_id: int,
        semestre_referencia: str,
    ) -> Optional[DoacaoEstatistica]:
        return (
            db.query(DoacaoEstatistica)
            .filter(
                DoacaoEstatistica.usuario_id == usuario_id,
                DoacaoEstatistica.turma_id == turma_id,
                DoacaoEstatistica.semestre_referencia == semestre_referencia,
            )
            .first()
        )

    def get_by_turma(self, db: Session, turma_id: int) -> List[DoacaoEstatistica]:
        return (
            db.query(DoacaoEstatistica)
            .filter(DoacaoEstatistica.turma_id == turma_id)
            .order_by(DoacaoEstatistica.created_at.desc())
            .all()
        )


doacao_repo = DoacaoRepository()
