import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ComentariosFrontend from "../../../components/ComentariosFrontend.tsx";

test("ComentariosFrontend bloqueia formulario e exibe aviso sem usar alert quando visitante nao esta logado", () => {
  const markup = renderToStaticMarkup(
    createElement(ComentariosFrontend, {
      disciplineName: "Cálculo 1",
      disciplineCode: "MAT0025",
      disciplineId: 1,
    })
  );

  assert.match(markup, /Apenas estudantes autenticados podem publicar ou responder/);
  assert.match(markup, /href="\/login"/);
  assert.match(markup, /Faça login para comentar/);
  assert.doesNotMatch(markup, /@estudante_fcte/);

  const sourcePath = path.resolve(
    process.cwd(),
    "components/ComentariosFrontend.tsx"
  );
  const source = fs.readFileSync(sourcePath, "utf-8");
  assert.doesNotMatch(source, /@estudante_fcte/);
  assert.doesNotMatch(source, /\balert\s*\(/);
});
