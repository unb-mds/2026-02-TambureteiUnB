import {
  type BackendComentarioItem,
  type BackendComentarioPage,
  type CreateDifficultyAlertInput,
  type DifficultyAlert,
  adaptBackendCommentToDifficultyAlert,
  encodeTopicWithSeverity,
  formatAlertDate,
} from "../types/dificuldade.ts";
import { ApiError, request } from "./httpClient.ts";

export const DIFFICULTY_MIN_CHARS = 10;
export const DIFFICULTY_MAX_CHARS = 2000;

const LOCAL_ALERTS_STORAGE_KEY = "tamburetei_difficulty_alerts_local";

function getLocalAlertsForDiscipline(key: string): DifficultyAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_ALERTS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, DifficultyAlert[]>) : {};
    return parsed[key] || [];
  } catch {
    return [];
  }
}

function saveLocalAlertForDiscipline(key: string, alert: DifficultyAlert): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LOCAL_ALERTS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, DifficultyAlert[]>) : {};
    const existing = parsed[key] || [];
    parsed[key] = [alert, ...existing];
    localStorage.setItem(LOCAL_ALERTS_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignora falha de armazenamento local
  }
}

const DIFFICULTY_ERROR_MESSAGES_BY_STATUS: Record<number, string> = {
  401: "Sessão expirada ou não autenticada. Faça login para registrar alertas de dificuldade.",
  403: "Você não possui permissão para executar esta ação.",
  404: "Disciplina não encontrada para registro do alerta de dificuldade.",
  422: "Dados inválidos no alerta de dificuldade. Verifique o tópico e o relato informado.",
};

function mapDifficultyError(err: unknown): ApiError {
  if (err instanceof ApiError) {
    const mappedMessage =
      DIFFICULTY_ERROR_MESSAGES_BY_STATUS[err.status] ?? err.message;
    return new ApiError(mappedMessage, err.status, err.data);
  }
  return new ApiError(
    "Falha na conexão com o servidor ao processar os alertas de dificuldade.",
    0
  );
}

const FALLBACK_HTTP_STATUSES = new Set([0, 401, 404, 422]);

function shouldUseLocalFallback(err: unknown): boolean {
  return (
    typeof window !== "undefined" &&
    err instanceof ApiError &&
    FALLBACK_HTTP_STATUSES.has(err.status)
  );
}

function extractRawCommentItems(
  response: BackendComentarioPage | BackendComentarioItem[]
): BackendComentarioItem[] {
  if (Array.isArray(response)) {
    return response;
  }
  return Array.isArray(response?.items) ? response.items : [];
}

function hasDifficultyTopic(item: BackendComentarioItem): boolean {
  return (
    typeof item.topico_dificuldade === "string" &&
    item.topico_dificuldade.trim().length > 0
  );
}

function buildListQuery(params: ListDifficultyAlertsParams): URLSearchParams {
  const query = new URLSearchParams();
  query.set("apenas_dificuldades", "true");
  if (params.turmaId) query.set("turma_id", String(params.turmaId));
  if (params.topic) query.set("topico", params.topic.trim());
  query.set("page", String(params.page ?? 1));
  query.set("size", String(params.size ?? 50));
  return query;
}

function buildPaginatedResult(
  items: DifficultyAlert[],
  page = 1,
  size = 50,
  pages?: number
) {
  return {
    items,
    total: items.length,
    page,
    size,
    pages: pages ?? (items.length > 0 ? 1 : 0),
  };
}

export interface ListDifficultyAlertsParams {
  turmaId?: number;
  topic?: string;
  page?: number;
  size?: number;
}

/**
 * Consulta os alertas de dificuldade e tópicos críticos de uma disciplina no backend.
 */
export async function listDifficultyAlerts(
  disciplineIdOrSlug: number | string,
  params: ListDifficultyAlertsParams = {}
): Promise<{
  items: DifficultyAlert[];
  total: number;
  page: number;
  size: number;
  pages: number;
}> {
  const key = String(disciplineIdOrSlug).trim().toLowerCase();
  const query = buildListQuery(params);
  const endpoint = `/cadeiras/${encodeURIComponent(
    String(disciplineIdOrSlug)
  )}/comentarios?${query.toString()}`;

  try {
    const response = await request<BackendComentarioPage | BackendComentarioItem[]>(
      endpoint
    );

    const adaptedItems = extractRawCommentItems(response)
      .filter(hasDifficultyTopic)
      .map(adaptBackendCommentToDifficultyAlert);

    const finalItems =
      adaptedItems.length > 0 ? adaptedItems : getLocalAlertsForDiscipline(key);

    if (Array.isArray(response)) {
      return buildPaginatedResult(finalItems, 1, finalItems.length || 50);
    }

    return buildPaginatedResult(
      finalItems,
      response.page ?? 1,
      response.size ?? 50,
      response.pages
    );
  } catch (err: unknown) {
    if (shouldUseLocalFallback(err)) {
      return buildPaginatedResult(getLocalAlertsForDiscipline(key));
    }
    throw mapDifficultyError(err);
  }
}

function validateAndNormalizeAlertInput(input: CreateDifficultyAlertInput) {
  const cleanTopic = input.topic?.trim() || "";
  if (!cleanTopic) {
    throw new ApiError(
      "Selecione ou informe a unidade/tópico crítico da ementa.",
      422
    );
  }

  const cleanContent = input.content?.trim() || "";
  if (cleanContent.length < DIFFICULTY_MIN_CHARS) {
    throw new ApiError(
      `O relato de dificuldade deve ter pelo menos ${DIFFICULTY_MIN_CHARS} caracteres.`,
      422
    );
  }
  if (cleanContent.length > DIFFICULTY_MAX_CHARS) {
    throw new ApiError(
      `O relato de dificuldade deve ter no máximo ${DIFFICULTY_MAX_CHARS} caracteres.`,
      422
    );
  }

  const validId =
    typeof input.disciplineId === "number" &&
    Number.isFinite(input.disciplineId) &&
    input.disciplineId > 0
      ? input.disciplineId
      : undefined;

  const targetSlugOrCode = input.disciplineSlugOrCode?.trim();
  if (!validId && !targetSlugOrCode) {
    throw new ApiError(
      "Identificador da disciplina ausente para envio do alerta.",
      422
    );
  }

  const resolvedAlias = input.isAnonymous
    ? "Estudante Anônimo"
    : input.authorAlias?.trim() || "Estudante Anônimo";

  return {
    cleanTopic,
    cleanContent,
    validId,
    targetSlugOrCode,
    resolvedAlias,
    encodedTopic: encodeTopicWithSeverity(cleanTopic, input.severity),
  };
}

/**
 * Submete um novo alerta de dificuldade e dica de estudo vinculada a um tópico crítico da ementa.
 */
export async function submitDifficultyAlert(
  input: CreateDifficultyAlertInput
): Promise<DifficultyAlert> {
  const {
    cleanTopic,
    cleanContent,
    validId,
    targetSlugOrCode,
    resolvedAlias,
    encodedTopic,
  } = validateAndNormalizeAlertInput(input);

  const endpoint = validId
    ? "/comentarios"
    : `/cadeiras/${encodeURIComponent(String(targetSlugOrCode))}/comentarios`;

  const payload = validId
    ? {
        disciplina_id: validId,
        turma_id: input.turmaId ?? null,
        autor_alias: resolvedAlias,
        topico_dificuldade: encodedTopic,
        conteudo: cleanContent,
      }
    : {
        turma_id: input.turmaId ?? null,
        autor_alias: resolvedAlias,
        topico_dificuldade: encodedTopic,
        conteudo: cleanContent,
      };

  try {
    const created = await request<BackendComentarioItem>(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return adaptBackendCommentToDifficultyAlert(created);
  } catch (err: unknown) {
    if (shouldUseLocalFallback(err)) {
      const nowIso = new Date().toISOString();
      const localCreated: DifficultyAlert = {
        id: `local-${Date.now()}`,
        disciplinaId: validId,
        turmaId: input.turmaId ?? null,
        authorAlias: resolvedAlias,
        isAnonymous: Boolean(input.isAnonymous),
        topic: cleanTopic,
        severity: input.severity,
        content: cleanContent,
        createdAt: formatAlertDate(nowIso),
        rawCreatedAt: nowIso,
        upvotes: 0,
        isLikedByMe: false,
      };
      const storageKey = String(targetSlugOrCode || validId).toLowerCase();
      saveLocalAlertForDiscipline(storageKey, localCreated);
      return localCreated;
    }
    throw mapDifficultyError(err);
  }
}

export const difficultyService = {
  listDifficultyAlerts,
  submitDifficultyAlert,
};

export default difficultyService;
