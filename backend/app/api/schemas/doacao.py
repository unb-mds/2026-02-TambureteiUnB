import re
import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from pydantic_core import PydanticCustomError

CAMPOS_TAXA = (
    "taxa_aprovacao",
    "taxa_reprovacao_nota",
    "taxa_reprovacao_falta",
    "taxa_trancamento",
)


class DoacaoCreate(BaseModel):
    semestre_referencia: str
    taxa_aprovacao: Decimal
    taxa_reprovacao_nota: Decimal
    taxa_reprovacao_falta: Decimal
    taxa_trancamento: Decimal

    @field_validator("semestre_referencia")
    @classmethod
    def validar_semestre(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^\d{4}\.[1-4]$", v):
            raise PydanticCustomError(
                "semestre_invalido",
                "O semestre deve seguir o padrão canônico da UnB (exemplo: 2026.1 ou 2026.2).",
            )
        return v

    @field_validator(*CAMPOS_TAXA)
    @classmethod
    def validar_taxa(cls, v: Decimal) -> Decimal:
        if v < 0 or v > 100:
            raise PydanticCustomError(
                "taxa_fora_do_intervalo",
                "Cada taxa deve estar entre 0 e 100.",
            )
        if v.as_tuple().exponent < -2:
            raise PydanticCustomError(
                "taxa_casas_decimais",
                "Cada taxa deve ter no máximo 2 casas decimais.",
            )
        return v

    @model_validator(mode="after")
    def validar_soma(self):
        soma = sum(getattr(self, campo) for campo in CAMPOS_TAXA)
        if soma != Decimal("100"):
            raise PydanticCustomError(
                "soma_taxas_invalida",
                "A soma das taxas deve ser exatamente 100%.",
            )
        return self


class DoacaoResponse(BaseModel):
    id: int
    turma_id: int
    usuario_id: uuid.UUID
    semestre_referencia: str
    taxa_aprovacao: Decimal
    taxa_reprovacao_nota: Decimal
    taxa_reprovacao_falta: Decimal
    taxa_trancamento: Decimal
    data_envio: datetime

    model_config = ConfigDict(from_attributes=True)