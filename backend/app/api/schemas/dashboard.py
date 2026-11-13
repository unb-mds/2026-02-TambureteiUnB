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
