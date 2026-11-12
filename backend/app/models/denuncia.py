from __future__ import annotations

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Denuncia(Base):
    __tablename__ = "denuncias"

    id = Column(BigInteger, primary_key=True, index=True)
    comentario_id = Column(
        BigInteger,
        ForeignKey("comentarios.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    conteudo_id = Column(
        BigInteger,
        ForeignKey("conteudos.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    usuario_id = Column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    categoria = Column(String(40), nullable=False, default="OFENSA_DOCENTE")
    motivo = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="PENDENTE", index=True)
    moderador_id = Column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="SET NULL"),
        nullable=True,
    )
    perfil_moderador = Column(String(20), nullable=True)
    justificativa_decisao = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    comentario = relationship("Comentario")
    conteudo = relationship("Conteudo")

    __table_args__ = (
        CheckConstraint(
            "(comentario_id IS NOT NULL AND conteudo_id IS NULL) "
            "OR (comentario_id IS NULL AND conteudo_id IS NOT NULL)",
            name="chk_denuncia_alvo_unico",
        ),
        CheckConstraint(
            "categoria IN ('OFENSA_DOCENTE', 'CONTEUDO_IMPROPRIO', 'GABARITO_ATIVO', 'SPAM', 'OUTRO')",
            name="chk_denuncia_categoria",
        ),
        CheckConstraint(
            "status IN ('PENDENTE', 'DESCARTADA', 'PROCEDENTE')",
            name="chk_denuncia_status",
        ),
        CheckConstraint(
            "length(trim(motivo)) >= 5 AND length(motivo) <= 1000",
            name="chk_denuncia_motivo",
        ),
        CheckConstraint(
            "justificativa_decisao IS NULL OR length(justificativa_decisao) <= 1000",
            name="chk_denuncia_justificativa",
        ),
        UniqueConstraint(
            "usuario_id",
            "comentario_id",
            name="uq_denuncia_usuario_comentario",
        ),
        UniqueConstraint(
            "usuario_id",
            "conteudo_id",
            name="uq_denuncia_usuario_conteudo",
        ),
        Index("ix_denuncias_status_created_at", "status", "created_at", "id"),
    )
