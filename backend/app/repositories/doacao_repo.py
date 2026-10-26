from typing import List, Optional
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.domain.quorum import GrupoValores
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

    def adicionar(self, db: Session, doacao: DoacaoEstatistica) -> DoacaoEstatistica:
        """Persiste sem commit (flush), para o service controlar a transação."""
        db.add(doacao)
        db.flush()
        return doacao

    def agrupar_por_valores(self, db: Session, turma_id: int, semestre_referencia: str) -> List[GrupoValores]:
        """Agrupa doações não descartadas por valores idênticos, com a contagem das já CONSOLIDADAS."""
        quantidade = func.count(DoacaoEstatistica.id)
        consolidadas = func.count(DoacaoEstatistica.id).filter(DoacaoEstatistica.status == "CONSOLIDADA")
        linhas = (
            db.query(
                DoacaoEstatistica.taxa_aprovacao,
                DoacaoEstatistica.taxa_reprovacao_nota,
                DoacaoEstatistica.taxa_reprovacao_falta,
                DoacaoEstatistica.taxa_trancamento,
                quantidade.label("quantidade"),
                consolidadas.label("consolidadas"),
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
        return [
            GrupoValores(
                taxa_aprovacao=l.taxa_aprovacao,
                taxa_reprovacao_nota=l.taxa_reprovacao_nota,
                taxa_reprovacao_falta=l.taxa_reprovacao_falta,
                taxa_trancamento=l.taxa_trancamento,
                quantidade=l.quantidade,
                consolidadas=l.consolidadas,
            )
            for l in linhas
        ]

    def definir_consolidadas(
        self, db: Session, turma_id: int, semestre_referencia: str, vencedor: Optional[GrupoValores]
    ) -> None:
        """
        Recalcula o status: doações não descartadas voltam a PENDENTE e, havendo vencedor,
        as do grupo vencedor passam a CONSOLIDADA. Não faz commit.
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


doacao_repo = DoacaoRepository()