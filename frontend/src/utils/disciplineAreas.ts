import type { BackendDisciplinaResumo, Discipline } from "../types/disciplina.ts";
import { normalizeSearchTerm } from "./search.ts";

export function getDisciplineArea(subject: Pick<BackendDisciplinaResumo,"codigo"|"nome"|"departamento">): Discipline["area"] {
  const code = subject.codigo.trim().toUpperCase();
  const name = normalizeSearchTerm(subject.nome).replace(/\s+/g," ");
  // Classificações específicas prevalecem sobre o departamento responsável.
  if(code === "FGA0164" || name === "humanidades e cidadania") return "Humanas";
  if(/^(MAT|IFD|IQD|EST)\d/.test(code)) return "Exatas";

  const department = normalizeSearchTerm(subject.departamento ?? "");
  if(department.includes("fga") || department.includes("fcte")) return "Tecnologia";
  if(department.includes("fce")) return "Saúde";
  if(department.includes("fup")) return "Humanas";
  if(department.includes("cic")) return "Tecnologia";
  return "Exatas";
}
