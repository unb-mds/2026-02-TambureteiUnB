from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.schemas.comentario import (
    ComentarioCreate,
    ComentarioListaPaginada,
    ComentarioResponse,
    ComentarioUpdate,
)
from app.core.database import get_db
from app.models.usuario import Usuario
from app.services.comentario_service import comentario_service

router = APIRouter(prefix="/comentarios", tags=["Comentários"])


@router.post(
    "",
    response_model=ComentarioResponse,
    status_code=status.HTTP_201_CREATED,
)
def criar_comentario(
    dados: ComentarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Cria um comentário em uma disciplina ou turma.

    Acessível somente por usuários autenticados.
    O comentário é criado com status_moderacao = 'ativo'.
    """
    return comentario_service.criar_comentario(db, dados, current_user)



@router.patch(
    "/{comentario_id}",
    response_model=ComentarioResponse,
)
def editar_comentario(
    comentario_id: int,
    dados: ComentarioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Edita o conteúdo de um comentário existente.

    Somente o autor do comentário pode editá-lo.
    """
    return comentario_service.editar_comentario(db, comentario_id, dados, current_user)



@router.delete(
    "/{comentario_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def excluir_comentario(
    comentario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Exclui um comentário existente.

    Somente o autor do comentário pode excluí-lo.
    """
    comentario_service.excluir_comentario(db, comentario_id, current_user)
