from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, UniqueConstraint, Table
from sqlalchemy.orm import relationship
from app.core.database import Base

# Tabela associativa N:N entre Turma e Professor (suporta co-docência)
turmas_professores = Table(
    "turmas_professores",
    Base.metadata,
    Column("turma_id", Integer, ForeignKey("turmas.id", ondelete="CASCADE"), primary_key=True),
    Column("professor_id", Integer, ForeignKey("professores.id", ondelete="CASCADE"), primary_key=True),
)

class Turma(Base):
    __tablename__ = "turmas"

    id = Column(Integer, primary_key=True, index=True)
    disciplina_id = Column(Integer, ForeignKey("disciplinas.id", ondelete="CASCADE"), nullable=False, index=True)
    codigo_turma = Column(String(10), nullable=False)  # Ex: '01', '02', 'A'
    semestre = Column(String(10), nullable=False, index=True)  # Ex: '2026.1'
    horario = Column(String(255), nullable=True)  # Ex: '35M12', '35T23' ou descritivo
    local = Column(String(255), nullable=True)  # Ex: 'UED - Sala 102'
    capacidade = Column(Integer, nullable=True)
    matriculados = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("disciplina_id", "codigo_turma", "semestre", name="uq_disciplina_turma_semestre"),
    )

    # Relacionamentos
    disciplina = relationship("Disciplina", back_populates="turmas")
    professores = relationship("Professor", secondary=turmas_professores, back_populates="turmas")
    conteudos = relationship("Conteudo", back_populates="turma")
    comentarios = relationship("Comentario", back_populates="turma")

    def __repr__(self):
        return f"<Turma(id={self.id}, disc_id={self.disciplina_id}, codigo='{self.codigo_turma}', semestre='{self.semestre}')>"
