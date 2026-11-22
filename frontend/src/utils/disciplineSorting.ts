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
  { value: "approval_desc", label: "Maior taxa de aprovação" },
  { value: "approval_asc", label: "Menor taxa de aprovação" },
  { value: "name_asc", label: "Ordem alfabética (A–Z)" },
  { value: "classes_desc", label: "Mais turmas ofertadas" },
  { value: "hours_desc", label: "Maior carga horária" },
];

export function sortDisciplines(
  disciplines: Discipline[],
  sort: DisciplineSortOption,
): Discipline[] {
  return [...disciplines].sort((a, b) => {
    if (sort === "name_asc") {
      return a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
    }

    if (sort === "classes_desc") {
      return (b.total_turmas ?? 0) - (a.total_turmas ?? 0);
    }

    if (sort === "hours_desc") {
      return b.hours - a.hours;
    }

    const hasApprovalA = hasApprovalData(a.approval);
    const hasApprovalB = hasApprovalData(b.approval);
    if (hasApprovalA !== hasApprovalB) return hasApprovalA ? -1 : 1;
    if (!hasApprovalA || !hasApprovalB) return 0;

    const difference = (a.approval ?? 0) - (b.approval ?? 0);
    return sort === "approval_asc" ? difference : -difference;
  });
}
