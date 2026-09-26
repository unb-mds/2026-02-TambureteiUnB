from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Professor(Base):
    __tablename__ = "professores"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(150), nullable=False, index=True)
    departamento = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relacionamento N:N com Turmas através de turmas_professores
    turmas = relationship("Turma", secondary="turmas_professores", back_populates="professores")

    def __repr__(self):
        return f"<Professor(id={self.id}, nome='{self.nome}', depto='{self.departamento}')>"
