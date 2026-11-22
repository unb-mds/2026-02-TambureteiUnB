import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AcademicProfileDashboard, {
  getAdjacentProfileSection,
  getDisciplineHistoryForSemester,
} from "../AcademicProfileDashboard.tsx";

test("AcademicProfileDashboard mostra navegação e exige consentimento para a demonstração", () => {
  const markup = renderToStaticMarkup(
    createElement(AcademicProfileDashboard, {
      consented: false,
      onConsent: () => {},
      onRevokeConsent: () => {},
    })
  );

  assert.match(markup, /Visão geral/);
  assert.match(markup, /Minha graduação/);
  assert.match(markup, /Disciplinas/);
  assert.match(markup, /Histórico/);
  assert.match(markup, /Desempenho/);
  assert.match(markup, /Horários/);
  assert.match(markup, /Planejamento/);
  assert.match(markup, /Comunidade/);
  assert.match(markup, /Concordar e abrir demonstração/);
  assert.match(markup, /Não consultamos o SIGAA/);
  assert.doesNotMatch(markup, /IRA demonstrativo/);
  assert.doesNotMatch(markup, /132 de 240 créditos/);
});

test("AcademicProfileDashboard exibe a visão geral após consentimento", () => {
  const markup = renderToStaticMarkup(
    createElement(AcademicProfileDashboard, {
      consented: true,
      onConsent: () => {},
      onRevokeConsent: () => {},
    })
  );

  assert.match(markup, /Ocultar demonstração/);
  assert.match(markup, /Sua trajetória em um só lugar/);
  assert.match(markup, /Próximos compromissos/);
  assert.match(markup, /todos os dados acadêmicos são fictícios/i);
});

test("getAdjacentProfileSection navega pelas abas e envolve as extremidades", () => {
  assert.equal(getAdjacentProfileSection(0, "ArrowLeft"), 7);
  assert.equal(getAdjacentProfileSection(7, "ArrowRight"), 0);
  assert.equal(getAdjacentProfileSection(3, "ArrowRight"), 4);
  assert.equal(getAdjacentProfileSection(3, "Home"), 0);
  assert.equal(getAdjacentProfileSection(3, "End"), 7);
  assert.equal(getAdjacentProfileSection(3, "Enter"), null);
});

test("getDisciplineHistoryForSemester retorna somente as disciplinas do semestre escolhido", () => {
  const history = getDisciplineHistoryForSemester("2024/2");

  assert.equal(history.length, 1);
  assert.equal(history[0].name, "Algoritmos e Programação");
  assert.equal(history[0].mention, "II");
  assert.deepEqual(getDisciplineHistoryForSemester("2030/1"), []);
});

test("AcademicProfileDashboard renderiza dados reais quando importedData é fornecido", () => {
  const markup = renderToStaticMarkup(
    createElement(AcademicProfileDashboard, {
      consented: false,
      onConsent: () => {},
      onRevokeConsent: () => {},
      importedData: {
        autenticidade_estrutural_valida: true,
        dados_academicos: {
          curso: "ENGENHARIA DE SOFTWARE/FCTE - BACHARELADO - DIURNO",
          curriculo: "6360/2 - 2024.2",
          status: "ATIVO",
          periodo_inicial: "2025.1",
          periodo_atual: 4,
          prazo_conclusao: "2029.2 / 2032.2",
          ira: 3.9718,
          mp: 4.0333,
          data_emissao: "21/11/2026 às 21:23",
          codigo_verificacao: "30330eba4c",
        },
        carga_horaria: {
          exigido: { obrigatorias: 2985, optativas: 540, complementares: 0, total: 3525 },
          integralizado: { obrigatorias: 900, optativas: 90, complementares: 0, total: 990 },
          pendente: { obrigatorias: 2085, optativas: 450, complementares: 0, total: 2535 },
        },
        cursadas: [
          {
            semestre: "2025.2",
            codigo: "FGA0158",
            nome: "ORIENTAÇÃO A OBJETOS",
            professores: ["LUCAS URSULINO BOAVENTURA"],
            ch: 60,
            turma: "02",
            frequencia: 100.0,
            mencao: "SS",
            situacao: "APR",
            natureza_simbolo: null,
          },
        ],
        cursando: [
          {
            semestre: "2026.2",
            codigo: "FGA0312",
            nome: "MÉTODOS DE DESENVOLVIMENTO DE SOFTWARE",
            professores: ["Dra. CARLA SILVA ROCHA AGUIAR"],
            ch: 60,
            turma: "01",
            frequencia: 100.0,
            mencao: null,
            situacao: "MATR",
            natureza_simbolo: null,
          },
        ],
        pendentes: [
          { codigo: "FGA0160", nome: "MÉTODOS NUMÉRICOS PARA ENGENHARIA", ch: 60, matriculado: false },
        ],
        contribuicao: {
          total_elegiveis: 1,
          novas_contribuicoes: 1,
          duplicadas_ignoradas: 0,
          disciplinas_nao_encontradas: [],
          turmas_atualizadas: 1,
          turmas_liberadas_lgpd: 0,
          minimo_amostras_lgpd: 5,
        },
      },
    })
  );

  assert.match(markup, /3,9718/);
  assert.match(markup, /990 de 3525 h/);
  assert.match(markup, /MÉTODOS DE DESENVOLVIMENTO DE SOFTWARE/);
  assert.match(markup, /Dados reais extraídos do seu Histórico Escolar/);
});
