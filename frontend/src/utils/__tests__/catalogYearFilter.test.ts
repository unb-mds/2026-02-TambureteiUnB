import assert from "node:assert/strict";
import test from "node:test";
import {
  applyDisciplineYearFilter,
  getAvailableCourseCatalogYears,
  getAvailableDisciplineCatalogYears,
  getCourseMetricsForYear,
} from "../catalogYearFilter.ts";
import type { Course } from "../../types/curso.ts";
import type { Discipline } from "../../types/disciplina.ts";

test("cursos extraem anos disponíveis ordenados e selecionam métricas do ano escolhido", () => {
  const courses: Course[] = [
    {
      id: "1",
      nome: "Engenharia de Software",
      slug: "engenharia-de-software",
      campus: "FCTE",
      metricas_recentes: {
        ano: 2024,
        vagas_totais: 120,
        inscritos_total: 600,
        ingressantes: 115,
        matriculados: 540,
        concluintes: 60,
        trancados: 18,
        desvinculados: 12,
      },
      metricas_historicas: [
        {
          ano: 2021,
          vagas_totais: 100,
          inscritos_total: 500,
          ingressantes: 98,
          matriculados: 470,
          concluintes: 45,
          trancados: 32,
          desvinculados: 14,
        },
        {
          ano: 2023,
          vagas_totais: 120,
          inscritos_total: 580,
          ingressantes: 112,
          matriculados: 515,
          concluintes: 55,
          trancados: 22,
          desvinculados: 11,
        },
      ],
    },
  ];

  assert.deepEqual(getAvailableCourseCatalogYears(courses), [2024, 2023, 2021]);
  assert.equal(getCourseMetricsForYear(courses[0], "all")?.ano, 2024);
  assert.equal(getCourseMetricsForYear(courses[0], 2021)?.trancados, 32);
  assert.equal(getCourseMetricsForYear(courses[0], 2020), null);
});

test("disciplinas extraem anos disponíveis, recalculam métricas anuais e respeitam RN07", () => {
  const disc: Discipline = {
    id: 1,
    code: "MAT0025",
    name: "Cálculo 1",
    slug: "calculo-1",
    department: "MAT",
    departmentName: "Departamento de Matemática",
    campus: "Darcy Ribeiro",
    campusFilter: "Darcy Ribeiro",
    area: "Exatas",
    credits: "6 créditos",
    hours: 90,
    approval: 75,
    failedGrade: 15,
    failedAttendance: 5,
    withdrawn: 5,
    resources: 0,
    popularity: 80,
    metrica_consolidada: {
      matriculados: 23,
      aprovados: 17,
      reprovados_nota: 3,
      reprovados_falta: 1,
      trancamentos: 2,
      taxa_aprovacao_acumulada: 73.9,
      total_turmas_suprimidas: 1,
    },
    historicalPerformance: [
      { semester: "2024/1", matriculados: 10, approved: 8, failed: 1, absent: 0, withdrawn: 1, amostragem_suprimida_lgpd: false },
      { semester: "2024/2", matriculados: 10, approved: 7, failed: 2, absent: 0, withdrawn: 1, amostragem_suprimida_lgpd: false },
      { semester: "2025/1", matriculados: 3, approved: 2, failed: 1, absent: 0, withdrawn: 0, amostragem_suprimida_lgpd: true },
    ],
  };

  assert.deepEqual(getAvailableDisciplineCatalogYears([disc]), [2025, 2024]);

  const y2024 = applyDisciplineYearFilter(disc, 2024);
  assert.equal(y2024.referenceYear, 2024);
  assert.equal(y2024.approval, 75);
  assert.equal(y2024.withdrawn, 10);
  assert.equal(y2024.withdrawnCount, 2);

  const y2025 = applyDisciplineYearFilter(disc, 2025);
  assert.equal(y2025.referenceYear, 2025);
  assert.equal(y2025.approval, null);
  assert.equal(y2025.withdrawnCount, null);
});
