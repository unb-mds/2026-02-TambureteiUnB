from typing import List, Optional
from pydantic import BaseModel, Field


class HistoricoDadosAcademicos(BaseModel):
    curso: Optional[str] = None
    curriculo: Optional[str] = None
    status: Optional[str] = None
    periodo_inicial: Optional[str] = None
    periodo_atual: Optional[int] = None
    prazo_conclusao: Optional[str] = None
    ira: Optional[float] = None
    mp: Optional[float] = None
    data_emissao: Optional[str] = None
    codigo_verificacao: Optional[str] = None


class HistoricoCargaItem(BaseModel):
    obrigatorias: int = 0
    optativas: int = 0
    complementares: int = 0
    total: int = 0


class HistoricoCargaHoraria(BaseModel):
    exigido: HistoricoCargaItem = Field(default_factory=HistoricoCargaItem)
    integralizado: HistoricoCargaItem = Field(default_factory=HistoricoCargaItem)
    pendente: HistoricoCargaItem = Field(default_factory=HistoricoCargaItem)


class HistoricoComponenteItem(BaseModel):
    semestre: str
    codigo: str
    nome: str
    professores: List[str] = Field(default_factory=list)
    ch: int = 0
    turma: Optional[str] = None
    frequencia: Optional[float] = None
    mencao: Optional[str] = None
    situacao: str
    natureza_simbolo: Optional[str] = None


class HistoricoPendenteItem(BaseModel):
    codigo: str
    nome: str
    ch: int = 0
    matriculado: bool = False


class HistoricoContribuicaoResumo(BaseModel):
    total_elegiveis: int = 0
    novas_contribuicoes: int = 0
    duplicadas_ignoradas: int = 0
    disciplinas_nao_encontradas: List[str] = Field(default_factory=list)
    turmas_atualizadas: int = 0
    turmas_liberadas_lgpd: int = 0
    minimo_amostras_lgpd: int = 5


class HistoricoImportacaoResponse(BaseModel):
    autenticidade_estrutural_valida: bool = True
    dados_academicos: HistoricoDadosAcademicos
    carga_horaria: HistoricoCargaHoraria
    cursadas: List[HistoricoComponenteItem] = Field(default_factory=list)
    cursando: List[HistoricoComponenteItem] = Field(default_factory=list)
    pendentes: List[HistoricoPendenteItem] = Field(default_factory=list)
    contribuicao: HistoricoContribuicaoResumo
