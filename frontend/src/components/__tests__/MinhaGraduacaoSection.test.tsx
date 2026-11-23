import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import MinhaGraduacaoSection from "../MinhaGraduacaoSection.tsx";
import type { HistoricoImportacaoResponse } from "../../services/historicoService.ts";

test("MinhaGraduacaoSection renderiza progresso geral, integralizacao e grade oficial de 10 semestres", () => {
  const markup = renderToStaticMarkup(<MinhaGraduacaoSection importedData={null} />);

  // Progresso geral em bloco unico
  assert.match(markup, /Conclusão da graduação/);
  assert.match(markup, /1980 de 3600 h integralizadas/);
  assert.match(markup, /Faltam 1620 h para integralizar o curso/);

  // Integralizacao curricular
  assert.match(markup, /Integralização curricular/);
  assert.match(markup, /Carga obrigatória/);
  assert.match(markup, /Carga optativa/);

  // Grade curricular visual por semestres (1º ao 10º semestre oficial)
  assert.match(markup, /Grade curricular/);
  assert.match(markup, /1º semestre/);
  assert.match(markup, /2º semestre/);
  assert.match(markup, /3º semestre/);
  assert.match(markup, /4º semestre/);
  assert.match(markup, /5º semestre/);
  assert.match(markup, /10º semestre/);
  assert.doesNotMatch(markup, /Optativas/);

  // Legenda de cores
  assert.match(markup, /Concluída/);
  assert.match(markup, /Em andamento/);
  assert.match(markup, /Pendente/);

  // Matérias curriculares obrigatórias oficiais
  assert.match(markup, /CIC0004/);
  assert.match(markup, /ALGORITMOS E PROGRAMAÇÃO DE COMPUTADORES/);
  assert.match(markup, /MAT0025/);
  assert.match(markup, /CÁLCULO 1/);
});

test("MinhaGraduacaoSection com dados importados aplica status real verde, roxo e cinza", () => {
  const mockImported: HistoricoImportacaoResponse = {
    autenticidade_estrutural_valida: true,
    contribuicao: {
      total_elegiveis: 1,
      novas_contribuicoes: 1,
      duplicadas_ignoradas: 0,
      disciplinas_nao_encontradas: [],
      turmas_atualizadas: 1,
      turmas_liberadas_lgpd: 1,
      minimo_amostras_lgpd: 5,
    },
    dados_academicos: {
      curso: "Engenharia de Software",
      curriculo: "2023",
      status: "Ativo",
      periodo_inicial: "2023/1",
      periodo_atual: 7,
      prazo_conclusao: "2028/2",
      ira: 4.2,
      mp: 4.1,
      data_emissao: "2026-11-22",
      codigo_verificacao: "ABC123XYZ",
    },
    carga_horaria: {
      exigido: { obrigatorias: 2400, optativas: 1200, complementares: 0, total: 3600 },
      integralizado: { obrigatorias: 1200, optativas: 300, complementares: 0, total: 1500 },
      pendente: { obrigatorias: 1200, optativas: 900, complementares: 0, total: 2100 },
    },
    cursadas: [
      {
        semestre: "2023/1",
        codigo: "CIC0004",
        nome: "ALGORITMOS E PROGRAMAÇÃO DE COMPUTADORES",
        slug: "algoritmos-e-programacao-de-computadores",
        professores: [],
        ch: 90,
        turma: "01",
        horario: "24M12",
        local: "Sala 1",
        frequencia: 100,
        mencao: "SS",
        situacao: "Aprovado",
        natureza_simbolo: "OBR",
      },
    ],
    cursando: [
      {
        semestre: "2026/1",
        codigo: "FGA0158",
        nome: "ORIENTAÇÃO A OBJETOS",
        slug: "orientacao-a-objetos",
        professores: [],
        ch: 60,
        turma: "01",
        horario: "35M12",
        local: "Sala 2",
        frequencia: null,
        mencao: null,
        situacao: "Matriculado",
        natureza_simbolo: "OBR",
      },
    ],
    pendentes: [
      {
        codigo: "FGA0124",
        nome: "PROJETO DE ALGORITMOS",
        ch: 60,
        matriculado: false,
      },
    ],
  };

  const markup = renderToStaticMarkup(<MinhaGraduacaoSection importedData={mockImported} />);

  assert.match(markup, /42%/); // 1500 / 3600 = 42%
  assert.match(markup, /1500 de 3600 h integralizadas/);
  assert.match(markup, /Faltam 2100 h para integralizar o curso/);

  // Verifica renderização dos blocos e classes de status
  assert.match(markup, /CIC0004/);
  assert.match(markup, /FGA0158/);
  assert.match(markup, /border-emerald/);
});
