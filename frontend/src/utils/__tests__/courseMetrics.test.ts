import test from "node:test";
import assert from "node:assert/strict";
import { CourseDetail, CourseMetrics } from "@/types/curso";

function getAvailableMetricYears(course: CourseDetail | null): number[] {
  if (course?.metricas_historicas && course.metricas_historicas.length > 0) {
    const years = Array.from(new Set(course.metricas_historicas.map((m) => m.ano || 2024)));
    return years.sort((a, b) => b - a);
  }
  const fallback: number[] = [];
  if (course?.metricas_recentes?.ano) fallback.push(course.metricas_recentes.ano);
  if (course?.metricas_2024?.ano && !fallback.includes(course.metricas_2024.ano)) {
    fallback.push(course.metricas_2024.ano);
  }
  return fallback.length > 0 ? fallback : [2024];
}

function getSelectedCourseMetrics(
  course: CourseDetail | null,
  activeYear: number
): CourseMetrics | null {
  if (course?.metricas_historicas && course.metricas_historicas.length > 0) {
    const found = course.metricas_historicas.find((m) => m.ano === activeYear);
    if (found) return found;
  }
  if (course?.metricas_recentes && course.metricas_recentes.ano === activeYear) {
    return course.metricas_recentes;
  }
  if (course?.metricas_2024 && (course.metricas_2024.ano === activeYear || activeYear === 2024)) {
    return course.metricas_2024;
  }
  return course?.metricas_recentes || course?.metricas_2024 || null;
}

test("getAvailableMetricYears extrai e ordena anos decrescentes a partir de metricas_historicas", () => {
  const mockCourse: CourseDetail = {
    nome: "Administração",
    campus: "Darcy Ribeiro",
    slug: "administracao-diurno",
    metricas_historicas: [
      { ano: 2021, vagas_totais: 200, matriculados: 1100, ingressantes: 200, concluintes: 100, desvinculados: 10, trancados: 20, inscritos_total: 0 },
      { ano: 2024, vagas_totais: 255, matriculados: 1193, ingressantes: 255, concluintes: 178, desvinculados: 64, trancados: 58, inscritos_total: 0 },
      { ano: 2022, vagas_totais: 220, matriculados: 1150, ingressantes: 220, concluintes: 181, desvinculados: 0, trancados: 0, inscritos_total: 0 },
      { ano: 2023, vagas_totais: 250, matriculados: 1185, ingressantes: 250, concluintes: 178, desvinculados: 40, trancados: 2, inscritos_total: 0 },
    ],
  };

  const years = getAvailableMetricYears(mockCourse);
  assert.deepEqual(years, [2024, 2023, 2022, 2021]);
});

test("getSelectedCourseMetrics retorna as métricas corretas para cada ano selecionado", () => {
  const m2024: CourseMetrics = { ano: 2024, vagas_totais: 255, matriculados: 1193, ingressantes: 255, concluintes: 178, desvinculados: 64, trancados: 58, inscritos_total: 0 };
  const m2023: CourseMetrics = { ano: 2023, vagas_totais: 250, matriculados: 1185, ingressantes: 250, concluintes: 178, desvinculados: 40, trancados: 2, inscritos_total: 0 };
  const mockCourse: CourseDetail = {
    nome: "Administração",
    campus: "Darcy Ribeiro",
    slug: "administracao-diurno",
    metricas_historicas: [m2024, m2023],
  };

  assert.equal(getSelectedCourseMetrics(mockCourse, 2024)?.matriculados, 1193);
  assert.equal(getSelectedCourseMetrics(mockCourse, 2023)?.matriculados, 1185);
});

test("getAvailableMetricYears usa fallback em metricas_recentes ou padrão 2024 quando não há histórico", () => {
  const mockCourse: CourseDetail = {
    nome: "Engenharia",
    campus: "FCTE",
    slug: "engenharia-diurno",
    metricas_recentes: { ano: 2023, vagas_totais: 100, matriculados: 500, ingressantes: 100, concluintes: 50, desvinculados: 5, trancados: 10, inscritos_total: 0 },
  };

  assert.deepEqual(getAvailableMetricYears(mockCourse), [2023]);
  assert.deepEqual(getAvailableMetricYears(null), [2024]);
});
