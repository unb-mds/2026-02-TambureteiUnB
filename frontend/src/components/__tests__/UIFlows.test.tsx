import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import ClassFilters from "../ClassFilters.tsx";
import DenunciaModerationCard from "../DenunciaModerationCard.tsx";
import EditMaterialModal from "../EditMaterialModal.tsx";
import MaterialModal from "../MaterialModal.tsx";
import MaterialPreviewModal from "../MaterialPreviewModal.tsx";
import MinhasContribuicoesSection from "../MinhasContribuicoesSection.tsx";
import ModerationCard from "../ModerationCard.tsx";
import ReplaceMaterialFileModal from "../ReplaceMaterialFileModal.tsx";

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

test("DenunciaModerationCard exibe acoes de preview e link para materiais denunciados", () => {
  const markupArquivo = renderToStaticMarkup(
    <DenunciaModerationCard
      denuncia={{
        id: 1,
        tipo_alvo: "MATERIAL",
        comentario_id: null,
        conteudo_id: 50,
        categoria: "GABARITO_ATIVO",
        motivo: "Gabarito oficial de prova vigente.",
        status: "PENDENTE",
        created_at: "2026-11-26T12:00:00Z",
        total_denuncias: 1,
        prioridade_rn04: false,
        sinalizacoes_rn04: [],
        alvo: {
          id: 50,
          tipo_alvo: "MATERIAL",
          titulo: "Prova P1 Resolvida",
          conteudo: "Prova P1 Resolvida",
          autor_alias: "Autor Anônimo",
          topico_dificuldade: "PROVA_ANTIGA",
          formato: "pdf",
          url_origem: null,
          status_moderacao: "ativo",
          created_at: "2026-11-26T10:00:00Z",
          disciplina: { id: 1, nome: "Cálculo 1", slug: "calculo-1" },
        },
      }}
      disabled={false}
      onRequestAction={() => {}}
      onPreviewMaterial={async () => {}}
    />,
  );
  assert.match(markupArquivo, /Material · PDF/);
  assert.match(markupArquivo, /Pré-visualizar arquivo/);

  const markupLink = renderToStaticMarkup(
    <DenunciaModerationCard
      denuncia={{
        id: 2,
        tipo_alvo: "MATERIAL",
        comentario_id: null,
        conteudo_id: 51,
        categoria: "SPAM",
        motivo: "Link comercial fora do escopo da disciplina.",
        status: "PENDENTE",
        created_at: "2026-11-26T12:00:00Z",
        total_denuncias: 3,
        prioridade_rn04: false,
        sinalizacoes_rn04: [],
        alvo: {
          id: 51,
          tipo_alvo: "MATERIAL",
          titulo: "Site suspeito",
          conteudo: "https://exemplo.unb.br/promo",
          autor_alias: "Autor Anônimo",
          topico_dificuldade: "DICA",
          formato: null,
          url_origem: "https://exemplo.unb.br/promo",
          status_moderacao: "PENDENTE",
          created_at: "2026-11-26T10:00:00Z",
          disciplina: { id: 1, nome: "Cálculo 1", slug: "calculo-1" },
        },
      }}
      disabled={false}
      onRequestAction={() => {}}
      onPreviewMaterial={async () => {}}
    />,
  );
  assert.match(markupLink, /Material · LINK EXTERNO/);
  assert.match(markupLink, /Abrir link externo/);
  assert.doesNotMatch(markupLink, /Pré-visualizar arquivo/);
});

test("DenunciaModerationCard exibe area de imagem inline e acoes de substituicao e download para imagem denunciada", () => {
  const markup = renderToStaticMarkup(
    <DenunciaModerationCard
      denuncia={{
        id: 7,
        tipo_alvo: "MATERIAL",
        comentario_id: null,
        conteudo_id: 99,
        categoria: "OUTRO",
        motivo: "Foto de prova contendo nome e matrícula.",
        status: "PENDENTE",
        created_at: "2026-11-26T12:00:00Z",
        total_denuncias: 3,
        prioridade_rn04: false,
        sinalizacoes_rn04: [],
        alvo: {
          id: 99,
          tipo_alvo: "MATERIAL",
          titulo: "Foto da P2",
          conteudo: "Foto da P2",
          autor_alias: "Autor Anônimo",
          topico_dificuldade: "PROVA_ANTIGA",
          formato: "png",
          url_origem: null,
          status_moderacao: "em_analise",
          created_at: "2026-11-26T10:00:00Z",
          disciplina: { id: 1, nome: "Cálculo 1", slug: "calculo-1" },
        },
      }}
      disabled={false}
      onRequestAction={() => {}}
      onPreviewMaterial={async () => {}}
      onDownloadMaterial={async () => {}}
      onReplaceMaterialFile={() => {}}
    />,
  );

  assert.match(markup, /Pré-visualização da imagem denunciada/);
  assert.match(markup, /Baixar arquivo/);
  assert.match(markup, /Substituir arquivo/);
  assert.match(markup, /Retido preventivamente/);
});

test("ReplaceMaterialFileModal renderiza controles de substituicao e download do arquivo atual", () => {
  const markup = renderToStaticMarkup(
    <ReplaceMaterialFileModal
      isOpen={true}
      material={{ id: 42, titulo: "Prova Antiga P1", disciplinaNome: "Cálculo 1", formato: "pdf" }}
      onClose={() => {}}
      onDownloadCurrent={async () => {}}
      onReplaced={async () => {}}
    />,
  );

  assert.match(markup, /Substituir arquivo do material/);
  assert.match(markup, /Prova Antiga P1/);
  assert.match(markup, /Baixar arquivo atual para editar no computador/);
  assert.match(markup, /type="file"/);
});

test("EditMaterialModal renderiza campos de edicao de titulo, categoria e URL para links", () => {
  const markup = renderToStaticMarkup(
    <EditMaterialModal
      isOpen={true}
      material={{
        id: 10,
        titulo: "Videoaula Derivadas",
        tipo: "RESUMO",
        url_origem: "https://youtube.com/watch?v=123",
        status_curadoria: "APROVADO",
      }}
      onClose={() => {}}
      onSaved={() => {}}
    />,
  );

  assert.match(markup, /Editar material de apoio/);
  assert.match(markup, /Videoaula Derivadas/);
  assert.match(markup, /URL externa/);
});

test("MinhasContribuicoesSection renderiza titulo e filtros de status no perfil", () => {
  const markup = renderToStaticMarkup(<MinhasContribuicoesSection />);

  assert.match(markup, /Minhas contribuições/);
  assert.match(markup, /Pendentes/);
  assert.match(markup, /Aprovados/);
  assert.match(markup, /Recusados/);
});
