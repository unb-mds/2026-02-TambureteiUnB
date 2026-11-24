import {
  DEFAULT_HISTORICAL_PERFORMANCE,
  type BackendMetricaConsolidada,
  type HistoricalPerformance,
} from "../types/disciplina.ts";
import { hasApprovalData } from "./academicMetrics.ts";
import {
  MIN_PUBLIC_SAMPLE_SIZE,
  filterPublicHistoricalPerformance,
  isSemesterSuppressedByLgpd,
} from "../services/openDataService.ts";

export interface DisciplinePeriodOption {
  value: string;
  label: string;
}

export interface PeriodMetricsSummary {
  matriculados: number;
  aprovados: number;
  reprovadosNota: number;
  reprovadosFalta: number;
  trancamentos: number;
  approval: number | null;
  failedGrade: number;
  failedAttendance: number;
  withdrawn: number;
  suppressedByLgpd: boolean;
  selectedHistory: HistoricalPerformance[];
  publicHistory: HistoricalPerformance[];
  filteredConsolidatedMetric: BackendMetricaConsolidada | null;
}

export function parseSemesterTuple(semester: string): [number, number] | null {
  const match = String(semester || "")
    .trim()
    .match(/^(\d{4})[./-](\d{1,2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const term = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(term)) return null;
  return [year, term];
}

function compareSemestersAsc(a: HistoricalPerformance, b: HistoricalPerformance): number {
  const pa = parseSemesterTuple(a.semester);
  const pb = parseSemesterTuple(b.semester);
  if (pa && pb) {
    return pa[0] - pb[0] || pa[1] - pb[1];
  }
  return a.semester.localeCompare(b.semester, "pt-BR", { numeric: true });
}

export function normalizeRealHistory(
  history?: HistoricalPerformance[] | null
): HistoricalPerformance[] {
  if (!history || !Array.isArray(history) || history === DEFAULT_HISTORICAL_PERFORMANCE) {
    return [];
  }
  return [...history].sort(compareSemestersAsc);
}

export function buildDisciplinePeriodOptions(
  history?: HistoricalPerformance[] | null
): DisciplinePeriodOption[] {
  const sortedAsc = normalizeRealHistory(history);
  if (sortedAsc.length === 0) {
    return [{ value: "ALL", label: "Todos os semestres" }];
  }

  const first = sortedAsc[0].semester;
  const last = sortedAsc[sortedAsc.length - 1].semester;
  const rangeLabel = first === last ? first : `${first} a ${last}`;

  const options: DisciplinePeriodOption[] = [
    { value: "ALL", label: `Todos os semestres (${rangeLabel})` },
  ];

  if (sortedAsc.length > 1) {
    options.push({ value: "LAST_2_YEARS", label: "Últimos 2 anos" });
  }

  for (let i = sortedAsc.length - 1; i >= 0; i--) {
    const item = sortedAsc[i];
    const sem = item.semester;
    const isSuppressed = isSemesterSuppressedByLgpd(item);
    options.push({
      value: sem,
      label: isSuppressed ? `${sem} (baixa amostragem — LGPD)` : sem,
    });
  }

  return options;
}

function toPct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Number(((part / total) * 100).toFixed(1));
}

export function computePeriodMetricsSummary(params: {
  history?: HistoricalPerformance[] | null;
  consolidatedMetric?: BackendMetricaConsolidada | null;
  period: string;
}): PeriodMetricsSummary {
  const chronological = normalizeRealHistory(params.history);
  const consolidated = params.consolidatedMetric ?? null;

  if (params.period === "ALL" || chronological.length === 0) {
    const publicHistory = filterPublicHistoricalPerformance(chronological);

    if (consolidated) {
      const mat = Math.max(0, consolidated.matriculados || 0);
      const apr = Math.max(0, consolidated.aprovados || 0);
      const repN = Math.max(0, consolidated.reprovados_nota || 0);
      const repF = Math.max(0, consolidated.reprovados_falta || 0);
      const tranc = Math.max(0, consolidated.trancamentos || 0);

      const approval =
        mat > 0
          ? hasApprovalData(consolidated.taxa_aprovacao_acumulada)
            ? consolidated.taxa_aprovacao_acumulada
            : toPct(apr, mat)
          : null;

      return {
        matriculados: mat,
        aprovados: apr,
        reprovadosNota: repN,
        reprovadosFalta: repF,
        trancamentos: tranc,
        approval,
        failedGrade: toPct(repN, mat),
        failedAttendance: toPct(repF, mat),
        withdrawn: toPct(tranc, mat),
        suppressedByLgpd: mat > 0 && approval === null && mat < MIN_PUBLIC_SAMPLE_SIZE,
        selectedHistory: chronological,
        publicHistory,
        filteredConsolidatedMetric: consolidated,
      };
    }

    return aggregateHistorySlice(chronological);
  }

  let selected = chronological;
  if (params.period === "LAST_2_YEARS") {
    const years = chronological
      .map((item) => parseSemesterTuple(item.semester)?.[0])
      .filter((year): year is number => typeof year === "number");
    const maxYear = years.length > 0 ? Math.max(...years) : null;
    if (maxYear !== null) {
      selected = chronological.filter((item) => {
        const parsed = parseSemesterTuple(item.semester);
        return parsed ? parsed[0] >= maxYear - 1 : true;
      });
    }
  } else {
    selected = chronological.filter((item) => item.semester === params.period);
  }

  return aggregateHistorySlice(selected);
}

function aggregateHistorySlice(slice: HistoricalPerformance[]): PeriodMetricsSummary {
  const publicHistory = filterPublicHistoricalPerformance(slice);
  let matriculados = 0;
  let aprovados = 0;
  let reprovadosNota = 0;
  let reprovadosFalta = 0;
  let trancamentos = 0;
  let suppressedCount = 0;

  for (const item of slice) {
    const apr = Math.max(0, item.approved || 0);
    const repN = Math.max(0, item.failed || 0);
    const repF = Math.max(0, item.absent || 0);
    const tranc = Math.max(0, item.withdrawn || 0);
    const outcomes = apr + repN + repF + tranc;
    const itemTotal =
      typeof item.matriculados === "number" && Number.isFinite(item.matriculados)
        ? Math.max(item.matriculados, outcomes)
        : outcomes;

    matriculados += itemTotal;
    aprovados += apr;
    reprovadosNota += repN;
    reprovadosFalta += repF;
    trancamentos += tranc;
    if (isSemesterSuppressedByLgpd(item)) {
      suppressedCount += 1;
    }
  }

  const blockedByLgpd =
    suppressedCount > 0 &&
    matriculados > 0 &&
    matriculados < MIN_PUBLIC_SAMPLE_SIZE;

  if (matriculados === 0 || blockedByLgpd) {
    return {
      matriculados,
      aprovados: 0,
      reprovadosNota: 0,
      reprovadosFalta: 0,
      trancamentos: 0,
      approval: null,
      failedGrade: 0,
      failedAttendance: 0,
      withdrawn: 0,
      suppressedByLgpd: blockedByLgpd,
      selectedHistory: slice,
      publicHistory,
      filteredConsolidatedMetric:
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
    };
  }

  const approval = toPct(aprovados, matriculados);
  return {
    matriculados,
    aprovados,
    reprovadosNota,
    reprovadosFalta,
    trancamentos,
    approval,
    failedGrade: toPct(reprovadosNota, matriculados),
    failedAttendance: toPct(reprovadosFalta, matriculados),
    withdrawn: toPct(trancamentos, matriculados),
    suppressedByLgpd: false,
    selectedHistory: slice,
    publicHistory,
    filteredConsolidatedMetric: {
      matriculados,
      aprovados,
      reprovados_nota: reprovadosNota,
      reprovados_falta: reprovadosFalta,
      trancamentos,
      taxa_aprovacao_acumulada: approval,
      total_turmas_suprimidas: suppressedCount,
    },
  };
}
