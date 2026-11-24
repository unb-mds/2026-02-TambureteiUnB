import type { Discipline } from "../types/disciplina.ts";
import { normalizeSearchTerm } from "./search.ts";
const campusPatterns: [string, RegExp][] = [
 ["FCTE (Gama)", /\b(fcte|fga|gama)\b/],
 ["FCE (Ceilândia)", /\b(fce|ceilandia)\b/],
 ["FUP (Planaltina)", /\b(fup|planaltina)\b/],
 ["Darcy Ribeiro", /\b(darcy|icc|bsa|bsas|pat|pjc)\b/],
];
export function getOfferingCampuses(locations: string[]): string[] {
 const locationsText=locations.map(normalizeSearchTerm);
 return campusPatterns.filter(([,pattern])=>locationsText.some(location=>pattern.test(location))).map(([name])=>name);
}
export function matchesDisciplineCampus(discipline: Pick<Discipline,"offeringCampuses"|"campus"|"campusFilter">, campus: string) {
 if(campus==="Todos os Campi") return true;
 if(discipline.offeringCampuses?.length) return discipline.offeringCampuses.includes(campus);
 return discipline.campus===campus || discipline.campusFilter===campus;
}
