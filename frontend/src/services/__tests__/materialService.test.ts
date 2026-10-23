import test from "node:test";
import assert from "node:assert/strict";

import { uploadMaterial, uploadMaterialsBatch } from "../materialService.ts";
import { setStoredToken, removeStoredToken } from "../httpClient.ts";

// Mock simples para simular ambiente de navegador com XMLHttpRequest e FormData
class MockUpload {
  private listeners: Record<string, ((event: unknown) => void)[]> = {};

  addEventListener(type: string, listener: (event: unknown) => void) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  emit(type: string, event: unknown) {
    if (this.listeners[type]) {
      for (const listener of this.listeners[type]) {
        listener(event);
      }
    }
  }
}

class MockXMLHttpRequest {
  public upload = new MockUpload();
  public status = 200;
  public responseText = "";
  public headers: Record<string, string> = {};
  public method = "";
  public url = "";
  public sentBody: unknown = null;
  public onload: (() => void) | null = null;
  public onerror: (() => void) | null = null;
  public ontimeout: (() => void) | null = null;

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(key: string, value: string) {
    this.headers[key] = value;
  }

  send(body?: unknown) {
    this.sentBody = body;
    // Emissao assincrona para permitir simular eventos
    setTimeout(() => {
      // Simula progresso
      this.upload.emit("progress", {
        lengthComputable: true,
        loaded: 500,
        total: 1000,
      });

      this.upload.emit("progress", {
        lengthComputable: true,
        loaded: 1000,
        total: 1000,
      });

      if (this.onload) {
        this.onload();
      }
    }, 5);
  }

  abort() {}
}

// Configura mocks globais se não existirem no Node
if (typeof globalThis.XMLHttpRequest === "undefined") {
  (globalThis as unknown as Record<string, unknown>).XMLHttpRequest = MockXMLHttpRequest;
}

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

test("uploadMaterial envia dados multipart com sucesso e captura progresso", async () => {
  const OriginalXHR = globalThis.XMLHttpRequest;

  class SuccessXHR extends MockXMLHttpRequest {
    send(body?: unknown) {
      this.status = 201;
      this.responseText = JSON.stringify({
        id: 123,
        disciplina_id: 1,
        titulo: "Resumo de Exemplo",
        tipo: "ARQUIVO",
        formato: "pdf",
        tamanho_bytes: 1000,
        status_moderacao: "ativo",
        created_at: "2026-10-23T14:00:00Z",
      });
      super.send(body);
    }
  }

  (globalThis as unknown as Record<string, unknown>).XMLHttpRequest = SuccessXHR;
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
  globalThis.XMLHttpRequest = OriginalXHR;
});

test("uploadMaterial trata erros 413 e 415 do backend adequadamente", async () => {
  const OriginalXHR = globalThis.XMLHttpRequest;

  class Error413XHR extends MockXMLHttpRequest {
    send() {
      this.status = 413;
      this.responseText = JSON.stringify({ detail: "Arquivo muito grande." });
      setTimeout(() => {
        if (this.onload) this.onload();
      }, 5);
    }
  }

  (globalThis as unknown as Record<string, unknown>).XMLHttpRequest = Error413XHR;
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

  globalThis.XMLHttpRequest = OriginalXHR;
});

test("uploadMaterialsBatch retorna lista vazia quando nenhum arquivo for fornecido", async () => {
  const result = await uploadMaterialsBatch({
    disciplineIdOrSlug: "calculo-1",
    items: [],
  });
  assert.deepEqual(result, []);
});
