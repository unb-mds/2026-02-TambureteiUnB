import assert from "node:assert/strict";
import test from "node:test";
import {
  formatPositiveMetric,
  hasApprovalData,
  resumirTaxasTurmaDetalhadas,
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

test("91.8 não é reescalado para 91.9 quando a pizza soma 99.9",()=>{
 const original={taxa_aprovacao:91.8,taxa_reprovacao_nota:4.6,taxa_reprovacao_falta:0,taxa_trancamento:3.5};
 assert.deepEqual(resumirTaxasTurmaDetalhadas(original),{aprovacao:91.8,reprovacaoNota:4.6,reprovacaoFalta:0,trancamento:3.5});
 assert.equal(original.taxa_aprovacao,91.8);
});
