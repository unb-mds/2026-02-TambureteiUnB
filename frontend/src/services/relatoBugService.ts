import { request } from "./httpClient.ts";

export interface RelatoBug {
  id: number;
  titulo: string;
  descricao: string;
  pagina: string;
  status: "PENDENTE" | "RESOLVIDO" | "DESCARTADO";
  justificativa: string | null;
  resolvido_em: string | null;
  created_at: string;
}
export interface FilaRelatosBugs {
  items: RelatoBug[];
  total: number;
  pagina: number;
  tamanho_pagina: number;
}
export function enviarRelatoBug(dados: { titulo: string; descricao: string; pagina: string }) {
  return request<RelatoBug>("/relatos-bugs", { method: "POST", body: JSON.stringify(dados) });
}
export function listarRelatosBugs(pagina = 1) {
  return request<FilaRelatosBugs>(`/moderacao/bugs?pagina=${pagina}`, { cache: "no-store" });
}
export function decidirRelatoBug(id: number, status: "RESOLVIDO" | "DESCARTADO", justificativa: string) {
  return request<RelatoBug>(`/moderacao/bugs/${id}`, { method: "PATCH", body: JSON.stringify({ status, justificativa }) });
}
