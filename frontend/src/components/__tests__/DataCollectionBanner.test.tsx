import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DATA_COLLECTION_BANNER_STORAGE_KEY } from "../DataCollectionBanner";

test("DataCollectionBanner declara a chave correta de persistencia no localStorage", () => {
  assert.equal(
    DATA_COLLECTION_BANNER_STORAGE_KEY,
    "tamburetei_hide_data_collection_banner"
  );
});

test("DataCollectionBanner possui estrutura semantica de acessibilidade e sem emojis", () => {
  const filePath = path.resolve(
    process.cwd(),
    "src/components/DataCollectionBanner.tsx"
  );
  const source = fs.readFileSync(filePath, "utf-8");

  // Acessibilidade e tags semanticas
  assert.match(source, /role="region"/);
  assert.match(source, /aria-label="Aviso sobre coleta colaborativa de dados"/);
  assert.match(source, /aria-label="Fechar aviso de coleta de dados"/);
  assert.match(source, /href="\/perfil"/);

  // Proibicao de emojis
  const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  assert.equal(emojiRegex.test(source), false);
});
