from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.schemas.curso import CursoResumo, CursoResponse
from app.core.database import get_db
from app.services.curso_service import curso_service

router = APIRouter(prefix="/cursos", tags=["Cursos"])


@router.get("", response_model=list[CursoResumo])
def listar_cursos(
    q: Optional[str] = Query(None, description="Busca por nome do curso"),
    campus: Optional[str] = Query(None, description="Filtro por campus"),
    db: Session = Depends(get_db),
):
    return curso_service.listar(db, q=q, campus=campus)


@router.get("/{slug}", response_model=CursoResponse)
def obter_curso(slug: str, db: Session = Depends(get_db)):
    return curso_service.obter_por_slug(db, slug)
