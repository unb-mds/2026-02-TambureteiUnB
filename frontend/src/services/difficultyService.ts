import {
  type BackendComentarioItem,
  type BackendComentarioPage,
  type CreateDifficultyAlertInput,
  type DifficultyAlert,
  adaptBackendCommentToDifficultyAlert,
  encodeTopicWithSeverity,
} from "../types/dificuldade.ts";
import { ApiError, request } from "./httpClient.ts";

export const DIFFICULTY_MIN_CHARS = 10;
export const DIFFICULTY_MAX_CHARS = 2000;

const DIFFICULTY_ERROR_MESSAGES_BY_STATUS: Record<number, string> = {
  401: "Sessão expirada ou não autenticada. Faça login para registrar alertas de dificuldade.",
  403: "Você não possui permissão para executar esta ação.",
  404: "Disciplina não encontrada para registro do alerta de dificuldade.",
  422: "Dados inválidos no alerta de dificuldade. Verifique o tópico e o relato informado.",
};

function mapDifficultyError(err: unknown): ApiError {
  if (err instanceof ApiError) {
    const hasSpecificServerMessage =
      Boolean(err.message) && !/^Erro HTTP \d+$/.test(err.message.trim());
    const resolvedMessage =
      err.status === 422 && hasSpecificServerMessage
        ? err.message
        : DIFFICULTY_ERROR_MESSAGES_BY_STATUS[err.status] ?? err.message;
    return new ApiError(resolvedMessage, err.status, err.data);
  }
  return new ApiError(
    "Falha na conexão com o servidor ao processar os alertas de dificuldade.",
    0
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
  const query = buildListQuery(params);
  const endpoint = `/cadeiras/${encodeURIComponent(
    String(disciplineIdOrSlug)
  )}/comentarios?${query.toString()}`;

  try {
    const response = await request<BackendComentarioPage | BackendComentarioItem[]>(
      endpoint,
      { cache: "no-store" }
    );

    const adaptedItems = extractRawCommentItems(response)
      .filter(hasDifficultyTopic)
      .map(adaptBackendCommentToDifficultyAlert);

    if (Array.isArray(response)) {
      return buildPaginatedResult(adaptedItems, 1, adaptedItems.length || 50);
    }

    return buildPaginatedResult(
      adaptedItems,
      response.page ?? 1,
      response.size ?? 50,
      response.pages
    );
  } catch (err: unknown) {
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
    throw mapDifficultyError(err);
  }
}

export interface DifficultyVoteResponse {
  comentario_id: number;
  upvotes: number;
  liked_by_me: boolean;
}

export async function toggleDifficultyVote(
  commentId: number
): Promise<DifficultyVoteResponse> {
  return request<DifficultyVoteResponse>(`/comentarios/${commentId}/voto`, {
    method: "POST",
  });
}

export async function updateDifficultyAlert(
  commentId: number,
  input: { topic: string; severity: DifficultyAlert["severity"]; content: string }
): Promise<DifficultyAlert> {
  const cleanTopic = input.topic.trim();
  const cleanContent = input.content.trim();
  if (!cleanTopic) {
    throw new ApiError("Selecione ou informe a unidade da ementa.", 422);
  }
  if (cleanContent.length < DIFFICULTY_MIN_CHARS) {
    throw new ApiError(
      `Descreva sua dica ou dificuldade com pelo menos ${DIFFICULTY_MIN_CHARS} caracteres.`,
      422
    );
  }
  if (cleanContent.length > DIFFICULTY_MAX_CHARS) {
    throw new ApiError(
      `O relato excede o limite de ${DIFFICULTY_MAX_CHARS} caracteres.`,
      422
    );
  }

  try {
    const updated = await request<BackendComentarioItem>(`/comentarios/${commentId}`, {
      method: "PATCH",
      body: JSON.stringify({
        conteudo: cleanContent,
        topico_dificuldade: encodeTopicWithSeverity(cleanTopic, input.severity),
      }),
    });
    return adaptBackendCommentToDifficultyAlert(updated);
  } catch (err: unknown) {
    throw mapDifficultyError(err);
  }
}

export async function deleteDifficultyAlert(commentId: number): Promise<void> {
  try {
    await request<void>(`/comentarios/${commentId}`, {
      method: "DELETE",
    });
  } catch (err: unknown) {
    throw mapDifficultyError(err);
  }
}

export const difficultyService = {
  listDifficultyAlerts,
  submitDifficultyAlert,
  toggleDifficultyVote,
  updateDifficultyAlert,
  deleteDifficultyAlert,
};

export default difficultyService;
