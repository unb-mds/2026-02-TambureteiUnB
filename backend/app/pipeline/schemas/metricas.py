from typing import Optional
from decimal import Decimal
from pydantic import BaseModel, Field


class MetricaAcademicaRaw(BaseModel):
    """Dados brutos de métricas agregadas extraídos do DPO/INEP/LAI."""
    codigo_disciplina: str
    nome_disciplina: Optional[str] = None
    ano: int
    semestre: int
    matriculados: int
    aprovados: int
    reprovados_nota: int = 0
    reprovados_falta: int = 0
    trancamentos: int = 0


class MetricaAcademicaClean(BaseModel):
    """Dados higienizados e agregados de métricas com taxas computadas."""
    disciplina_id: Optional[int] = None
    codigo_disciplina: str
    slug_disciplina: str
    ano: int
    semestre: int
    matriculados: int
    aprovados: int
    reprovados_nota: int
    reprovados_falta: int
    trancamentos: int
    taxa_aprovacao: Optional[Decimal] = Field(default=None, decimal_places=2, max_digits=5)
    amostragem_suprimida_lgpd: bool = False
