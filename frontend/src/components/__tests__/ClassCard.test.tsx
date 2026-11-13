import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ClassCard from "../ClassCard.tsx";
import { adaptBackendTurma } from "../../types/turma.ts";

const base = { id: 1, disciplina_id: 2, codigo_turma: "01", semestre: "2026.1", professores: [{ id: 1, nome: "Docente de teste" }] };

for (const [capacidade, matriculados, texto] of [
  [45, 38, "Ocupação: 38/45 vagas"], [45, 0, "Ocupação: 0/45 vagas"],
  [0, 0, "Ocupação: 0/0 vagas"], [30, 38, "Ocupação: 38/30 vagas"],
  [null, null, "Ocupação: Não informada"], [45, null, "Ocupação: Não informada"], [null, 38, "Ocupação: Não informada"],
] as const) {
  test(`card apresenta apenas ocupação informada: ${matriculados}/${capacidade}`, () => {
    const turma = adaptBackendTurma({ ...base, capacidade, matriculados });
    const html = renderToStaticMarkup(<ClassCard classData={turma} />);
    assert.ok(html.includes(texto));
    assert.ok(html.includes("Docente de teste"));
    assert.ok(html.includes("Turma 01"));
    for (const removido of ["Vagas abertas", "Últimas vagas", "Esgotada", "%", "progressbar"]) assert.ok(!html.includes(removido));
  });
}

test("card mantém compatibilidade com a prop turma e não mostra mock quando não há dados", () => {
  const turma = adaptBackendTurma(base);
  const html = renderToStaticMarkup(<ClassCard turma={turma} />);
  assert.ok(html.includes("Ocupação: Não informada"));
  assert.ok(!html.includes("0/45"));
  assert.equal(renderToStaticMarkup(<ClassCard />), "");
});
