from fastapi import APIRouter
from typing import List, Optional
from app.api.schemas.disciplina import DisciplinaResumo, DisciplinaResponse

router = APIRouter(prefix="/cadeiras", tags=["Cadeiras (Disciplinas)"])

@router.get("", response_model=List[DisciplinaResumo])
async def listar_disciplinas(
    q: Optional[str] = None,
    departamento: Optional[str] = None
):
    """
    Catálogo e Busca de Cadeiras (RF04).
    Permite busca por nome/código (q) e filtro por departamento.
    TODO: Integrar com SQLAlchemy repository.
    """
    return [
        {
            "codigo": "FGA0168",
            "nome": "Métodos de Desenvolvimento de Software",
            "slug": "fga0168-metodos-de-desenvolvimento-de-software",
            "departamento": "FCTE",
            "creditos": 4
        }
    ]

@router.get("/{slug}", response_model=DisciplinaResponse)
async def obter_disciplina(slug: str):
    """
    Página individual da Cadeira (Hub Colaborativo - RF07/RF08).
    TODO: Integrar com SQLAlchemy repository.
    """
    return {
        "codigo": "FGA0168",
        "nome": "Métodos de Desenvolvimento de Software",
        "slug": slug,
        "departamento": "FCTE",
        "creditos": 4
    }
