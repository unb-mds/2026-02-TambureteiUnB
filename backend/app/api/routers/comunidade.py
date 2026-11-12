from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.schemas.denuncia import DenunciaCreate, DenunciaResponse
from app.core.database import get_db
from app.models.usuario import Usuario
from app.services.denuncia_service import denuncia_service

router = APIRouter(prefix="/comunidade", tags=["Comunidade"])
Banco = Annotated[Session, Depends(get_db)]
Autenticado = Annotated[Usuario, Depends(get_current_user)]


@router.post(
    "/denuncias",
    response_model=DenunciaResponse,
    status_code=status.HTTP_201_CREATED,
)
def criar_denuncia(
    dados: DenunciaCreate,
    db: Banco,
    current_user: Autenticado,
) -> DenunciaResponse:
    return denuncia_service.criar(db, dados, current_user)
