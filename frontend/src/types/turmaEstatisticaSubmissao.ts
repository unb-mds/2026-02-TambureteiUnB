export interface TurmaEstatisticaSubmissaoPayload {
  codigo_disciplina: string;
  nome_disciplina: string;
  codigo_turma: string;
  semestre: string;
  docente?: string;
  taxa_aprovacao_pct?: number;
  taxa_reprovacao_pct?: number;
  taxa_reprovacao_falta_pct?: number;
  taxa_trancamento_pct?: number;
  total_matriculados?: number;
  imagem_estatistica_base64?: string;
}

export interface TurmaCursadaVerificada {
  turma_id?: number;
  codigo: string;
  nome: string;
  turma: string;
  semestre: string;
  professores: string[];
  situacao: string;
  comprovado_pelo_historico: boolean;
}

export interface TurmaEstatisticaStatusItem {
  codigo: string;
  turma: string;
  semestre: string;
  turma_id: number | null;
  ja_possui_pizza: boolean;
  ja_possui_historico: boolean;
  ja_enviada_usuario: boolean;
}
