from sqlalchemy import BigInteger, CheckConstraint, Column, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class RelatoBug(Base):
    __tablename__ = "relatos_bugs"

    id = Column(BigInteger, primary_key=True)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    titulo = Column(String(120), nullable=False)
    descricao = Column(Text, nullable=False)
    pagina = Column(String(500), nullable=False)
    status = Column(String(20), nullable=False, server_default="PENDENTE", default="PENDENTE")
    moderador_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    justificativa = Column(String(1000), nullable=True)
    resolvido_em = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint("status IN ('PENDENTE', 'RESOLVIDO', 'DESCARTADO')", name="chk_relato_bug_status"),
        CheckConstraint("length(trim(titulo)) BETWEEN 5 AND 120", name="chk_relato_bug_titulo"),
        CheckConstraint("length(trim(descricao)) BETWEEN 10 AND 3000", name="chk_relato_bug_descricao"),
        Index("ix_relatos_bugs_status_created_at", "status", "created_at", "id"),
    )
