from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.schemas.curso import CursoResumo, CursoResponse
from app.core.database import get_db
from app.services.curso_service import curso_service

router = APIRouter(prefix="/cursos", tags=["Cursos"])


@router.get("", response_model=list[CursoResumo])
def listar_cursos(db: Session = Depends(get_db)):
    return curso_service.listar(db)


@router.get("/{slug}", response_model=CursoResponse)
def obter_curso(slug: str, db: Session = Depends(get_db)):
    return curso_service.obter_por_slug(db, slug)
