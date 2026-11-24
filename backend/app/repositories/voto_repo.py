from typing import Dict, List, Set, Tuple
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.voto import VotoUtil


def contar_votos_por_target(
    db: Session, target_type: str, target_ids: List[int]
) -> Dict[int, int]:
    """Conta votos úteis agrupados por target_id para o target_type informado."""
    if not target_ids:
        return {}
    rows = (
        db.query(VotoUtil.target_id, func.count(VotoUtil.id))
        .filter(
            VotoUtil.target_type == target_type,
            VotoUtil.target_id.in_(target_ids),
        )
        .group_by(VotoUtil.target_id)
        .all()
    )
    return {int(target_id): int(total) for target_id, total in rows}


def listar_votos_usuario_por_target(
    db: Session, target_type: str, target_ids: List[int], usuario_id: UUID
) -> Set[int]:
    """Retorna os target_ids já votados pelo usuário autenticado."""
    if not target_ids:
        return set()
    rows = (
        db.query(VotoUtil.target_id)
        .filter(
            VotoUtil.target_type == target_type,
            VotoUtil.usuario_id == usuario_id,
            VotoUtil.target_id.in_(target_ids),
        )
        .all()
    )
    return {int(row[0]) for row in rows}


def alternar_voto_target(
    db: Session, target_type: str, target_id: int, usuario_id: UUID
) -> Tuple[int, bool]:
    """Adiciona ou remove o voto útil do usuário e retorna (total, liked_by_me)."""
    existente = (
        db.query(VotoUtil)
        .filter(
            VotoUtil.target_type == target_type,
            VotoUtil.target_id == target_id,
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
                target_type=target_type,
                target_id=target_id,
            )
        )
        liked_by_me = True
    db.commit()
    total = (
        db.query(func.count(VotoUtil.id))
        .filter(
            VotoUtil.target_type == target_type,
            VotoUtil.target_id == target_id,
        )
        .scalar()
    )
    return int(total or 0), liked_by_me
