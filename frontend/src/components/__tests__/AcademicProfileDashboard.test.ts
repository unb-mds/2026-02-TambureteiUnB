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
