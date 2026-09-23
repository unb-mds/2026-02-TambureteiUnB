"""Arquivos físicos da Feature 5.2, separados dos links em conteudos."""

from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Material(Base):
    __tablename__ = "materiais"

    id = Column(Integer, primary_key=True)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    disciplina_id = Column(Integer, ForeignKey("disciplinas.id", ondelete="CASCADE"), nullable=False)
    titulo = Column(String(200), nullable=False)
    caminho_arquivo = Column(String(64), nullable=False, unique=True)
    formato = Column(String(3), nullable=False)
    tamanho_bytes = Column(Integer, nullable=False)
    status_moderacao = Column(String(20), nullable=False, default="ativo", server_default="ativo")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    usuario = relationship("Usuario")
    disciplina = relationship("Disciplina")

    __table_args__ = (
        CheckConstraint("formato IN ('pdf', 'png', 'jpg')", name="chk_material_formato"),
        CheckConstraint("tamanho_bytes > 0", name="chk_material_tamanho"),
        CheckConstraint("length(trim(titulo)) > 0", name="chk_material_titulo"),
        CheckConstraint(
            "status_moderacao IN ('ativo', 'em_analise', 'bloqueado', 'excluido')",
            name="chk_material_status",
        ),
        Index("ix_materiais_disciplina_status_id", "disciplina_id", "status_moderacao", "id"),
        Index("ix_materiais_usuario_id", "usuario_id"),
    )
