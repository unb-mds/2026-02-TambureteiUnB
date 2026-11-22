import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateCourseSemesters,
  generateSemesterFilters,
} from "../courseCatalog.ts";

test("calculateCourseSemesters extrai o maior período a partir das disciplinas da grade", () => {
  const disciplinas8 = [
    { semester: "1º Semestre" },
    { semester: "2º Semestre" },
    { semester: "8º Semestre" },
    { semester: "Optativas" },
  ];
  assert.equal(calculateCourseSemesters(disciplinas8), 8);

  const disciplinas10 = [
    { semester: "1º Semestre" },
    { semester: "5º Semestre" },
    { semester: "10º Semestre" },
    { semester: "Optativas" },
  ];
  assert.equal(calculateCourseSemesters(disciplinas10), 10);

  const disciplinas12 = [
    { semester: "1º Semestre" },
    { semester: "12º Semestre" },
  ];
  assert.equal(calculateCourseSemesters(disciplinas12), 12);
});

test("calculateCourseSemesters usa fallback no curso ou padrão 8 quando não há períodos na grade", () => {
  assert.equal(calculateCourseSemesters([], 6), 6);
  assert.equal(calculateCourseSemesters([{ semester: "Optativas" }], 10), 10);
  assert.equal(calculateCourseSemesters([]), 8);
});

test("generateSemesterFilters gera abas de 1 até N semestres com Todos e Optativas", () => {
  assert.deepEqual(generateSemesterFilters(8, true), [
    "Todos",
    "1º Semestre",
    "2º Semestre",
    "3º Semestre",
    "4º Semestre",
    "5º Semestre",
    "6º Semestre",
    "7º Semestre",
    "8º Semestre",
    "Optativas",
  ]);

  assert.deepEqual(generateSemesterFilters(4, false), [
    "Todos",
    "1º Semestre",
    "2º Semestre",
    "3º Semestre",
    "4º Semestre",
  ]);

  assert.deepEqual(generateSemesterFilters(10, true), [
    "Todos",
    "1º Semestre",
    "2º Semestre",
    "3º Semestre",
    "4º Semestre",
    "5º Semestre",
    "6º Semestre",
    "7º Semestre",
    "8º Semestre",
    "9º Semestre",
    "10º Semestre",
    "Optativas",
  ]);
});
