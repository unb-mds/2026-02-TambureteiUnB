from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session

from sqlalchemy import func

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
    def agrupar_por_valores(self, db: Session, turma_id: int, semestre_referencia: str):
        """Agrupa doações não descartadas da turma/semestre por valores idênticos das 4 taxas."""
        quantidade = func.count(DoacaoEstatistica.id)
        return (
            db.query(
                DoacaoEstatistica.taxa_aprovacao,
                DoacaoEstatistica.taxa_reprovacao_nota,
                DoacaoEstatistica.taxa_reprovacao_falta,
                DoacaoEstatistica.taxa_trancamento,
                quantidade.label("quantidade"),
            )
            .filter(
                DoacaoEstatistica.turma_id == turma_id,
                DoacaoEstatistica.semestre_referencia == semestre_referencia,
                DoacaoEstatistica.status != "DESCARTADA",
            )
            .group_by(
                DoacaoEstatistica.taxa_aprovacao,
                DoacaoEstatistica.taxa_reprovacao_nota,
                DoacaoEstatistica.taxa_reprovacao_falta,
                DoacaoEstatistica.taxa_trancamento,
            )
            .order_by(quantidade.desc(), DoacaoEstatistica.taxa_aprovacao.desc())
            .all()
        )

    def definir_consolidadas(self, db: Session, turma_id: int, semestre_referencia: str, vencedor) -> None:
        """
        Recalcula o status: todas as doações não descartadas voltam a PENDENTE e,
        se houver vencedor, as do grupo vencedor passam a CONSOLIDADA.
        """
        base = db.query(DoacaoEstatistica).filter(
            DoacaoEstatistica.turma_id == turma_id,
            DoacaoEstatistica.semestre_referencia == semestre_referencia,
            DoacaoEstatistica.status != "DESCARTADA",
        )
        base.update({DoacaoEstatistica.status: "PENDENTE"}, synchronize_session=False)
        if vencedor is not None:
            base.filter(
                DoacaoEstatistica.taxa_aprovacao == vencedor.taxa_aprovacao,
                DoacaoEstatistica.taxa_reprovacao_nota == vencedor.taxa_reprovacao_nota,
                DoacaoEstatistica.taxa_reprovacao_falta == vencedor.taxa_reprovacao_falta,
                DoacaoEstatistica.taxa_trancamento == vencedor.taxa_trancamento,
            ).update({DoacaoEstatistica.status: "CONSOLIDADA"}, synchronize_session=False)
        db.commit()


doacao_repo = DoacaoRepository()
