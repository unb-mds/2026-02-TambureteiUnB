from datetime import datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict
from pydantic_core import PydanticCustomError


class MaterialResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    disciplina_id: int
    titulo: str
    formato: Literal["pdf", "png", "jpg"]
    tamanho_bytes: int
    status_moderacao: str
    created_at: datetime


class MaterialPage(BaseModel):
    items: list[MaterialResponse]
    total: int
    pagina: int
    tamanho_pagina: int


def validar_titulo(valor: str) -> str:
    valor = valor.strip()
    if not 1 <= len(valor) <= 200:
        raise PydanticCustomError(
            "titulo_invalido", "O título deve conter entre 1 e 200 caracteres."
        )
    return valor


TituloMaterial = Annotated[str, AfterValidator(validar_titulo)]
