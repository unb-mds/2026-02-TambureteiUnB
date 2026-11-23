import logging
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.api.schemas.usuario import (
    UsuarioCreate,
    UsuarioLogin,
    EsqueciSenhaInput,
    RedefinirSenhaInput,
    AlterarSenhaInput,
)
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_password_reset_token,
    verify_password_reset_token,
    invalidate_password_reset_token,
)
from app.models.usuario import Usuario
from app.repositories.usuario_repo import usuario_repo
from app.services.email_service import email_service

logger = logging.getLogger(__name__)

class AuthService:
    def cadastrar_usuario(self, db: Session, dados_usuario: UsuarioCreate) -> Usuario:
        """
        Cadastra um novo estudante no sistema.
        Valida se o email já existe, criptografa a senha com bcrypt
        e persiste via repositório.
        """
        user_existente = usuario_repo.get_by_email(db, email=dados_usuario.email)
        if user_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="E-mail já cadastrado na plataforma."
            )

        senha_criptografada = get_password_hash(dados_usuario.senha)

        novo_usuario = Usuario(
            email=dados_usuario.email,
            nome=dados_usuario.nome,
            password_hash=senha_criptografada,
            role="STUDENT"
        )

        return usuario_repo.create(db, novo_usuario)

    def autenticar_usuario(self, db: Session, credenciais: UsuarioLogin) -> dict:
        """
        Autentica o usuário validando e-mail e senha.
        Gera e retorna o token JWT assinado se as credenciais forem válidas.
        """
        user = usuario_repo.get_by_email(db, email=credenciais.email)

        if not user or not verify_password(credenciais.senha, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="E-mail ou senha inválidos",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Esta conta foi desativada."
            )

        access_token = create_access_token(
            data={"sub": user.email, "role": user.role}
        )

        return {
            "access_token": access_token,
            "token_type": "bearer"  # nosec B105
        }

    def desativar_conta(self, db: Session, current_user: Usuario) -> dict:
        """
        Desativa a conta do usuário aplicando anonimização
        em estrita conformidade com a LGPD (Privacy by Design).
        """
        current_user.nome = "Usuário Excluído"
        current_user.email = f"excluido_{current_user.id}@anonimo.com"
        current_user.is_active = False

        db.commit()

        return {"detail": "Conta desativada com sucesso. Suas contribuições foram preservadas."}

    def solicitar_recuperacao_senha(self, db: Session, dados: EsqueciSenhaInput) -> dict:
        """
        Gera um token assinado de recuperação de senha com validade de 15 minutos.
        Envia e-mail de recuperação de forma assíncrona ou direta se configurado.
        Retorna mensagem amigável sem revelar se o e-mail existe na base (prevenção de enumeração).
        """
        user = usuario_repo.get_by_email(db, email=dados.email)
        token = None
        if user and user.is_active:
            token = create_password_reset_token(user.email)
            # Despacho desacoplado de e-mail via EmailService do backend
            enviado = email_service.send_password_reset_email(to_email=user.email, reset_token=token)
            if not enviado:
                logger.warning(
                    "[AuthService] Falha ou alerta ao disparar e-mail de recuperacao de senha para '%s'.",
                    user.email,
                )

        return {
            "message": "Se o e-mail informado estiver cadastrado, as instruções para redefinição foram enviadas.",
        }

    def redefinir_senha(self, db: Session, dados: RedefinirSenhaInput) -> dict:
        """
        Valida o token temporário e atualiza a senha do usuário com hash bcrypt.
        """
        email = verify_password_reset_token(dados.token)
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token de recuperação inválido ou expirado. Solicite um novo link.",
            )

        user = usuario_repo.get_by_email(db, email=email)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário associado ao token não encontrado.",
            )

        user.password_hash = get_password_hash(dados.nova_senha)
        db.commit()
        invalidate_password_reset_token(dados.token)
        email_service.send_password_change_confirmation(to_email=user.email)

        return {"message": "Senha redefinida com sucesso. Você já pode fazer login."}

    def alterar_senha(self, db: Session, current_user: Usuario, dados: AlterarSenhaInput) -> dict:
        """
        Permite a um usuário autenticado alterar sua senha mediante validação da senha atual.
        """
        if not verify_password(dados.senha_atual, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A senha atual informada está incorreta.",
            )

        if dados.senha_atual == dados.nova_senha:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A nova senha não pode ser idêntica à senha atual.",
            )

        current_user.password_hash = get_password_hash(dados.nova_senha)
        db.commit()
        email_service.send_password_change_confirmation(to_email=current_user.email)

        return {"message": "Senha alterada com sucesso."}

auth_service = AuthService()
