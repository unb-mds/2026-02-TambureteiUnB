import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import Footer from "../Footer.tsx";

test("Footer exibe links de Entrar e Cadastrar para visitante nao autenticado", () => {
  const markup = renderToStaticMarkup(<Footer />);

  assert.match(markup, /href="\/"/);
  assert.match(markup, /href="\/cursos"/);
  assert.match(markup, /href="\/disciplinas"/);
  assert.match(markup, /href="https:\/\/github\.com\/unb-mds\/2026-02-TambureteiUnB"/);
  assert.match(markup, /GitHub/);
  assert.match(markup, /href="\/login"[^>]*>Entrar</);
  assert.match(markup, /href="\/cadastro"[^>]*>Cadastrar</);
});

test("Footer oculta Entrar e Cadastrar reativamente com base no estado autenticado", () => {
  const sourcePath = path.resolve(process.cwd(), "src/components/Footer.tsx");
  const source = fs.readFileSync(sourcePath, "utf-8");

  assert.match(source, /useSyncExternalStore/);
  assert.match(source, /subscribeAuthChange/);
  assert.match(source, /isAuthenticated\(\)/);
  assert.match(source, /\{!isLoggedIn\s*&&/);
});


test("Footer oferece relato de problema com dialogo acessivel", () => {
  const markup = renderToStaticMarkup(<Footer />);
  assert.match(markup, /Relatar problema/);
  assert.match(markup, /<dialog[^>]*aria-labelledby="relato-bug-titulo"/);
  assert.match(markup, /Entre na sua conta para enviar um relato/);
});
