from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, field_validator
from pydantic_core import PydanticCustomError


def texto_limitado(value: str, minimo: int, maximo: int) -> str:
    value = value.strip()
    if not minimo <= len(value) <= maximo:
        raise PydanticCustomError("texto_tamanho", f"Informe entre {minimo} e {maximo} caracteres.")
    return value


class RelatoBugCreate(BaseModel):
    titulo: str
    descricao: str
    pagina: str

    @field_validator("titulo")
    @classmethod
    def validar_titulo(cls, value: str) -> str:
        return texto_limitado(value, 5, 120)

    @field_validator("descricao")
    @classmethod
    def validar_descricao(cls, value: str) -> str:
        return texto_limitado(value, 10, 3000)

    @field_validator("pagina")
    @classmethod
    def validar_pagina(cls, value: str) -> str:
        value = value.strip()
        if (
            not value.startswith("/")
            or value.startswith("//")
            or any(c in value for c in "?#\\")
            or len(value) > 500
            or any(ord(c) < 32 for c in value)
        ):
            raise PydanticCustomError("pagina_invalida", "Informe apenas o caminho interno da página, sem parâmetros.")
        return value


class DecisaoRelatoBug(BaseModel):
    status: Literal["RESOLVIDO", "DESCARTADO"]
    justificativa: str | None = None

    @field_validator("justificativa")
    @classmethod
    def validar_justificativa(cls, value: str | None) -> str | None:
        return texto_limitado(value, 0, 1000) or None if value is not None else None


class RelatoBugResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    titulo: str
    descricao: str
    pagina: str
    status: Literal["PENDENTE", "RESOLVIDO", "DESCARTADO"]
    justificativa: str | None
    resolvido_em: datetime | None
    created_at: datetime


class FilaRelatosBugs(BaseModel):
    items: list[RelatoBugResponse]
    total: int
    pagina: int
    tamanho_pagina: int
