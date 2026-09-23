import re
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator



class UsuarioCreate(BaseModel):
    nome: str = Field(
        ...,
        min_length=3,
        max_length=100,
        description="Nome do estudante",
        examples=["Aluno da Silva"]
    )
    email: EmailStr = Field(
        ...,
        max_length=150,
        description="E-mail do estudante",
        examples=["aluno@aluno.unb.br"]
    )
    senha: str = Field(
        ...,
        min_length=8,
        max_length=72,
        description="Senha com no mínimo 8 caracteres (maiúscula, minúscula, número e caractere especial)",
        examples=["SenhaForte123!"]
    )

    @field_validator("nome")
    @classmethod
    def validar_nome(cls, v: str) -> str:
        v = " ".join(v.split())
        if len(v) < 3:
            raise ValueError("O nome deve ter no mínimo 3 caracteres.")
        if not re.match(r"^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$", v):
            raise ValueError("O nome deve conter apenas letras e espaços.")
        return v

    @field_validator("email")
    @classmethod
    def normalizar_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("senha")
    @classmethod
    def validar_complexidade_senha(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("A senha deve conter pelo menos uma letra maiúscula.")
        if not re.search(r"[a-z]", v):
            raise ValueError("A senha deve conter pelo menos uma letra minúscula.")
        if not re.search(r"[0-9]", v):
            raise ValueError("A senha deve conter pelo menos um número.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>\-_=+]", v):
            raise ValueError("A senha deve conter pelo menos um caractere especial (!@#$%^&* etc.).")
        return v


class UsuarioLogin(BaseModel):
    email: EmailStr = Field(..., max_length=150, description="E-mail cadastrado")
    senha: str = Field(..., min_length=1, max_length=72, description="Senha do usuário")

    @field_validator("email")
    @classmethod
    def normalizar_email(cls, v: str) -> str:
        return v.strip().lower()


class UsuarioResponse(BaseModel):
    id: UUID
    nome: str
    email: EmailStr
    role: str

    model_config = ConfigDict(from_attributes=True)



class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UsuarioDesativado(BaseModel):
    detail: str = "Conta desativada com sucesso. Suas contribuições foram preservadas."