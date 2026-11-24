import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { METRICAS_UNB } from "../../components/InstitutionalMetrics.tsx";
import {
  validateFormControlSemantics,
  validateScreenReaderLiveRegion,
} from "../accessibilityValidator.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, "../../..");

test("InstitutionalMetrics contem todos os indicadores consolidados da UnB", () => {
  assert.equal(METRICAS_UNB.length, 4);

  const ids = METRICAS_UNB.map((m) => m.id);
  assert.equal(ids.includes("campi"), true);
  assert.equal(ids.includes("cursos"), true);
  assert.equal(ids.includes("disciplinas"), true);
  assert.equal(ids.includes("comunidade"), true);

  const campiMetrica = METRICAS_UNB.find((m) => m.id === "campi");
  assert.equal(campiMetrica?.valor, "4 Campi");
  assert.match(campiMetrica?.descricao ?? "", /Darcy Ribeiro/);
  assert.match(campiMetrica?.descricao ?? "", /FGA Gama/);
  assert.match(campiMetrica?.descricao ?? "", /FCE Ceilândia/);
  assert.match(campiMetrica?.descricao ?? "", /FUP Planaltina/);

  const metricasPath = path.join(FRONTEND_ROOT, "src/components/InstitutionalMetrics.tsx");
  const content = fs.readFileSync(metricasPath, "utf-8");
  assert.match(content, /<section[^>]*aria-labelledby=["']metricas-unb-titulo["']/);
  assert.match(content, /<h2[^>]*id=["']metricas-unb-titulo["']/);
  assert.match(content, /<dl\b/);
  assert.match(content, /<dt\b/);
  assert.match(content, /<dd\b/);
});

test("Landing Page contem link de salto de navegacao para teclado (WCAG 2.4.1)", () => {
  const pagePath = path.join(FRONTEND_ROOT, "src/app/page.tsx");
  const content = fs.readFileSync(pagePath, "utf-8");

  assert.match(
    content,
    /<a[\s\S]*?href=["']#catalogo["'][\s\S]*?Pular para o conteúdo principal<\/a>/,
    "A pagina inicial deve possuir link de salto direcionando para #catalogo"
  );
  assert.match(
    content,
    /focus:not-sr-only/,
    "O link de salto deve tornar-se visivel no foco do teclado"
  );
});

test("Campo de busca rapida na Landing Page possui associacao semantica e rotulo acessivel", () => {
  const pagePath = path.join(FRONTEND_ROOT, "src/app/page.tsx");
  const content = fs.readFileSync(pagePath, "utf-8");

  assert.match(content, /role=["']search["']/, "Formulario deve definir role search");
  assert.match(content, /<label[^>]*htmlFor=["']campo-busca-cursos["']/, "Deve possuir label associada");
  assert.match(content, /<input[^>]*id=["']campo-busca-cursos["']/, "Input deve corresponder ao ID da label");
  assert.match(content, /type=["']search["']/, "Input deve ser do tipo search");

  const validation = validateFormControlSemantics({
    id: "campo-busca-cursos",
    tagName: "input",
    hasExplicitLabel: true,
    ariaLabel: "Buscar curso por nome ou departamento",
  });
  assert.equal(validation.valid, true);
  assert.equal(validation.violations.length, 0);
});

test("Landing Page define regiao viva para leitor de tela nos resultados da busca (WCAG 4.1.3)", () => {
  const pagePath = path.join(FRONTEND_ROOT, "src/app/page.tsx");
  const content = fs.readFileSync(pagePath, "utf-8");

  assert.match(content, /role=["']status["']/, "Deve definir role status");
  assert.match(content, /aria-live=["']polite["']/, "Deve definir aria-live polite");
  assert.match(content, /aria-atomic=["']true["']/, "Deve definir aria-atomic true");

  const liveValidation = validateScreenReaderLiveRegion({
    role: "status",
    ariaLive: "polite",
    ariaAtomic: "true",
    hasTextContent: true,
  });
  assert.equal(liveValidation.valid, true);
});

test("Botoes de filtro por campus e elementos interativos possuem anel de foco visivel e atributos ARIA", () => {
  const pagePath = path.join(FRONTEND_ROOT, "src/app/page.tsx");
  const content = fs.readFileSync(pagePath, "utf-8");

  assert.match(content, /role=["']group["']/, "Grupo de filtros deve expor role group");
  assert.match(content, /aria-label=["']Filtrar cursos por campus da UnB["']/);
  assert.match(content, /aria-pressed=\{active\}/, "Botoes de campus devem indicar selecao via aria-pressed");
  assert.match(content, /focus-visible:ring-2/, "Controles interativos devem possuir classe focus-visible:ring-2");
  assert.match(content, /focus-visible:ring-\[#5B4BDB\]/, "Anel de foco deve utilizar a cor institucional de destaque");
});

test("Landing Page integra InstitutionalMetrics e OpenDataExportBar com alto contraste", () => {
  const pagePath = path.join(FRONTEND_ROOT, "src/app/page.tsx");
  const content = fs.readFileSync(pagePath, "utf-8");

  assert.match(content, /<InstitutionalMetrics\s*\/>/, "A pagina inicial deve renderizar InstitutionalMetrics");
  assert.match(content, /<OpenDataExportBar/, "A pagina inicial deve manter OpenDataExportBar integrado");

  assert.equal(
    content.includes("text-gray-400"),
    false,
    "Cores com baixo contraste como text-gray-400 devem ser substituidas por tons de maior legibilidade (WCAG AA)"
  );
});