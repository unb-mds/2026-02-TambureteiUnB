from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic_core import PydanticCustomError

COMENTARIO_MAX_LENGTH = 2000


class ComentarioCreate(BaseModel):
    """Schema de entrada para criação de comentário."""

    disciplina_id: int = Field(..., description="ID da disciplina")
    turma_id: Optional[int] = Field(None, description="ID da turma")
    autor_alias: Optional[str] = Field("Estudante Anônimo", description="Apelido do autor")
    topico_dificuldade: Optional[str] = Field(None, description="Tópico de dificuldade")
    conteudo: str = Field(..., description="Texto do comentário")

    @field_validator("conteudo")
    @classmethod
    def validar_conteudo(cls, v: str) -> str:
        v = v.strip()
        if len(v) == 0:
            raise PydanticCustomError(
                "conteudo_vazio",
                "O conteúdo do comentário não pode ser vazio.",
            )
        if len(v) > COMENTARIO_MAX_LENGTH:
            raise PydanticCustomError(
                "conteudo_longo",
                "O comentário deve ter no máximo {max_length} caracteres.",
                {"max_length": COMENTARIO_MAX_LENGTH},
            )
        return v


class ComentarioUpdate(BaseModel):
    """Schema de entrada para edição de comentário."""

    conteudo: str = Field(..., description="Novo texto do comentário")

    @field_validator("conteudo")
    @classmethod
    def validar_conteudo(cls, v: str) -> str:
        v = v.strip()
        if len(v) == 0:
            raise PydanticCustomError("conteudo_vazio", "O conteúdo não pode ser vazio.")
        if len(v) > COMENTARIO_MAX_LENGTH:
            raise PydanticCustomError("conteudo_longo", "O comentário excedeu o limite.")
        return v


class ComentarioResponse(BaseModel):
    """Schema de saída — retornado pela API."""

    id: int
    usuario_id: UUID
    disciplina_id: int
    turma_id: Optional[int] = None
    autor_alias: str
    topico_dificuldade: Optional[str] = None
    conteudo: str
    parent_id: Optional[int] = None
    status_moderacao: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ComentarioListaPaginada(BaseModel):
    """Schema de saída para listagem paginada de comentários."""

    items: list[ComentarioResponse]
    total: int
    page: int
    size: int
    pages: int
