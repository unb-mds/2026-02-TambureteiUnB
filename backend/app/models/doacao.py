from sqlalchemy import (
    Column,
    Integer,
    BigInteger,
    String,
    Numeric,
    ForeignKey,
    DateTime,
    func,
    UniqueConstraint,
    CheckConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, synonym
from app.core.database import Base


class DoacaoEstatistica(Base):
    """
    Registro de doação colaborativa de estatísticas de turma extraídas do SIGAA
    por estudantes autenticados (Épico 3 - US 3.1.1).
    """

    __tablename__ = "doacoes_estatisticas"

    id = Column(BigInteger, primary_key=True, index=True)
    turma_id = Column(Integer, ForeignKey("turmas.id", ondelete="CASCADE"), nullable=False, index=True)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    semestre_referencia = Column(String(10), nullable=False)

    taxa_aprovacao = Column(Numeric(5, 2), nullable=False)
    taxa_reprovacao_nota = Column(Numeric(5, 2), nullable=False)
    taxa_reprovacao_falta = Column(Numeric(5, 2), nullable=False)
    taxa_trancamento = Column(Numeric(5, 2), nullable=False)

    status = Column(String(20), nullable=False, default="PENDENTE", server_default="PENDENTE")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    data_envio = synonym("created_at")

    # Relacionamentos
    turma = relationship("Turma", back_populates="doacoes")
    usuario = relationship("Usuario", back_populates="doacoes")

    __table_args__ = (
        UniqueConstraint("usuario_id", "turma_id", "semestre_referencia", name="uq_usuario_turma_semestre_doacao"),
        CheckConstraint("taxa_aprovacao >= 0 AND taxa_aprovacao <= 100", name="chk_taxa_aprovacao"),
        CheckConstraint("taxa_reprovacao_nota >= 0 AND taxa_reprovacao_nota <= 100", name="chk_taxa_reprov_nota"),
        CheckConstraint("taxa_reprovacao_falta >= 0 AND taxa_reprovacao_falta <= 100", name="chk_taxa_reprov_falta"),
        CheckConstraint("taxa_trancamento >= 0 AND taxa_trancamento <= 100", name="chk_taxa_trancamento"),
        CheckConstraint("status IN ('PENDENTE', 'CONSOLIDADA', 'DESCARTADA')", name="chk_status_doacao"),
        CheckConstraint(
            "(taxa_aprovacao + taxa_reprovacao_nota + taxa_reprovacao_falta + taxa_trancamento) = 100.00",
            name="chk_soma_taxas_cem",
        ),
    )

    def __repr__(self):
        return (
            f"<DoacaoEstatistica(id={self.id}, turma_id={self.turma_id}, "
            f"user={self.usuario_id}, sem='{self.semestre_referencia}', status='{self.status}')>"
        )
