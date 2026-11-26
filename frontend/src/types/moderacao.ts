import type { MaterialResponse } from "./material.ts";

export type DecisaoCuradoria = "APROVADO" | "RECUSADO";
export type DecisaoComentarioCuradoria = "PUBLICADO" | "OCULTO";

export type CategoriaDenuncia =
  | "OFENSA_DOCENTE"
  | "CONTEUDO_IMPROPRIO"
  | "GABARITO_ATIVO"
  | "SPAM"
  | "OUTRO";

export type AcaoDenuncia = "EXCLUIR_CONTEUDO" | "DESCARTAR_DENUNCIA";
export type FiltroTipoDenuncia = "TODOS" | "COMENTARIO" | "MATERIAL";
export type FiltroCategoriaDenuncia = "TODAS" | CategoriaDenuncia;
export type FiltroSituacaoDenuncia = "TODOS" | "OCULTADOS" | "ABAIXO_LIMIAR";

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
  url_origem?: string | null;
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

export type TipoEnvioPizza = "IMAGEM" | "TEXTO";
export type DecisaoPizzaStatus = "CONSOLIDADA" | "DESCARTADA";

export interface PizzaModeracaoItem {
  id: number;
  turma_id: number;
  codigo_turma: string;
  semestre_referencia: string;
  disciplina_id: number;
  disciplina_codigo: string;
  disciplina_nome: string;
  disciplina_slug: string;
  professores: string[];
  tipo_envio: TipoEnvioPizza;
  possui_imagem: boolean;
  taxa_aprovacao: number | null;
  taxa_reprovacao_nota: number | null;
  taxa_reprovacao_falta: number | null;
  taxa_trancamento: number | null;
  quantidade_envios: number;
  outros_iguais: number;
  minimo_outros_iguais: number;
  selo_verde: boolean;
  created_at: string;
}

export interface PizzaModeracaoSemestreGrupo {
  semestre: string;
  total: number;
  itens: PizzaModeracaoItem[];
}

export interface FilaPizzasModeracao {
  grupos_semestre: PizzaModeracaoSemestreGrupo[];
  total_itens: number;
  total_envios_pendentes: number;
}

export interface DecisaoPizzaPayload {
  status: DecisaoPizzaStatus;
  taxa_aprovacao?: number | null;
  taxa_reprovacao_nota?: number | null;
  taxa_reprovacao_falta?: number | null;
  taxa_trancamento?: number | null;
  justificativa?: string | null;
}

export interface ResumoDecisaoPizza {
  id: number;
  turma_id: number;
  semestre_referencia: string;
  status: string;
  tipo_envio: string;
  doacoes_atualizadas: number;
  moderado_por_id: string;
  moderado_em: string;
  justificativa: string | null;
}
