from typing import Optional
from pydantic import BaseModel, ConfigDict


class ProfessorResumo(BaseModel):
    id: int
    nome: str
    departamento: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)