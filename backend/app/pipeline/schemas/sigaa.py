from typing import Optional, List
from pydantic import BaseModel, Field


class SIGAADocenteRaw(BaseModel):
    """Dados brutos de docente extraídos do SIGAA / Dados Abertos."""
    nome: str
    departamento: Optional[str] = None


class SIGAADisciplinaRaw(BaseModel):
    """Dados brutos de disciplina extraídos do SIGAA."""
    codigo: str
    nome: str
    departamento: Optional[str] = None
    creditos: Optional[int] = None
    carga_horaria: Optional[int] = None
    ementa: Optional[str] = None


class SIGAATurmaRaw(BaseModel):
    """Dados brutos de turma ofertada extraídos do SIGAA."""
    codigo_disciplina: str
    nome_disciplina: str
    codigo_turma: str
    semestre: str  # Ex: "2026.1"
    horario: Optional[str] = None
    local: Optional[str] = None
    docentes: List[str] = Field(default_factory=list)
    capacidade: Optional[int] = None
    matriculados: Optional[int] = None


class SIGAADocenteClean(BaseModel):
    """Dados normalizados de docente prontos para persistência."""
    nome: str
    departamento: Optional[str] = None


class SIGAADisciplinaClean(BaseModel):
    """Dados normalizados de disciplina com slug canônico."""
    codigo: str
    slug: str
    nome: str
    departamento: Optional[str] = None
    creditos: Optional[int] = None
    carga_horaria: Optional[int] = None
    ementa: Optional[str] = None


class SIGAATurmaClean(BaseModel):
    """Dados normalizados de turma prontos para carga no banco."""
    codigo_disciplina: str
    slug_disciplina: str
    codigo_turma: str
    semestre: str
    horario: Optional[str] = None
    local: Optional[str] = None
    docentes: List[str] = Field(default_factory=list)
    matriculados: Optional[int] = None
