import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import ClassFilters from "../ClassFilters.tsx";
import MaterialModal from "../MaterialModal.tsx";
import MaterialPreviewModal from "../MaterialPreviewModal.tsx";
import ModerationCard from "../ModerationCard.tsx";

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

test("MaterialPreviewModal renderiza modo somente leitura para materiais de apoio sem botoes de moderacao", () => {
  const markup = renderToStaticMarkup(
    <MaterialPreviewModal
      isOpen
      material={{
        id: 10,
        titulo: "Prova 1 2025.2",
        tipo: "PROVA_ANTIGA",
        formato: "PDF",
        tamanho_bytes: 2048,
        disciplinaNome: "Cálculo 1",
      }}
      blobUrl="blob:https://tambureteiunb.com.br/mock-pdf"
      loading={false}
      error=""
      onClose={() => {}}
      onDownload={() => {}}
    />,
  );

  assert.match(markup, /Cálculo 1/);
  assert.match(markup, /Prova 1 2025\.2/);
  assert.match(markup, /Baixar material/);
  assert.match(markup, /<iframe/);
  assert.doesNotMatch(markup, /Aprovar Material/);
  assert.doesNotMatch(markup, /Rejeitar com Justificativa/);
});

test("ModerationCard renderiza link externo pendente com acoes seguras sem exigir formato de arquivo", () => {
  const markup = renderToStaticMarkup(
    <ModerationCard
      material={{
        id: 22,
        disciplina_id: 1,
        titulo: "Função Real",
        tipo: "RESUMO",
        formato: null,
        tamanho_bytes: null,
        url_origem: "https://www.youtube.com/watch?v=wPesFG0cG7g",
        status_curadoria: "PENDENTE",
        status_moderacao: null,
        created_at: "2026-11-25T00:00:00Z",
        disciplina: { id: 1, nome: "Cálculo 1", slug: "calculo-1" },
      }}
      disabled={false}
      onDecision={async () => {}}
      onDownload={async () => {}}
    />,
  );

  assert.match(markup, /RESUMO • LINK EXTERNO/);
  assert.match(markup, /https:\/\/www\.youtube\.com\/watch\?v=wPesFG0cG7g/);
  assert.match(markup, /Abrir link externo/);
  assert.doesNotMatch(markup, /Baixar para análise/);
  assert.match(markup, /Aprovar/);
  assert.match(markup, /Rejeitar/);
});
