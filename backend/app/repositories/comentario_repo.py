import math
from typing import Dict, List, Optional, Set, Tuple
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.comentario import Comentario
from app.models.voto import VotoUtil
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
        topico: Optional[str] = None,
        apenas_dificuldades: bool = False,
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

        if apenas_dificuldades:
            query = query.filter(
                Comentario.topico_dificuldade.isnot(None),
                Comentario.topico_dificuldade != "",
            )

        if topico:
            query = query.filter(Comentario.topico_dificuldade.ilike(f"%{topico.strip()}%"))

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

    def contar_votos_comentarios(
        self, db: Session, comentario_ids: List[int]
    ) -> Dict[int, int]:
        if not comentario_ids:
            return {}
        rows = (
            db.query(VotoUtil.target_id, func.count(VotoUtil.id))
            .filter(
                VotoUtil.target_type == "COMENTARIO",
                VotoUtil.target_id.in_(comentario_ids),
            )
            .group_by(VotoUtil.target_id)
            .all()
        )
        return {int(target_id): int(total) for target_id, total in rows}

    def listar_votos_usuario(
        self, db: Session, comentario_ids: List[int], usuario_id: UUID
    ) -> Set[int]:
        if not comentario_ids:
            return set()
        rows = (
            db.query(VotoUtil.target_id)
            .filter(
                VotoUtil.target_type == "COMENTARIO",
                VotoUtil.usuario_id == usuario_id,
                VotoUtil.target_id.in_(comentario_ids),
            )
            .all()
        )
        return {int(row[0]) for row in rows}

    def alternar_voto_comentario(
        self, db: Session, comentario_id: int, usuario_id: UUID
    ) -> Tuple[int, bool]:
        existente = (
            db.query(VotoUtil)
            .filter(
                VotoUtil.target_type == "COMENTARIO",
                VotoUtil.target_id == comentario_id,
                VotoUtil.usuario_id == usuario_id,
            )
            .first()
        )
        if existente is not None:
            db.delete(existente)
            liked_by_me = False
        else:
            db.add(
                VotoUtil(
                    usuario_id=usuario_id,
                    target_type="COMENTARIO",
                    target_id=comentario_id,
                )
            )
            liked_by_me = True
        db.commit()
        total = (
            db.query(func.count(VotoUtil.id))
            .filter(
                VotoUtil.target_type == "COMENTARIO",
                VotoUtil.target_id == comentario_id,
            )
            .scalar()
        )
        return int(total or 0), liked_by_me


comentario_repo = ComentarioRepository()
