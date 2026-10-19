import re
from datetime import datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic_core import PydanticCustomError


class DoacaoCreate(BaseModel):
    semestre_referencia: str = Field(..., description="Semestre letivo de referência (ex: 2026.1)")
    taxa_aprovacao: Decimal = Field(..., description="Taxa percentual de aprovação (0 a 100)")
    taxa_reprovacao_nota: Decimal = Field(..., description="Taxa percentual de reprovação por nota (0 a 100)")
    taxa_reprovacao_falta: Decimal = Field(..., description="Taxa percentual de reprovação por falta (0 a 100)")
    taxa_trancamento: Decimal = Field(..., description="Taxa percentual de trancamento (0 a 100)")

    @field_validator("semestre_referencia")
    @classmethod
    def validar_semestre_referencia(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^\d{4}\.[1-4]$", v):
            raise PydanticCustomError(
                "semestre_invalido",
                "O semestre deve seguir o padrão canônico da UnB (exemplo: 2026.1 ou 2026.2).",
            )
        return v

    @field_validator(
        "taxa_aprovacao",
        "taxa_reprovacao_nota",
        "taxa_reprovacao_falta",
        "taxa_trancamento",
        mode="before",
    )
    @classmethod
    def validar_intervalo_taxa(cls, v: Any) -> Decimal:
        if isinstance(v, bool) or v is None:
            raise PydanticCustomError(
                "taxa_invalida",
                "O valor informado para a taxa deve ser um número válido.",
            )
        try:
            valor = Decimal(str(v)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        except (InvalidOperation, ValueError, TypeError):
            raise PydanticCustomError(
                "taxa_invalida",
                "O valor informado para a taxa deve ser um número válido.",
            )
        if valor < Decimal("0.00") or valor > Decimal("100.00"):
            raise PydanticCustomError(
                "taxa_fora_intervalo",
                "Os valores das taxas devem estar no intervalo permitido entre 0% e 100%.",
            )
        return valor

    @model_validator(mode="after")
    def validar_soma_taxas(self) -> "DoacaoCreate":
        soma = (
            self.taxa_aprovacao
            + self.taxa_reprovacao_nota
            + self.taxa_reprovacao_falta
            + self.taxa_trancamento
        )
        if soma != Decimal("100.00"):
            raise PydanticCustomError(
                "soma_taxas_invalida",
                f"A soma das taxas deve ser exatamente 100% (soma informada: {soma}%).",
            )
        return self


class DoacaoResponse(BaseModel):
    id: int
    turma_id: int
    usuario_id: UUID
    semestre_referencia: str
    taxa_aprovacao: float
    taxa_reprovacao_nota: float
    taxa_reprovacao_falta: float
    taxa_trancamento: float
    status: str
    created_at: datetime
    data_envio: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
