from fastapi import APIRouter, Depends, status
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
from app.core.rate_limit import rate_limit
from app.models.usuario import Usuario
from app.services.comentario_service import comentario_service
from app.services.denuncia_service import denuncia_service

router = APIRouter(prefix="/comentarios", tags=["Comentários"])


@router.post(
    "",
    response_model=ComentarioResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(
            rate_limit(
                "comentarios:create",
                limit=15,
                window_seconds=60,
                by_user=True,
                ip_ceiling=60,
                message="Você enviou muitos comentários em pouco tempo. Aguarde alguns segundos antes de publicar novamente.",
            )
        )
    ],
)
def criar_comentario(
    dados: ComentarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Cria um comentário em uma disciplina ou turma com publicação imediata.

    Acessível somente por usuários autenticados.
    Passa por validação determinística de dados pessoais (RN01/LGPD) e fica
    sujeito às denúncias da comunidade (ocultação automática a partir de 3 denúncias).
    """
    return comentario_service.criar_comentario(db, dados, current_user)


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
    dependencies=[Depends(rate_limit("comentarios:write", limit=15, window_seconds=60, by_user=True))],
)
def editar_comentario(
    comentario_id: int,
    dados: ComentarioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Edita o conteúdo de um comentário existente com validação LGPD (RN01).

    Somente o autor do comentário pode editá-lo.
    """
    return comentario_service.editar_comentario(db, comentario_id, dados, current_user)


@router.delete(
    "/{comentario_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(rate_limit("comentarios:write", limit=15, window_seconds=60, by_user=True))],
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
    dependencies=[Depends(rate_limit("comentarios:voto", limit=30, window_seconds=60, by_user=True))],
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
    dependencies=[
        Depends(
            rate_limit(
                "comunidade:denuncia",
                limit=10,
                window_seconds=15 * 60,
                by_user=True,
                ip_ceiling=30,
                message="Limite de denúncias atingido. Aguarde alguns minutos antes de enviar outra denúncia.",
            )
        )
    ],
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
