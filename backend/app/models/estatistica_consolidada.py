from sqlalchemy import (
    BigInteger, Boolean, CheckConstraint, Column, DateTime, ForeignKey,
    Index, Integer, Numeric, String, UniqueConstraint, func,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class EstatisticaConsolidada(Base):
    """Estatística oficial de uma turma, gravada quando o quórum é atingido (US 3.2.2) ou via histórico SIGAA."""

    __tablename__ = "estatisticas_consolidadas"

    id = Column(BigInteger, primary_key=True)
    turma_id = Column(Integer, ForeignKey("turmas.id", ondelete="CASCADE"), nullable=False)
    disciplina_id = Column(Integer, ForeignKey("disciplinas.id", ondelete="CASCADE"), nullable=False)
    semestre_referencia = Column(String(10), nullable=False)

    taxa_aprovacao = Column(Numeric(5, 2), nullable=False)
    taxa_reprovacao_nota = Column(Numeric(5, 2), nullable=False)
    taxa_reprovacao_falta = Column(Numeric(5, 2), nullable=False)
    taxa_trancamento = Column(Numeric(5, 2), nullable=False)

    total_amostras = Column(Integer, nullable=False, default=0, server_default="0")
    origem = Column(String(30), nullable=False, default="DOACAO_QUORUM", server_default="DOACAO_QUORUM")
    qtd_ss = Column(Integer, nullable=False, default=0, server_default="0")
    qtd_ms = Column(Integer, nullable=False, default=0, server_default="0")
    qtd_mm = Column(Integer, nullable=False, default=0, server_default="0")
    qtd_mi = Column(Integer, nullable=False, default=0, server_default="0")
    qtd_ii = Column(Integer, nullable=False, default=0, server_default="0")
    qtd_sr = Column(Integer, nullable=False, default=0, server_default="0")
    amostragem_suprimida_lgpd = Column(Boolean, nullable=False, default=False, server_default="false")

    status = Column(String(20), nullable=False, default="VALIDADO", server_default="VALIDADO")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    turma = relationship("Turma")

    __table_args__ = (
        UniqueConstraint("turma_id", "semestre_referencia", name="uq_estatistica_turma_semestre"),
        Index("ix_estatisticas_disciplina_semestre", "disciplina_id", "semestre_referencia"),
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