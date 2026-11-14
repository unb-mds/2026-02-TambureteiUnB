"""Decisoes de curadoria: registros sem endpoints de edicao ou exclusao."""
from sqlalchemy import BigInteger, CheckConstraint, Column, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Curadoria(Base):
    __tablename__ = "curadorias"

    id = Column(BigInteger, primary_key=True)
    conteudo_id = Column(BigInteger, ForeignKey("conteudos.id", ondelete="RESTRICT"), nullable=False, unique=True)
    moderador_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    perfil_moderador = Column(String(20), nullable=False)
    status_anterior = Column(String(20), nullable=False)
    status_novo = Column(String(20), nullable=False)
    justificativa = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("perfil_moderador IN ('MODERATOR', 'ADMIN')", name="chk_curadoria_perfil"),
        CheckConstraint("status_anterior = 'PENDENTE'", name="chk_curadoria_anterior"),
        CheckConstraint("status_novo IN ('APROVADO', 'RECUSADO')", name="chk_curadoria_novo"),
        CheckConstraint("justificativa IS NULL OR length(justificativa) <= 1000", name="chk_curadoria_justificativa"),
        CheckConstraint("status_novo <> 'RECUSADO' OR (justificativa IS NOT NULL AND length(trim(justificativa)) > 0)", name="chk_curadoria_recusa"),
    )
