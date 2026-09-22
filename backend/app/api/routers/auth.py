from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.schemas.usuario import UsuarioCreate, UsuarioResponse, Token, UsuarioDesativado
from app.core.security import get_password_hash, verify_password, create_access_token
from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.usuario import Usuario

router = APIRouter(prefix="/auth", tags=["Autenticação"])

@router.post("/register", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def register(usuario_in: UsuarioCreate, db: Session = Depends(get_db)):
    user_existente = db.query(Usuario).filter(Usuario.email == usuario_in.email).first()
    if user_existente:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado na plataforma.")

    senha_criptografada = get_password_hash(usuario_in.senha)

    novo_usuario = Usuario(
        email=usuario_in.email,
        nome=usuario_in.nome,
        password_hash=senha_criptografada,
        role="STUDENT"
    )

    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)

    return novo_usuario

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha inválidos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Esta conta foi desativada.")

    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}
    )

    return {"access_token": access_token, "token_type": "bearer"}

@router.delete("/me", response_model=UsuarioDesativado)
def deactivate_account(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.nome = "Usuário Excluído"
    current_user.email = f"excluido_{current_user.id}@anonimo.com"
    current_user.is_active = False

    db.commit()

    return {"detail": "Conta desativada com sucesso. Suas contribuições foram preservadas."}