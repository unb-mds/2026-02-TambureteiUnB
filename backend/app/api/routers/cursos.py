from fastapi import APIRouter
from typing import List
from app.api.schemas.curso import CursoResumo, CursoResponse

router = APIRouter(prefix="/cursos", tags=["Cursos"])

@router.get("", response_model=List[CursoResumo])
async def listar_cursos():
    """
    Lista todos os cursos disponíveis.
    TODO: Integrar com SQLAlchemy quando a branch de banco for mergeada.
    """

    return [
        {
            "codigo_mec": "123",
            "nome": "Engenharia de Software",
            "grau": "Bacharelado",
            "turno": "Integral",
            "slug": "engenharia-de-software"
        }
    ]

@router.get("/{slug}", response_model=CursoResponse)
async def obter_curso(slug: str):
    """
    Busca um curso específico pelo slug.
    TODO: Integrar com SQLAlchemy quando a branch de banco for mergeada.
    """

    return {
        "codigo_mec": "123",
        "nome": "Engenharia de Software",
        "campus": "Gama",
        "grau": "Bacharelado",
        "turno": "Integral",
        "slug": slug,
        "modalidade": "Presencial",
        "area_geral": "TI",
        "area_especifica": "Software"
    }
