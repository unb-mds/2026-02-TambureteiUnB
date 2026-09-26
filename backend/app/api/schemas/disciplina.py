from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional


class DisciplinaResumo(BaseModel):
    codigo: str
    nome: str
    slug: str
    departamento: Optional[str] = None
    creditos: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class CursoDisciplinaInfo(BaseModel):
    curso_nome: str
    curso_slug: str
    periodo_sugerido: Optional[int] = None
    is_obrigatoria: bool = True
    natureza: str = "Obrigatoria"

    model_config = ConfigDict(from_attributes=True)


class DisciplinaResponse(DisciplinaResumo):
    carga_horaria: Optional[int] = None
    ementa: Optional[str] = None
    pre_requisitos: Optional[str] = None
    co_requisitos: Optional[str] = None
    equivalencias: Optional[str] = None
    pre_requisitos_itens: List[DisciplinaResumo] = Field(default_factory=list)
    equivalencias_itens: List[DisciplinaResumo] = Field(default_factory=list)
    cursos: List[CursoDisciplinaInfo] = Field(default_factory=list)


class DisciplinaListaPaginada(BaseModel):
    items: List[DisciplinaResumo]
    total: int
    page: int
    size: int
    pages: int
