from typing import List, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.domain.quorum import GrupoValores
from app.models.estatistica_consolidada import EstatisticaConsolidada
from app.models.turma import Turma
from app.repositories.base import BaseRepository


class EstatisticaConsolidadaRepository(BaseRepository[EstatisticaConsolidada]):
    def __init__(self):
        super().__init__(EstatisticaConsolidada)

    def get_by_turma_e_semestre(
        self, db: Session, turma_id: int, semestre_referencia: str
    ) -> Optional[EstatisticaConsolidada]:
        return (
            db.query(EstatisticaConsolidada)
            .filter(
                EstatisticaConsolidada.turma_id == turma_id,
                EstatisticaConsolidada.semestre_referencia == semestre_referencia,
            )
            .first()
        )

    def salvar(
        self, db: Session, turma_id: int, semestre_referencia: str, grupo: GrupoValores
    ) -> EstatisticaConsolidada:
        """Cria ou substitui a oficial da turma/semestre. Só flush: o commit é do service."""
        obj = self.get_by_turma_e_semestre(db, turma_id, semestre_referencia)
        if obj is None:
            obj = EstatisticaConsolidada(turma_id=turma_id, semestre_referencia=semestre_referencia)
            db.add(obj)
        else:
            obj.updated_at = func.now()
        obj.taxa_aprovacao = grupo.taxa_aprovacao
        obj.taxa_reprovacao_nota = grupo.taxa_reprovacao_nota
        obj.taxa_reprovacao_falta = grupo.taxa_reprovacao_falta
        obj.taxa_trancamento = grupo.taxa_trancamento
        obj.status = "VALIDADO"
        db.flush()
        return obj

    def listar(
        self,
        db: Session,
        turma_id: Optional[int] = None,
        disciplina_id: Optional[int] = None,
        semestre_referencia: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> List[EstatisticaConsolidada]:
        query = db.query(EstatisticaConsolidada)
        if disciplina_id is not None:
            query = query.join(Turma, Turma.id == EstatisticaConsolidada.turma_id).filter(
                Turma.disciplina_id == disciplina_id
            )
        if turma_id is not None:
            query = query.filter(EstatisticaConsolidada.turma_id == turma_id)
        if semestre_referencia is not None:
            query = query.filter(EstatisticaConsolidada.semestre_referencia == semestre_referencia)
        return (
            query.order_by(EstatisticaConsolidada.semestre_referencia.desc(), EstatisticaConsolidada.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )


estatistica_repo = EstatisticaConsolidadaRepository()