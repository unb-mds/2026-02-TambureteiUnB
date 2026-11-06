import type { MaterialResponse } from "./material.ts";

export type DecisaoCuradoria = "APROVADO" | "RECUSADO";

export type CategoriaDenuncia =
  | "OFENSA_DOCENTE"
  | "CONTEUDO_IMPROPRIO"
  | "GABARITO_ATIVO"
  | "SPAM"
  | "OUTRO";

export type AcaoDenuncia = "EXCLUIR_CONTEUDO" | "DESCARTAR_DENUNCIA";
export type FiltroTipoDenuncia = "TODOS" | "COMENTARIO" | "MATERIAL";
export type FiltroCategoriaDenuncia = "TODAS" | CategoriaDenuncia;

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

export interface DenunciaCreatePayload {
  comentario_id?: number;
  conteudo_id?: number;
  material_id?: number;
  categoria: CategoriaDenuncia;
  motivo: string;
}

export interface DenunciaResponse {
  id: number;
  tipo_alvo: "COMENTARIO" | "MATERIAL";
  comentario_id: number | null;
  conteudo_id: number | null;
  categoria: CategoriaDenuncia;
  motivo: string;
  status: string;
  total_denuncias_alvo: number;
  ocultado_automaticamente: boolean;
  created_at: string;
}

export interface AlvoDenunciadoResumo {
  id: number;
  tipo_alvo: "COMENTARIO" | "MATERIAL";
  titulo: string | null;
  conteudo: string;
  autor_alias: string;
  topico_dificuldade: string | null;
  formato: string | null;
  status_moderacao: string;
  created_at: string;
  disciplina: { id: number; nome: string; slug: string };
}

export interface DenunciaItemFila {
  id: number;
  tipo_alvo: "COMENTARIO" | "MATERIAL";
  comentario_id: number | null;
  conteudo_id: number | null;
  categoria: CategoriaDenuncia;
  motivo: string;
  status: string;
  created_at: string;
  total_denuncias: number;
  prioridade_rn04: boolean;
  sinalizacoes_rn04: string[];
  alvo: AlvoDenunciadoResumo;
}

export interface FilaDenuncias {
  items: DenunciaItemFila[];
  total: number;
  pagina: number;
  tamanho_pagina: number;
}

export interface ResumoDecisaoDenuncia {
  id: number;
  tipo_alvo: "COMENTARIO" | "MATERIAL";
  alvo_id: number;
  acao: AcaoDenuncia;
  status_denuncia: string;
  status_moderacao_alvo: string;
  denuncias_atualizadas: number;
  moderador_id: string | null;
  perfil_moderador: string;
  justificativa: string | null;
  resolved_at: string;
}
