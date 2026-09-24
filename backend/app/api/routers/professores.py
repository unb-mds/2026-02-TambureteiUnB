import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.schemas.professor import ProfessorDetalhe, ProfessorListaPaginada
from app.core.database import get_db
from app.repositories.professor_repo import professor_repo

router = APIRouter(prefix="/professores", tags=["Professores"])


@router.get("", response_model=ProfessorListaPaginada)
def listar_professores(
    nome: Optional[str] = Query(None, description="Busca parcial por nome"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    items, total = professor_repo.search_paginated(db, nome=nome, skip=(page - 1) * size, limit=size)
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": math.ceil(total / size) if total else 0,
    }


@router.get("/{professor_id}", response_model=ProfessorDetalhe)
def obter_professor(professor_id: int, db: Session = Depends(get_db)):
    professor = professor_repo.get_with_turmas(db, professor_id)
    if not professor:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Professor não encontrado.")
    return professor