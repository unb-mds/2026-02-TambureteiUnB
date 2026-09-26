import math
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.professor import Professor
from app.repositories.professor_repo import professor_repo


class ProfessorService:
    def listar_paginado(self, db: Session, nome: Optional[str], page: int, size: int) -> dict:
        items, total = professor_repo.search_paginated(db, nome=nome, skip=(page - 1) * size, limit=size)
        return {
            "items": items,
            "total": total,
            "page": page,
            "size": size,
            "pages": math.ceil(total / size) if total else 0,
        }

    def obter_com_turmas(self, db: Session, professor_id: int) -> Professor:
        professor = professor_repo.get_with_turmas(db, professor_id)
        if not professor:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Professor não encontrado.")
        return professor


professor_service = ProfessorService()