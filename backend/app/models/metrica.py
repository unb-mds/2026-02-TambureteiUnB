from sqlalchemy import Column, Integer, BigInteger, Numeric, Boolean, ForeignKey, DateTime, func, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base

class MetricaAcademica(Base):
    __tablename__ = "metricas_academicas"

    id = Column(BigInteger, primary_key=True, index=True)
    disciplina_id = Column(Integer, ForeignKey("disciplinas.id", ondelete="CASCADE"), nullable=False, index=True)
    ano = Column(Integer, nullable=False, index=True)
    semestre = Column(Integer, nullable=False) # 1 ou 2
    matriculados = Column(Integer, default=0, nullable=False)
    aprovados = Column(Integer, default=0, nullable=False)
    reprovados_nota = Column(Integer, default=0, nullable=False)
    reprovados_falta = Column(Integer, default=0, nullable=False)
    trancamentos = Column(Integer, default=0, nullable=False)
    taxa_aprovacao = Column(Numeric(5, 2), nullable=True)
    amostragem_suprimida_lgpd = Column(Boolean, default=False, server_default="false", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    disciplina = relationship("Disciplina", back_populates="metricas")

    __table_args__ = (
        UniqueConstraint("disciplina_id", "ano", "semestre", name="uq_disciplina_ano_semestre"),
        CheckConstraint("semestre IN (1, 2)", name="chk_semestre_valido")
    )

    def __repr__(self):
        return f"<MetricaAcademica(disciplina_id={self.disciplina_id}, ano={self.ano}, sem={self.semestre})>"


class MetricaConsolidada(Base):
    """
    Consolidação histórica agregada de desempenho da disciplina (RN07 - LGPD).
    
    Armazena o acumulado geral da matéria incluindo todas as turmas suprimidas
    por baixa amostragem (< 5 estudantes) para garantir fidedignidade estatística
    sem expor microdados individualizados.
    """
    __tablename__ = "metricas_consolidadas"

    id = Column(BigInteger, primary_key=True, index=True)
    disciplina_id = Column(Integer, ForeignKey("disciplinas.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    matriculados = Column(Integer, default=0, nullable=False)
    aprovados = Column(Integer, default=0, nullable=False)
    reprovados_nota = Column(Integer, default=0, nullable=False)
    reprovados_falta = Column(Integer, default=0, nullable=False)
    trancamentos = Column(Integer, default=0, nullable=False)
    taxa_aprovacao_acumulada = Column(Numeric(5, 2), nullable=True)
    total_turmas_suprimidas = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    disciplina = relationship("Disciplina", back_populates="metrica_consolidada")

    def __repr__(self):
        return f"<MetricaConsolidada(disciplina_id={self.disciplina_id}, matriculados={self.matriculados}, taxa={self.taxa_aprovacao_acumulada})>"

