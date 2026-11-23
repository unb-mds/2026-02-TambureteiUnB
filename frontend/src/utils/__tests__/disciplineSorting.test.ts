import assert from "node:assert/strict";
import test from "node:test";
import type { Discipline } from "../../types/disciplina.ts";
import { sortDisciplines } from "../disciplineSorting.ts";

function makeDiscipline(
  name: string,
  overrides: Partial<Discipline> = {},
): Discipline {
  return {
    code: name,
    name,
    slug: name,
    department: "Departamento",
    departmentName: "Departamento",
    campus: "Campus",
    campusFilter: "Campus",
    area: "Exatas",
    credits: "4 créditos",
    hours: 60,
    resources: 0,
    popularity: 0,
    ...overrides,
  };
}

test("ordena taxas crescentes e decrescentes deixando disciplinas sem dados no final", () => {
  const disciplines = [
    makeDiscipline("Sem dados", { approval: null }),
    makeDiscipline("Alta", { approval: 90 }),
    makeDiscipline("Baixa", { approval: 30 }),
  ];

  assert.deepEqual(
    sortDisciplines(disciplines, "approval_desc").map(({ name }) => name),
    ["Alta", "Baixa", "Sem dados"],
  );
  assert.deepEqual(
    sortDisciplines(disciplines, "approval_asc").map(({ name }) => name),
    ["Baixa", "Alta", "Sem dados"],
  );
});

test("ordena por nome, turmas ofertadas e carga horária usando dados reais", () => {
  const disciplines = [
    makeDiscipline("Cálculo", { total_turmas: 2, hours: 60 }),
    makeDiscipline("Álgebra", { total_turmas: 8, hours: 90 }),
    makeDiscipline("Banco de Dados", { total_turmas: 4, hours: 30 }),
  ];

  assert.deepEqual(
    sortDisciplines(disciplines, "name_asc").map(({ name }) => name),
    ["Álgebra", "Banco de Dados", "Cálculo"],
  );
  assert.deepEqual(
    sortDisciplines(disciplines, "classes_desc").map(({ name }) => name),
    ["Álgebra", "Banco de Dados", "Cálculo"],
  );
  assert.deepEqual(
    sortDisciplines(disciplines, "hours_desc").map(({ name }) => name),
    ["Álgebra", "Cálculo", "Banco de Dados"],
  );
});
