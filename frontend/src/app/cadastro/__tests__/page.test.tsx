import {
  AppRouterContext,
  type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import RegisterPage from "../page.tsx";

function renderRegisterPage(): string {
  const router: AppRouterInstance = {
    back() {},
    forward() {},
    refresh() {},
    bfcacheId: "teste-cadastro",
    push() {},
    replace() {},
    prefetch() {},
  };

  return renderToStaticMarkup(
    createElement(
      AppRouterContext.Provider,
      { value: router },
      createElement(RegisterPage)
    )
  );
}

test("campo de senha em /cadastro exibe placeholder alinhado ao minimo de 8 caracteres", () => {
  const markup = renderRegisterPage();

  assert.match(
    markup,
    /placeholder="Crie uma senha segura \(mín\. 8 caracteres\)"/
  );
  assert.doesNotMatch(markup, /6 d[íi]gitos|mín\. 6|min\. 6/i);
});

test("formulario de cadastro renderiza campos obrigatorios e mantem regras reais de senha forte", () => {
  const markup = renderRegisterPage();

  assert.match(markup, /id="register-nome"/);
  assert.match(markup, /id="register-email"/);
  assert.match(markup, /id="register-password"/);
  assert.match(markup, /id="register-confirm-password"/);
  assert.match(markup, /Criar Conta/);

  const registerSource = fs.readFileSync(
    path.resolve(process.cwd(), "src/app/cadastro/page.tsx"),
    "utf-8"
  );

  assert.match(registerSource, /password\.length < 8/);
  assert.match(registerSource, /A senha deve ter no mínimo 8 caracteres\./);
  assert.match(registerSource, /\[A-Z\]/);
  assert.match(registerSource, /\[a-z\]/);
  assert.match(registerSource, /\[0-9\]/);
});
