from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.curso import Curso
from app.repositories.curso_repo import curso_repo


class CursoService:
    def listar(self, db: Session) -> list[Curso]:
        return curso_repo.listar(db)

    def obter_por_slug(self, db: Session, slug: str) -> Curso:
        curso = curso_repo.get_by_slug(db, slug)
        if curso is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Curso não encontrado.")
        return curso


curso_service = CursoService()
