from pydantic import BaseModel, ConfigDict, field_validator
from pydantic_core import PydanticCustomError


class MetricaFormacaoItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ano: int
    ingressantes: int = 0
    matriculados: int = 0
    concluintes: int = 0
    taxa_formacao: float


class CursoFormacaoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    curso_id: int
    curso_nome: str
    curso_slug: str
    taxa_media_formacao: float
    serie_historica: list[MetricaFormacaoItem] = []


class IndicadoresEvasaoBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    matriculados: int
    desvinculados: int
    taxa_evasao: float

    @field_validator("matriculados", "desvinculados")
    @classmethod
    def validar_quantidade(cls, valor: int) -> int:
        if valor < 0:
            raise PydanticCustomError(
                "quantidade_negativa",
                "A quantidade de alunos não pode ser negativa.",
            )
        return valor

    @field_validator("taxa_evasao")
    @classmethod
    def validar_taxa(cls, valor: float) -> float:
        if valor < 0:
            raise PydanticCustomError(
                "taxa_negativa",
                "A taxa de evasão não pode ser negativa.",
            )
        return valor


class EvasaoCampusAnoItem(IndicadoresEvasaoBase):
    ano: int
    total_cursos: int


class EvasaoCampusResumoItem(IndicadoresEvasaoBase):
    campus: str
    taxa_media_anual: float


class EvasaoCampusComparativoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_campi: int
    campi: list[EvasaoCampusResumoItem] = []


class EvasaoCampusDetalheResponse(EvasaoCampusResumoItem):
    serie_historica: list[EvasaoCampusAnoItem] = []


def _validar_valor_nao_negativo(
    valor: int | float | None,
    codigo: str,
    mensagem: str,
) -> int | float | None:
    if valor is not None and valor < 0:
        raise PydanticCustomError(codigo, mensagem)
    return valor


class FluxoEstudantesPeriodoItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ano: int
    ingressantes: int = 0
    matriculados: int = 0
    concluintes: int = 0
    trancados: int = 0
    evadidos: int = 0
    taxa_formacao: float | None = None
    taxa_evasao: float | None = None

    @field_validator("ingressantes", "matriculados", "concluintes", "trancados", "evadidos")
    @classmethod
    def validar_quantidade(cls, valor: int) -> int:
        return int(
            _validar_valor_nao_negativo(
                valor,
                "quantidade_negativa",
                "A quantidade de alunos não pode ser negativa.",
            )
        )

    @field_validator("taxa_formacao", "taxa_evasao")
    @classmethod
    def validar_taxas(cls, valor: float | None) -> float | None:
        return _validar_valor_nao_negativo(
            valor,
            "taxa_negativa",
            "A taxa institucional não pode ser negativa.",
        )


class DashboardGeralResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_cursos: int
    total_campi: int
    ingressantes: int
    matriculados: int
    concluintes: int
    trancados: int
    evadidos: int
    taxa_media_formacao: float | None = None
    taxa_media_evasao: float | None = None
    resumo_campi: list[EvasaoCampusResumoItem] = []
    fluxo_estudantes: list[FluxoEstudantesPeriodoItem] = []

    @field_validator(
        "total_cursos",
        "total_campi",
        "ingressantes",
        "matriculados",
        "concluintes",
        "trancados",
        "evadidos",
    )
    @classmethod
    def validar_totais(cls, valor: int) -> int:
        return int(
            _validar_valor_nao_negativo(
                valor,
                "quantidade_negativa",
                "A quantidade consolidada não pode ser negativa.",
            )
        )

    @field_validator("taxa_media_formacao", "taxa_media_evasao")
    @classmethod
    def validar_medias(cls, valor: float | None) -> float | None:
        return _validar_valor_nao_negativo(
            valor,
            "taxa_negativa",
            "A taxa institucional não pode ser negativa.",
        )
