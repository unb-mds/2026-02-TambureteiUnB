import assert from "node:assert/strict";
import test from "node:test";
import type { Discipline } from "../../types/disciplina.ts";
import {
  DISCIPLINE_SORT_OPTIONS,
  getDisciplineDataTier,
  sortDisciplines,
} from "../disciplineSorting.ts";

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

test("prioriza dados das pizzas, depois apenas históricos e por fim sem dados", () => {
  assert.equal(DISCIPLINE_SORT_OPTIONS[0]?.value, "data_priority");

  const disciplines = [
    makeDiscipline("Alfa Sem Dados", { approval: null }),
    makeDiscipline("Beta Só Histórico", {
      possui_dados_pizza: false,
      metrica_consolidada: {
        matriculados: 3,
        aprovados: 2,
        reprovados_nota: 1,
        reprovados_falta: 0,
        trancamentos: 0,
        taxa_aprovacao_acumulada: null,
        total_turmas_suprimidas: 1,
      },
    }),
    makeDiscipline("Zebra Pizza", {
      possui_dados_pizza: true,
      approval: 78,
      metrica_consolidada: {
        matriculados: 100,
        aprovados: 78,
        reprovados_nota: 12,
        reprovados_falta: 5,
        trancamentos: 5,
        taxa_aprovacao_acumulada: 78,
        total_turmas_suprimidas: 0,
      },
    }),
    makeDiscipline("Cálculo Pizza", {
      possui_dados_pizza: true,
      approval: 65,
    }),
  ];

  assert.equal(getDisciplineDataTier(disciplines[0]), 2);
  assert.equal(getDisciplineDataTier(disciplines[1]), 1);
  assert.equal(getDisciplineDataTier(disciplines[2]), 0);

  assert.deepEqual(
    sortDisciplines(disciplines, "data_priority").map(({ name }) => name),
    ["Cálculo Pizza", "Zebra Pizza", "Beta Só Histórico", "Alfa Sem Dados"],
  );
});

test("ao filtrar por ano específico em data_priority, disciplinas sem dados naquele ano vão para o fim", () => {
  const disciplines = [
    makeDiscipline("Pizza Sem Dados no Ano", {
      possui_dados_pizza: true,
      approval: null,
      metrica_consolidada: null,
      referenceYear: 2026,
    }),
    makeDiscipline("Histórico no Ano", {
      possui_dados_pizza: false,
      approval: 80,
      referenceYear: 2026,
    }),
    makeDiscipline("Pizza no Ano", {
      possui_dados_pizza: true,
      approval: 90,
      referenceYear: 2026,
    }),
  ];

  assert.deepEqual(
    sortDisciplines(disciplines, "data_priority").map(({ name }) => name),
    ["Pizza no Ano", "Histórico no Ano", "Pizza Sem Dados no Ano"],
  );
});

test("permite alternar para ordem alfabética e desempata por nome nas taxas", () => {
  const disciplines = [
    makeDiscipline("Zebra", { approval: 80 }),
    makeDiscipline("Beta", { approval: null }),
    makeDiscipline("Alfa", { approval: null }),
    makeDiscipline("Cálculo", { approval: 80 }),
  ];

  assert.deepEqual(
    sortDisciplines(disciplines, "approval_desc").map(({ name }) => name),
    ["Cálculo", "Zebra", "Alfa", "Beta"],
  );
  assert.deepEqual(
    sortDisciplines(disciplines, "approval_asc").map(({ name }) => name),
    ["Cálculo", "Zebra", "Alfa", "Beta"],
  );
});
