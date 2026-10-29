import type {
  MaterialPageResponse,
  MaterialResponse,
  MaterialType,
  UploadProgressInfo,
} from "../types/material.ts";
import { ApiError, request } from "./httpClient.ts";

export interface SingleUploadOptions {
  disciplineIdOrSlug: string | number;
  title: string;
  file: File;
  type?: MaterialType;
  onProgress?: (progress: { percent: number; loadedBytes: number; totalBytes: number }) => void;
  signal?: AbortSignal;
}

export interface BatchUploadOptions {
  disciplineIdOrSlug: string | number;
  items: Array<{
    title: string;
    file: File;
    type?: MaterialType;
  }>;
  onProgress?: (info: UploadProgressInfo) => void;
  signal?: AbortSignal;
}

const UPLOAD_ERROR_MESSAGES_BY_STATUS: Record<number, string> = {
  401: "Sessao expirada ou nao autenticada. Faca login novamente.",
  403: "Apenas usuarios com perfil de estudante (STUDENT) podem enviar materiais.",
  404: "Disciplina nao encontrada no sistema.",
  413: "O arquivo excede o limite maximo de 5 MiB permitido pelo servidor.",
  415: "Formato de arquivo nao aceito. Envie apenas PDF, PNG ou JPG.",
  503: "Servico de armazenamento temporariamente indisponivel. Tente novamente mais tarde.",
};

function mapUploadErrorMessage(status: number, fallbackMessage: string): string {
  return UPLOAD_ERROR_MESSAGES_BY_STATUS[status] ?? fallbackMessage;
}

function buildMaterialFormData(title: string, type: MaterialType, file: File): FormData {
  const formData = new FormData();
  formData.append("titulo", title.trim());
  formData.append("tipo", type);
  formData.append("arquivo", file, file.name);
  return formData;
}

function normalizeUploadError(err: unknown, signal?: AbortSignal): ApiError {
  if (signal?.aborted || (err instanceof Error && err.name === "AbortError")) {
    return new ApiError("Envio cancelado pelo usuario.", 0);
  }

  if (err instanceof ApiError) {
    return new ApiError(
      mapUploadErrorMessage(err.status, err.message),
      err.status,
      err.data
    );
  }

  return new ApiError(
    "Falha na conexao com o servidor. Verifique sua rede e se a API esta em execucao.",
    0
  );
}

function calculateBatchProgress(
  fileIndex: number,
  totalFiles: number,
  singlePercent: number,
  loadedPerFile: number[],
  totalBytesSum: number
): UploadProgressInfo {
  const currentTotalLoaded = loadedPerFile.reduce((acc, curr) => acc + curr, 0);
  const overallPercent =
    totalBytesSum > 0
      ? Math.min(100, Math.round((currentTotalLoaded / totalBytesSum) * 100))
      : Math.round(((fileIndex + singlePercent / 100) / totalFiles) * 100);

  return {
    currentFileIndex: fileIndex + 1,
    totalFiles,
    percent: overallPercent,
    loadedBytes: currentTotalLoaded,
    totalBytes: totalBytesSum,
  };
}

/**
 * Envia um único arquivo para o endpoint multipart /cadeiras/{id}/materiais
 * utilizando a Fetch API nativa do Next.js via httpClient.
 */
export async function uploadMaterial(
  options: SingleUploadOptions
): Promise<MaterialResponse> {
  const { disciplineIdOrSlug, title, file, type = "ARQUIVO", onProgress, signal } = options;

  if (signal?.aborted) {
    throw new ApiError("Envio cancelado pelo usuario.", 0);
  }

  const formData = buildMaterialFormData(title, type, file);
  onProgress?.({ percent: 0, loadedBytes: 0, totalBytes: file.size });

  const endpoint = `/cadeiras/${encodeURIComponent(disciplineIdOrSlug)}/materiais`;

  try {
    const response = await request<MaterialResponse>(endpoint, {
      method: "POST",
      body: formData,
      signal,
    });

    onProgress?.({ percent: 100, loadedBytes: file.size, totalBytes: file.size });
    return response;
  } catch (err: unknown) {
    throw normalizeUploadError(err, signal);
  }
}

/**
 * Envia múltiplos materiais em sequência, agregando o progresso total ponderado.
 */
export async function uploadMaterialsBatch(
  options: BatchUploadOptions
): Promise<MaterialResponse[]> {
  const { disciplineIdOrSlug, items, onProgress, signal } = options;
  const results: MaterialResponse[] = [];
  const totalFiles = items.length;

  if (totalFiles === 0) {
    return results;
  }

  const totalBytesSum = items.reduce((acc, it) => acc + it.file.size, 0);
  const loadedPerFile = new Array<number>(totalFiles).fill(0);

  for (let i = 0; i < totalFiles; i++) {
    if (signal?.aborted) {
      throw new ApiError("Operacao cancelada pelo usuario.", 0);
    }

    const item = items[i];
    const uploaded = await uploadMaterial({
      disciplineIdOrSlug,
      title: item.title,
      file: item.file,
      type: item.type,
      signal,
      onProgress: (singleProg) => {
        loadedPerFile[i] = singleProg.loadedBytes;
        onProgress?.(
          calculateBatchProgress(i, totalFiles, singleProg.percent, loadedPerFile, totalBytesSum)
        );
      },
    });

    loadedPerFile[i] = item.file.size;
    results.push(uploaded);
  }

  return results;
}

/**
 * Consulta a lista de materiais ativos da disciplina.
 */
export async function listMaterials(
  disciplineIdOrSlug: string | number,
  params: { titulo?: string; tipo?: string; pagina?: number; tamanho_pagina?: number } = {}
): Promise<MaterialPageResponse> {
  const query = new URLSearchParams();
  if (params.titulo) query.set("titulo", params.titulo);
  if (params.tipo) query.set("tipo", params.tipo);
  if (params.pagina) query.set("pagina", String(params.pagina));
  if (params.tamanho_pagina) query.set("tamanho_pagina", String(params.tamanho_pagina));

  const qs = query.toString();
  const endpoint = `/cadeiras/${encodeURIComponent(disciplineIdOrSlug)}/materiais${
    qs ? `?${qs}` : ""
  }`;
  return request<MaterialPageResponse>(endpoint);
}

export const materialService = {
  uploadMaterial,
  uploadMaterialsBatch,
  listMaterials,
};

export default materialService;
