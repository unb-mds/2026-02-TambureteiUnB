from sqlalchemy import Column, Integer, BigInteger, String, Text, ForeignKey, DateTime, func, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class Comentario(Base):
    __tablename__ = "comentarios"

    id = Column(BigInteger, primary_key=True, index=True)
    disciplina_id = Column(Integer, ForeignKey("disciplinas.id", ondelete="CASCADE"), nullable=False, index=True)
    turma_id = Column(Integer, ForeignKey("turmas.id", ondelete="SET NULL"), nullable=True, index=True)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    autor_alias = Column(String(50), default="Estudante Anônimo", nullable=False)
    topico_dificuldade = Column(String(150), nullable=True)
    conteudo = Column(Text, nullable=False)
    parent_id = Column(BigInteger, ForeignKey("comentarios.id", ondelete="CASCADE"), nullable=True, index=True)
    status_moderacao = Column(String(20), default="PUBLICADO", nullable=False) # 'PUBLICADO', 'PENDENTE', 'OCULTO'
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    disciplina = relationship("Disciplina", back_populates="comentarios")
    turma = relationship("Turma", back_populates="comentarios")
    usuario = relationship("Usuario", back_populates="comentarios")
    parent = relationship("Comentario", back_populates="respostas", remote_side=[id])
    respostas = relationship("Comentario", back_populates="parent", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("status_moderacao IN ('PUBLICADO', 'PENDENTE', 'OCULTO')", name="chk_status_moderacao"),
    )

    def __repr__(self):
        return f"<Comentario(id={self.id}, disc={self.disciplina_id}, alias='{self.autor_alias}')>"
