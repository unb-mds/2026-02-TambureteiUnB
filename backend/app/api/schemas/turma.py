import re
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic_core import PydanticCustomError
from app.api.schemas.professor import ProfessorResumo
from app.core.config import settings


class TurmaCreate(BaseModel):
    disciplina_id: int= Field(..., description="ID da disciplina")
    semestre: str = Field(..., description="Semestre letivo (ex: 2026.1)")
    codigo_turma: str = Field(..., description="Código da turma (ex: 01, A)")
    professores_ids: List[int] = Field(..., description="Lista com IDs dos professores")
    horario: Optional[str] = Field(None, max_length=50)
    local: Optional[str] = Field(None, max_length=100)

    @field_validator("semestre")
    @classmethod
    def validar_semestre(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r"^\d{4}\.[1-4]$", v):
            raise PydanticCustomError(
                "semestre_invalido",
                "O semestre deve seguir o padrão canônico da UnB (exemplo: 2026.1 ou 2026.2).",
            )
        return v

    @field_validator("codigo_turma")
    @classmethod
    def validar_codigo_turma(cls, v: str) -> str:
        v = " ".join(v.split())
        if len(v) < 1:
            raise PydanticCustomError(
                "codigo_turma_vazio",
                "O código da turma não pode ser vazio.",
            )
        if len(v) > 10:
            raise PydanticCustomError(
                "codigo_turma_muito_longo",
                "O código da turma deve ter no máximo 10 caracteres.",
            )
        return v

    @field_validator("professores_ids")
    @classmethod
    def validar_professores_ids(cls, v: List[int]) -> List[int]:
        if len(v) == 0:
            raise PydanticCustomError(
                "professores_obrigatorios",
                "Informe ao menos um professor responsável pela turma.",
            )
        if any(pid <= 0 for pid in v):
            raise PydanticCustomError(
                "professor_id_invalido",
                "Os IDs de professor devem ser números inteiros positivos.",
            )
        if len(v) != len(set(v)):
            raise PydanticCustomError(
                "professores_duplicados",
                "A lista de professores não pode conter IDs repetidos.",
            )
        return v


class EstatisticaTurma(BaseModel):
    taxa_aprovacao: float
    taxa_reprovacao_nota: float
    taxa_reprovacao_falta: float
    taxa_trancamento: float
    status: str

    model_config = ConfigDict(from_attributes=True)


class TurmaResponse(BaseModel):
    id: int
    disciplina_id: int
    semestre: str
    codigo_turma: str
    horario: Optional[str] = None
    local: Optional[str] = None
    capacidade: Optional[int] = None
    matriculados: Optional[int] = None
    professores: List[ProfessorResumo] = []
    estatistica: Optional[EstatisticaTurma] = None
    amostras_comunidade: int = 0
    minimo_amostras_lgpd: int = Field(default_factory=lambda: settings.HISTORICO_MIN_AMOSTRAS)

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def extrair_contagem_comunidade(cls, data):
        if isinstance(data, dict):
            est = data.get("estatistica")
            if est is not None:
                total = est.get("total_amostras", 0) if isinstance(est, dict) else getattr(est, "total_amostras", 0)
                return {**data, "amostras_comunidade": total or 0, "minimo_amostras_lgpd": settings.HISTORICO_MIN_AMOSTRAS}
            return {**data, "minimo_amostras_lgpd": settings.HISTORICO_MIN_AMOSTRAS}

        est = getattr(data, "estatistica", None)
        total = getattr(est, "total_amostras", 0) if est is not None else 0
        # Constrói dict superficial apenas se precisarmos injetar amostras_comunidade sem mutar ORM
        return {
            "id": getattr(data, "id"),
            "disciplina_id": getattr(data, "disciplina_id"),
            "semestre": getattr(data, "semestre"),
            "codigo_turma": getattr(data, "codigo_turma"),
            "horario": getattr(data, "horario", None),
            "local": getattr(data, "local", None),
            "capacidade": getattr(data, "capacidade", None),
            "matriculados": getattr(data, "matriculados", None),
            "professores": getattr(data, "professores", []),
            "estatistica": est,
            "amostras_comunidade": total or 0,
            "minimo_amostras_lgpd": settings.HISTORICO_MIN_AMOSTRAS,
        }

    @field_validator("estatistica", mode="before")
    @classmethod
    def ocultar_baixa_amostragem_lgpd(cls, v):
        # RN07: Oculta estatística detalhada se marcada como suprimida por baixa amostragem.
        if v is None:
            return None
        suprimida = (
            v.get("amostragem_suprimida_lgpd", False)
            if isinstance(v, dict)
            else getattr(v, "amostragem_suprimida_lgpd", False)
        )
        if suprimida:
            return None
        return v