import atual from "../data/pas-2023-2025.json";
import anterior2024 from "../data/pas-2022-2024.json";
import anterior2023 from "../data/pas-2021-2023.json";
import anterior2022 from "../data/pas-2020-2022.json";
import anterior2021 from "../data/pas-2019-2021.json";
import anterior2020 from "../data/pas-2018-2020.json";
import type { Course } from "../types/curso";
import { normalizeSearchTerm } from "./search";

export const pasSources = [
  atual,
  anterior2024,
  anterior2023,
  anterior2022,
  anterior2021,
  anterior2020,
];
export const pasSource = pasSources[0];
export function getPasSourceForYear(year: number | "all" = "all") {
  return year === "all" ? pasSource : pasSources.find(source => Number(source.ciclo.split(/[–-]/).at(-1)) === year);
}

type PasSource = (typeof pasSources)[number];
const campusAliases = new Map([
  ["fcte", "FCTE"],
  ["fcte gama", "FCTE"],
  ["fcte unb gama", "FCTE"],
  ["fga", "FCTE"],
  ["fga gama", "FCTE"],
  ["gama", "FCTE"],
  ["darcy ribeiro", "Darcy Ribeiro"],
  ["fce", "FCE"],
  ["fce ceilandia", "FCE"],
  ["ceilandia", "FCE"],
  ["fup", "FUP"],
  ["fup planaltina", "FUP"],
  ["planaltina", "FUP"],
]);
function canonicalCampus(value: string) {
  const key = normalizeSearchTerm(value)
    .replace(/[()]/g, "")
    .replace(/\s*-\s*/g, " ")
    .replace(/\s+/g, " ");
  return campusAliases.get(key);
}
const engenharias = new Set([
  "engenharia",
  "engenharia de software",
  "engenharia aeroespacial",
  "engenharia automotiva",
  "engenharia de energia",
  "engenharia eletronica",
]);

function normalizedName(value: string) {
  return normalizeSearchTerm(value)
    .replace(/[–—.,\/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const nameAliases = new Map([
  ["ciencias sociais", "ciencias sociais antropologia sociologia"],
  ["ciencias sociais antropologia", "ciencias sociais antropologia sociologia"],
  ["ciencias sociais sociologia", "ciencias sociais antropologia sociologia"],
  ["educacao fisica", "educacao fisica ciclo basico"],
  ["engenharia mecatronica controle e automacao", "engenharia mecatronica"],
  ["artes cenicas interpretacao teatral", "artes cenicas"],
  ["teoria critica e historia da arte", "teoria critica e historia da arte"],
  [
    "comunicacao social comunicacao organizacional",
    "comunicacao organizacional",
  ],
  ["design programacao visual", "design"],
  ["design projeto do produto", "design"],
  ["educacao fisica ciclo basico", "educacao fisica ciclo basico"],
  ["letras lingua e literatura japonesa", "lingua e literatura japonesa"],
  [
    "letras lingua espanhola e literatura espanhola e hispano americana",
    "lingua espanhola e literatura espanhola e hispano americana",
  ],
  ["letras lingua francesa e respectiva literatura", "lingua francesa"],
  ["lingua francesa e respectiva literatura", "lingua francesa"],
  ["letras lingua inglesa e respectiva literatura", "lingua inglesa"],
  ["lingua inglesa e respectiva literatura", "lingua inglesa"],
  ["letras lingua portuguesa e respectiva literatura", "lingua portuguesa"],
  ["lingua portuguesa e respectiva literatura", "lingua portuguesa"],
  [
    "letras portugues do brasil como segunda lingua",
    "letras portugues do brasil como segunda lingua",
  ],
  [
    "letras portugues do brasil como seg lingua",
    "letras portugues do brasil como segunda lingua",
  ],
  ["linguas estrangeiras aplicadas msi", "linguas estrangeiras aplicadas"],
  ["gestao de agronegocios", "gestao de agronegocio"],
]);
function courseName(value: string) {
  const key = normalizedName(value);
  return nameAliases.get(key) || key;
}
const professionalDegrees = new Map([
  ["agronomia", "engenheiro agronomo"],
  ["arquitetura e urbanismo", "arquiteto e urbanista"],
  ["enfermagem", "enfermeiro"],
  ["engenharia ambiental", "engenheiro"],
  ["engenharia civil", "engenheiro civil"],
  ["engenharia eletrica", "engenheiro eletricista"],
  ["engenharia florestal", "engenheiro florestal"],
  ["engenharia mecanica", "engenheiro mecanico"],
  ["engenharia mecatronica", "engenheiro de controle e automacao"],
  ["geologia", "geologo"],
  ["medicina", "medico"],
  ["medicina veterinaria", "medico veterinario"],
  ["nutricao", "nutricionista"],
  ["odontologia", "cirurgiao dentista"],
]);
function catalogDegree(course: Course) {
  const degree = normalizeSearchTerm(course.grau);
  return professionalDegrees.get(courseName(course.nome)) === degree
    ? "bacharelado"
    : degree;
}

// Cada edição preserva a própria oferta; ausência recente não usa uma nota antiga.
export function findPasAdmission(
  course: Course,
  source: PasSource = pasSource,
) {
  if (["a distancia", "ead"].includes(normalizeSearchTerm(course.modalidade)))
    return undefined;
  const campus = canonicalCampus(course.campus);
  if (!campus) return undefined;
  const name = courseName(course.nome);
  const matches = source.registros.filter(
    (item) =>
      item.campus === campus &&
      normalizeSearchTerm(item.turno) === normalizeSearchTerm(course.turno) &&
      item.graus.some(
        (degree) => normalizeSearchTerm(degree) === catalogDegree(course),
      ) &&
      (courseName(item.nome) === name ||
        (item.ingressoConjunto && engenharias.has(name))),
  );
  return matches.length === 1 ? matches[0] : undefined;
}

export function getPasHistory(course: Course) {
  return pasSources.map((source) => ({
    source,
    admission: findPasAdmission(course, source),
  }));
}

export function formatPasScore(value: string | null): string {
  return value === null
    ? "Não informado"
    : new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      }).format(Number(value));
}
