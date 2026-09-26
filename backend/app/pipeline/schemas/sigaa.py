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
    pre_requisitos: Optional[str] = None
    co_requisitos: Optional[str] = None
    equivalencias: Optional[str] = None
    cursos: List[dict] = Field(default_factory=list)


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


class SIGAACursoVinculoClean(BaseModel):
    """Vínculo de uma disciplina com um curso específico (N:N)."""
    curso_slug: str
    periodo_sugerido: Optional[int] = None
    is_obrigatoria: bool = True
    natureza: str = "Obrigatoria"  # "Obrigatoria", "Optativa", "Complementar"


class SIGAACursoClean(BaseModel):
    """Dados cadastrais normalizados de um curso."""
    id: Optional[int] = None
    codigo_sigaa: Optional[int] = None
    codigo_mec: Optional[str] = None
    nome: str
    slug: str
    campus: str = "FCTE - Gama"
    grau: Optional[str] = "Bacharelado"
    turno: Optional[str] = "Diurno"


class SIGAADocenteClean(BaseModel):
    """Dados normalizados de docente prontos para persistência."""
    nome: str
    departamento: Optional[str] = None


class SIGAADisciplinaClean(BaseModel):
    """Dados normalizados de disciplina com slug canônico e lista de cursos vinculados."""
    codigo: str
    slug: str
    nome: str
    departamento: Optional[str] = None
    creditos: Optional[int] = None
    carga_horaria: Optional[int] = None
    ementa: Optional[str] = None
    pre_requisitos: Optional[str] = None
    co_requisitos: Optional[str] = None
    equivalencias: Optional[str] = None
    cursos: List[SIGAACursoVinculoClean] = Field(default_factory=list)


class SIGAATurmaClean(BaseModel):
    """Dados normalizados de turma prontos para carga no banco."""
    codigo_disciplina: str
    slug_disciplina: str
    codigo_turma: str
    semestre: str
    horario: Optional[str] = None
    local: Optional[str] = None
    docentes: List[str] = Field(default_factory=list)
    capacidade: Optional[int] = None
    matriculados: Optional[int] = None
    amostragem_suprimida_lgpd: bool = False
