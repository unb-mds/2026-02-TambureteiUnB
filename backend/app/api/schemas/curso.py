from pydantic import BaseModel
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
  
    codigo_mec: str
    nome: str
    campus: str
    grau: str
    turno: str
    slug: str
    modalidade: str
    area_geral: str
    area_especifica: str
    metricas_2024: Optional[MetricasCurso] = None

class CursoResumo(BaseModel):
   
    codigo_mec: str
    nome: str
    grau: str
    turno: str
    slug: str
