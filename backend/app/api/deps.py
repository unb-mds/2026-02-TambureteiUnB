from typing import List, Union
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.core.security import SECRET_KEY, ALGORITHM
from app.core.database import get_db
from app.models.usuario import Usuario
from app.repositories.usuario_repo import usuario_repo

# Extrai o header Authorization: Bearer <token>
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido ou expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Busca via repositório mantendo a arquitetura limpa
    user = usuario_repo.get_by_email(db, email=email)
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta conta foi desativada.",
        )

    return user


def require_role(*roles_permitidos: str):
    """
    Dependency para autorização baseada em perfil (RBAC).
    Permite passar um ou múltiplos perfis, por exemplo:
    Depends(require_role("ADMIN")) ou Depends(require_role("ADMIN", "MODERATOR"))
    """
    def role_checker(current_user: Usuario = Depends(get_current_user)) -> Usuario:
        if current_user.role not in roles_permitidos:
            perfis = ", ".join(roles_permitidos)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acesso negado. Perfil necessário: {perfis}."
            )
        return current_user

    return role_checker