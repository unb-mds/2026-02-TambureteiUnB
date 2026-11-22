import atual from "../data/pas-2023-2025.json";
import anterior2024 from "../data/pas-2022-2024.json";
import anterior2023 from "../data/pas-2021-2023.json";
import anterior2022 from "../data/pas-2020-2022.json";
import anterior2021 from "../data/pas-2019-2021.json";
import anterior2020 from "../data/pas-2018-2020.json";
import type { Course } from "../types/curso";
import { normalizeSearchTerm } from "./search";

export const pasSources = [atual, anterior2024, anterior2023, anterior2022, anterior2021, anterior2020];
export const pasSource = pasSources[0];
type PasSource = (typeof pasSources)[number];
const campusAliases = new Map([
  ["fcte", "FCTE"], ["fcte gama", "FCTE"], ["fcte unb gama", "FCTE"],
  ["fga", "FCTE"], ["fga gama", "FCTE"], ["gama", "FCTE"],
  ["darcy ribeiro", "Darcy Ribeiro"],
  ["fce", "FCE"], ["fce ceilandia", "FCE"], ["ceilandia", "FCE"],
  ["fup", "FUP"], ["fup planaltina", "FUP"], ["planaltina", "FUP"],
]);
function canonicalCampus(value: string) {
  const key = normalizeSearchTerm(value).replace(/[()]/g, "").replace(/\s*-\s*/g, " ").replace(/\s+/g, " ");
  return campusAliases.get(key);
}
const engenharias = new Set([
  "engenharia de software", "engenharia aeroespacial", "engenharia automotiva",
  "engenharia de energia", "engenharia eletronica",
]);

// Cada edição preserva a própria oferta; ausência recente não usa uma nota antiga.
export function findPasAdmission(course: Course, source: PasSource = pasSource) {
  if (["a distancia", "ead"].includes(normalizeSearchTerm(course.modalidade))) return undefined;
  const campus = canonicalCampus(course.campus);
  if (!campus) return undefined;
  const name = normalizeSearchTerm(course.nome);
  const matches = source.registros.filter((item) =>
    item.campus === campus && normalizeSearchTerm(item.turno) === normalizeSearchTerm(course.turno) &&
    normalizeSearchTerm(item.grau) === normalizeSearchTerm(course.grau) &&
    (normalizeSearchTerm(item.nome) === name ||
      (item.ingressoConjunto && engenharias.has(name)))
  );
  return matches.length === 1 ? matches[0] : undefined;
}

export function getPasHistory(course: Course) {
  return pasSources.map((source) => ({ source, admission: findPasAdmission(course, source) }));
}

export function formatPasScore(value: string | null): string {
  return value === null ? "Não informado" : new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 3, maximumFractionDigits: 3,
  }).format(Number(value));
}
