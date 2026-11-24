import type { Course, CourseMetrics } from "../types/curso.ts";
import {
  DEFAULT_HISTORICAL_PERFORMANCE,
  type Discipline,
  type HistoricalPerformance,
} from "../types/disciplina.ts";
import { hasApprovalData } from "./academicMetrics.ts";

export type CatalogYearSelection = number | "all";

const MIN_PUBLIC_DISCIPLINE_SAMPLE = 5;

function parseSemesterYear(semester?: string): number | null {
  const match = String(semester || "")
    .trim()
    .match(/^(\d{4})[./-]\d{1,2}$/);
  if (!match) return null;
  const year = Number(match[1]);
  return Number.isFinite(year) && year > 1900 ? year : null;
}

function isSuppressedDisciplineSample(item: HistoricalPerformance): boolean {
  if (item.amostragem_suprimida_lgpd === true) return true;
  const outcomes =
    Math.max(0, item.approved || 0) +
    Math.max(0, item.failed || 0) +
    Math.max(0, item.absent || 0) +
    Math.max(0, item.withdrawn || 0);
  const total =
    typeof item.matriculados === "number" && Number.isFinite(item.matriculados)
      ? Math.max(0, item.matriculados)
      : outcomes;
  return total < MIN_PUBLIC_DISCIPLINE_SAMPLE || outcomes < MIN_PUBLIC_DISCIPLINE_SAMPLE;
}

export function getAvailableCourseCatalogYears(courses: Course[]): number[] {
  const years = new Set<number>();
  for (const course of courses) {
    if (typeof course.metricas_recentes?.ano === "number" && course.metricas_recentes.ano > 0) {
      years.add(course.metricas_recentes.ano);
    }
    if (typeof course.metricas_2024?.ano === "number" && course.metricas_2024.ano > 0) {
      years.add(course.metricas_2024.ano);
    }
    for (const hist of course.metricas_historicas ?? []) {
      if (typeof hist.ano === "number" && hist.ano > 0) {
        years.add(hist.ano);
      }
    }
  }
  return Array.from(years).sort((a, b) => b - a);
}

export function getCourseMetricsForYear(
  course: Course,
  selectedYear: CatalogYearSelection
): CourseMetrics | null {
  if (selectedYear === "all") {
    return course.metricas_recentes ?? course.metricas_2024 ?? null;
  }

  const fromHistory = course.metricas_historicas?.find(
    (item) => item.ano === selectedYear
  );
  if (fromHistory) return fromHistory;

  if (course.metricas_recentes?.ano === selectedYear) {
    return course.metricas_recentes;
  }

  if (
    course.metricas_2024 &&
    (course.metricas_2024.ano === selectedYear ||
      (course.metricas_2024.ano === undefined && selectedYear === 2024))
  ) {
    return course.metricas_2024;
  }

  return null;
}

export function getAvailableDisciplineCatalogYears(
  disciplines: Discipline[]
): number[] {
  const years = new Set<number>();
  for (const d of disciplines) {
    const history = d.historicalPerformance;
    if (!history || history === DEFAULT_HISTORICAL_PERFORMANCE) continue;
    for (const item of history) {
      const year = parseSemesterYear(item.semester);
      if (year !== null) {
        years.add(year);
      }
    }
  }
  return Array.from(years).sort((a, b) => b - a);
}

export function applyDisciplineYearFilter(
  discipline: Discipline,
  selectedYear: CatalogYearSelection
): Discipline {
  if (selectedYear === "all") {
    const mc = discipline.metrica_consolidada;
    const isProtected =
      mc != null &&
      mc.matriculados > 0 &&
      mc.matriculados < MIN_PUBLIC_DISCIPLINE_SAMPLE &&
      !hasApprovalData(discipline.approval);
    return {
      ...discipline,
      referenceYear: null,
      withdrawnCount:
        mc && !isProtected ? Math.max(0, mc.trancamentos ?? 0) : null,
    };
  }

  const history =
    discipline.historicalPerformance &&
    discipline.historicalPerformance !== DEFAULT_HISTORICAL_PERFORMANCE
      ? discipline.historicalPerformance.filter(
          (item) => parseSemesterYear(item.semester) === selectedYear
        )
      : [];

  if (history.length === 0) {
    return {
      ...discipline,
      approval: null,
      failedGrade: 0,
      failedAttendance: 0,
      withdrawn: 0,
      metrica_consolidada: null,
      referenceYear: selectedYear,
      withdrawnCount: null,
    };
  }

  let matriculados = 0;
  let aprovados = 0;
  let reprovadosNota = 0;
  let reprovadosFalta = 0;
  let trancamentos = 0;
  let suppressedCount = 0;

  for (const item of history) {
    const apr = Math.max(0, item.approved || 0);
    const repN = Math.max(0, item.failed || 0);
    const repF = Math.max(0, item.absent || 0);
    const tranc = Math.max(0, item.withdrawn || 0);
    const outcomes = apr + repN + repF + tranc;
    const total =
      typeof item.matriculados === "number" && Number.isFinite(item.matriculados)
        ? Math.max(item.matriculados, outcomes)
        : outcomes;

    matriculados += total;
    aprovados += apr;
    reprovadosNota += repN;
    reprovadosFalta += repF;
    trancamentos += tranc;
    if (isSuppressedDisciplineSample(item)) {
      suppressedCount += 1;
    }
  }

  const blockedByLgpd =
    suppressedCount > 0 &&
    matriculados > 0 &&
    matriculados < MIN_PUBLIC_DISCIPLINE_SAMPLE;

  if (matriculados <= 0 || blockedByLgpd) {
    return {
      ...discipline,
      approval: null,
      failedGrade: 0,
      failedAttendance: 0,
      withdrawn: 0,
      metrica_consolidada:
        matriculados > 0
          ? {
              matriculados,
              aprovados: 0,
              reprovados_nota: 0,
              reprovados_falta: 0,
              trancamentos: 0,
              taxa_aprovacao_acumulada: null,
              total_turmas_suprimidas: suppressedCount,
            }
          : null,
      referenceYear: selectedYear,
      withdrawnCount: null,
    };
  }

  const toPct = (part: number) => Number(((part / matriculados) * 100).toFixed(1));
  const approval = toPct(aprovados);

  return {
    ...discipline,
    approval,
    failedGrade: toPct(reprovadosNota),
    failedAttendance: toPct(reprovadosFalta),
    withdrawn: toPct(trancamentos),
    metrica_consolidada: {
      matriculados,
      aprovados,
      reprovados_nota: reprovadosNota,
      reprovados_falta: reprovadosFalta,
      trancamentos,
      taxa_aprovacao_acumulada: approval,
      total_turmas_suprimidas: suppressedCount,
    },
    referenceYear: selectedYear,
    withdrawnCount: trancamentos,
  };
}
