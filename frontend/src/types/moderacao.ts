import type { MaterialResponse } from "./material.ts";

export type DecisaoCuradoria = "APROVADO" | "RECUSADO";
export type DecisaoComentarioCuradoria = "PUBLICADO" | "OCULTO";

export interface MaterialPendente extends MaterialResponse {
  motivo_moderacao?: string | null;
  confianca_ia?: number | null;
  moderado_por?: string | null;
  disciplina: { id: number; nome: string; slug: string };
}

export interface FilaCuradoria {
  items: MaterialPendente[];
  total: number;
  pagina: number;
  tamanho_pagina: number;
}

export interface ComentarioPendente {
  id: number;
  disciplina_id: number;
  turma_id: number | null;
  autor_alias: string;
  topico_dificuldade: string | null;
  conteudo: string;
  status_moderacao: string;
  motivo_moderacao?: string | null;
  confianca_ia?: number | null;
  moderado_por?: string | null;
  created_at: string;
  disciplina: { id: number; nome: string; slug: string };
}

export interface FilaComentariosCuradoria {
  items: ComentarioPendente[];
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
