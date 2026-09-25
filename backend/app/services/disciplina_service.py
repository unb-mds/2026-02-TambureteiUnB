import math
from typing import Optional
from sqlalchemy.orm import Session

from app.repositories.disciplina_repo import disciplina_repo


class DisciplinaService:
    def listar_catalogo(
        self,
        db: Session,
        nome: Optional[str],
        codigo: Optional[str],
        departamento: Optional[str],
        page: int,
        size: int,
    ) -> dict:
        items, total = disciplina_repo.search_paginated(
            db,
            nome=nome,
            codigo=codigo,
            departamento=departamento,
            skip=(page - 1) * size,
            limit=size,
        )
        return {
            "items": items,
            "total": total,
            "page": page,
            "size": size,
            "pages": math.ceil(total / size) if total else 0,
        }


disciplina_service = DisciplinaService()