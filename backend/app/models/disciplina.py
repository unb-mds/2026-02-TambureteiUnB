from sqlalchemy import Column, Integer, String, Text, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Disciplina(Base):
    __tablename__ = "disciplinas"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(30), index=True, nullable=True)
    slug = Column(String(150), unique=True, index=True, nullable=False)
    nome = Column(String(150), nullable=False)
    departamento = Column(String(100), nullable=True)
    creditos = Column(Integer, nullable=True)
    carga_horaria = Column(Integer, nullable=True)
    ementa = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relacionamentos
    cursos_disciplinas = relationship("CursoDisciplina", back_populates="disciplina", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Disciplina(id={self.id}, nome='{self.nome}', slug='{self.slug}')>"
