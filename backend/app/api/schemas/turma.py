from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.api.schemas.professor import ProfessorResumo


class TurmaCreate(BaseModel):
    disciplina_id: int
    semestre: str = Field(..., max_length=10, examples=["2026.1"])
    codigo_turma: str = Field(..., max_length=10, examples=["01"])
    professores_ids: List[int] = Field(..., min_length=1)
    horario: Optional[str] = Field(None, max_length=50)
    local: Optional[str] = Field(None, max_length=100)


class TurmaResponse(BaseModel):
    id: int
    disciplina_id: int
    semestre: str
    codigo_turma: str
    horario: Optional[str] = None
    local: Optional[str] = None
    professores: List[ProfessorResumo] = []

    model_config = ConfigDict(from_attributes=True)