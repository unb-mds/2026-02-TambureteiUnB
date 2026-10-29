from datetime import datetime
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
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)