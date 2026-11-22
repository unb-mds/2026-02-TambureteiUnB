import { API_BASE_URL, ApiError, getStoredToken } from "./httpClient";

export const HISTORICO_STORAGE_KEY = "tamburetei_historico_sigaa";

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

const HISTORICO_MAX_BYTES = 10 * 1024 * 1024;

export async function uploadHistoricoPdf(
  file: File
): Promise<HistoricoImportacaoResponse> {
  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    throw new Error("Selecione um arquivo PDF oficial emitido pelo SIGAA/UnB.");
  }
  if (file.size > HISTORICO_MAX_BYTES) {
    throw new Error("O arquivo excede o tamanho máximo permitido de 10 MB.");
  }

  const token = getStoredToken();
  if (!token) {
    throw new Error("Sessão expirada. Faça login novamente para importar seu histórico.");
  }

  const formData = new FormData();
  formData.append("arquivo", file);

  const response = await fetch(`${API_BASE_URL}/perfil/importar-historico`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message =
      data && typeof data.detail === "string"
        ? data.detail
        : "Não foi possível processar o Histórico Escolar enviado.";
    throw new ApiError(message, response.status, data);
  }

  return response.json() as Promise<HistoricoImportacaoResponse>;
}

export function saveImportedHistorico(data: HistoricoImportacaoResponse): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HISTORICO_STORAGE_KEY, JSON.stringify(data));
}

export function loadImportedHistorico(): HistoricoImportacaoResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(HISTORICO_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HistoricoImportacaoResponse) : null;
  } catch {
    return null;
  }
}

export function clearImportedHistorico(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(HISTORICO_STORAGE_KEY);
}
