from pydantic import BaseModel, ConfigDict
from typing import Optional

class MetricasCurso(BaseModel):
    vagas_totais: int = 0
    inscritos_total: int = 0
    ingressantes: int = 0
    matriculados: int = 0
    concluintes: int = 0
    trancados: int = 0
    desvinculados: int = 0

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
    metricas_2024: Optional[MetricasCurso] = None

class CursoResumo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
   
    codigo_mec: str | None = None
    nome: str
    grau: str | None = None
    turno: str | None = None
    slug: str
