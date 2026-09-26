from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.schemas.professor import ProfessorDetalhe, ProfessorListaPaginada
from app.core.database import get_db
from app.services.professor_service import professor_service

router = APIRouter(prefix="/professores", tags=["Professores"])


@router.get("", response_model=ProfessorListaPaginada)
def listar_professores(
    nome: Optional[str] = Query(None, description="Busca parcial por nome"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return professor_service.listar_paginado(db, nome, page, size)


@router.get("/{professor_id}", response_model=ProfessorDetalhe)
def obter_professor(professor_id: int, db: Session = Depends(get_db)):
    return professor_service.obter_com_turmas(db, professor_id)