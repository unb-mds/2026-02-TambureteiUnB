import assert from "node:assert/strict";
import test from "node:test";
import {
  findPasAdmission,
  formatPasScore,
  getPasHistory,
  pasSources,
} from "../pasAdmission.ts";
const software = {
  nome: "Engenharia de Software",
  campus: "FCTE",
  grau: "Bacharelado",
  turno: "Diurno",
  slug: "software",
};
test("Software usa somente a oferta conjunta validada do ciclo", () => {
  const entry = findPasAdmission(software);
  assert.equal(entry?.minimo, "61.705");
  assert.equal(entry?.ingressoConjunto, true);
  assert.equal(entry?.pagina, 10);
});
test("não transfere notas entre campus, grau ou turno", () => {
  for (const patch of [
    { campus: "Darcy Ribeiro" },
    { grau: "Licenciatura" },
    { turno: "Noturno" },
    { modalidade: "A Distância" },
  ]) {
    assert.equal(findPasAdmission({ ...software, ...patch }), undefined);
  }
});
test("mantém negativos e precisão de três casas sem escala percentual", () => {
  assert.equal(formatPasScore("-22.177"), "-22,177");
  assert.equal(formatPasScore("135.827"), "135,827");
  assert.equal(formatPasScore("0.000"), "0,000");
  assert.equal(formatPasScore(null), "Não informado");
});
test("ausência de correspondência não vira zero ou associação aproximada", () => {
  assert.equal(
    findPasAdmission({ ...software, nome: "Curso desconhecido" }),
    undefined,
  );
});

test("histórico mantém os seis ciclos em ordem e preserva o valor mais recente", () => {
  const history = getPasHistory(software);
  assert.deepEqual(
    history.map((item) => item.source.ciclo),
    [
      "2023–2025",
      "2022–2024",
      "2021–2023",
      "2020–2022",
      "2019–2021",
      "2018–2020",
    ],
  );
  assert.deepEqual(
    history.map((item) => item.admission?.minimo),
    ["61.705", "24.317", "70.386", "50.773", "50.195", "-101.981"],
  );
  assert.ok(history.every((item) => item.admission?.ingressoConjunto));
  assert.ok(history[0].source.url.endsWith("2023-2025_V5.pdf"));
});
test("uma oferta sem dado recente não recebe uma nota do histórico", () => {
  const course = software;
  const missing = { ...pasSources[0], registros: [] };
  assert.equal(findPasAdmission(course, missing), undefined);
  assert.ok(findPasAdmission(course, pasSources[1]));
});
test("campus inconsistente no boletim antigo impede associação silenciosa", () => {
  const course = {
    nome: "Enfermagem",
    campus: "Darcy Ribeiro",
    grau: "Bacharelado",
    turno: "Diurno",
    slug: "enfermagem",
  };
  const history = getPasHistory(course);
  assert.equal(history.at(-1)?.admission, undefined);
  assert.match(history.at(-1)?.source.observacao || "", /inconsistentes/);
});

test("campus antigo é associado somente quando confirmado na mesma edição", () => {
  const course = {
    nome: "Administração",
    campus: "Darcy Ribeiro",
    grau: "Bacharelado",
    turno: "Diurno",
    slug: "administracao",
  };
  assert.equal(findPasAdmission(course, pasSources.at(-1))?.minimo, "-5.813");
  assert.equal(
    findPasAdmission({ ...course, campus: "FCE" }, pasSources.at(-1)),
    undefined,
  );
});

test("aceita a nomenclatura de campus usada pelo pipeline oficial da FCTE", () => {
  const apiCourse = {
    ...software,
    id: "414924",
    codigo_mec: "115998",
    campus: "FCTE - Gama",
    slug: "engenharia-de-software",
  };
  assert.equal(findPasAdmission(apiCourse)?.minimo, "61.705");
  assert.equal(
    getPasHistory(apiCourse).filter((item) => item.admission).length,
    6,
  );
});
test("campus desconhecido ou parecido não recebe nota por aproximação", () => {
  assert.equal(
    findPasAdmission({ ...software, campus: "FCTE - campus não reconhecido" }),
    undefined,
  );
});
test("matrizes do mesmo curso preservam a oferta de ingresso sem depender do slug", () => {
  assert.equal(
    findPasAdmission({
      ...software,
      campus: "FCTE - Gama",
      slug: "software-2018-diurno",
      matriz_curricular: "2018",
    })?.minimo,
    "61.705",
  );
});

test("títulos profissionais do catálogo não ocultam notas de bacharelados", () => {
  for (const [nome, grau] of [
    ["Agronomia", "Engenheiro Agrônomo"],
    ["Enfermagem", "Enfermeiro"],
    ["Medicina", "Médico"],
    ["Arquitetura e Urbanismo", "Arquiteto E Urbanista"],
  ]) {
    assert.ok(
      findPasAdmission({
        nome,
        grau,
        campus: "Darcy Ribeiro",
        turno: "Diurno",
        slug: "teste",
      }),
      nome,
    );
  }
});
test("oferta conjunta preserva bacharelado e licenciatura sem generalizar outras ofertas", () => {
  for (const nome of ["Filosofia", "Geografia", "História", "Matemática"]) {
    for (const grau of ["Bacharelado", "Licenciatura"])
      assert.ok(
        findPasAdmission({
          nome,
          grau,
          campus: "Darcy Ribeiro",
          turno: "Diurno",
          slug: "teste",
        }),
        `${nome}: ${grau}`,
      );
  }
  assert.equal(
    findPasAdmission({
      nome: "Artes Visuais",
      grau: "Licenciatura",
      campus: "Darcy Ribeiro",
      turno: "Diurno",
      slug: "teste",
    }),
    undefined,
  );
});
test("título profissional não autoriza qualquer curso ou campus", () => {
  assert.equal(
    findPasAdmission({
      nome: "Agronomia",
      grau: "Médico",
      campus: "Darcy Ribeiro",
      turno: "Diurno",
      slug: "teste",
    }),
    undefined,
  );
});

test("nomes equivalentes preservam a oferta oficial e não absorvem habilitações diferentes", () => {
  for (const nome of [
    "Comunicação Social - Audiovisual",
    "Engenharia Mecatrônica - Controle E Automação",
    "Ciências Sociais - Antropologia",
    "Design - Programação Visual",
  ]) {
    const entry = findPasAdmission({
      nome,
      grau: "Bacharelado",
      campus: "Darcy Ribeiro",
      turno: "Diurno",
      slug: "teste",
    });
    assert.ok(entry?.ofertaOriginal, nome);
  }
  assert.equal(
    findPasAdmission({
      nome: "Ciências Sociais - Latino-Americanas",
      grau: "Bacharelado",
      campus: "Darcy Ribeiro",
      turno: "Diurno",
      slug: "teste",
    }),
    undefined,
  );
});
