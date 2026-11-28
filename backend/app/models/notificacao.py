from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Notificacao(Base):
    __tablename__ = "notificacoes"

    id = Column(BigInteger, primary_key=True, index=True)
    usuario_id = Column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tipo = Column(String(40), nullable=False)
    titulo = Column(String(200), nullable=False)
    mensagem = Column(Text, nullable=False)
    link = Column(String(300), nullable=True)
    lida = Column(Boolean, default=False, server_default="false", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_notificacoes_usuario_lida_created", "usuario_id", "lida", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<Notificacao(id={self.id}, usuario_id={self.usuario_id}, tipo='{self.tipo}', lida={self.lida})>"
