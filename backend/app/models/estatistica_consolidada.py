from sqlalchemy import (
    BigInteger, CheckConstraint, Column, DateTime, ForeignKey,
    Integer, Numeric, String, UniqueConstraint, func,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class EstatisticaConsolidada(Base):
    """Estatística oficial de uma turma, gravada quando o quórum é atingido (US 3.2.2)."""

    __tablename__ = "estatisticas_consolidadas"

    id = Column(BigInteger, primary_key=True)
    turma_id = Column(Integer, ForeignKey("turmas.id", ondelete="CASCADE"), nullable=False)
    semestre_referencia = Column(String(10), nullable=False)

    taxa_aprovacao = Column(Numeric(5, 2), nullable=False)
    taxa_reprovacao_nota = Column(Numeric(5, 2), nullable=False)
    taxa_reprovacao_falta = Column(Numeric(5, 2), nullable=False)
    taxa_trancamento = Column(Numeric(5, 2), nullable=False)

    status = Column(String(20), nullable=False, default="VALIDADO", server_default="VALIDADO")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    turma = relationship("Turma")

    __table_args__ = (
        UniqueConstraint("turma_id", "semestre_referencia", name="uq_estatistica_turma_semestre"),
        CheckConstraint("status IN ('VALIDADO')", name="chk_status_estatistica"),
        CheckConstraint(
            "taxa_aprovacao >= 0 AND taxa_reprovacao_nota >= 0 "
            "AND taxa_reprovacao_falta >= 0 AND taxa_trancamento >= 0",
            name="chk_estatistica_taxas_positivas",
        ),
        CheckConstraint(
            "(taxa_aprovacao + taxa_reprovacao_nota + taxa_reprovacao_falta + taxa_trancamento) = 100.00",
            name="chk_estatistica_soma_cem",
        ),
    )