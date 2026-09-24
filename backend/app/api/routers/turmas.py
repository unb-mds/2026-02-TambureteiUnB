from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.api.schemas.turma import TurmaCreate, TurmaResponse
from app.core.database import get_db
from app.models.turma import Turma
from app.repositories.disciplina_repo import disciplina_repo
from app.repositories.professor_repo import professor_repo
from app.repositories.turma_repo import turma_repo

router = APIRouter(prefix="/turmas", tags=["Turmas"])


@router.post("", response_model=TurmaResponse, status_code=status.HTTP_201_CREATED)
def criar_turma(
    dados: TurmaCreate,
    db: Session = Depends(get_db),
    _admin=Depends(require_role("ADMIN")),
):
    """Cadastra uma turma vinculada a uma disciplina e a um ou mais professores (somente ADMIN)."""
    disciplina = disciplina_repo.get_by_id(db, dados.disciplina_id)
    if not disciplina:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Disciplina não encontrada.")

    ids = list(set(dados.professores_ids))
    professores = professor_repo.get_by_ids(db, ids)
    if len(professores) != len(ids):
        faltando = sorted(set(ids) - {p.id for p in professores})
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail=f"Professor(es) não encontrado(s): {faltando}",
        )

    if turma_repo.get_duplicada(db, dados.disciplina_id, dados.codigo_turma, dados.semestre):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="Já existe uma turma com esse código nessa disciplina e semestre.",
        )

    turma = Turma(
        disciplina_id=dados.disciplina_id,
        semestre=dados.semestre,
        codigo_turma=dados.codigo_turma,
        horario=dados.horario,
        local=dados.local,
        professores=professores,
    )
    return turma_repo.create(db, turma)


@router.get("", response_model=List[TurmaResponse])
def listar_turmas_da_disciplina(
    disciplina_id: int = Query(..., description="ID da disciplina"),
    semestre: Optional[str] = Query(None, description="Ex.: 2026.1"),
    db: Session = Depends(get_db),
):
    """Lista as turmas de uma disciplina, com filtro opcional de semestre."""
    if not disciplina_repo.get_by_id(db, disciplina_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Disciplina não encontrada.")
    return turma_repo.get_by_disciplina(db, disciplina_id, semestre)


@router.get("/{turma_id}", response_model=TurmaResponse)
def obter_turma(turma_id: int, db: Session = Depends(get_db)):
    turma = turma_repo.get_turma_com_professores(db, turma_id)
    if not turma:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Turma não encontrada.")
    return turma