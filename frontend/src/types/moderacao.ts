import type { MaterialResponse } from "./material.ts";

export type DecisaoCuradoria = "APROVADO" | "RECUSADO";
export interface MaterialPendente extends MaterialResponse {
  disciplina: { id: number; nome: string; slug: string };
}
export interface FilaCuradoria {
  items: MaterialPendente[];
  total: number;
  pagina: number;
  tamanho_pagina: number;
}
export interface RegistroCuradoria {
  id: number;
  conteudo_id: number;
  moderador_id: string | null;
  perfil_moderador: string;
  status_anterior: string;
  status_novo: DecisaoCuradoria;
  justificativa: string | null;
  created_at: string;
}
