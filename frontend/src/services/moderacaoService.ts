import type { UserResponse } from "../types/auth.ts";
import type { DecisaoCuradoria, FilaCuradoria, RegistroCuradoria } from "../types/moderacao.ts";
import { API_BASE_URL, ApiError, getStoredToken, request } from "./httpClient.ts";

export function podeModerar(role: string): boolean {
  return role === "MODERATOR" || role === "ADMIN";
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
