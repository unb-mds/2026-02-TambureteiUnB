from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.schemas.usuario import (
    UsuarioCreate,
    UsuarioLogin,
    UsuarioResponse,
    Token,
    UsuarioDesativado,
)
from app.core.database import get_db
from app.models.usuario import Usuario
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/register", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def register(usuario_in: UsuarioCreate, db: Session = Depends(get_db)):
    """
    Cadastra um novo usuário no sistema.
    """
    return auth_service.cadastrar_usuario(db, usuario_in)


@router.post("/login", response_model=Token)
def login(login_in: UsuarioLogin, db: Session = Depends(get_db)):
    """
    Realiza o login com email e senha (JSON), retornando o Token JWT.
    """
    return auth_service.autenticar_usuario(db, login_in)


@router.delete("/me", response_model=UsuarioDesativado)
def deactivate_account(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Desativa a conta do usuário atual (LGPD / Privacy by Design).
    """
    return auth_service.desativar_conta(db, current_user)