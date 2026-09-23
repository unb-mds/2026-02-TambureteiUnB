from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.api.schemas.usuario import UsuarioCreate, UsuarioLogin
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.usuario import Usuario
from app.repositories.usuario_repo import usuario_repo

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
            "token_type": "bearer"
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

auth_service = AuthService()
