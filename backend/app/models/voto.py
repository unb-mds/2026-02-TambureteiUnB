from sqlalchemy import Column, BigInteger, String, ForeignKey, DateTime, func, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class VotoUtil(Base):
    __tablename__ = "votos_uteis"

    id = Column(BigInteger, primary_key=True, index=True)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    target_type = Column(String(20), nullable=False, index=True) # 'CONTEUDO', 'COMENTARIO'
    target_id = Column(BigInteger, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    usuario = relationship("Usuario", back_populates="votos")

    __table_args__ = (
        UniqueConstraint("usuario_id", "target_type", "target_id", name="uq_usuario_target_voto"),
        CheckConstraint("target_type IN ('CONTEUDO', 'COMENTARIO')", name="chk_target_type_valido")
    )

    def __repr__(self):
        return f"<VotoUtil(user={self.usuario_id}, target={self.target_type}:{self.target_id})>"
