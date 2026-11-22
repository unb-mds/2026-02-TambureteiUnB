import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AcademicProfileDashboard, {
  getAdjacentProfileSection,
  buildWeeklySchedule,
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
  assert.match(markup, /Histórico/);
  assert.match(markup, /Desempenho/);
  assert.doesNotMatch(markup, /Planejamento/);
  assert.doesNotMatch(markup, /Comunidade/);
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
  assert.match(markup, /Horários demonstrativos/);
  assert.match(markup, /todos os dados acadêmicos são fictícios/i);
});

test("getAdjacentProfileSection navega pelas abas e envolve as extremidades", () => {
  assert.equal(getAdjacentProfileSection(0, "ArrowLeft"), 3);
  assert.equal(getAdjacentProfileSection(3, "ArrowRight"), 0);
  assert.equal(getAdjacentProfileSection(1, "ArrowRight"), 2);
  assert.equal(getAdjacentProfileSection(2, "Home"), 0);
  assert.equal(getAdjacentProfileSection(1, "End"), 3);
  assert.equal(getAdjacentProfileSection(2, "Enter"), null);
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
            slug: "metodos-de-desenvolvimento-de-software",
            professores: [
              "MÉTODOS DE DESENVOLVIMENTO DE SOFTWARE Dra. CARLA SILVA ROCHA AGUIAR",
            ],
            ch: 60,
            turma: "01",
            frequencia: 100.0,
            mencao: null,
            situacao: "MATR",
            natureza_simbolo: null,
            horario: "35M12",
            local: "FCTE - Sala S4",
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
  assert.match(markup, /Terça/);
  assert.match(markup, /Quinta/);
  assert.match(markup, /08:00–09:50/);
  assert.match(markup, /FCTE - Sala S4/);
  assert.match(markup, /Turma 01/);
  assert.match(markup, /FGA0312 · 60 h/);
  assert.match(markup, /Dra\. CARLA SILVA ROCHA AGUIAR/);
  assert.doesNotMatch(
    markup,
    /MÉTODOS DE DESENVOLVIMENTO DE SOFTWARE Dra\. CARLA SILVA ROCHA AGUIAR/
  );
  assert.match(markup, /\/disciplinas\/metodos-de-desenvolvimento-de-software/);
  assert.doesNotMatch(markup, /Disciplinas · Semestre/);
  assert.match(markup, /Dados reais extraídos do seu Histórico Escolar/);
});

const scheduleSubject = (horario: string, turma = "01") => ({
 semestre:"2026.2",codigo:"FGA0312",nome:"MÉTODOS DE DESENVOLVIMENTO DE SOFTWARE",
 professores:["Docente de teste"],ch:60,turma,horario,local:"Sala de teste",
 frequencia:null,mencao:null,situacao:"MATR",natureza_simbolo:null,
});
test("horários do perfil unem M5 e T1 da mesma turma em um único bloco", () => {
 const days=buildWeeklySchedule([scheduleSubject("24M5 24T1")],{});
 for (const day of days.filter(day=>["Segunda","Quarta"].includes(day.day))) {
  assert.equal(day.classes.length,1);
  assert.equal(day.classes[0].time,"12:00–13:50");
 }
});
test("horários do perfil preservam intervalos e turmas diferentes", () => {
 const days=buildWeeklySchedule([scheduleSubject("2M12 2M34"),scheduleSubject("2M5","02"),scheduleSubject("2T1","03")],{});
 assert.deepEqual(days[0].classes.map(item=>item.time),["08:00–09:50","10:00–11:50","12:00–12:55","12:55–13:50"]);
});
