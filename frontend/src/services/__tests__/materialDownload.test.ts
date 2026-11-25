import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { downloadMaterial } from "../materialService.ts";
import { ApiError } from "../httpClient.ts";

function mockWindow(t: TestContext, token: string | null) {
  const names = ["window", "localStorage"] as const;
  const originals = names.map(name => Object.getOwnPropertyDescriptor(globalThis, name));
  const storage = { getItem: () => token };
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: storage } });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  t.after(() => names.forEach((name, index) => {
    const original = originals[index];
    if (original) Object.defineProperty(globalThis, name, original);
    else Reflect.deleteProperty(globalThis, name);
  }));
}

test("download envia JWT e preserva o conteúdo binário", async t => {
  mockWindow(t, "token-teste");
  const fetch = t.mock.method(globalThis, "fetch", async (_url: unknown, options?: RequestInit) => {
    assert.equal(new Headers(options?.headers).get("Authorization"), "Bearer token-teste");
    return new Response("%PDF-1.7 teste", { headers: { "Content-Type": "application/pdf" } });
  });
  const blob = await downloadMaterial(7);
  assert.equal(await blob.text(), "%PDF-1.7 teste");
  assert.match(String(fetch.mock.calls[0].arguments[0]), /\/materiais\/7\/download$/);
});

test("visitante consegue baixar material público sem token", async t => {
  mockWindow(t, null);
  const fetch = t.mock.method(globalThis, "fetch", async (_url: unknown, options?: RequestInit) => {
    assert.equal(new Headers(options?.headers).get("Authorization"), null);
    return new Response("%PDF-1.7 publico", { headers: { "Content-Type": "application/pdf" } });
  });
  const blob = await downloadMaterial(7);
  assert.equal(await blob.text(), "%PDF-1.7 publico");
  assert.equal(fetch.mock.callCount(), 1);
});

for (const status of [401, 403, 404, 503]) {
  test(`download informa erro HTTP ${status}`, async t => {
    mockWindow(t, "token-teste");
    t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ detail: "Falha controlada" }), { status }));
    await assert.rejects(downloadMaterial(7), (e: unknown) => e instanceof ApiError && e.status === status && e.message === "Falha controlada");
  });
}
