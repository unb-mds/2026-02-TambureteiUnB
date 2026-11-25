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
] as const) {
  test(`card apresenta ocupação informada: ${matriculados}/${capacidade}`, () => {
    const turma = adaptBackendTurma({ ...base, horario: "24T23", local: "FCTE - S10", capacidade, matriculados });
    const html = renderToStaticMarkup(<ClassCard classData={turma} />);
    assert.ok(html.includes(texto));
    assert.ok(html.includes("Docente de teste"));
    assert.ok(html.includes("Turma 01"));
    assert.ok(html.includes("Vespertino"));
    assert.ok(html.includes("FCTE - S10"));
    assert.ok(html.includes('role="img"'));
    for (const removido of ["Vagas abertas", "Últimas vagas", "Esgotada", "progressbar"]) assert.ok(!html.includes(removido));
  });
}

for (const [capacidade, matriculados] of [
  [null, null], [45, null], [null, 38],
] as const) {
  test(`card histórico sem horário, local e ocupação omite campos inexistentes: ${matriculados}/${capacidade}`, () => {
    const turma = adaptBackendTurma({ ...base, capacidade, matriculados });
    const html = renderToStaticMarkup(<ClassCard classData={turma} />);
    assert.ok(html.includes("Docente de teste"));
    assert.ok(html.includes("Turma 01"));
    assert.ok(html.includes("Histórico"));
    for (const ausente of [
      "Horário:",
      "Horário a definir",
      "Local:",
      "Local a definir",
      "Ocupação:",
      "Ocupação: Não informada",
      "Matutino",
      'role="img"',
    ]) {
      assert.ok(!html.includes(ausente), `Não deveria exibir "${ausente}" em turma histórica`);
    }
  });
}

test("card mantém compatibilidade com a prop turma e não mostra dados fictícios", () => {
  const turma = adaptBackendTurma(base);
  const html = renderToStaticMarkup(<ClassCard turma={turma} />);
  assert.ok(html.includes("Sem estatísticas comunitárias registradas"));
  assert.ok(!html.includes("0/45"));
  assert.ok(!html.includes("Ocupação: Não informada"));
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
  assert.ok(htmlColeta.includes("Histórico"));
  assert.ok(!htmlColeta.includes("Horário a definir"));

  const turmaLiberada = adaptBackendTurma({
    ...base,
    amostras_comunidade: 6,
    minimo_amostras_lgpd: 5,
    estatistica: {
      taxa_aprovacao: 75,
      taxa_reprovacao_nota: 15,
      taxa_reprovacao_falta: 6,
      taxa_trancamento: 4,
      status: "VALIDADO",
    },
  });
  const htmlLiberada = renderToStaticMarkup(<ClassCard classData={turmaLiberada} />);
  assert.ok(htmlLiberada.includes("Aprovação: 75%"));
  assert.ok(htmlLiberada.includes("Reprov. nota: 15%"));
  assert.ok(htmlLiberada.includes("Reprov. falta: 6%"));
  assert.ok(htmlLiberada.includes("Tranc.: 4%"));
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
