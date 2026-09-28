import math
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.comentario import Comentario
from app.repositories.base import BaseRepository


class ComentarioRepository(BaseRepository[Comentario]):
    def __init__(self):
        super().__init__(Comentario)

    def listar_por_disciplina_paginado(
        self,
        db: Session,
        disciplina_id: int,
        turma_id: Optional[int],
        page: int,
        size: int,
    ) -> Tuple[List[Comentario], int]:
        query = (
            db.query(Comentario)
            .filter(
                Comentario.disciplina_id == disciplina_id,
                Comentario.status_moderacao == "PUBLICADO",
            )
        )

        if turma_id is not None:
            query = query.filter(Comentario.turma_id == turma_id)

        total = query.count()
        items = (
            query.order_by(Comentario.created_at.desc())
            .offset((page - 1) * size)
            .limit(size)
            .all()
        )
        return items, total

    def update(self, db: Session, comentario: Comentario) -> Comentario:
        db.commit()
        db.refresh(comentario)
        return comentario

    def delete(self, db: Session, comentario: Comentario) -> None:
        db.delete(comentario)
        db.commit()

    def get_by_disciplina(self, db: Session, disciplina_id: int) -> List[Comentario]:
        return (
            db.query(Comentario)
            .filter(Comentario.disciplina_id == disciplina_id)
            .order_by(Comentario.created_at.desc())
            .all()
        )

    def get_by_turma(self, db: Session, turma_id: int) -> List[Comentario]:
        return (
            db.query(Comentario)
            .filter(Comentario.turma_id == turma_id)
            .order_by(Comentario.created_at.desc())
            .all()
        )


comentario_repo = ComentarioRepository()
