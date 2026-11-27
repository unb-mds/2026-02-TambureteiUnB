import assert from "node:assert/strict";
import test from "node:test";
import { ApiError, request } from "../httpClient.ts";

test("httpClient retorna mensagem amigavel em HTTP 429 mesmo quando proxy devolve HTML", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    return new Response("<html><body><h1>429 Too Many Requests</h1></body></html>", {
      status: 429,
      headers: { "content-type": "text/html" },
    });
  });

  await assert.rejects(
    () => request("/cadeiras"),
    (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 429);
      assert.match(err.message, /Muitas requisições em sequência/);
      return true;
    }
  );
});

test("httpClient preserva detail JSON do backend em HTTP 429", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    return new Response(
      JSON.stringify({ detail: "Muitas tentativas de login. Aguarde um minuto." }),
      { status: 429, headers: { "content-type": "application/json" } }
    );
  });

  await assert.rejects(
    () => request("/auth/login", { method: "POST" }),
    (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 429);
      assert.equal(err.message, "Muitas tentativas de login. Aguarde um minuto.");
      return true;
    }
  );
});
