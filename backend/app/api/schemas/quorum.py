from typing import List

from pydantic import BaseModel, Field


class GrupoQuorum(BaseModel):
    taxa_aprovacao: float
    taxa_reprovacao_nota: float
    taxa_reprovacao_falta: float
    taxa_trancamento: float
    quantidade: int = Field(..., description="Quantidade de doações com exatamente estes valores")
    atingiu_quorum: bool
    consolidado: bool = Field(..., description="Se este grupo é o vencedor atual da turma")


class QuorumProgressoResponse(BaseModel):
    turma_id: int
    semestre_referencia: str
    quorum_minimo: int
    consolidado: bool
    grupos: List[GrupoQuorum] = Field(default_factory=list)