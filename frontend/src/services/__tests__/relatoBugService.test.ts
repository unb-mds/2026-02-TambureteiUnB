import test from "node:test";
import assert from "node:assert/strict";
import { enviarRelatoBug, listarRelatosBugs, decidirRelatoBug } from "../relatoBugService.ts";
import { ApiError } from "../httpClient.ts";

test("envia relato e encaminha decisao sem expor dados na URL", async t => {
  const calls: { url: string; options?: RequestInit }[] = [];
  t.mock.method(globalThis, "fetch", async (url: string | URL | Request, options?: RequestInit) => {
    calls.push({ url: String(url), options });
    return new Response(JSON.stringify({ id: 1 }), { status: 200 });
  });
  await enviarRelatoBug({ titulo: "Problema na grade", descricao: "Falha ao baixar o arquivo.", pagina: "/minha-grade" });
  await listarRelatosBugs(2);
  await decidirRelatoBug(1, "RESOLVIDO", "Testado.");
  assert.ok(calls[0].url.endsWith("/relatos-bugs"));
  assert.equal(calls[0].options?.method, "POST");
  assert.equal(JSON.parse(String(calls[0].options?.body)).pagina, "/minha-grade");
  assert.ok(calls[1].url.endsWith("/moderacao/bugs?pagina=2"));
  assert.equal(calls[2].options?.method, "PATCH");
  assert.equal(JSON.parse(String(calls[2].options?.body)).status, "RESOLVIDO");
});

test("falha no envio permanece disponivel para nova tentativa", async t => {
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ detail: "Sessão expirada." }), { status: 401 }));
  await assert.rejects(enviarRelatoBug({ titulo: "Erro na grade", descricao: "Não gerou o arquivo.", pagina: "/minha-grade" }), (e: unknown) => e instanceof ApiError && e.status === 401);
});
