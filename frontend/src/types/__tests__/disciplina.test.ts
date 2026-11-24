import assert from "node:assert/strict";
import test from "node:test";
import { adaptBackendDisciplina, type BackendDisciplinaResponse } from "../disciplina.ts";

const base: BackendDisciplinaResponse = { id: 10, codigo: "TEST001", nome: "Teste", slug: "teste", cursos: [], metricas: [], pre_requisitos_itens: [], equivalencias_itens: [] };
for (const [matriculados, aprovados, taxa, expected] of [[10, 0, 0, 0], [0, 0, 0, null], [10, 8, 80, 80]] as const) {
  test(`adapta aprovação com ${matriculados} matriculados e ${aprovados} aprovados`, () => {
    const result = adaptBackendDisciplina({ ...base, metrica_consolidada: { matriculados, aprovados, reprovados_nota: matriculados-aprovados, reprovados_falta: 0, trancamentos: 0, taxa_aprovacao_acumulada: taxa, total_turmas_suprimidas: 0 } });
    assert.equal(result.approval, expected);
  });
}
test("histórico vazio não é substituído no adaptador", () => {
  assert.equal(adaptBackendDisciplina(base).historicalPerformance, undefined);
  assert.equal(adaptBackendDisciplina(base).resources, 0);
});

test("mantém nomes completos de departamentos retornados pela API", () => {
  const department = "Faculdade de Agronomia e Medicina Veterinária";

  assert.equal(
    adaptBackendDisciplina({ ...base, departamento: department }).departmentName,
    department,
  );
});

test("adapta metrica_consolidada no resumo retornado por GET /cadeiras", () => {
  const result = adaptBackendDisciplina({
    codigo: "FGA0158",
    nome: "Orientação a Objetos",
    slug: "orientacao-a-objetos",
    departamento: "FCTE",
    creditos: 4,
    total_turmas: 3,
    metrica_consolidada: {
      matriculados: 40,
      aprovados: 32,
      reprovados_nota: 4,
      reprovados_falta: 2,
      trancamentos: 2,
      taxa_aprovacao_acumulada: 80,
      total_turmas_suprimidas: 0,
    },
  });

  assert.equal(result.approval, 80);
  assert.equal(result.failedGrade, 10);
  assert.equal(result.failedAttendance, 5);
  assert.equal(result.withdrawn, 5);
  assert.equal(result.metrica_consolidada?.matriculados, 40);
});
