import test from "node:test";
import assert from "node:assert/strict";

import { uploadMaterial, uploadMaterialsBatch } from "../materialService.ts";
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
