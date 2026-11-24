import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDisciplinePeriodOptions,
  computePeriodMetricsSummary,
} from "../disciplinePeriodMetrics.ts";
import type { BackendMetricaConsolidada, HistoricalPerformance } from "../../types/disciplina.ts";

const sampleHistory: HistoricalPerformance[] = [
  { semester: "2025/2", matriculados: 2, approved: 2, failed: 0, absent: 0, withdrawn: 0, amostragem_suprimida_lgpd: true },
  { semester: "2024/2", matriculados: 1, approved: 1, failed: 0, absent: 0, withdrawn: 0, amostragem_suprimida_lgpd: true },
  { semester: "2023/1", matriculados: 10, approved: 7, failed: 2, absent: 1, withdrawn: 0, amostragem_suprimida_lgpd: false },
];

const sampleConsolidated: BackendMetricaConsolidada = {
  matriculados: 13,
  aprovados: 10,
  reprovados_nota: 2,
  reprovados_falta: 1,
  trancamentos: 0,
  taxa_aprovacao_acumulada: 76.9,
  total_turmas_suprimidas: 2,
};

test("buildDisciplinePeriodOptions cria opções dinâmicas em ordem real dos dados", () => {
  const options = buildDisciplinePeriodOptions(sampleHistory);
  assert.deepEqual(
    options.map((o) => o.value),
    ["ALL", "LAST_2_YEARS", "2025/2", "2024/2", "2023/1"]
  );
  assert.equal(options[0].label, "Todos os semestres (2023/1 a 2025/2)");
  assert.match(options[2].label, /LGPD/);
  assert.equal(options[4].label, "2023/1");
});

test("computePeriodMetricsSummary filtra por Últimos 2 anos e semestre específico respeitando LGPD", () => {
  const allSummary = computePeriodMetricsSummary({
    history: sampleHistory,
    consolidatedMetric: sampleConsolidated,
    period: "ALL",
  });
  assert.equal(allSummary.matriculados, 13);
  assert.equal(allSummary.approval, 76.9);
  assert.deepEqual(
    allSummary.publicHistory.map((item) => item.semester),
    ["2023/1"]
  );

  const last2Years = computePeriodMetricsSummary({
    history: sampleHistory,
    consolidatedMetric: sampleConsolidated,
    period: "LAST_2_YEARS",
  });
  // 2024/2 (1) + 2025/2 (2) = 3 matriculados (< 5 e suprimido -> protege taxas conforme RN07)
  assert.equal(last2Years.matriculados, 3);
  assert.equal(last2Years.suppressedByLgpd, true);
  assert.equal(last2Years.approval, null);

  const sem2023 = computePeriodMetricsSummary({
    history: sampleHistory,
    consolidatedMetric: sampleConsolidated,
    period: "2023/1",
  });
  assert.equal(sem2023.matriculados, 10);
  assert.equal(sem2023.suppressedByLgpd, false);
  assert.equal(sem2023.approval, 70);
  assert.equal(sem2023.failedGrade, 20);
  assert.equal(sem2023.failedAttendance, 10);
});
