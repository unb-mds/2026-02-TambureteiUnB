import math
from typing import Dict, List, Optional, Set, Tuple
from uuid import UUID

from sqlalchemy import or_
from sqlalchemy.orm import Session, aliased

from app.models.comentario import Comentario
from app.repositories.base import BaseRepository
from app.repositories.voto_repo import (
    alternar_voto_target,
    contar_votos_por_target,
    listar_votos_usuario_por_target,
)


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
        ParentComentario = aliased(Comentario)
        query = (
            db.query(Comentario)
            .outerjoin(ParentComentario, Comentario.parent_id == ParentComentario.id)
            .filter(
                Comentario.disciplina_id == disciplina_id,
                Comentario.status_moderacao == "PUBLICADO",
                or_(
                    Comentario.parent_id.is_(None),
                    ParentComentario.status_moderacao == "PUBLICADO",
                ),
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

    def ocultar_descendentes(
        self,
        db: Session,
        comentario_pai_id: int,
        moderado_por: Optional[str] = None,
        motivo: str = "Comentário pai removido pela moderação.",
    ) -> int:
        """Oculta em cascata todos os subcomentários descendentes de um comentário removido."""
        ocultados = 0
        pais_atuais = [comentario_pai_id]
        while pais_atuais:
            filhos = (
                db.query(Comentario)
                .filter(Comentario.parent_id.in_(pais_atuais))
                .all()
            )
            if not filhos:
                break
            proximos_pais = []
            for filho in filhos:
                if filho.status_moderacao != "OCULTO":
                    filho.status_moderacao = "OCULTO"
                    if moderado_por and not filho.moderado_por:
                        filho.moderado_por = moderado_por
                    if not filho.motivo_moderacao:
                        filho.motivo_moderacao = motivo
                    ocultados += 1
                proximos_pais.append(filho.id)
            pais_atuais = proximos_pais
        if ocultados > 0:
            db.flush()
        return ocultados

    def contar_votos_comentarios(
        self, db: Session, comentario_ids: List[int]
    ) -> Dict[int, int]:
        return contar_votos_por_target(db, "COMENTARIO", comentario_ids)

    def listar_votos_usuario(
        self, db: Session, comentario_ids: List[int], usuario_id: UUID
    ) -> Set[int]:
        return listar_votos_usuario_por_target(db, "COMENTARIO", comentario_ids, usuario_id)

    def alternar_voto_comentario(
        self, db: Session, comentario_id: int, usuario_id: UUID
    ) -> Tuple[int, bool]:
        return alternar_voto_target(db, "COMENTARIO", comentario_id, usuario_id)


comentario_repo = ComentarioRepository()
