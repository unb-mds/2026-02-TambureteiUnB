import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import ClassFilters from "../ClassFilters.tsx";
import MaterialModal from "../MaterialModal.tsx";

test("ClassFilters apresenta filtros, ordenação e resumo vazado para UI", () => {
  const markup = renderToStaticMarkup(
    <ClassFilters
      selectedShift="Matutino"
      onShiftChange={() => {}}
      sortBy="occupancy_desc"
      onSortChange={() => {}}
      totalCount={12}
      filteredCount={4}
      onResetFilters={() => {}}
    />,
  );

  assert.match(markup, /Filtros e ordenação de turmas/);
  assert.match(markup, /Filtrar turmas por turno/);
  assert.match(markup, /Matutino/);
  assert.match(markup, /Ordenar por:/);
  assert.match(markup, /Exibindo <strong[^>]*>4<\/strong> de <strong[^>]*>12<\/strong>/);
  assert.match(markup, /Limpar/);
});

test("MaterialModal apresenta estados iniciais de upload e conteúdo válido", () => {
  const markup = renderToStaticMarkup(
    <MaterialModal
      isOpen
      disciplineId={7}
      disciplineSlug="calculo-1"
      disciplineName="Cálculo 1"
      onClose={() => {}}
    />,
  );

  assert.match(markup, /Compartilhar Material de Apoio/);
  assert.match(markup, /Cálculo 1/);
  assert.match(markup, /Arquivos \(PDF e Imagens\)/);
  assert.match(markup, /Adicionar Link Externo/);
  assert.match(markup, /PDF, PNG, JPG ou JPEG/);
});

test("MaterialModal permanece fechado quando isOpen é falso", () => {
  const markup = renderToStaticMarkup(
    <MaterialModal
      isOpen={false}
      disciplineId={7}
      disciplineSlug="calculo-1"
      disciplineName="Cálculo 1"
      onClose={() => {}}
    />,
  );

  assert.equal(markup, "");
});
