import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSearchTerm } from "../search.ts";

test("normalizeSearchTerm remove acentos e diacríticos mantendo letras base", () => {
  assert.equal(normalizeSearchTerm("Cálculo 1"), "calculo 1");
  assert.equal(normalizeSearchTerm("FÍSICA GERAL"), "fisica geral");
  assert.equal(normalizeSearchTerm("Química Orgânica"), "quimica organica");
  assert.equal(normalizeSearchTerm("Álgebra Linear"), "algebra linear");
  assert.equal(normalizeSearchTerm("Introdução à Programação"), "introducao a programacao");
  assert.equal(normalizeSearchTerm("Administração"), "administracao");
});

test("normalizeSearchTerm lida com espaços nas bordas e maiúsculas/minúsculas", () => {
  assert.equal(normalizeSearchTerm("  Calculo  "), "calculo");
  assert.equal(normalizeSearchTerm("cAlCuLo"), "calculo");
});

test("normalizeSearchTerm lida com valores nulos, vazios ou indefinidos", () => {
  assert.equal(normalizeSearchTerm(""), "");
  assert.equal(normalizeSearchTerm(null), "");
  assert.equal(normalizeSearchTerm(undefined), "");
});
