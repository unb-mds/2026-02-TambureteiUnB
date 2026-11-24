import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ClassCard from "../ClassCard.tsx";
import ClassFilters from "../ClassFilters.tsx";
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
    assert.ok(html.includes('role="img"'));
    for (const removido of ["Vagas abertas", "Últimas vagas", "Esgotada", "progressbar"]) assert.ok(!html.includes(removido));
  });
}

test("card mantém compatibilidade com a prop turma e não mostra mock quando não há dados", () => {
  const turma = adaptBackendTurma(base);
  const html = renderToStaticMarkup(<ClassCard turma={turma} />);
  assert.ok(html.includes("Ocupação: Não informada"));
  assert.ok(!html.includes("0/45"));
  assert.equal(renderToStaticMarkup(<ClassCard />), "");
});

test("card exibe progresso de coleta da comunidade abaixo do limiar LGPD e taxas quando liberado", () => {
  const turmaColeta = adaptBackendTurma({
    ...base,
    amostras_comunidade: 2,
    minimo_amostras_lgpd: 5,
    estatistica: null,
  });
  const htmlColeta = renderToStaticMarkup(<ClassCard classData={turmaColeta} />);
  assert.ok(htmlColeta.includes("Coleta comunidade: 2/5 históricos (RN07)"));

  const turmaLiberada = adaptBackendTurma({
    ...base,
    amostras_comunidade: 6,
    minimo_amostras_lgpd: 5,
    estatistica: {
      taxa_aprovacao: 83.33,
      taxa_reprovacao_nota: 16.67,
      taxa_reprovacao_falta: 0,
      taxa_trancamento: 0,
      status: "VALIDADO",
    },
  });
  const htmlLiberada = renderToStaticMarkup(<ClassCard classData={turmaLiberada} />);
  assert.ok(htmlLiberada.includes("Aprovação: 83%"));
  assert.ok(htmlLiberada.includes("Baseado em 6 históricos"));
});

test("card preserva badge de turma sem quebra de linha e ClassFilters exibe seletor de período", () => {
  const turma = adaptBackendTurma({ ...base, horario: "24T23", semestre: "2026.2" });
  const htmlCard = renderToStaticMarkup(<ClassCard classData={turma} />);
  assert.ok(htmlCard.includes("whitespace-nowrap"));
  assert.ok(htmlCard.includes("Vespertino"));

  const htmlFilters = renderToStaticMarkup(
    <ClassFilters
      selectedShift="Todos"
      onShiftChange={() => {}}
      sortBy="code_asc"
      onSortChange={() => {}}
      totalCount={4}
      filteredCount={2}
      periodosDisponiveis={["2026.2", "2026.1", "2025.2"]}
      periodoSelecionado="2026.2"
      aoAlterarPeriodo={() => {}}
    />
  );
  assert.ok(htmlFilters.includes("Filtrar turmas por período"));
  assert.ok(htmlFilters.includes("Todos os períodos"));
  assert.ok(htmlFilters.includes("2026.2"));
  assert.ok(htmlFilters.includes("2026.1"));
  assert.ok(htmlFilters.includes("2025.2"));
});
