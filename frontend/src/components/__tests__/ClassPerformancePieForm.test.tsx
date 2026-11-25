import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ClassPerformancePieForm from "../ClassPerformancePieForm.tsx";
import type { Class } from "../../types/turma.ts";

function makeClass(id: number, codigoTurma: string, semestre: string, ocupadas = 20, total = 40): Class {
  return {
    id,
    disciplinaCodigo: "MAT0025",
    codigoTurma,
    semestre,
    professor: "Docente",
    horarios: "24T23",
    local: "Sala",
    vagasOcupadas: ocupadas,
    totalVagas: total,
    occupancy: {
      occupied: ocupadas,
      total,
      available: total - ocupadas,
      percentage: Math.round((ocupadas / total) * 100),
      isFull: ocupadas >= total,
      level: ocupadas >= total ? "full" : "medium",
    },
    turno: "Vespertino",
  };
}

test("ClassPerformancePieForm ordena turmas em ordem crescente e exibe ocupação da primeira turma", () => {
  const markup = renderToStaticMarkup(
    createElement(ClassPerformancePieForm, {
      classes: [
        makeClass(10, "Turma 27", "2026.2", 30, 40),
        makeClass(11, "Turma 01", "2026.2", 10, 40),
        makeClass(12, "Turma 02", "2026.1", 40, 40),
      ],
    })
  );

  const idx01 = markup.indexOf("Turma 01 (2026.2)");
  const idx27 = markup.indexOf("Turma 27 (2026.2)");
  const idx02 = markup.indexOf("Turma 02 (2026.1)");

  assert.ok(idx01 !== -1 && idx27 !== -1 && idx02 !== -1);
  assert.ok(idx01 < idx27);
  assert.ok(idx27 < idx02);
  // 10/40 = 25% da primeira turma ordenada (Turma 01 2026.2)
  assert.match(markup, /25%/);
});

test("ClassPerformancePieForm ignora turmas históricas sem ocupação", () => {
  const historica: Class = {
    id: 99,
    disciplinaCodigo: "MAT0025",
    codigoTurma: "Turma 02",
    semestre: "2025.2",
    professor: "Docente Histórico",
    horarios: "",
    local: "",
    vagasOcupadas: null,
    totalVagas: null,
    occupancy: null,
    turno: null,
    isHistorical: true,
  };

  const withOffer = renderToStaticMarkup(
    createElement(ClassPerformancePieForm, {
      classes: [makeClass(1, "Turma 05", "2026.2", 58, 70), historica],
    })
  );
  assert.ok(!withOffer.includes("Turma 02 (2025.2)"));
  assert.match(withOffer, /83%/);

  const onlyHistorical = renderToStaticMarkup(
    createElement(ClassPerformancePieForm, {
      classes: [historica],
    })
  );
  assert.ok(
    onlyHistorical.includes(
      "Não há dados de ocupação disponíveis para as turmas desta disciplina."
    )
  );
});
