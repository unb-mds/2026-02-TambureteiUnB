import assert from "node:assert/strict";
import test from "node:test";
import { listMaterials } from "../materialService.ts";

test("pesquisa, categoria e página são enviados ao servidor", async t => {
  const fetch = t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ items: [], total: 0, pagina: 2, tamanho_pagina: 20 })));
  await listMaterials("cálculo 1", { titulo: "Resumo antigo", tipos: ["RESUMO", "DICA"], pagina: 2, tamanho_pagina: 20 });
  const url = new URL(String(fetch.mock.calls[0].arguments[0]));
  assert.equal(decodeURIComponent(url.pathname), "/cadeiras/cálculo 1/materiais");
  assert.equal(url.searchParams.get("titulo"), "Resumo antigo");
  assert.deepEqual(url.searchParams.getAll("tipos"), ["RESUMO", "DICA"]);
  assert.equal(url.searchParams.get("pagina"), "2");
});
