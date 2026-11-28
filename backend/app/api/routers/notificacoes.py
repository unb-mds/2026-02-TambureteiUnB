from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.schemas.notificacao import (
    ListaNotificacoesResponse,
    MarcarTodasLidasResponse,
    NotificacaoResponse,
)
from app.core.database import get_db
from app.core.rate_limit import rate_limit
from app.models.usuario import Usuario
from app.services.notificacao_service import notificacao_service

router = APIRouter(prefix="/notificacoes", tags=["Notificações"])


@router.get(
    "",
    response_model=ListaNotificacoesResponse,
    dependencies=[Depends(rate_limit("notificacoes:list", limit=90, window_seconds=60, by_user=True))],
)
def listar_notificacoes(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
    limite: Annotated[int, Query(ge=1, le=50)] = 30,
) -> ListaNotificacoesResponse:
    """Lista as notificações mais recentes do usuário autenticado e o total de não lidas."""
    return notificacao_service.listar(db, current_user.id, limite=limite)


@router.patch(
    "/{id}/lida",
    response_model=NotificacaoResponse,
    dependencies=[Depends(rate_limit("notificacoes:write", limit=60, window_seconds=60, by_user=True))],
)
def marcar_notificacao_lida(
    id: Annotated[int, Path(gt=0)],
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
) -> NotificacaoResponse:
    """Marca uma notificação do usuário autenticado como lida."""
    return notificacao_service.marcar_lida(db, id, current_user.id)


@router.post(
    "/ler-todas",
    response_model=MarcarTodasLidasResponse,
    dependencies=[Depends(rate_limit("notificacoes:write", limit=30, window_seconds=60, by_user=True))],
)
def marcar_todas_notificacoes_lidas(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
) -> MarcarTodasLidasResponse:
    """Marca todas as notificações não lidas do usuário autenticado como lidas."""
    return notificacao_service.marcar_todas_lidas(db, current_user.id)
