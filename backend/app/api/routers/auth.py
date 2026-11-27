from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.rate_limit import enforce_rate_limit, rate_limit
from app.api.schemas.usuario import (
    UsuarioCreate,
    UsuarioLogin,
    UsuarioResponse,
    Token,
    UsuarioDesativado,
    EsqueciSenhaInput,
    RedefinirSenhaInput,
    AlterarSenhaInput,
    AtualizarNomeInput,
    MensagemAuthResponse,
)
from app.core.database import get_db
from app.models.usuario import Usuario
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post(
    "/register",
    response_model=UsuarioResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(
            rate_limit(
                "auth:register",
                limit=10,
                window_seconds=15 * 60,
                message="Muitas tentativas de cadastro. Aguarde alguns minutos antes de tentar novamente.",
            )
        )
    ],
)
def register(usuario_in: UsuarioCreate, db: Session = Depends(get_db)):
    """
    Cadastra um novo usuário no sistema.
    """
    return auth_service.cadastrar_usuario(db, usuario_in)


@router.post(
    "/login",
    response_model=Token,
    dependencies=[
        Depends(
            rate_limit(
                "auth:login",
                limit=15,
                window_seconds=60,
                message="Muitas tentativas de login. Aguarde um minuto antes de tentar novamente.",
            )
        )
    ],
)
def login(login_in: UsuarioLogin, db: Session = Depends(get_db)):
    """
    Realiza o login com email e senha (JSON), retornando o Token JWT.
    """
    enforce_rate_limit(
        "auth:login:email",
        login_in.email.strip().lower(),
        limit=10,
        window_seconds=15 * 60,
        message="Muitas tentativas de login para este e-mail. Aguarde alguns minutos e tente novamente.",
    )
    return auth_service.autenticar_usuario(db, login_in)


@router.get("/me", response_model=UsuarioResponse)
def get_current_user_profile(
    current_user: Usuario = Depends(get_current_user),
):
    """
    Retorna os dados cadastrais do usuário autenticado atual.
    """
    return current_user


@router.patch(
    "/me",
    response_model=UsuarioResponse,
    dependencies=[Depends(rate_limit("auth:update_me", limit=10, window_seconds=15 * 60, by_user=True))],
)
def update_current_user_name(
    dados: AtualizarNomeInput,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Atualiza o nome do usuário autenticado atual.
    """
    return auth_service.atualizar_nome(db, current_user, dados)


@router.delete(
    "/me",
    response_model=UsuarioDesativado,
    dependencies=[Depends(rate_limit("auth:deactivate", limit=5, window_seconds=15 * 60, by_user=True))],
)
def deactivate_account(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Desativa a conta do usuário atual (LGPD / Privacy by Design).
    """
    return auth_service.desativar_conta(db, current_user)


@router.post(
    "/esqueci-senha",
    response_model=MensagemAuthResponse,
    dependencies=[
        Depends(
            rate_limit(
                "auth:forgot_password",
                limit=5,
                window_seconds=15 * 60,
                message="Muitas tentativas de recuperação de senha. Aguarde alguns minutos antes de tentar novamente.",
            )
        )
    ],
)
def esqueci_senha(dados: EsqueciSenhaInput, db: Session = Depends(get_db)):
    """
    Solicita a recuperação de senha por e-mail gerando token seguro temporário.
    """
    enforce_rate_limit(
        "auth:forgot_password:email",
        dados.email.strip().lower(),
        limit=3,
        window_seconds=15 * 60,
        message="Muitas tentativas de recuperação para este e-mail. Aguarde alguns minutos antes de tentar novamente.",
    )
    return auth_service.solicitar_recuperacao_senha(db, dados)


@router.post(
    "/redefinir-senha",
    response_model=MensagemAuthResponse,
    dependencies=[
        Depends(
            rate_limit(
                "auth:reset_password",
                limit=10,
                window_seconds=15 * 60,
                message="Muitas tentativas de redefinição de senha. Aguarde alguns minutos.",
            )
        )
    ],
)
def redefinir_senha(dados: RedefinirSenhaInput, db: Session = Depends(get_db)):
    """
    Redefine a senha do usuário com base no token recebido.
    """
    return auth_service.redefinir_senha(db, dados)


@router.post(
    "/alterar-senha",
    response_model=MensagemAuthResponse,
    dependencies=[
        Depends(
            rate_limit(
                "auth:change_password",
                limit=5,
                window_seconds=15 * 60,
                by_user=True,
                ip_ceiling=15,
                message="Muitas tentativas de alteração de senha. Aguarde alguns minutos.",
            )
        )
    ],
)
def alterar_senha(
    dados: AlterarSenhaInput,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Altera a senha do usuário autenticado no sistema.
    """
    return auth_service.alterar_senha(db, current_user, dados)
