import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateFormControlSemantics,
  validateTableSemantics,
  validateScreenReaderLiveRegion,
  auditTableMarkup,
  auditFormAndScreenReaderMarkup,
} from "../accessibilityValidator.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, "../../..");

test("validateFormControlSemantics aprova controles rotulados e rejeita controles orfaos", () => {
  const validByLabel = validateFormControlSemantics({
    id: "login-email",
    tagName: "input",
    hasExplicitLabel: true,
  });
  assert.equal(validByLabel.valid, true);
  assert.equal(validByLabel.violations.length, 0);

  const validWithError = validateFormControlSemantics({
    id: "login-password",
    tagName: "input",
    hasExplicitLabel: true,
    hasError: true,
    ariaInvalid: "true",
    ariaDescribedBy: "login-password-error",
  });
  assert.equal(validWithError.valid, true);

  const invalidUnlabeled = validateFormControlSemantics({
    tagName: "textarea",
  });
  assert.equal(invalidUnlabeled.valid, false);
  assert.equal(invalidUnlabeled.violations.length, 1);

  const invalidErrorState = validateFormControlSemantics({
    id: "campo-nome",
    tagName: "input",
    hasExplicitLabel: true,
    hasError: true,
    ariaInvalid: "false",
  });
  assert.equal(invalidErrorState.valid, false);
  assert.equal(invalidErrorState.violations.length, 2);
});

test("validateTableSemantics exige caption/aria-label, thead, tbody e escopos col/row", () => {
  const validTable = validateTableSemantics({
    hasCaption: true,
    ariaLabel: "Tabela de desempenho semestral",
    hasThead: true,
    hasTbody: true,
    columnHeaderScopes: ["col", "col", "col"],
    rowHeaderScopes: ["row", "row"],
  });
  assert.equal(validTable.valid, true);

  const invalidTable = validateTableSemantics({
    hasCaption: false,
    hasThead: true,
    hasTbody: false,
    columnHeaderScopes: ["col", ""],
    rowHeaderScopes: ["invalid"],
  });
  assert.equal(invalidTable.valid, false);
  assert.equal(invalidTable.violations.length, 4);
});

test("validateScreenReaderLiveRegion valida anuncios de status e alerta para leitores de tela", () => {
  const validPolite = validateScreenReaderLiveRegion({
    role: "status",
    ariaLive: "polite",
    ariaAtomic: "true",
    hasTextContent: true,
  });
  assert.equal(validPolite.valid, true);

  const invalidEmpty = validateScreenReaderLiveRegion({
    hasTextContent: false,
  });
  assert.equal(invalidEmpty.valid, false);
  assert.equal(invalidEmpty.violations.length, 2);
});

test("auditTableMarkup valida a tabela semantica real na pagina de detalhes da disciplina", () => {
  const disciplineDetailPath = path.join(
    FRONTEND_ROOT,
    "src/app/disciplinas/[slug]/page.tsx"
  );
  const content = fs.readFileSync(disciplineDetailPath, "utf-8");

  const tableAudit = auditTableMarkup(content);
  assert.equal(
    tableAudit.valid,
    true,
    `Violacoes na tabela semantica: ${tableAudit.violations.join("; ")}`
  );
});

test("auditFormAndScreenReaderMarkup valida formularios e leitores de tela nos componentes reais", () => {
  const filesToAudit = [
    "src/components/Input.tsx",
    "src/app/login/page.tsx",
    "src/app/cadastro/page.tsx",
    "src/components/DificuldadesPanel.tsx",
    "src/components/MaterialModal.tsx",
    "components/ComentariosFrontend.tsx",
  ];

  for (const relativePath of filesToAudit) {
    const fullPath = path.join(FRONTEND_ROOT, relativePath);
    const content = fs.readFileSync(fullPath, "utf-8");
    const result = auditFormAndScreenReaderMarkup(content);
    assert.equal(
      result.valid,
      true,
      `Falha de acessibilidade em ${relativePath}: ${result.violations.join("; ")}`
    );
  }
});

test("OpenDataExportBar e catalogos possuem regioes vivas e rotulos ARIA para leitores de tela", () => {
  const exportBarPath = path.join(
    FRONTEND_ROOT,
    "src/components/OpenDataExportBar.tsx"
  );
  const exportBarContent = fs.readFileSync(exportBarPath, "utf-8");

  assert.equal(/role=["']region["']/.test(exportBarContent), true);
  assert.equal(/role=["']status["']/.test(exportBarContent), true);
  assert.equal(/aria-live=["']polite["']/.test(exportBarContent), true);
  assert.equal(/aria-label=/.test(exportBarContent), true);

  const catalogPages = [
    "src/app/page.tsx",
    "src/app/cursos/page.tsx",
    "src/app/disciplinas/page.tsx",
  ];

  for (const pageRelPath of catalogPages) {
    const content = fs.readFileSync(path.join(FRONTEND_ROOT, pageRelPath), "utf-8");
    assert.equal(
      /aria-label=/.test(content),
      true,
      `Campo de busca em ${pageRelPath} deve possuir aria-label`
    );
    assert.equal(
      /aria-pressed=/.test(content),
      true,
      `Filtros de botoes em ${pageRelPath} devem possuir aria-pressed`
    );
    assert.equal(
      content.includes("OpenDataExportBar"),
      true,
      `Pagina ${pageRelPath} deve integrar OpenDataExportBar`
    );
  }
});
