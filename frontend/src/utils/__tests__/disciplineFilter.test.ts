import assert from "node:assert/strict";
import test from "node:test";
import type { Discipline } from "../../types/disciplina";
import { normalizeSearchTerm } from "../search";

const mockDisciplines: Partial<Discipline>[] = [
  {
    name: "Cálculo 1",
    code: "MAT0025",
    department: "MAT",
    departmentName: "Departamento de Matemática",
    total_turmas: 12,
  },
  {
    name: "Cálculo 1 - Especial",
    code: "MAT0026",
    department: "MAT",
    departmentName: "Departamento de Matemática",
    total_turmas: 0,
  },
  {
    name: "Química Geral 1",
    code: "IQD0001",
    department: "IQD",
    departmentName: "Instituto de Química",
    total_turmas: 5,
  },
  {
    name: "Química Geral Experimental",
    code: "IQD0002",
    department: "IQD",
    departmentName: "Instituto de Química",
    total_turmas: 0,
  },
];

function filterTestDisciplines(
  items: Partial<Discipline>[],
  query: string,
  onlyWithClasses: boolean
): Partial<Discipline>[] {
  const normalizedQuery = normalizeSearchTerm(query);

  return items.filter((d) => {
    const matchesTurmas = !onlyWithClasses || ((d.total_turmas ?? 0) > 0);
    if (!matchesTurmas) return false;

    const searchable = normalizeSearchTerm(`${d.name} ${d.code} ${d.department}`);
    return !normalizedQuery || searchable.includes(normalizedQuery);
  });
}

test("filtra apenas disciplinas com turmas por padrão", () => {
  const result = filterTestDisciplines(mockDisciplines, "", true);
  assert.equal(result.length, 2);
  assert.deepEqual(
    result.map((d) => d.code),
    ["MAT0025", "IQD0001"]
  );
});

test("permite exibir todas as disciplinas inclusive sem turmas quando o filtro é desmarcado", () => {
  const result = filterTestDisciplines(mockDisciplines, "", false);
  assert.equal(result.length, 4);
});

test("busca 'calculo' sem acento respeitando o filtro de turmas ativas", () => {
  const resultComTurmas = filterTestDisciplines(mockDisciplines, "calculo", true);
  assert.equal(resultComTurmas.length, 1);
  assert.equal(resultComTurmas[0].code, "MAT0025");

  const resultTodas = filterTestDisciplines(mockDisciplines, "calculo", false);
  assert.equal(resultTodas.length, 2);
  assert.deepEqual(
    resultTodas.map((d) => d.code),
    ["MAT0025", "MAT0026"]
  );
});
