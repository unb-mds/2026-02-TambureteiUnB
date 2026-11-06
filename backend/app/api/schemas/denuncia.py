from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from pydantic_core import PydanticCustomError

from app.api.schemas.curadoria import DisciplinaCuradoria
from app.domain.denuncias import (
    normalizar_justificativa_decisao,
    normalizar_motivo_denuncia,
    validar_categoria_denuncia,
)

CategoriaDenunciaLiteral = Literal[
    "OFENSA_DOCENTE",
    "CONTEUDO_IMPROPRIO",
    "GABARITO_ATIVO",
    "SPAM",
    "OUTRO",
]

AcaoDenunciaLiteral = Literal[
    "EXCLUIR_CONTEUDO",
    "DESCARTAR_DENUNCIA",
    "REMOVER",
    "APROVAR",
]


class DenunciaCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    comentario_id: int | None = None
    conteudo_id: int | None = None
    material_id: int | None = None
    categoria: str = "OFENSA_DOCENTE"
    motivo: str

    @field_validator("comentario_id", "conteudo_id", "material_id")
    @classmethod
    def validar_identificador_positivo(cls, valor: int | None) -> int | None:
        if valor is not None and valor <= 0:
            raise PydanticCustomError(
                "alvo_invalido",
                "O identificador do alvo deve ser positivo.",
            )
        return valor

    @field_validator("categoria", mode="before")
    @classmethod
    def validar_categoria(cls, valor: str) -> str:
        try:
            return validar_categoria_denuncia(valor)
        except ValueError as exc:
            raise PydanticCustomError("categoria_invalida", str(exc)) from exc

    @field_validator("motivo", mode="before")
    @classmethod
    def validar_motivo(cls, valor: str) -> str:
        try:
            return normalizar_motivo_denuncia(valor)
        except ValueError as exc:
            raise PydanticCustomError("motivo_invalido", str(exc)) from exc

    @model_validator(mode="after")
    def validar_alvo_unico(self) -> DenunciaCreate:
        if self.material_id is not None and self.conteudo_id is not None and self.material_id != self.conteudo_id:
            raise PydanticCustomError(
                "alvo_ambiguo",
                "Informe exatamente um alvo (comentario_id ou conteudo_id).",
            )
        alvo_conteudo = self.conteudo_id if self.conteudo_id is not None else self.material_id
        tem_comentario = self.comentario_id is not None
        tem_conteudo = alvo_conteudo is not None
        if tem_comentario == tem_conteudo:
            raise PydanticCustomError(
                "alvo_obrigatorio",
                "Informe exatamente um alvo (comentario_id ou conteudo_id).",
            )
        self.conteudo_id = alvo_conteudo
        self.material_id = None
        return self


class DecisaoDenuncia(BaseModel):
    model_config = ConfigDict(extra="forbid")

    acao: AcaoDenunciaLiteral
    justificativa: str | None = None

    @field_validator("acao", mode="before")
    @classmethod
    def validar_acao(cls, valor: str) -> str:
        if not isinstance(valor, str):
            raise PydanticCustomError("acao_invalida", "Escolha EXCLUIR_CONTEUDO ou DESCARTAR_DENUNCIA.")
        normalizada = valor.strip().upper()
        if normalizada == "REMOVER":
            return "EXCLUIR_CONTEUDO"
        if normalizada == "APROVAR":
            return "DESCARTAR_DENUNCIA"
        if normalizada not in ("EXCLUIR_CONTEUDO", "DESCARTAR_DENUNCIA"):
            raise PydanticCustomError("acao_invalida", "Escolha EXCLUIR_CONTEUDO ou DESCARTAR_DENUNCIA.")
        return normalizada

    @field_validator("justificativa")
    @classmethod
    def validar_justificativa(cls, valor: str | None) -> str | None:
        try:
            return normalizar_justificativa_decisao(valor)
        except ValueError as exc:
            raise PydanticCustomError("justificativa_longa", str(exc)) from exc


class DenunciaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tipo_alvo: Literal["COMENTARIO", "MATERIAL"]
    comentario_id: int | None = None
    conteudo_id: int | None = None
    categoria: str
    motivo: str
    status: str
    total_denuncias_alvo: int = 1
    ocultado_automaticamente: bool = False
    created_at: datetime


class AlvoDenunciadoResumo(BaseModel):
    id: int
    tipo_alvo: Literal["COMENTARIO", "MATERIAL"]
    titulo: str | None = None
    conteudo: str
    autor_alias: str
    topico_dificuldade: str | None = None
    formato: str | None = None
    status_moderacao: str
    created_at: datetime
    disciplina: DisciplinaCuradoria


class DenunciaItemFila(BaseModel):
    id: int
    tipo_alvo: Literal["COMENTARIO", "MATERIAL"]
    comentario_id: int | None = None
    conteudo_id: int | None = None
    categoria: str
    motivo: str
    status: str
    created_at: datetime
    total_denuncias: int
    prioridade_rn04: bool
    sinalizacoes_rn04: list[str]
    alvo: AlvoDenunciadoResumo


class FilaDenuncias(BaseModel):
    items: list[DenunciaItemFila]
    total: int
    pagina: int
    tamanho_pagina: int


class ResumoDecisaoDenuncia(BaseModel):
    id: int
    tipo_alvo: Literal["COMENTARIO", "MATERIAL"]
    alvo_id: int
    acao: Literal["EXCLUIR_CONTEUDO", "DESCARTAR_DENUNCIA"]
    status_denuncia: str
    status_moderacao_alvo: str
    denuncias_atualizadas: int
    moderador_id: UUID | None = None
    perfil_moderador: str
    justificativa: str | None = None
    resolved_at: datetime
