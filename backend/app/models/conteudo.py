from sqlalchemy import Column, Integer, BigInteger, String, Text, ForeignKey, DateTime, func, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class Conteudo(Base):
    __tablename__ = "conteudos"

    id = Column(BigInteger, primary_key=True, index=True)
    disciplina_id = Column(Integer, ForeignKey("disciplinas.id", ondelete="CASCADE"), nullable=False, index=True)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, index=True)
    titulo = Column(String(200), nullable=False)
    descricao = Column(Text, nullable=True)
    tipo = Column(String(30), nullable=False, index=True)
    url_origem = Column(Text, nullable=False)
    semestre = Column(String(10), nullable=True)
    status_curadoria = Column(String(20), default="PENDENTE", nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    disciplina = relationship("Disciplina", back_populates="conteudos")
    usuario = relationship("Usuario", back_populates="conteudos")

    __table_args__ = (
        CheckConstraint("tipo IN ('LINK_UTIL', 'RESUMO', 'PROVA_ANTIGA', 'DICA')", name="chk_tipo_conteudo"),
        CheckConstraint("status_curadoria IN ('PENDENTE', 'APROVADO', 'RECUSADO')", name="chk_status_curadoria")
    )

    def __repr__(self):
        return f"<Conteudo(id={self.id}, titulo='{self.titulo}', tipo='{self.tipo}')>"
