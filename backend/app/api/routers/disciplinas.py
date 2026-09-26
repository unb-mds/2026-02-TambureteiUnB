from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from sqlalchemy.orm import Session
from app.api.schemas.disciplina import DisciplinaResumo, DisciplinaResponse
from app.api.schemas.comentario import ComentarioListaPaginada
from app.core.database import get_db
from app.services.comentario_service import comentario_service

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


# ── US 5.1.2 — Listagem de comentários de uma cadeira ────────────────
@router.get(
    "/{disciplina_id}/comentarios",
    response_model=ComentarioListaPaginada,
)
def listar_comentarios_cadeira(
    disciplina_id: int,
    turma_id: Optional[int] = Query(None, description="Filtrar por turma específica"),
    page: int = Query(1, ge=1, description="Número da página"),
    size: int = Query(20, ge=1, le=100, description="Itens por página"),
    db: Session = Depends(get_db),
):
    """Lista comentários ativos de uma cadeira, com paginação e filtro por turma.

    Retorna lista vazia (HTTP 200) se não houver comentários.
    """
    return comentario_service.listar_comentarios(db, disciplina_id, turma_id, page, size)
