import re
from datetime import datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any, List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic_core import PydanticCustomError


def _parse_taxa_decimal(v: Any) -> Decimal:
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


def _validar_soma_cem(
    taxa_aprovacao: Decimal,
    taxa_reprovacao_nota: Decimal,
    taxa_reprovacao_falta: Decimal,
    taxa_trancamento: Decimal,
) -> tuple[Decimal, Decimal, Decimal, Decimal]:
    """
    Aceita tolerância de ±0.20% decorrente do arredondamento de 1 casa decimal
    do gráfico do SIGAA (ex.: 73.3 + 17.3 + 5.3 + 4.0 = 99.9%) e ajusta a diferença
    residual na maior parcela para manter soma exata de 100.00% no banco.
    """
    valores = [taxa_aprovacao, taxa_reprovacao_nota, taxa_reprovacao_falta, taxa_trancamento]
    soma = sum(valores, Decimal("0.00"))
    diferenca = Decimal("100.00") - soma
    if abs(diferenca) > Decimal("0.20"):
        raise PydanticCustomError(
            "soma_taxas_invalida",
            f"A soma das taxas deve ser exatamente 100% (soma informada: {soma}%).",
        )
    if diferenca != Decimal("0.00"):
        idx_maior = max(range(4), key=lambda i: valores[i])
        valores[idx_maior] = (valores[idx_maior] + diferenca).quantize(Decimal("0.01"))
    return valores[0], valores[1], valores[2], valores[3]


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
        return _parse_taxa_decimal(v)

    @model_validator(mode="after")
    def validar_soma_taxas(self) -> "DoacaoCreate":
        (
            self.taxa_aprovacao,
            self.taxa_reprovacao_nota,
            self.taxa_reprovacao_falta,
            self.taxa_trancamento,
        ) = _validar_soma_cem(
            self.taxa_aprovacao,
            self.taxa_reprovacao_nota,
            self.taxa_reprovacao_falta,
            self.taxa_trancamento,
        )
        return self


class DoacaoResponse(BaseModel):
    id: int
    turma_id: int
    usuario_id: UUID
    semestre_referencia: str
    taxa_aprovacao: Optional[float] = None
    taxa_reprovacao_nota: Optional[float] = None
    taxa_reprovacao_falta: Optional[float] = None
    taxa_trancamento: Optional[float] = None
    tipo_envio: str = "TEXTO"
    possui_imagem: bool = False
    status: str
    created_at: datetime
    data_envio: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PizzaModeracaoItemResponse(BaseModel):
    id: int
    turma_id: int
    codigo_turma: str
    semestre_referencia: str
    disciplina_id: int
    disciplina_codigo: str
    disciplina_nome: str
    disciplina_slug: str
    professores: List[str] = Field(default_factory=list)
    tipo_envio: Literal["IMAGEM", "TEXTO"]
    possui_imagem: bool
    taxa_aprovacao: Optional[float] = None
    taxa_reprovacao_nota: Optional[float] = None
    taxa_reprovacao_falta: Optional[float] = None
    taxa_trancamento: Optional[float] = None
    quantidade_envios: int = 1
    outros_iguais: int = 0
    minimo_outros_iguais: int = 5
    selo_verde: bool = False
    created_at: datetime


class PizzaModeracaoSemestreGrupo(BaseModel):
    semestre: str
    total: int
    itens: List[PizzaModeracaoItemResponse] = Field(default_factory=list)


class FilaPizzasModeracao(BaseModel):
    grupos_semestre: List[PizzaModeracaoSemestreGrupo] = Field(default_factory=list)
    total_itens: int = 0
    total_envios_pendentes: int = 0


class PizzaModeracaoDecisaoRequest(BaseModel):
    status: Literal["CONSOLIDADA", "DESCARTADA"]
    taxa_aprovacao: Optional[Decimal] = None
    taxa_reprovacao_nota: Optional[Decimal] = None
    taxa_reprovacao_falta: Optional[Decimal] = None
    taxa_trancamento: Optional[Decimal] = None
    justificativa: Optional[str] = Field(None, max_length=1000)

    @field_validator(
        "taxa_aprovacao",
        "taxa_reprovacao_nota",
        "taxa_reprovacao_falta",
        "taxa_trancamento",
        mode="before",
    )
    @classmethod
    def validar_intervalo_taxa_opcional(cls, v: Any) -> Optional[Decimal]:
        if v is None or v == "":
            return None
        return _parse_taxa_decimal(v)

    @model_validator(mode="after")
    def validar_taxas_decisao(self) -> "PizzaModeracaoDecisaoRequest":
        taxas = (
            self.taxa_aprovacao,
            self.taxa_reprovacao_nota,
            self.taxa_reprovacao_falta,
            self.taxa_trancamento,
        )
        if any(t is not None for t in taxas):
            if any(t is None for t in taxas):
                raise PydanticCustomError(
                    "taxas_incompletas",
                    "Informe todos os 4 percentuais ou deixe todos em branco.",
                )
            (
                self.taxa_aprovacao,
                self.taxa_reprovacao_nota,
                self.taxa_reprovacao_falta,
                self.taxa_trancamento,
            ) = _validar_soma_cem(*taxas)  # type: ignore[arg-type]
        return self


class PizzaModeracaoDecisaoResponse(BaseModel):
    id: int
    turma_id: int
    semestre_referencia: str
    status: str
    tipo_envio: str
    doacoes_atualizadas: int
    moderado_por_id: UUID
    moderado_em: datetime
    justificativa: Optional[str] = None
