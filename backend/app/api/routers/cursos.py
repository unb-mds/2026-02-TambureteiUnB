from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.api.schemas.curso import CursoResumo, CursoResponse, CursoGradeResponse
from app.core.database import get_db
from app.core.rate_limit import rate_limit
from app.services.curso_service import curso_service

router = APIRouter(prefix="/cursos", tags=["Cursos"])


@router.get(
    "",
    response_model=list[CursoResumo],
    dependencies=[Depends(rate_limit("cursos:list", limit=60, window_seconds=60))],
)
def listar_cursos(
    response: Response,
    q: Optional[str] = Query(None, max_length=200, description="Busca por nome do curso"),
    campus: Optional[str] = Query(None, max_length=100, description="Filtro por campus"),
    apenas_ativos: bool = Query(False, description="Filtra apenas cursos com grade e matriz curricular ativa"),
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = "public, max-age=60"
    return curso_service.listar(db, q=q, campus=campus, apenas_ativos=apenas_ativos)


@router.get(
    "/{curso_id}/grade",
    response_model=CursoGradeResponse,
    dependencies=[Depends(rate_limit("cursos:detail", limit=60, window_seconds=60))],
)
def obter_grade_curso(curso_id: int, response: Response, db: Session = Depends(get_db)):
    """Consulta pública da matriz curricular do curso organizada por período (US 6.1.1)."""
    response.headers["Cache-Control"] = "public, max-age=60"
    return curso_service.obter_grade(db, curso_id)


@router.get(
    "/{slug}",
    response_model=CursoResponse,
    dependencies=[Depends(rate_limit("cursos:detail", limit=60, window_seconds=60))],
)
def obter_curso(slug: str, response: Response, db: Session = Depends(get_db)):
    response.headers["Cache-Control"] = "public, max-age=60"
    return curso_service.obter_por_slug(db, slug)
