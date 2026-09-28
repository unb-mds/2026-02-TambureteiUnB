from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.api.schemas.turma import TurmaCreate, TurmaResponse
from app.core.database import get_db
from app.services.turma_service import turma_service

router = APIRouter(prefix="/turmas", tags=["Turmas"])


@router.post("", response_model=TurmaResponse, status_code=status.HTTP_201_CREATED)
def criar_turma(
    dados: TurmaCreate,
    db: Session = Depends(get_db),
    _admin=Depends(require_role("ADMIN")),
):
    return turma_service.criar_turma(db, dados)

@router.get("", response_model=List[TurmaResponse])
def listar_turmas_da_disciplina(
    disciplina_id: int = Query(..., description="ID da disciplina"),
    semestre: Optional[str] = Query(None, description="Ex.: 2026.1"),
    db: Session = Depends(get_db),
):
    return turma_service.listar_por_disciplina(db, disciplina_id, semestre)


@router.get("/{turma_id}", response_model=TurmaResponse)
def obter_turma(turma_id: int, db: Session = Depends(get_db)):
    return turma_service.obter_por_id(db, turma_id)