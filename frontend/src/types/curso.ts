export type Campus = "FGA" | "Darcy Ribeiro" | "FCE" | "FUP" | string;
export type CampusFilter = "Todos" | "FGA" | "Darcy Ribeiro" | "FCE" | "FUP" | string;

export interface Course {
  id?: string;
  codigo_mec?: string;
  nome: string;
  campus: string;
  grau?: string;
  turno?: string;
  slug: string;
  departamento?: string;
  semestres?: number;
  total_disciplinas?: number;
  descricao?: string;
}

export interface CourseGradeDisciplina {
  codigo?: string;
  nome: string;
  slug: string;
  departamento?: string;
  creditos?: number;
  carga_horaria?: number;
  periodo_sugerido?: number;
  is_obrigatoria: boolean;
  natureza: string;
}

export interface CourseDetail extends Course {
  modalidade?: string;
  area_geral?: string;
  area_especifica?: string;
  metricas_2024?: {
    vagas_totais: number;
    inscritos_total: number;
    ingressantes: number;
    matriculados: number;
    concluintes: number;
    trancados: number;
    desvinculados: number;
  };
  disciplinas?: CourseGradeDisciplina[];
}

export const CAMPUS_LIST: CampusFilter[] = [
  "Todos",
  "FGA",
  "Darcy Ribeiro",
  "FCE",
  "FUP",
];
