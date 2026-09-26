from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.schemas.disciplina import DisciplinaResponse, DisciplinaResumo
from app.core.database import get_db
from app.services.disciplina_service import disciplina_service

router = APIRouter(prefix="/cadeiras", tags=["Cadeiras (Disciplinas)"])


@router.get("", response_model=List[DisciplinaResumo])
def listar_disciplinas(
    q: Optional[str] = Query(None, description="Busca por nome da disciplina"),
    codigo: Optional[str] = Query(None, description="Busca por código da disciplina"),
    departamento: Optional[str] = Query(None, description="Filtro por departamento"),
    db: Session = Depends(get_db),
):
    """
    Catálogo e Busca de Cadeiras (RF04).
    Permite busca por nome/código e filtro por departamento.
    """
    return disciplina_service.listar(
        db,
        nome=q,
        codigo=codigo,
        departamento=departamento,
    )


@router.get("/{slug}", response_model=DisciplinaResponse)
def obter_disciplina(slug: str, db: Session = Depends(get_db)):
    """
    Página individual da Cadeira (Hub Colaborativo - RF07/RF08).
    Retorna dados da disciplina, ementa, pré-requisitos, equivalências
    e lista de itens resolvidos com seus respectivos slugs para navegação direta.
    """
    return disciplina_service.obter_por_slug(db, slug)
