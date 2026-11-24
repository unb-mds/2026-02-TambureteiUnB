from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.schemas.comentario import (
    ComentarioCreate,
    ComentarioResponse,
    ComentarioStatusResponse,
    ComentarioUpdate,
    ComentarioVotoResponse,
)
from app.api.schemas.denuncia import (
    DenunciaComentarioPayload,
    DenunciaCreate,
    DenunciaResponse,
)
from app.core.database import get_db
from app.models.usuario import Usuario
from app.services.comentario_service import comentario_service
from app.services.denuncia_service import denuncia_service
from app.services.moderacao_ia_service import processar_moderacao_comentario_bg

router = APIRouter(prefix="/comentarios", tags=["Comentários"])


@router.post(
    "",
    response_model=ComentarioResponse,
    status_code=status.HTTP_201_CREATED,
)
def criar_comentario(
    dados: ComentarioCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Cria um comentário em uma disciplina ou turma com triagem assíncrona.

    Acessível somente por usuários autenticados.
    O comentário é criado inicialmente com status_moderacao = 'PENDENTE'
    e submetido à triagem autônoma em segundo plano (RN06 / RF16).
    """
    comentario = comentario_service.criar_comentario(db, dados, current_user)
    background_tasks.add_task(processar_moderacao_comentario_bg, comentario.id)
    return comentario


@router.get(
    "/{comentario_id}/status",
    response_model=ComentarioStatusResponse,
)
def consultar_status_comentario(
    comentario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Consulta o status da triagem de moderação de um comentário do próprio autor."""
    return comentario_service.consultar_status_moderacao(db, comentario_id, current_user)


@router.patch(
    "/{comentario_id}",
    response_model=ComentarioResponse,
)
def editar_comentario(
    comentario_id: int,
    dados: ComentarioUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Edita o conteúdo de um comentário existente e aciona nova triagem.

    Somente o autor do comentário pode editá-lo. O comentário retorna para
    status_moderacao = 'PENDENTE' para revalidação automática (RN06).
    """
    comentario = comentario_service.editar_comentario(db, comentario_id, dados, current_user)
    background_tasks.add_task(processar_moderacao_comentario_bg, comentario.id)
    return comentario


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


@router.post(
    "/{comentario_id}/voto",
    response_model=ComentarioVotoResponse,
)
def alternar_voto_comentario(
    comentario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Alterna o voto útil (Concordo) de um estudante autenticado no comentário (RN03)."""
    return comentario_service.alternar_voto(db, comentario_id, current_user)


@router.post(
    "/{comentario_id}/denuncias",
    response_model=DenunciaResponse,
    status_code=status.HTTP_201_CREATED,
)
def denunciar_comentario(
    comentario_id: int,
    dados: DenunciaComentarioPayload,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Registra uma denúncia da comunidade para um comentário (RN04)."""
    payload = DenunciaCreate(
        comentario_id=comentario_id,
        categoria=dados.categoria,
        motivo=dados.motivo,
    )
    return denuncia_service.criar(db, payload, current_user)
