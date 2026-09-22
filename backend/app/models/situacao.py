from sqlalchemy import Column, Integer, BigInteger, String, ForeignKey, DateTime, func, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class SituacaoDisciplina(Base):
    __tablename__ = "situacoes_disciplinas"

    id = Column(BigInteger, primary_key=True, index=True)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    disciplina_id = Column(Integer, ForeignKey("disciplinas.id", ondelete="CASCADE"), nullable=False, index=True)
    situacao = Column(String(20), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    usuario = relationship("Usuario", back_populates="situacoes")
    disciplina = relationship("Disciplina", back_populates="situacoes")

    __table_args__ = (
        UniqueConstraint("usuario_id", "disciplina_id", name="uq_usuario_disciplina_situacao"),
        CheckConstraint("situacao IN ('APROVADO', 'REPROVADO_NOTA', 'REPROVADO_FALTA', 'TRANCOU')", name="chk_situacao_valida")
    )

    def __repr__(self):
        return f"<SituacaoDisciplina(user={self.usuario_id}, disc={self.disciplina_id}, sit='{self.situacao}')>"
