from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from pydantic_core import PydanticCustomError
from app.api.schemas.material import MaterialResponse


class DecisaoCuradoria(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal["APROVADO", "RECUSADO"]
    justificativa: str | None = None

    @field_validator("status", mode="before")
    @classmethod
    def validar_status(cls, valor):
        if valor not in ("APROVADO", "RECUSADO"):
            raise PydanticCustomError("status_invalido", "Escolha APROVADO ou RECUSADO.")
        return valor

    @field_validator("justificativa")
    @classmethod
    def validar_justificativa(cls, valor: str | None) -> str | None:
        valor = valor.strip() if valor is not None else None
        if valor and len(valor) > 1000:
            raise PydanticCustomError("justificativa_longa", "A justificativa deve ter no máximo 1000 caracteres.")
        return valor or None

    @model_validator(mode="after")
    def exigir_motivo_recusa(self):
        if self.status == "RECUSADO" and not self.justificativa:
            raise PydanticCustomError("recusa_sem_motivo", "Informe uma justificativa para recusar o material.")
        return self


class DisciplinaCuradoria(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nome: str
    slug: str


class MaterialPendente(MaterialResponse):
    disciplina: DisciplinaCuradoria


class FilaCuradoria(BaseModel):
    items: list[MaterialPendente]
    total: int
    pagina: int
    tamanho_pagina: int


class RegistroCuradoria(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    conteudo_id: int
    moderador_id: UUID | None
    perfil_moderador: str
    status_anterior: str
    status_novo: str
    justificativa: str | None
    created_at: datetime
