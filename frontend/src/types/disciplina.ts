export interface HistoricalPerformance {
  semester: string;
  approved: number;
  failed: number;
  absent: number;
  withdrawn: number;
}

export interface DisciplineMetric {
  label: string;
  value: string;
  count: string;
  color: string;
  iconColor: string;
  background: string;
}

export interface CourseReference {
  name: string;
  slug: string;
  semester: string;
  type: "Obrigatória" | "Optativa";
}

export interface Discipline {
  code: string;
  name: string;
  slug: string;
  department: string;
  departmentName: string;
  campus: string;
  campusFilter: string;
  area: "Exatas" | "Tecnologia" | "Saúde" | "Humanas";
  credits: string;
  hours: number;
  approval: number;
  failedGrade?: number;
  failedAttendance?: number;
  withdrawn?: number;
  resources: number;
  popularity: number;
  semester?: string;
  type?: "Obrigatória" | "Optativa";
  ementa?: string;
  objectives?: string[];
  historicalPerformance?: HistoricalPerformance[];
  preRequisitos?: string[];
  equivalencias?: string[];
  courses?: CourseReference[];
}

// Backend schemas interfaces
export interface BackendDisciplinaResumo {
  codigo: string;
  nome: string;
  slug: string;
  departamento?: string | null;
  creditos?: number | null;
}

export interface BackendCursoDisciplinaInfo {
  curso_nome: string;
  curso_slug: string;
  periodo_sugerido?: number | null;
  is_obrigatoria: boolean;
  natureza: string;
}

export interface BackendMetricaConsolidada {
  matriculados: number;
  aprovados: number;
  reprovados_nota: number;
  reprovados_falta: number;
  trancamentos: number;
  taxa_aprovacao_acumulada?: number | null;
  total_turmas_suprimidas: number;
}

export interface BackendMetricaAcademica {
  ano: number;
  semestre: number;
  matriculados: number;
  aprovados: number;
  reprovados_nota: number;
  reprovados_falta: number;
  trancamentos: number;
  taxa_aprovacao?: number | null;
  amostragem_suprimida_lgpd: boolean;
}

export interface BackendDisciplinaResponse extends BackendDisciplinaResumo {
  carga_horaria?: number | null;
  ementa?: string | null;
  pre_requisitos?: string | null;
  co_requisitos?: string | null;
  equivalencias?: string | null;
  pre_requisitos_itens: BackendDisciplinaResumo[];
  equivalencias_itens: BackendDisciplinaResumo[];
  cursos: BackendCursoDisciplinaInfo[];
  metrica_consolidada?: BackendMetricaConsolidada | null;
  metricas: BackendMetricaAcademica[];
}

export interface PaginatedDisciplines {
  items: BackendDisciplinaResumo[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// UI Filter Constants
export const GLOBAL_CAMPUSES = [
  "Todos os Campi",
  "Darcy Ribeiro",
  "FCTE (Gama)",
  "FCE (Ceilândia)",
  "FUP (Planaltina)",
];

export const GLOBAL_AREAS = [
  "Todas",
  "Exatas",
  "Tecnologia",
  "Saúde",
  "Humanas",
];

export const GLOBAL_DEPARTMENTS = [
  "Todos os Departamentos",
  "FCTE",
  "MAT",
  "CIC",
  "IF",
  "FCE",
  "FUP",
  "IQ",
];

export const SEMESTER_FILTERS = [
  "Todos",
  "1º Semestre",
  "2º Semestre",
  "3º Semestre",
  "4º Semestre",
  "5º+",
  "Optativas",
];

export const DEFAULT_HISTORICAL_PERFORMANCE: HistoricalPerformance[] = [
  { semester: "2023/1", approved: 72, failed: 18, absent: 7, withdrawn: 3 },
  { semester: "2023/2", approved: 76, failed: 16, absent: 5, withdrawn: 3 },
  { semester: "2024/1", approved: 74, failed: 17, absent: 6, withdrawn: 3 },
  { semester: "2024/2", approved: 81, failed: 12, absent: 4, withdrawn: 3 },
  { semester: "2025/1", approved: 79, failed: 14, absent: 5, withdrawn: 2 },
  { semester: "2025/2", approved: 84, failed: 10, absent: 4, withdrawn: 2 },
];

/**
 * Converte dados do backend (BackendDisciplinaResumo ou BackendDisciplinaResponse)
 * para a interface completa Discipline utilizada na renderização da interface do usuário.
 */
export function adaptBackendDisciplina(
  raw: BackendDisciplinaResumo | BackendDisciplinaResponse
): Discipline {
  const isFull = "ementa" in raw || "metricas" in raw || "cursos" in raw;
  const full = isFull ? (raw as BackendDisciplinaResponse) : undefined;

  const dep = (raw.departamento || "Geral").toUpperCase();
  let campus = "Darcy Ribeiro";
  let campusFilter = "Darcy Ribeiro";
  let area: "Exatas" | "Tecnologia" | "Saúde" | "Humanas" = "Exatas";

  if (dep.includes("FGA") || dep.includes("FCTE")) {
    campus = "FCTE";
    campusFilter = "FCTE (Gama)";
    area = "Tecnologia";
  } else if (dep.includes("FCE")) {
    campus = "FCE";
    campusFilter = "FCE (Ceilândia)";
    area = "Saúde";
  } else if (dep.includes("FUP")) {
    campus = "FUP";
    campusFilter = "FUP (Planaltina)";
    area = "Humanas";
  } else if (dep.includes("CIC")) {
    campus = "Darcy Ribeiro";
    campusFilter = "Darcy Ribeiro";
    area = "Tecnologia";
  } else if (dep.includes("MAT") || dep.includes("EST") || dep.includes("FIS") || dep.includes("IQ")) {
    campus = "Darcy Ribeiro";
    campusFilter = "Darcy Ribeiro";
    area = "Exatas";
  }

  const creditosNum = raw.creditos || 4;
  const cargaHoraria = full?.carga_horaria || creditosNum * 15;

  let approval = 75.0;
  let failedGrade = 15.0;
  let failedAttendance = 5.0;
  let withdrawn = 5.0;

  if (full?.metrica_consolidada) {
    const mc = full.metrica_consolidada;
    approval = mc.taxa_aprovacao_acumulada !== null && mc.taxa_aprovacao_acumulada !== undefined
      ? Number(mc.taxa_aprovacao_acumulada)
      : (mc.matriculados > 0 ? Number(((mc.aprovados / mc.matriculados) * 100).toFixed(1)) : 75.0);
    if (mc.matriculados > 0) {
      failedGrade = Number(((mc.reprovados_nota / mc.matriculados) * 100).toFixed(1));
      failedAttendance = Number(((mc.reprovados_falta / mc.matriculados) * 100).toFixed(1));
      withdrawn = Number(((mc.trancamentos / mc.matriculados) * 100).toFixed(1));
    }
  }

  let historicalPerf: HistoricalPerformance[] | undefined = undefined;
  if (full?.metricas && full.metricas.length > 0) {
    historicalPerf = full.metricas.map((m) => ({
      semester: `${m.ano}/${m.semestre}`,
      approved: m.aprovados,
      failed: m.reprovados_nota,
      absent: m.reprovados_falta,
      withdrawn: m.trancamentos,
    }));
  }

  const preReqs = full?.pre_requisitos_itens?.map((p) => `${p.codigo} - ${p.nome}`) || (full?.pre_requisitos ? [full.pre_requisitos] : []);
  const equivs = full?.equivalencias_itens?.map((e) => `${e.codigo} - ${e.nome}`) || (full?.equivalencias ? [full.equivalencias] : []);

  const courses: CourseReference[] = full?.cursos?.map((c) => ({
    name: c.curso_nome,
    slug: c.curso_slug,
    semester: c.periodo_sugerido ? `${c.periodo_sugerido}º Semestre` : "Optativa",
    type: c.is_obrigatoria ? "Obrigatória" : "Optativa",
  })) || [];

  return {
    code: raw.codigo,
    name: raw.nome,
    slug: raw.slug,
    department: raw.departamento || "DEP",
    departmentName: raw.departamento ? `Departamento de ${raw.departamento}` : "Departamento Acadêmico",
    campus,
    campusFilter,
    area,
    credits: `${creditosNum} créditos • ${cargaHoraria}h`,
    hours: cargaHoraria,
    approval,
    failedGrade,
    failedAttendance,
    withdrawn,
    resources: 12,
    popularity: 85,
    ementa: full?.ementa || undefined,
    historicalPerformance: historicalPerf,
    preRequisitos: preReqs,
    equivalencias: equivs,
    courses,
  };
}
