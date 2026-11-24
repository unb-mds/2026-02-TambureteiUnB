import assert from "node:assert/strict";
import test from "node:test";
import { formatPreRequisitos } from "../preRequisitos.ts";

test("formatPreRequisitos formata itens estruturados do backend com slugs de navegacao", () => {
  const items = [
    { codigo: "MAT0025", nome: "Cálculo 1", slug: "calculo-1" },
    { codigo: "FGA0158", nome: "Orientação a Objetos", slug: "orientacao-a-objetos" },
  ];

  const result = formatPreRequisitos(items, []);
  assert.equal(result.length, 2);
  assert.equal(result[0].codigo, "MAT0025");
  assert.equal(result[0].nome, "Cálculo 1");
  assert.equal(result[0].slug, "calculo-1");
  assert.equal(result[0].textoCompleto, "MAT0025 - Cálculo 1");
});

test("formatPreRequisitos extrai codigo e slug a partir de strings brutas", () => {
  const rawStrings = [
    "MAT0025 - CÁLCULO 1",
    "FGA0138 - Métodos de Desenvolvimento de Software",
  ];

  const result = formatPreRequisitos([], rawStrings);
  assert.equal(result.length, 2);
  assert.equal(result[0].codigo, "MAT0025");
  assert.equal(result[0].nome, "CÁLCULO 1");
  assert.equal(result[0].slug, "mat0025");
  assert.equal(result[1].codigo, "FGA0138");
});

test("formatPreRequisitos deduplica itens com mesmo codigo", () => {
  const items = [{ codigo: "MAT0025", nome: "Cálculo 1", slug: "calculo-1" }];
  const rawStrings = ["MAT0025 - Cálculo 1"];

  const result = formatPreRequisitos(items, rawStrings);
  assert.equal(result.length, 1);
  assert.equal(result[0].codigo, "MAT0025");
});

test("formatPreRequisitos lida com lista vazia", () => {
  const result = formatPreRequisitos([], []);
  assert.deepEqual(result, []);
});
