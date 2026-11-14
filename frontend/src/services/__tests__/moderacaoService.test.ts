import test from "node:test";
import assert from "node:assert/strict";
import {
  verificarModerador,
  podeModerar,
  listarPendentes,
  decidirCuradoria,
  baixarParaAnalise,
  validarMotivoDenuncia,
  criarDenuncia,
  listarDenunciasPendentes,
  decidirDenuncia,
} from "../moderacaoService.ts";
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

test("validarMotivoDenuncia aplica limites minimos e maximos", () => {
  assert.equal(validarMotivoDenuncia("   ").valido, false);
  assert.match(validarMotivoDenuncia("abcd").erro ?? "", /mínimo 5 caracteres/);
  assert.match(validarMotivoDenuncia("x".repeat(1001)).erro ?? "", /máximo 1000 caracteres/);
  assert.deepEqual(validarMotivoDenuncia("  Ataque direto ao docente da disciplina (RN04).  "), {
    valido: true,
  });
});

test("criarDenuncia valida entrada e envia POST para /comunidade/denuncias", async (t) => {
  dados.set("tamburetei_auth_token", "token-aluno");
  const chamadas: Array<{ url: string; options: RequestInit }> = [];
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    chamadas.push({ url, options });
    return new Response(
      JSON.stringify({
        id: 7,
        tipo_alvo: "COMENTARIO",
        comentario_id: 42,
        conteudo_id: null,
        categoria: "OFENSA_DOCENTE",
        motivo: "Comentário contém juízo depreciativo contra o docente.",
        status: "PENDENTE",
        total_denuncias_alvo: 1,
        ocultado_automaticamente: false,
        created_at: "2026-11-06T12:00:00Z",
      }),
      { status: 201 },
    );
  });

  await assert.rejects(
    criarDenuncia({ categoria: "OFENSA_DOCENTE", motivo: "Motivo válido com mais de cinco letras" }),
    /alvo válido/,
  );

  await assert.rejects(
    criarDenuncia({ comentario_id: 42, categoria: "OFENSA_DOCENTE", motivo: "abc" }),
    /mínimo 5 caracteres/,
  );

  const resposta = await criarDenuncia({
    comentario_id: 42,
    categoria: "OFENSA_DOCENTE",
    motivo: "  Comentário contém juízo depreciativo contra o docente.  ",
  });

  assert.equal(resposta.id, 7);
  assert.equal(resposta.status, "PENDENTE");
  assert.match(chamadas[0].url, /\/comunidade\/denuncias$/);
  assert.equal(chamadas[0].options.method, "POST");
  assert.deepEqual(JSON.parse(String(chamadas[0].options.body)), {
    comentario_id: 42,
    categoria: "OFENSA_DOCENTE",
    motivo: "Comentário contém juízo depreciativo contra o docente.",
  });
});

test("listarDenunciasPendentes e decidirDenuncia enviam filtros e payload de acao", async (t) => {
  dados.set("tamburetei_auth_token", "token-mod");
  const chamadas: Array<{ url: string; options: RequestInit }> = [];
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    chamadas.push({ url, options });
    return new Response(JSON.stringify({ items: [], total: 0, pagina: 1, tamanho_pagina: 20 }), { status: 200 });
  });

  await listarDenunciasPendentes(1, "COMENTARIO", "OFENSA_DOCENTE");
  assert.match(chamadas[0].url, /\/moderacao\/denuncias\?pagina=1&tamanho_pagina=20&tipo=COMENTARIO&categoria=OFENSA_DOCENTE$/);

  await decidirDenuncia(15, "EXCLUIR_CONTEUDO", "  Violação confirmada da RN04. ");
  assert.match(chamadas[1].url, /\/moderacao\/denuncias\/15$/);
  assert.equal(chamadas[1].options.method, "PATCH");
  assert.deepEqual(JSON.parse(String(chamadas[1].options.body)), {
    acao: "EXCLUIR_CONTEUDO",
    justificativa: "Violação confirmada da RN04.",
  });

  await decidirDenuncia(16, "DESCARTAR_DENUNCIA");
  assert.deepEqual(JSON.parse(String(chamadas[2].options.body)), {
    acao: "DESCARTAR_DENUNCIA",
    justificativa: null,
  });
});
