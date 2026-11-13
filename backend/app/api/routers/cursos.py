from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.schemas.curso import CursoResumo, CursoResponse, CursoGradeResponse
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


@router.get("/{curso_id}/grade", response_model=CursoGradeResponse)
def obter_grade_curso(curso_id: int, db: Session = Depends(get_db)):
    """Consulta pública da matriz curricular do curso organizada por período (US 6.1.1)."""
    return curso_service.obter_grade(db, curso_id)


@router.get("/{slug}", response_model=CursoResponse)
def obter_curso(slug: str, db: Session = Depends(get_db)):
    return curso_service.obter_por_slug(db, slug)
