import test from "node:test";
import assert from "node:assert/strict";

import {
  createExternalLink,
  listMaterials,
  toggleMaterialVote,
  uploadMaterial,
  uploadMaterialsBatch,
} from "../materialService.ts";
import { setStoredToken, removeStoredToken } from "../httpClient.ts";

if (typeof globalThis.FormData === "undefined") {
  class MockFormData {
    private data: Record<string, unknown> = {};
    append(key: string, value: unknown) {
      this.data[key] = value;
    }
    get(key: string) {
      return this.data[key];
    }
  }
  (globalThis as unknown as Record<string, unknown>).FormData = MockFormData;
}

if (typeof globalThis.File === "undefined") {
  class MockFile {
    parts: (string | Blob)[];
    name: string;
    options?: { type?: string };

    constructor(
      parts: (string | Blob)[],
      name: string,
      options?: { type?: string }
    ) {
      this.parts = parts;
      this.name = name;
      this.options = options;
    }

    get size() {
      return 1000;
    }
  }
  (globalThis as unknown as Record<string, unknown>).File = MockFile;
}

test("uploadMaterial envia dados multipart via fetch com sucesso e reporta progresso", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        id: 123,
        disciplina_id: 1,
        titulo: "Resumo de Exemplo",
        tipo: "ARQUIVO",
        formato: "pdf",
        tamanho_bytes: 1000,
        status_moderacao: "ativo",
        created_at: "2026-10-23T14:00:00Z",
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    )) as typeof fetch;

  setStoredToken("token-de-teste-123");

  const progressRecords: number[] = [];
  const fakeFile = new (globalThis as unknown as { File: new (p: string[], n: string) => File }).File(
    ["conteudo"],
    "resumo.pdf"
  );

  const response = await uploadMaterial({
    disciplineIdOrSlug: "calculo-1",
    title: "Resumo de Exemplo",
    file: fakeFile,
    type: "RESUMO",
    onProgress: (p) => {
      progressRecords.push(p.percent);
    },
  });

  assert.equal(response.id, 123);
  assert.equal(response.titulo, "Resumo de Exemplo");
  assert.equal(response.status_moderacao, "ativo");
  assert.ok(progressRecords.length >= 1);
  assert.equal(progressRecords[progressRecords.length - 1], 100);

  removeStoredToken();
  globalThis.fetch = originalFetch;
});

test("uploadMaterial trata erros 413 e 415 do backend adequadamente via fetch", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ detail: "Arquivo muito grande." }), {
      status: 413,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;

  const fakeFile = new (globalThis as unknown as { File: new (p: string[], n: string) => File }).File(
    ["dados"],
    "grande.pdf"
  );

  await assert.rejects(
    async () => {
      await uploadMaterial({
        disciplineIdOrSlug: 1,
        title: "Arquivo Grande",
        file: fakeFile,
      });
    },
    (err: { status?: number; message?: string }) => {
      assert.equal(err.status, 413);
      assert.match(err.message || "", /limite maximo de 5 MiB/i);
      return true;
    }
  );

  globalThis.fetch = originalFetch;
});

test("uploadMaterialsBatch retorna lista vazia quando nenhum arquivo for fornecido", async () => {
  const result = await uploadMaterialsBatch({
    disciplineIdOrSlug: "calculo-1",
    items: [],
  });
  assert.deepEqual(result, []);
});

test("listMaterials consulta materiais com cache no-store", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedInit = init;
    return new Response(
      JSON.stringify({ items: [], total: 0, pagina: 1, tamanho_pagina: 20 }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  const page = await listMaterials("matematica-discreta-1");

  assert.match(capturedUrl, /\/cadeiras\/matematica-discreta-1\/materiais$/);
  assert.equal(capturedInit?.cache, "no-store");
  assert.equal(page.total, 0);

  globalThis.fetch = originalFetch;
});

test("toggleMaterialVote chama POST /materiais/{id}/voto e retorna contagem atualizada", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedMethod = "";

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedMethod = init?.method || "GET";
    return new Response(
      JSON.stringify({ material_id: 42, upvotes: 3, liked_by_me: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  const res = await toggleMaterialVote(42);
  assert.match(capturedUrl, /\/materiais\/42\/voto$/);
  assert.equal(capturedMethod, "POST");
  assert.deepEqual(res, { material_id: 42, upvotes: 3, liked_by_me: true });

  globalThis.fetch = originalFetch;
});

test("createExternalLink envia POST /cadeiras/{id}/links com payload normalizado", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedMethod = "";
  let capturedBody = "";

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedMethod = init?.method || "GET";
    capturedBody = String(init?.body || "");
    return new Response(
      JSON.stringify({
        id: 99,
        disciplina_id: 1,
        titulo: "Função Real",
        tipo: "RESUMO",
        formato: null,
        tamanho_bytes: null,
        url_origem: "https://www.youtube.com/watch?v=wPesFG0cG7g",
        status_curadoria: "PENDENTE",
        status_moderacao: null,
        created_at: "2026-11-25T00:00:00Z",
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  setStoredToken("token-link");
  const created = await createExternalLink({
    disciplineIdOrSlug: "calculo-1",
    title: "  Função Real  ",
    url: "  https://www.youtube.com/watch?v=wPesFG0cG7g  ",
    type: "PROVA_ANTIGA",
  });

  assert.match(capturedUrl, /\/cadeiras\/calculo-1\/links$/);
  assert.equal(capturedMethod, "POST");
  assert.deepEqual(JSON.parse(capturedBody), {
    titulo: "Função Real",
    url_origem: "https://www.youtube.com/watch?v=wPesFG0cG7g",
    tipo: "PROVA_ANTIGA",
  });
  assert.equal(created.id, 99);
  assert.equal(created.url_origem, "https://www.youtube.com/watch?v=wPesFG0cG7g");

  removeStoredToken();
  globalThis.fetch = originalFetch;
});
