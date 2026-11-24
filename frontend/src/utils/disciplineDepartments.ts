import type { Discipline } from "../types/disciplina.ts";

export function getDepartmentOptions(
  disciplines: Pick<Discipline, "departmentName">[],
): string[] {
  return [...new Set(disciplines.map(({ departmentName }) => departmentName.trim()))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
}
