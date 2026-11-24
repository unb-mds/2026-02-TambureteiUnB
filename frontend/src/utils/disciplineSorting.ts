import { hasApprovalData } from "./academicMetrics.ts";
import type { Discipline } from "../types/disciplina.ts";

export type DisciplineSortOption =
  | "approval_desc"
  | "approval_asc"
  | "name_asc"
  | "classes_desc"
  | "hours_desc";

export const DISCIPLINE_SORT_OPTIONS: {
  value: DisciplineSortOption;
  label: string;
}[] = [
  { value: "name_asc", label: "Ordem alfabética (A–Z)" },
  { value: "approval_desc", label: "Maior taxa de aprovação" },
  { value: "approval_asc", label: "Menor taxa de aprovação" },
  { value: "classes_desc", label: "Mais turmas ofertadas" },
  { value: "hours_desc", label: "Maior carga horária" },
];

export function sortDisciplines(
  disciplines: Discipline[],
  sort: DisciplineSortOption,
): Discipline[] {
  const compareNames = (a: Discipline, b: Discipline) =>
    a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });

  return [...disciplines].sort((a, b) => {
    if (sort === "name_asc") {
      return compareNames(a, b);
    }

    if (sort === "classes_desc") {
      return (b.total_turmas ?? 0) - (a.total_turmas ?? 0) || compareNames(a, b);
    }

    if (sort === "hours_desc") {
      return b.hours - a.hours || compareNames(a, b);
    }

    const hasApprovalA = hasApprovalData(a.approval);
    const hasApprovalB = hasApprovalData(b.approval);
    if (hasApprovalA !== hasApprovalB) return hasApprovalA ? -1 : 1;
    if (!hasApprovalA || !hasApprovalB) return compareNames(a, b);

    const difference = (a.approval ?? 0) - (b.approval ?? 0);
    if (difference === 0) return compareNames(a, b);
    return sort === "approval_asc" ? difference : -difference;
  });
}
