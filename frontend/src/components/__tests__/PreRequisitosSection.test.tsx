import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import PreRequisitosSection from "../PreRequisitosSection.tsx";

test("PreRequisitosSection renderiza links navegaveis quando ha pre-requisitos estruturados", () => {
  const items = [
    { codigo: "MAT0025", nome: "Cálculo 1", slug: "calculo-1" },
    { codigo: "FGA0158", nome: "Orientação a Objetos", slug: "orientacao-a-objetos" },
  ];

  const markup = renderToStaticMarkup(
    <PreRequisitosSection preRequisitosItens={items} />
  );

  assert.match(markup, /Pré-requisitos Obrigatórios/i);
  assert.match(markup, /href="\/disciplinas\/calculo-1"/);
  assert.match(markup, /MAT0025 - Cálculo 1/);
  assert.match(markup, /href="\/disciplinas\/orientacao-a-objetos"/);
  assert.match(markup, /FGA0158 - Orientação a Objetos/);
});

test("PreRequisitosSection renderiza estado amigavel quando nao ha pre-requisitos", () => {
  const markup = renderToStaticMarkup(
    <PreRequisitosSection preRequisitosItens={[]} preRequisitosStrings={[]} />
  );

  assert.match(markup, /Sem pré-requisitos exigidos para esta disciplina/i);
});

test("PreRequisitosSection renderiza co-requisito quando informado", () => {
  const markup = renderToStaticMarkup(
    <PreRequisitosSection
      preRequisitosItens={[{ codigo: "FGA0138", nome: "MDS", slug: "mds" }]}
      coRequisitos="FGA0142 - Engenharia de Requisitos"
    />
  );

  assert.match(markup, /Co-requisito registrado:/i);
  assert.match(markup, /FGA0142 - Engenharia de Requisitos/);
});
