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
