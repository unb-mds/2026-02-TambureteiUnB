from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class AmostraHistorico(Base):
    """
    Registro anonimizado de uma amostra individual extraída de Histórico Escolar do SIGAA.

    Não armazena dados pessoais (nome, CPF, matrícula ou usuario_id). O campo
    `dedup_hash` é um SHA-256 irreversível (com segredo do servidor) usado
    exclusivamente para evitar contagem duplicada em reenvios.
    """

    __tablename__ = "amostras_historico"

    id = Column(BigInteger, primary_key=True, index=True)
    dedup_hash = Column(String(64), nullable=False, unique=True, index=True)
    disciplina_id = Column(Integer, ForeignKey("disciplinas.id", ondelete="CASCADE"), nullable=False, index=True)
    turma_id = Column(Integer, ForeignKey("turmas.id", ondelete="SET NULL"), nullable=True, index=True)
    codigo_turma = Column(String(10), nullable=False)
    semestre = Column(String(10), nullable=False, index=True)
    desfecho = Column(String(20), nullable=False)
    mencao = Column(String(5), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    disciplina = relationship("Disciplina")
    turma = relationship("Turma")

    __table_args__ = (
        CheckConstraint(
            "desfecho IN ('APR', 'REP_NOTA', 'REP_FALTA', 'TRANC')",
            name="chk_amostra_desfecho",
        ),
        CheckConstraint(
            "mencao IS NULL OR mencao IN ('SS', 'MS', 'MM', 'MI', 'II', 'SR')",
            name="chk_amostra_mencao",
        ),
    )

    def __repr__(self):
        return (
            f"<AmostraHistorico(id={self.id}, disc_id={self.disciplina_id}, "
            f"turma='{self.codigo_turma}', sem='{self.semestre}', desfecho='{self.desfecho}')>"
        )
