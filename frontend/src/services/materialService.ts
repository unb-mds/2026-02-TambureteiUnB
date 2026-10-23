import type {
  MaterialPageResponse,
  MaterialResponse,
  MaterialType,
  UploadProgressInfo,
} from "../types/material.ts";
import { API_BASE_URL, ApiError, getStoredToken, request } from "./httpClient.ts";

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

/**
 * Envia um único arquivo para o endpoint multipart /cadeiras/{id}/materiais
 * utilizando XMLHttpRequest para permitir medição precisa de bytes transferidos.
 */
export function uploadMaterial(options: SingleUploadOptions): Promise<MaterialResponse> {
  const { disciplineIdOrSlug, title, file, type = "ARQUIVO", onProgress, signal } = options;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${API_BASE_URL}/cadeiras/${encodeURIComponent(disciplineIdOrSlug)}/materiais`;

    xhr.open("POST", url, true);

    // Injeta o token Bearer JWT caso o usuário esteja autenticado
    const token = getStoredToken();
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    // Monitora o progresso real da transferência via xhr.upload
    if (xhr.upload && onProgress) {
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
          onProgress({
            percent,
            loadedBytes: event.loaded,
            totalBytes: event.total,
          });
        }
      });
    }

    // Suporte a cancelamento da requisição
    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        reject(new ApiError("Envio cancelado pelo usuario.", 0));
        return;
      }
      signal.addEventListener("abort", () => {
        xhr.abort();
        reject(new ApiError("Envio cancelado pelo usuario.", 0));
      });
    }

    xhr.onload = () => {
      let responseBody: unknown = null;
      try {
        responseBody = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        responseBody = xhr.responseText;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(responseBody as MaterialResponse);
        return;
      }

      let errorMessage = `Erro HTTP ${xhr.status}`;
      const parsed = responseBody as Record<string, unknown> | null;

      if (xhr.status === 401) {
        errorMessage = "Sessao expirada ou nao autenticada. Faca login novamente.";
      } else if (xhr.status === 403) {
        errorMessage = "Apenas usuarios com perfil de estudante (STUDENT) podem enviar materiais.";
      } else if (xhr.status === 413) {
        errorMessage = "O arquivo excede o limite maximo de 5 MiB permitido pelo servidor.";
      } else if (xhr.status === 415) {
        errorMessage = "Formato de arquivo nao aceito. Envie apenas PDF, PNG ou JPG.";
      } else if (xhr.status === 404) {
        errorMessage = "Disciplina nao encontrada no sistema.";
      } else if (xhr.status === 503) {
        errorMessage = "Servico de armazenamento temporariamente indisponivel. Tente novamente mais tarde.";
      } else if (typeof parsed?.detail === "string") {
        errorMessage = parsed.detail;
      } else if (Array.isArray(parsed?.detail)) {
        const msgs = parsed.detail
          .map((item: unknown) => {
            if (typeof item === "string") return item;
            if (item && typeof item === "object" && "msg" in item) {
              return String((item as { msg: unknown }).msg).replace(/^Value error,\s*/i, "");
            }
            return null;
          })
          .filter(Boolean);
        if (msgs.length > 0) errorMessage = msgs.join(" • ");
      } else if (typeof parsed?.message === "string") {
        errorMessage = parsed.message;
      }

      reject(new ApiError(errorMessage, xhr.status, responseBody));
    };

    xhr.onerror = () => {
      reject(
        new ApiError(
          "Falha na conexao com o servidor. Verifique sua rede e se a API esta em execucao.",
          0
        )
      );
    };

    xhr.ontimeout = () => {
      reject(new ApiError("Tempo de conexao esgotado durante o envio do arquivo.", 0));
    };

    // Monta o FormData com os campos exigidos pela API
    // ATENCAO: Nao definir manualmente Content-Type; o navegador define com o boundary correto.
    const formData = new FormData();
    formData.append("titulo", title.trim());
    formData.append("tipo", type);
    formData.append("arquivo", file, file.name);

    xhr.send(formData);
  });
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

  const fileSizes = items.map((it) => it.file.size);
  const totalBytesSum = fileSizes.reduce((acc, curr) => acc + curr, 0);
  const loadedPerFile = new Array(totalFiles).fill(0);

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
        const currentTotalLoaded = loadedPerFile.reduce((acc, curr) => acc + curr, 0);
        const overallPercent =
          totalBytesSum > 0
            ? Math.min(100, Math.round((currentTotalLoaded / totalBytesSum) * 100))
            : Math.round(((i + singleProg.percent / 100) / totalFiles) * 100);

        if (onProgress) {
          onProgress({
            currentFileIndex: i + 1,
            totalFiles,
            percent: overallPercent,
            loadedBytes: currentTotalLoaded,
            totalBytes: totalBytesSum,
          });
        }
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
