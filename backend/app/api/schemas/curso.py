from pydantic import BaseModel, ConfigDict
from typing import Optional

class MetricasCurso(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ano: int = 2024
    vagas_totais: int = 0
    inscritos_total: int = 0
    ingressantes: int = 0
    matriculados: int = 0
    concluintes: int = 0
    trancados: int = 0
    desvinculados: int = 0
    taxa_sucesso: Optional[float] = None
    taxa_evasao: Optional[float] = None

class CursoGradeDisciplina(BaseModel):
    codigo: Optional[str] = None
    nome: str
    slug: str
    departamento: Optional[str] = None
    creditos: Optional[int] = None
    carga_horaria: Optional[int] = None
    periodo_sugerido: Optional[int] = None
    is_obrigatoria: bool = True
    natureza: str = "Obrigatoria"

    model_config = ConfigDict(from_attributes=True)

class CursoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
  
    codigo_mec: str | None = None
    nome: str
    campus: str
    grau: str | None = None
    turno: str | None = None
    slug: str
    modalidade: str | None = None
    area_geral: str | None = None
    area_especifica: str | None = None
    total_disciplinas: int = 0
    metricas_2024: Optional[MetricasCurso] = None
    metricas_recentes: Optional[MetricasCurso] = None
    disciplinas: list[CursoGradeDisciplina] = []

class CursoResumo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
   
    codigo_mec: str | None = None
    nome: str
    campus: Optional[str] = None
    grau: str | None = None
    turno: str | None = None
    slug: str
    modalidade: str | None = None
    area_geral: str | None = None
    area_especifica: str | None = None
    total_disciplinas: int = 0
    metricas_2024: Optional[MetricasCurso] = None
    metricas_recentes: Optional[MetricasCurso] = None
