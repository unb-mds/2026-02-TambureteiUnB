from pydantic import BaseModel, ConfigDict


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
