import test from "node:test";
import assert from "node:assert/strict";
import { getDisciplines, getOfferedSemesters } from "../disciplineService.ts";

test("busca de grade envia oferta e semestre ao servidor antes do limite", async (t) => {
  const fetch = t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("[]"),
  );
  await getDisciplines({
    codigo: "MAT0025",
    apenas_com_turmas: true,
    semestre: "2027.1",
    limit: 12,
  });
  const url = new URL(String(fetch.mock.calls[0].arguments[0]));
  assert.equal(url.pathname, "/cadeiras");
  assert.equal(url.searchParams.get("apenas_com_turmas"), "true");
  assert.equal(url.searchParams.get("semestre"), "2027.1");
  assert.equal(url.searchParams.get("limit"), "12");
});

test("semestres vêm das ofertas do servidor", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response('["2027.1","2026.2"]'),
  );
  assert.deepEqual(await getOfferedSemesters(), ["2027.1", "2026.2"]);
});
