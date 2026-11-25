import assert from "node:assert/strict";
import test from "node:test";
import {
  formatPositiveMetric,
  hasApprovalData,
} from "../academicMetrics.ts";
test("taxa zero e limites percentuais são dados válidos", () => {
  for (const value of [0, 0.1, 70, 100]) assert.equal(hasApprovalData(value), true);
});
test("ausência e percentuais inválidos não são dados válidos", () => {
  for (const value of [null, undefined, NaN, Infinity, -1, 101, "0"]) assert.equal(hasApprovalData(value), false);
});

test("métricas zeradas ou ausentes são exibidas como Sem dados", () => {
  assert.equal(formatPositiveMetric(0), "Sem dados");
  assert.equal(formatPositiveMetric(undefined), "Sem dados");
  assert.equal(formatPositiveMetric(null), "Sem dados");
  assert.equal(formatPositiveMetric(82.5, "%"), "82.5%");
});
