export interface HistoricoDadosAcademicos {
  curso: string | null;
  curriculo: string | null;
  status: string | null;
  periodo_inicial: string | null;
  periodo_atual: number | null;
  prazo_conclusao: string | null;
  ira: number | null;
  mp: number | null;
  data_emissao: string | null;
  codigo_verificacao: string | null;
}

export interface HistoricoCargaItem {
  obrigatorias: number;
  optativas: number;
  complementares: number;
  total: number;
}

export interface HistoricoCargaHoraria {
  exigido: HistoricoCargaItem;
  integralizado: HistoricoCargaItem;
  pendente: HistoricoCargaItem;
}

export interface HistoricoComponenteItem {
  semestre: string;
  codigo: string;
  nome: string;
  slug?: string | null;
  professores: string[];
  ch: number;
  turma: string | null;
  horario?: string | null;
  local?: string | null;
  frequencia: number | null;
  mencao: string | null;
  situacao: string;
  natureza_simbolo: string | null;
}

export interface HistoricoPendenteItem {
  codigo: string;
  nome: string;
  ch: number;
  matriculado: boolean;
}

export interface HistoricoContribuicaoResumo {
  total_elegiveis: number;
  novas_contribuicoes: number;
  duplicadas_ignoradas: number;
  disciplinas_nao_encontradas: string[];
  turmas_atualizadas: number;
  turmas_liberadas_lgpd: number;
  minimo_amostras_lgpd: number;
}

export interface HistoricoImportacaoResponse {
  autenticidade_estrutural_valida: boolean;
  dados_academicos: HistoricoDadosAcademicos;
  carga_horaria: HistoricoCargaHoraria;
  cursadas: HistoricoComponenteItem[];
  cursando: HistoricoComponenteItem[];
  pendentes: HistoricoPendenteItem[];
  contribuicao: HistoricoContribuicaoResumo;
}

export interface HistoricoStorageOptions {
  userId?: number | string | null;
}
