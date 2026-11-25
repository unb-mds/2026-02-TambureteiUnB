from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class EstatisticaConsolidadaResponse(BaseModel):
    id: int
    turma_id: int
    semestre_referencia: str
    taxa_aprovacao: float
    taxa_reprovacao_nota: float
    taxa_reprovacao_falta: float
    taxa_trancamento: float
    status: str
    total_amostras: int = 0
    origem: str = "DOACAO_QUORUM"
    qtd_ss: int = 0
    qtd_ms: int = 0
    qtd_mm: int = 0
    qtd_mi: int = 0
    qtd_ii: int = 0
    qtd_sr: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SerieHistoricaSemestre(BaseModel):
    semestre_referencia: str
    total_turmas: int
    taxa_aprovacao: float
    taxa_reprovacao_nota: float
    taxa_reprovacao_falta: float
    taxa_trancamento: float


class SerieHistoricaResponse(BaseModel):
    disciplina_id: int
    ano_inicio: Optional[int] = None
    ano_fim: Optional[int] = None
    semestres: List[SerieHistoricaSemestre]
