import type { UserResponse } from "../types/auth.ts";
import type {
  AcaoDenuncia,
  CategoriaDenuncia,
  ComentarioPendente,
  DecisaoComentarioCuradoria,
  DecisaoCuradoria,
  DenunciaCreatePayload,
  DenunciaResponse,
  FilaComentariosCuradoria,
  FilaCuradoria,
  FilaDenuncias,
  FiltroCategoriaDenuncia,
  FiltroTipoDenuncia,
  RegistroCuradoria,
  ResumoDecisaoDenuncia,
} from "../types/moderacao.ts";
import { API_BASE_URL, ApiError, getStoredToken, request } from "./httpClient.ts";

export const ROTULOS_CATEGORIA_DENUNCIA: Record<CategoriaDenuncia, string> = {
  OFENSA_DOCENTE: "Ataque ou ofensa a docente (RN04)",
  CONTEUDO_IMPROPRIO: "Conteúdo ofensivo ou impróprio",
  GABARITO_ATIVO: "Gabarito de avaliação vigente (RN05)",
  SPAM: "Spam ou divulgação indevida",
  OUTRO: "Outra violação das diretrizes",
};

export function podeModerar(role: string): boolean {
  return role === "MODERATOR" || role === "ADMIN";
}

export function validarMotivoDenuncia(motivo: string): { valido: boolean; erro?: string } {
  const limpo = (motivo || "").trim();
  if (!limpo) {
    return { valido: false, erro: "Informe o motivo da denúncia." };
  }
  if (limpo.length < 5) {
    return { valido: false, erro: "O motivo da denúncia deve ter no mínimo 5 caracteres." };
  }
  if (limpo.length > 1000) {
    return { valido: false, erro: "O motivo da denúncia deve ter no máximo 1000 caracteres." };
  }
  return { valido: true };
}

export async function verificarModerador(): Promise<UserResponse> {
  if (!getStoredToken()) throw new ApiError("Faça login para acessar a moderação.", 401);
  // Nunca autorizar pelo perfil em cache: consultar a sessão no servidor.
  const user = await request<UserResponse>("/auth/me", { cache: "no-store" });
  if (!podeModerar(user.role) || user.is_active === false) {
    throw new ApiError("Acesso restrito a moderadores e administradores.", 403);
  }
  return user;
}

export function listarPendentes(pagina = 1): Promise<FilaCuradoria> {
  return request<FilaCuradoria>(`/moderacao/materiais?pagina=${pagina}&tamanho_pagina=20`, { cache: "no-store" });
}

export function decidirCuradoria(id: number, status: DecisaoCuradoria, justificativa?: string): Promise<RegistroCuradoria> {
  return request<RegistroCuradoria>(`/moderacao/conteudos/${id}/curadoria`, {
    method: "PATCH",
    body: JSON.stringify({ status, justificativa: justificativa?.trim() || null }),
  });
}

export function listarComentariosPendentes(pagina = 1): Promise<FilaComentariosCuradoria> {
  return request<FilaComentariosCuradoria>(`/moderacao/comentarios?pagina=${pagina}&tamanho_pagina=20`, {
    cache: "no-store",
  });
}

export function decidirComentarioCuradoria(
  id: number,
  status: DecisaoComentarioCuradoria,
  justificativa?: string,
): Promise<ComentarioPendente> {
  return request<ComentarioPendente>(`/moderacao/comentarios/${id}/curadoria`, {
    method: "PATCH",
    body: JSON.stringify({ status, justificativa: justificativa?.trim() || null }),
  });
}

export function obterHistorico(id: number): Promise<RegistroCuradoria[]> {
  return request<RegistroCuradoria[]>(`/moderacao/conteudos/${id}/historico`, { cache: "no-store" });
}

export async function baixarParaAnalise(id: number): Promise<Blob> {
  const token = getStoredToken();
  if (!token) throw new ApiError("Sua sessão expirou. Faça login novamente.", 401);
  const response = await fetch(`${API_BASE_URL}/moderacao/materiais/${id}/download`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  if (!response.ok) {
    let mensagem = "Não foi possível baixar o arquivo para análise.";
    try {
      const body = await response.json();
      if (typeof body.detail === "string") mensagem = body.detail;
    } catch { /* Resposta sem JSON: preservar mensagem legível. */ }
    throw new ApiError(mensagem, response.status);
  }
  return response.blob();
}

export async function criarDenuncia(payload: DenunciaCreatePayload): Promise<DenunciaResponse> {
  const alvoConteudo = payload.conteudo_id ?? payload.material_id;
  const temComentario = typeof payload.comentario_id === "number" && payload.comentario_id > 0;
  const temConteudo = typeof alvoConteudo === "number" && alvoConteudo > 0;

  if (temComentario === temConteudo) {
    throw new ApiError("Informe um alvo válido para registrar a denúncia.", 400);
  }

  const validacao = validarMotivoDenuncia(payload.motivo);
  if (!validacao.valido) {
    throw new ApiError(validacao.erro || "Motivo da denúncia inválido.", 422);
  }

  const corpo: Record<string, unknown> = {
    categoria: payload.categoria,
    motivo: payload.motivo.trim(),
  };
  if (temComentario) {
    corpo.comentario_id = payload.comentario_id;
  } else {
    corpo.conteudo_id = alvoConteudo;
  }

  return request<DenunciaResponse>("/comunidade/denuncias", {
    method: "POST",
    body: JSON.stringify(corpo),
  });
}

export function listarDenunciasPendentes(
  pagina = 1,
  tipo: FiltroTipoDenuncia = "TODOS",
  categoria: FiltroCategoriaDenuncia = "TODAS",
): Promise<FilaDenuncias> {
  const params = new URLSearchParams({
    pagina: String(pagina),
    tamanho_pagina: "20",
  });
  if (tipo && tipo !== "TODOS") {
    params.set("tipo", tipo);
  }
  if (categoria && categoria !== "TODAS") {
    params.set("categoria", categoria);
  }
  return request<FilaDenuncias>(`/moderacao/denuncias?${params.toString()}`, {
    cache: "no-store",
  });
}

export function decidirDenuncia(
  id: number,
  acao: AcaoDenuncia,
  justificativa?: string,
): Promise<ResumoDecisaoDenuncia> {
  const limpa = justificativa?.trim() || null;
  if (limpa && limpa.length > 1000) {
    return Promise.reject(new ApiError("A justificativa deve ter no máximo 1000 caracteres.", 422));
  }
  return request<ResumoDecisaoDenuncia>(`/moderacao/denuncias/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ acao, justificativa: limpa }),
  });
}

export type TipoAvisoTriagem = "pending" | "approved" | "rejected" | "review" | "error";

export interface AvisoTriagemComentario {
  kind: TipoAvisoTriagem;
  text: string;
}

export interface BackendComentarioStatus {
  id: number;
  status_moderacao: string;
  motivo_moderacao?: string | null;
  moderado_por?: string | null;
  confianca_ia?: number | null;
}

export function consultarStatusComentario(comentarioId: number): Promise<BackendComentarioStatus> {
  return request<BackendComentarioStatus>(`/comentarios/${comentarioId}/status`, {
    cache: "no-store",
  });
}

export function resolverAvisoTriagemComentario(
  statusResp: BackendComentarioStatus,
  contexto: "relato" | "resposta" | "dificuldade" = "relato",
): AvisoTriagemComentario | null {
  const status = (statusResp.status_moderacao || "").toUpperCase();
  const motivo = statusResp.motivo_moderacao?.trim();
  const artigo = contexto === "resposta" ? "Sua resposta" : contexto === "dificuldade" ? "Seu relato de dificuldade" : "Seu comentário";

  if (status === "PUBLICADO") {
    return {
      kind: "approved",
      text: `[PUBLICADO] ${artigo} foi aprovado pela moderação automática e já está visível abaixo.`,
    };
  }

  if (status === "OCULTO") {
    return {
      kind: "rejected",
      text: motivo
        ? `[RECUSADO] ${artigo} foi recusado pela moderação e não será publicado. Motivo: ${motivo}`
        : `[RECUSADO] ${artigo} foi recusado pela moderação e não será publicado.`,
    };
  }

  if (status === "PENDENTE" && (Boolean(statusResp.moderado_por) || Boolean(motivo))) {
    return {
      kind: "review",
      text: motivo
        ? `[EM REVISÃO] ${artigo} foi encaminhado para análise da moderação antes de ser publicado. Detalhe: ${motivo}`
        : `[EM REVISÃO] ${artigo} foi encaminhado para análise da moderação antes de ser publicado.`,
    };
  }

  return null;
}

export function getTriageBannerClasses(kind: TipoAvisoTriagem): string {
  switch (kind) {
    case "approved":
      return "border-emerald-300 bg-emerald-50 text-emerald-800";
    case "rejected":
    case "error":
      return "border-red-300 bg-red-50 text-red-800";
    case "review":
      return "border-amber-300 bg-amber-50 text-amber-900";
    default:
      return "border-[#EDE9FD] bg-[#FAF9FD] text-[#5B4BDB]";
  }
}

export function iniciarPollingStatusComentario(options: {
  commentId: number;
  contexto: "relato" | "resposta" | "dificuldade";
  onStatus: (aviso: AvisoTriagemComentario) => void;
  onApproved?: () => Promise<void> | void;
  onFallbackCheckPublished?: () => Promise<boolean>;
  maxAttempts?: number;
  intervalMs?: number;
}): () => void {
  const {
    commentId,
    contexto,
    onStatus,
    onApproved,
    onFallbackCheckPublished,
    maxAttempts = 20,
    intervalMs = 1500,
  } = options;

  let cancelled = false;
  let attempts = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const scheduleNext = () => {
    if (cancelled) return;
    timer = setTimeout(() => {
      void tick();
    }, intervalMs);
  };

  const tick = async () => {
    if (cancelled) return;
    attempts += 1;

    try {
      const statusResp = await consultarStatusComentario(commentId);
      if (cancelled) return;
      const aviso = resolverAvisoTriagemComentario(statusResp, contexto);
      if (aviso) {
        if (aviso.kind === "approved" && onApproved) {
          await onApproved();
          if (cancelled) return;
        }
        onStatus(aviso);
        return;
      }
    } catch {
      if (onFallbackCheckPublished) {
        const published = await onFallbackCheckPublished();
        if (cancelled) return;
        if (published) {
          onStatus({
            kind: "approved",
            text:
              contexto === "resposta"
                ? "[PUBLICADO] Sua resposta foi aprovada pela moderação automática e já está visível abaixo."
                : "[PUBLICADO] Seu relato foi aprovado pela moderação automática e já está visível abaixo.",
          });
          return;
        }
      }
    }

    if (attempts < maxAttempts) {
      scheduleNext();
    } else {
      const label =
        contexto === "resposta"
          ? "Sua resposta"
          : contexto === "dificuldade"
          ? "Seu relato de dificuldade"
          : "Seu comentário";
      onStatus({
        kind: "review",
        text: `[EM REVISÃO] ${label} segue em análise pela equipe de moderação.`,
      });
    }
  };

  scheduleNext();

  return () => {
    cancelled = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
}
