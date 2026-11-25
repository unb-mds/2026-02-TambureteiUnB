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
  assert.match(softwareUrl, /id=414924/);

  const aeroUrl = getOfficialCurriculumUrl({ slug: "engenharia-aeroespacial" });
  assert.equal(aeroUrl, OFFICIAL_CURRICULUM_LINKS["engenharia-aeroespacial"]);
  assert.match(aeroUrl, /id=414916/);

  const autoUrl = getOfficialCurriculumUrl({ slug: "engenharia-automotiva" });
  assert.equal(autoUrl, OFFICIAL_CURRICULUM_LINKS["engenharia-automotiva"]);
  assert.match(autoUrl, /id=414919/);

  assert.match(getOfficialCurriculumUrl({ slug: "ciencia-da-computacao" }), /id=414599/);
  assert.match(getOfficialCurriculumUrl({ slug: "direito-diurno" }), /id=414220/);
  assert.match(getOfficialCurriculumUrl({ slug: "enfermagem-diurno" }), /id=414295/);
  assert.match(getOfficialCurriculumUrl({ slug: "enfermagem-enfermeiro-diurno" }), /id=414902/);
  assert.match(getOfficialCurriculumUrl({ slug: "gestao-ambiental" }), /id=414888/);
});

test("OFFICIAL_CURRICULUM_LINKS contem apenas URLs oficiais validas do SIGAA para todos os 161 cursos", () => {
  const entries = Object.entries(OFFICIAL_CURRICULUM_LINKS);
  assert.equal(entries.length, 161);
  for (const [slug, url] of entries) {
    assert.ok(slug.length > 0);
    assert.match(
      url,
      /^https:\/\/sigaa\.unb\.br\/sigaa\/public\/curso\/curriculo\.jsf\?lc=pt_BR&id=\d+$/
    );
  }
});

test("getOfficialCurriculumUrl retorna fallback oficial do SIGAA quando slug nao possui link especifico", () => {
  const fallbackUrl = getOfficialCurriculumUrl({ slug: "curso-inedito-xyz" });
  assert.equal(fallbackUrl, SIGAA_COURSES_CONSULTATION_URL);

  const emptyFallback = getOfficialCurriculumUrl();
  assert.equal(emptyFallback, SIGAA_COURSES_CONSULTATION_URL);
});
