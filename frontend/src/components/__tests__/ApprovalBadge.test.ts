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
  assert.match(markup, /var\(--status-success-bg\)/);
  assert.doesNotMatch(markup, /Sem dados/);
});

test("ApprovalBadge exibe badge neutro sem métrica válida", () => {
  for (const approval of [null, undefined, NaN, Infinity, -1, 101]) {
    const markup = renderToStaticMarkup(
      createElement(ApprovalBadge, { approval })
    );

    assert.match(markup, /Sem dados/);
    assert.match(markup, /var\(--status-neutral-bg\)/);
    assert.match(markup, /var\(--status-neutral-text\)/);
    assert.doesNotMatch(markup, /% de aprovação/);
  }
});

test("ApprovalBadge exibe Sem dados para taxa zero", () => {
  const markup = renderToStaticMarkup(createElement(ApprovalBadge, { approval: 0 }));
  assert.match(markup, /Sem dados/);
  assert.doesNotMatch(markup, /0% de aprovação/);
});
