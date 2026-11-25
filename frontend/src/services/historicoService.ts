import { API_BASE_URL, ApiError, getStoredToken } from "./httpClient.ts";
import type {
  HistoricoCargaHoraria,
  HistoricoCargaItem,
  HistoricoComponenteItem,
  HistoricoContribuicaoResumo,
  HistoricoDadosAcademicos,
  HistoricoImportacaoResponse,
  HistoricoPendenteItem,
  HistoricoStorageOptions,
} from "../types/historico.ts";

export type {
  HistoricoCargaHoraria,
  HistoricoCargaItem,
  HistoricoComponenteItem,
  HistoricoContribuicaoResumo,
  HistoricoDadosAcademicos,
  HistoricoImportacaoResponse,
  HistoricoPendenteItem,
  HistoricoStorageOptions,
};

export const HISTORICO_STORAGE_KEY = "tamburetei_historico_sigaa";
export const HISTORICO_USER_STORAGE_PREFIX = "tamburetei_historico_sigaa_user_";
export const HISTORICO_CHANGE_EVENT = "tamburetei-historico-change";

export function getHistoricoUserStorageKey(userId?: number | string | null): string {
  if (userId !== undefined && userId !== null && String(userId).trim() !== "") {
    return `${HISTORICO_USER_STORAGE_PREFIX}${String(userId).trim()}`;
  }
  return HISTORICO_STORAGE_KEY;
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

function getHistoricoStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  if (typeof localStorage !== "undefined") {
    return localStorage;
  }
  return null;
}

export function saveImportedHistorico(
  data: HistoricoImportacaoResponse,
  options?: HistoricoStorageOptions
): void {
  const storage = getHistoricoStorage();
  if (!storage) return;
  const serialized = JSON.stringify(data);
  storage.setItem(HISTORICO_STORAGE_KEY, serialized);
  if (options?.userId) {
    storage.setItem(getHistoricoUserStorageKey(options.userId), serialized);
  }
}

export function loadImportedHistorico(
  options?: HistoricoStorageOptions
): HistoricoImportacaoResponse | null {
  const storage = getHistoricoStorage();
  if (!storage) return null;
  try {
    if (options?.userId) {
      const userKey = getHistoricoUserStorageKey(options.userId);
      const userRaw = storage.getItem(userKey);
      if (userRaw) {
        return JSON.parse(userRaw) as HistoricoImportacaoResponse;
      }
    }
    const raw = storage.getItem(HISTORICO_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HistoricoImportacaoResponse) : null;
  } catch {
    return null;
  }
}

export function clearImportedHistorico(options?: HistoricoStorageOptions): void {
  const storage = getHistoricoStorage();
  if (!storage) return;
  storage.removeItem(HISTORICO_STORAGE_KEY);
  if (options?.userId) {
    storage.removeItem(getHistoricoUserStorageKey(options.userId));
  }
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new Event(HISTORICO_CHANGE_EVENT));
  }
}
