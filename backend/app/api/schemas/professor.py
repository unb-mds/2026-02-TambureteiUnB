from pydantic import BaseModel, ConfigDict
from typing import List, Optional


class ProfessorResumo(BaseModel):
    id: int
    nome: str
    departamento: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class DisciplinaNaTurma(BaseModel):
    id: int
    codigo: Optional[str] = None
    nome: str
    slug: str

    model_config = ConfigDict(from_attributes=True)


class TurmaDoProfessor(BaseModel):
    id: int
    codigo_turma: str
    semestre: str
    horario: Optional[str] = None
    local: Optional[str] = None
    disciplina: DisciplinaNaTurma

    model_config = ConfigDict(from_attributes=True)


class ProfessorDetalhe(ProfessorResumo):
    turmas: List[TurmaDoProfessor] = []

class ProfessorListaPaginada(BaseModel):
    items: List[ProfessorResumo]
    total: int
    page: int
    size: int
    pages: int