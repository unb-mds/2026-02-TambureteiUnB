import test from "node:test";
import assert from "node:assert/strict";
import { verificarModerador, podeModerar, listarPendentes, decidirCuradoria, baixarParaAnalise } from "../moderacaoService.ts";
import { ApiError } from "../httpClient.ts";

const dados = new Map<string, string>();
Object.defineProperty(globalThis, "window", { value: {}, configurable: true });
Object.defineProperty(globalThis, "localStorage", { value: {
  getItem: (key: string) => dados.get(key) ?? null,
  setItem: (key: string, value: string) => dados.set(key, value),
  removeItem: (key: string) => dados.delete(key),
}, configurable: true });

test("somente perfis administrativos podem moderar", () => {
  assert.equal(podeModerar("STUDENT"), false);
  assert.equal(podeModerar("MODERATOR"), true);
  assert.equal(podeModerar("ADMIN"), true);
});

test("perfil ADMIN em cache não autoriza estudante", async (t) => {
  dados.set("tamburetei_auth_token", "token");
  dados.set("tamburetei_user", JSON.stringify({ role: "ADMIN" }));
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ id: "1", role: "STUDENT" }), { status: 200 }));
  await assert.rejects(verificarModerador(), (e: unknown) => e instanceof ApiError && e.status === 403);
});

test("sem token não consulta sessão", async (t) => {
  dados.clear();
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("Não deveria consultar"); });
  await assert.rejects(verificarModerador(), (e: unknown) => e instanceof ApiError && e.status === 401);
  assert.equal(fetch.mock.callCount(), 0);
});

test("sessão expirada não usa fallback de cache", async (t) => {
  dados.set("tamburetei_auth_token", "expirado");
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ detail: "Token expirado." }), { status: 401 }));
  await assert.rejects(verificarModerador(), (e: unknown) => e instanceof ApiError && e.status === 401);
});

test("perfil administrativo validado no servidor", async (t) => {
  dados.set("tamburetei_auth_token", "token");
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ id: "1", role: "ADMIN", is_active: true }), { status: 200 }));
  assert.equal((await verificarModerador()).role, "ADMIN");
});

test("fila e decisão usam Bearer e contrato correto", async (t) => {
  dados.set("tamburetei_auth_token", "token");
  const chamadas: Array<{ url: string; options: RequestInit }> = [];
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    chamadas.push({ url, options });
    return new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 });
  });
  await listarPendentes(2);
  await decidirCuradoria(12, "RECUSADO", "  Material inadequado.  ");
  assert.match(chamadas[0].url, /pagina=2&tamanho_pagina=20/);
  assert.equal(new Headers(chamadas[0].options.headers).get("Authorization"), "Bearer token");
  assert.equal(chamadas[1].options.method, "PATCH");
  assert.deepEqual(JSON.parse(String(chamadas[1].options.body)), { status: "RECUSADO", justificativa: "Material inadequado." });
});

test("conflito de outro moderador é propagado", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ detail: "Já avaliado." }), { status: 409 }));
  await assert.rejects(decidirCuradoria(12, "APROVADO"), (e: unknown) => e instanceof ApiError && e.status === 409);
});

test("download usa endpoint protegido e retorna binário", async (t) => {
  dados.set("tamburetei_auth_token", "token");
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    assert.match(url, /moderacao\/materiais\/12\/download$/);
    assert.equal(new Headers(options.headers).get("Authorization"), "Bearer token");
    return new Response("%PDF-1.7 teste", { status: 200 });
  });
  assert.equal(await (await baixarParaAnalise(12)).text(), "%PDF-1.7 teste");
});
