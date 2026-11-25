import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("HistoricoTipoAviso orienta sobre o documento correto e nao contem emojis", () => {
  const filePath = path.resolve(
    process.cwd(),
    "src/components/HistoricoTipoAviso.tsx"
  );
  const source = fs.readFileSync(filePath, "utf-8");

  // Orientacoes textuais
  assert.match(source, /Histórico Escolar Simplificado/);
  assert.match(source, /Não envie o Histórico Completo/);
  assert.match(source, /Ensino &gt; Histórico Escolar/);

  // Semantica e acessibilidade
  assert.match(source, /role="region"/);
  assert.match(source, /aria-label="Orientação sobre documento correto do histórico SIGAA"/);

  // Proibicao de emojis
  const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  assert.equal(emojiRegex.test(source), false);
});
