from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, func, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base

class Curso(Base):
    __tablename__ = "cursos"

    id = Column(Integer, primary_key=True, index=True)
    codigo_mec = Column(String(20), unique=True, index=True, nullable=True)
    nome = Column(String(150), nullable=False)
    campus = Column(String(100), default="FCTE - Gama", nullable=False)
    grau = Column(String(50), default="Bacharelado", nullable=True)
    turno = Column(String(50), default="Diurno", nullable=True)
    slug = Column(String(150), unique=True, index=True, nullable=False)
    modalidade = Column(String(50), nullable=True)
    area_geral = Column(String(100), nullable=True)
    area_especifica = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relacionamentos
    curso_disciplinas = relationship("CursoDisciplina", back_populates="curso", cascade="all, delete-orphan")
    metricas = relationship("MetricaCurso", back_populates="curso", cascade="all, delete-orphan")

    @property
    def metricas_2024(self):
        if self.metricas:
            for m in self.metricas:
                if m.ano == 2024:
                    return m
        return None

    @property
    def disciplinas(self):
        items = []
        if self.curso_disciplinas:
            ordenadas = sorted(
                self.curso_disciplinas,
                key=lambda x: (
                    x.periodo_sugerido if x.periodo_sugerido is not None else 99,
                    x.disciplina.nome if x.disciplina else "",
                ),
            )
            for cd in ordenadas:
                if cd.disciplina:
                    items.append({
                        "codigo": cd.disciplina.codigo,
                        "nome": cd.disciplina.nome,
                        "slug": cd.disciplina.slug,
                        "departamento": cd.disciplina.departamento,
                        "creditos": cd.disciplina.creditos,
                        "carga_horaria": cd.disciplina.carga_horaria,
                        "periodo_sugerido": cd.periodo_sugerido,
                        "is_obrigatoria": cd.is_obrigatoria,
                        "natureza": cd.natureza or ("Obrigatoria" if cd.is_obrigatoria else "Optativa"),
                    })
        return items

    def __repr__(self):
        return f"<Curso(id={self.id}, nome='{self.nome}', slug='{self.slug}')>"


class CursoDisciplina(Base):
    __tablename__ = "cursos_disciplinas"

    id = Column(Integer, primary_key=True, index=True)
    curso_id = Column(Integer, ForeignKey("cursos.id", ondelete="CASCADE"), nullable=False, index=True)
    disciplina_id = Column(Integer, ForeignKey("disciplinas.id", ondelete="CASCADE"), nullable=False, index=True)
    periodo_sugerido = Column(Integer, nullable=True) # 1, 2, 3...
    is_obrigatoria = Column(Boolean, default=True, nullable=False)
    natureza = Column(String(50), default="Obrigatoria", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    curso = relationship("Curso", back_populates="curso_disciplinas")
    disciplina = relationship("Disciplina", back_populates="cursos_disciplinas")

    __table_args__ = (
        UniqueConstraint("curso_id", "disciplina_id", name="uq_curso_disciplina"),
    )
