import assert from "node:assert/strict";
import test from "node:test";
import {
  getOfficialCurriculumUrl,
  OFFICIAL_CURRICULUM_LINKS,
  SIGAA_COURSES_CONSULTATION_URL,
} from "../courseCurriculum.ts";

test("getOfficialCurriculumUrl retorna link especifico quando informado diretamente no curso", () => {
  const customUrl = "https://sigaa.unb.br/custom/curriculo.jsf?id=999";
  const url = getOfficialCurriculumUrl({
    slug: "engenharia-de-software",
    link_grade_oficial: customUrl,
  });

  assert.equal(url, customUrl);
});

test("getOfficialCurriculumUrl resolve link mapeado pelo slug do curso", () => {
  const softwareUrl = getOfficialCurriculumUrl({ slug: "engenharia-de-software" });
  assert.equal(softwareUrl, OFFICIAL_CURRICULUM_LINKS["engenharia-de-software"]);
  assert.match(softwareUrl, /sigaa\.unb\.br/);

  const computacaoUrl = getOfficialCurriculumUrl({ slug: "ciencia-da-computacao" });
  assert.equal(computacaoUrl, OFFICIAL_CURRICULUM_LINKS["ciencia-da-computacao"]);
});

test("getOfficialCurriculumUrl retorna fallback oficial do SIGAA quando slug nao possui link especifico", () => {
  const fallbackUrl = getOfficialCurriculumUrl({ slug: "curso-inedito-xyz" });
  assert.equal(fallbackUrl, SIGAA_COURSES_CONSULTATION_URL);

  const emptyFallback = getOfficialCurriculumUrl();
  assert.equal(emptyFallback, SIGAA_COURSES_CONSULTATION_URL);
});
