export type OpenDataFormat = "csv" | "json";

export type OpenDataScope =
  | "cursos"
  | "disciplinas"
  | "historico_disciplina"
  | "turmas_disciplina";

export interface OpenDataColumnDefinition<T> {
  key: keyof T & string;
  header: string;
}

export interface CourseOpenDataRow {
  codigo_mec: string;
  nome: string;
  slug: string;
  campus: string;
  departamento: string;
  grau: string;
  turno: string;
  semestres: number;
  total_disciplinas: number;
  matriculados_recentes: number | null;
  concluintes_recentes: number | null;
  taxa_sucesso_pct: number | null;
  taxa_evasao_pct: number | null;
}

export interface DisciplineOpenDataRow {
  codigo: string;
  nome: string;
  slug: string;
  departamento: string;
  nome_departamento: string;
  campus: string;
  grande_area: string;
  creditos_descricao: string;
  carga_horaria_h: number;
  taxa_aprovacao_pct: number;
  taxa_reprovacao_nota_pct: number;
  taxa_reprovacao_falta_pct: number;
  taxa_trancamento_pct: number;
  total_materiais_relatos: number;
}

export interface HistoricalPerformanceOpenDataRow {
  codigo_disciplina: string;
  nome_disciplina: string;
  semestre_letivo: string;
  total_avaliados: number;
  aprovados: number;
  reprovados_nota: number;
  reprovados_falta: number;
  trancamentos: number;
  taxa_aprovacao_pct: number;
  taxa_reprovacao_nota_pct: number;
  taxa_reprovacao_falta_pct: number;
  taxa_trancamento_pct: number;
}

export interface ClassOpenDataRow {
  codigo_disciplina: string;
  codigo_turma: string;
  semestre_letivo: string;
  docentes: string;
  turno: string;
  horarios: string;
  local: string;
  vagas_ocupadas: number;
  total_vagas: number;
  taxa_ocupacao_pct: number;
}

export interface OpenDataEnvelope<T> {
  plataforma: string;
  instituicao: string;
  requisito: string;
  conformidade_lgpd: string;
  escopo: OpenDataScope;
  identificador_contexto: string | null;
  gerado_em: string;
  total_registros: number;
  dados: T[];
}

export interface OpenDataExportResult {
  filename: string;
  mimeType: string;
  format: OpenDataFormat;
  scope: OpenDataScope;
  recordCount: number;
  content: string;
}
