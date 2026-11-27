from datetime import datetime
from typing import Annotated, Literal
from urllib.parse import urlsplit

from pydantic import AfterValidator, BaseModel, ConfigDict, field_validator
from pydantic_core import PydanticCustomError


class MaterialResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    disciplina_id: int
    titulo: str
    tipo: str = "ARQUIVO"
    formato: Literal["pdf", "png", "jpg"] | None = None
    tamanho_bytes: int | None = None
    url_origem: str | None = None
    status_curadoria: Literal["PENDENTE", "APROVADO", "RECUSADO"]
    status_moderacao: str | None = None
    created_at: datetime
    upvotes: int = 0
    liked_by_me: bool = False
    is_mine: bool = False


class MeuMaterialResponse(MaterialResponse):
    """Material submetido pelo próprio usuário para exibição em Minhas Contribuições."""

    disciplina_nome: str
    disciplina_slug: str
    motivo_moderacao: str | None = None


class MaterialVotoResponse(BaseModel):
    material_id: int
    upvotes: int
    liked_by_me: bool


class MaterialPage(BaseModel):
    items: list[MaterialResponse]
    total: int
    pagina: int
    tamanho_pagina: int


class MaterialStatusResponse(BaseModel):
    """Status atual da triagem e curadoria de um material para acompanhamento do autor."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    status_curadoria: Literal["PENDENTE", "APROVADO", "RECUSADO"]
    status_moderacao: str | None = None
    motivo_moderacao: str | None = None
    moderado_por: str | None = None
    confianca_ia: float | None = None


def validar_titulo(valor: str) -> str:
    valor = valor.strip()
    if not 1 <= len(valor) <= 200:
        raise PydanticCustomError(
            "titulo_invalido", "O título deve conter entre 1 e 200 caracteres."
        )
    return valor


def validar_url_externa(valor: str) -> str:
    valor = valor.strip()
    if not 1 <= len(valor) <= 2000 or any(ch.isspace() for ch in valor):
        raise PydanticCustomError(
            "url_invalida", "Informe uma URL válida iniciada por http:// ou https://."
        )
    parsed = urlsplit(valor)
    if (
        parsed.scheme.lower() not in {"http", "https"}
        or not parsed.hostname
        or "." not in parsed.hostname
    ):
        raise PydanticCustomError(
            "url_invalida", "Informe uma URL válida iniciada por http:// ou https://."
        )
    return valor


TituloMaterial = Annotated[str, AfterValidator(validar_titulo)]
UrlExterna = Annotated[str, AfterValidator(validar_url_externa)]


class MaterialLinkCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    titulo: TituloMaterial
    url_origem: UrlExterna
    tipo: Literal["RESUMO", "DICA", "PROVA_ANTIGA", "LINK_UTIL"] = "RESUMO"

    @field_validator("tipo", mode="before")
    @classmethod
    def normalizar_tipo(cls, valor: str) -> str:
        if isinstance(valor, str):
            return valor.strip().upper()
        return valor


class MaterialUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    titulo: TituloMaterial | None = None
    tipo: Literal["ARQUIVO", "RESUMO", "DICA", "PROVA_ANTIGA", "LINK_UTIL"] | None = None
    url_origem: UrlExterna | None = None

    @field_validator("tipo", mode="before")
    @classmethod
    def normalizar_tipo(cls, valor: str | None) -> str | None:
        if isinstance(valor, str):
            return valor.strip().upper()
        return valor
