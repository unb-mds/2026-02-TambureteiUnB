import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ApprovalBadge from "../ApprovalBadge.ts";

test("ApprovalBadge exibe porcentagem real para métricas válidas", () => {
  const markup = renderToStaticMarkup(
    createElement(ApprovalBadge, { approval: 76.5 })
  );

  assert.match(markup, /76\.5% de aprovação/);
  assert.match(markup, /bg-\[#E9F9F3\]/);
  assert.doesNotMatch(markup, /Sem dados/);
});

test("ApprovalBadge exibe badge neutro sem métrica válida", () => {
  for (const approval of [null, undefined, 0]) {
    const markup = renderToStaticMarkup(
      createElement(ApprovalBadge, { approval })
    );

    assert.match(markup, /Sem dados/);
    assert.match(markup, /bg-gray-100/);
    assert.match(markup, /text-gray-500/);
    assert.doesNotMatch(markup, /% de aprovação/);
  }
});
