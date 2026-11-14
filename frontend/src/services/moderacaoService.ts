import type { UserResponse } from "../types/auth.ts";
import type {
  AcaoDenuncia,
  CategoriaDenuncia,
  DecisaoCuradoria,
  DenunciaCreatePayload,
  DenunciaResponse,
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
