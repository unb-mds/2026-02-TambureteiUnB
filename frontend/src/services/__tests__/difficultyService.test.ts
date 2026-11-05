import test from "node:test";
import assert from "node:assert/strict";

import {
  listDifficultyAlerts,
  submitDifficultyAlert,
} from "../difficultyService.ts";
import {
  extractSyllabusUnits,
  encodeTopicWithSeverity,
  parseTopicAndSeverity,
  computeDifficultySummary,
} from "../../types/dificuldade.ts";
import { setStoredToken, removeStoredToken } from "../httpClient.ts";

test("extractSyllabusUnits extrai unidades reais da ementa oficial", () => {
  const ementa =
    "Processos de desenvolvimento de software e ciclos de vida. Métodos ágeis com ênfase em Scrum e XP. Planejamento iterativo e gestão de requisitos. Integração contínua e testes automatizados.";

  const units = extractSyllabusUnits(ementa);
  assert.equal(units.length, 4);
  assert.equal(units[0], "Processos de desenvolvimento de software e ciclos de vida");
  assert.equal(units[1], "Métodos ágeis com ênfase em Scrum e XP");
});

test("encodeTopicWithSeverity e parseTopicAndSeverity preservam severidade e topico", () => {
  const encoded = encodeTopicWithSeverity("Integrais Múltiplas", "CRITICO");
  assert.equal(encoded, "[CRITICO] Integrais Múltiplas");

  const parsed = parseTopicAndSeverity(encoded);
  assert.equal(parsed.severity, "CRITICO");
  assert.equal(parsed.topic, "Integrais Múltiplas");
});

test("computeDifficultySummary calcula ranking e percentual das unidades mais temidas", () => {
  const units = ["Séries e Sequências", "Integrais Múltiplas", "Derivadas Parciais"];
  const alerts = [
    {
      id: "1",
      authorAlias: "@aluno1",
      isAnonymous: false,
      topic: "Integrais Múltiplas",
      severity: "CRITICO" as const,
      content: "Tópico com alta cobrança na prova final.",
      createdAt: "Recente",
      rawCreatedAt: "2026-10-30T12:00:00Z",
      upvotes: 5,
      isLikedByMe: false,
    },
    {
      id: "2",
      authorAlias: "Estudante Anônimo",
      isAnonymous: true,
      topic: "Integrais Múltiplas",
      severity: "ALTO" as const,
      content: "Requer muita prática de mudança de coordenadas.",
      createdAt: "Recente",
      rawCreatedAt: "2026-10-30T13:00:00Z",
      upvotes: 2,
      isLikedByMe: false,
    },
    {
      id: "3",
      authorAlias: "@aluno2",
      isAnonymous: false,
      topic: "Séries e Sequências",
      severity: "MODERADO" as const,
      content: "Critérios de convergência exigem atenção.",
      createdAt: "Recente",
      rawCreatedAt: "2026-10-30T14:00:00Z",
      upvotes: 1,
      isLikedByMe: false,
    },
  ];

  const summary = computeDifficultySummary(alerts, units, 30);
  assert.equal(summary.totalAlerts, 3);
  assert.equal(summary.totalUpvotes, 8);
  assert.equal(summary.mappedUnitsCount, 2);
  assert.ok(summary.mostFearedUnit);
  assert.equal(summary.mostFearedUnit.unit, "Integrais Múltiplas");
  assert.equal(summary.mostFearedUnit.alertCount, 2);
  assert.ok(summary.mostFearedUnit.fearPercentage > 50);
});

test("listDifficultyAlerts consulta o endpoint e filtra alertas com topico_dificuldade", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        items: [
          {
            id: 10,
            disciplina_id: 5,
            autor_alias: "Marina S.",
            topico_dificuldade: "[CRITICO] Recursão e Ponteiros",
            conteudo: "Importante treinar alocação dinâmica com listas encadeadas.",
            status_moderacao: "PUBLICADO",
            created_at: "2026-10-29T10:00:00Z",
          },
          {
            id: 11,
            disciplina_id: 5,
            autor_alias: "Carlos",
            topico_dificuldade: null,
            conteudo: "Comentário geral sem tópico de dificuldade.",
            status_moderacao: "PUBLICADO",
            created_at: "2026-10-29T11:00:00Z",
          },
        ],
        total: 2,
        page: 1,
        size: 50,
        pages: 1,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )) as typeof fetch;

  const result = await listDifficultyAlerts("algoritmos");
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].topic, "Recursão e Ponteiros");
  assert.equal(result.items[0].severity, "CRITICO");

  globalThis.fetch = originalFetch;
});

test("submitDifficultyAlert envia novo alerta para POST /comentarios quando disciplineId existe", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedBody: Record<string, unknown> = {};

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedBody = JSON.parse(String(init?.body || "{}"));
    return new Response(
      JSON.stringify({
        id: 42,
        disciplina_id: 7,
        autor_alias: "Estudante Anônimo",
        topico_dificuldade: capturedBody.topico_dificuldade,
        conteudo: capturedBody.conteudo,
        status_moderacao: "PUBLICADO",
        created_at: "2026-10-31T10:00:00Z",
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  setStoredToken("jwt-teste");

  const created = await submitDifficultyAlert({
    disciplineId: 7,
    disciplineSlugOrCode: "calculo-1",
    isAnonymous: true,
    topic: "Teorema Fundamental do Cálculo",
    severity: "CRITICO",
    content: "Recomendo resolver as provas antigas dos últimos três semestres.",
  });

  assert.ok(capturedUrl.endsWith("/comentarios"));
  assert.equal(capturedBody.disciplina_id, 7);
  assert.equal(
    capturedBody.topico_dificuldade,
    "[CRITICO] Teorema Fundamental do Cálculo"
  );
  assert.equal(created.id, "42");
  assert.equal(created.severity, "CRITICO");
  assert.equal(created.topic, "Teorema Fundamental do Cálculo");

  removeStoredToken();
  globalThis.fetch = originalFetch;
});
