import re
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from pydantic_core import PydanticCustomError


class UsuarioCreate(BaseModel):
    nome: str = Field(
        ...,
        description="Nome do estudante",
        examples=["Aluno da Silva"]
    )
    email: EmailStr = Field(
        ...,
        description="E-mail do estudante",
        examples=["aluno@aluno.unb.br"]
    )
    senha: str = Field(
        ...,
        description="Senha do estudante",
        examples=["SenhaForte123!"]
    )

    @field_validator("nome")
    @classmethod
    def validar_nome(cls, v: str) -> str:
        v = " ".join(v.split())
        if len(v) < 3:
            raise PydanticCustomError("nome_curto", "O campo nome deve ter no mínimo 3 caracteres.")
        if len(v) > 100:
            raise PydanticCustomError("nome_longo", "O campo nome deve ter no máximo 100 caracteres.")
        if not re.match(r"^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$", v):
            raise PydanticCustomError("nome_invalido", "O nome deve conter apenas letras e espaços.")
        return v

    @field_validator("email")
    @classmethod
    def normalizar_email(cls, v: str) -> str:
        v = v.strip().lower()
        if len(v) > 150:
            raise PydanticCustomError("email_longo", "O e-mail deve ter no máximo 150 caracteres.")
        return v

    @field_validator("senha")
    @classmethod
    def validar_complexidade_senha(cls, v: str) -> str:
        if len(v) < 8:
            raise PydanticCustomError("senha_curta", "A senha deve possuir pelo menos 8 caracteres.")
        if len(v) > 72:
            raise PydanticCustomError("senha_longa", "A senha não pode ultrapassar 72 caracteres.")
        if not re.search(r"[A-Z]", v):
            raise PydanticCustomError("senha_sem_maiuscula", "A senha deve conter pelo menos uma letra maiúscula.")
        if not re.search(r"[a-z]", v):
            raise PydanticCustomError("senha_sem_minuscula", "A senha deve conter pelo menos uma letra minúscula.")
        if not re.search(r"[0-9]", v):
            raise PydanticCustomError("senha_sem_numero", "A senha deve conter pelo menos um número.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>\-_=+]", v):
            raise PydanticCustomError("senha_sem_especial", "A senha deve conter pelo menos um caractere especial (!@#$%^&* etc.).")
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
