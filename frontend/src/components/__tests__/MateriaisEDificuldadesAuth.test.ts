import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import MateriaisApoio from "../../../components/MateriaisApoio.tsx";
import DificuldadesPanel from "../DificuldadesPanel.tsx";

test("MateriaisApoio bloqueia compartilhamento e exibe aviso de login sem alert() quando visitante nao esta logado", () => {
  const markup = renderToStaticMarkup(
    createElement(MateriaisApoio, {
      disciplineName: "Cálculo 1",
      disciplineIdOrSlug: "calculo-1",
    })
  );

  assert.match(markup, /Apenas estudantes autenticados podem compartilhar materiais/);
  assert.match(markup, /href="\/login"/);
  assert.match(markup, /Faça login para compartilhar/);

  const sourcePath = path.resolve(process.cwd(), "components/MateriaisApoio.tsx");
  const source = fs.readFileSync(sourcePath, "utf-8");
  assert.doesNotMatch(source, /\balert\s*\(/);
});

test("DificuldadesPanel bloqueia abertura do formulario e exibe aviso de login quando visitante nao esta logado", () => {
  const markup = renderToStaticMarkup(
    createElement(DificuldadesPanel, {
      disciplineId: 1,
      disciplineSlug: "calculo-1",
      disciplineCode: "MAT0025",
      disciplineName: "Cálculo 1",
      ementa: "1. Limites\n2. Derivadas",
    })
  );

  assert.match(markup, /Apenas estudantes autenticados podem registrar dificuldades na ementa/);
  assert.match(markup, /href="\/login"/);
  assert.match(markup, /Faça login para relatar/);

  const sourcePath = path.resolve(process.cwd(), "src/components/DificuldadesPanel.tsx");
  const source = fs.readFileSync(sourcePath, "utf-8");
  assert.doesNotMatch(source, /\balert\s*\(/);
});
