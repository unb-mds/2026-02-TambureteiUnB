from pydantic import BaseModel
from typing import Optional

class DisciplinaResumo(BaseModel):
  
    codigo: str
    nome: str
    slug: str
    departamento: Optional[str] = None
    creditos: Optional[int] = None

class DisciplinaResponse(DisciplinaResumo):

    pass
from pydantic import BaseModel
from typing import List, Optional

class DisciplinaResumo(BaseModel):

    codigo: str
    nome: str
    slug: str
    departamento: Optional[str] = None
    creditos: Optional[int] = None

class DisciplinaResponse(DisciplinaResumo):

    pass


class DisciplinaListaPaginada(BaseModel):
    items: List[DisciplinaResumo]
    total: int
    page: int
    size: int
    pages: int
