import type { CampusFilter, Course } from "@/types/curso";
import { normalizeSearchTerm } from "./search";

export function filterCourses(
  courses: Course[],
  searchQuery: string,
  selectedCampus: CampusFilter
): Course[] {
  const query = normalizeSearchTerm(searchQuery);
  const normalizedCampus = normalizeSearchTerm(selectedCampus);

  return courses.filter((course) => {
    // Filtra cursos extintos / inativos do SIGAA com 0 disciplinas
    const isAtivo = course.total_disciplinas === undefined || course.total_disciplinas > 0;
    if (!isAtivo) return false;

    const matchesCampus =
      selectedCampus === "Todos" ||
      normalizeSearchTerm(course.campus).includes(normalizedCampus);

    const searchable = normalizeSearchTerm(
      `${course.nome} ${course.departamento || ""} ${course.campus || ""} ${course.grau || ""} ${course.turno || ""} ${course.modalidade || ""} ${course.matriz_curricular || ""}`
    );

    const matchesQuery = !query || searchable.includes(query);

    return matchesCampus && matchesQuery;
  });
}

export function getCampusBadgeClasses(campus: string): string {
  if (!campus) return "bg-gray-100 text-gray-700 border-gray-200";
  if (campus.includes("FCTE") || campus.includes("FGA")) {
    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  }
  if (campus.includes("Darcy") || campus.includes("Darcy Ribeiro")) {
    return "bg-purple-50 text-purple-700 border-purple-200";
  }
  if (
    campus.includes("FCE") ||
    campus.includes("Ceilândia") ||
    campus.includes("Ceilandia")
  ) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (campus.includes("FUP") || campus.includes("Planaltina")) {
    return "bg-amber-50 text-amber-800 border-amber-200";
  }
  return "bg-gray-100 text-gray-700 border-gray-200";
}

/**
 * Calcula a quantidade de semestres sugeridos de um curso com base no
 * maior período sugerido entre suas disciplinas ou na propriedade explícita do curso.
 */
export function calculateCourseSemesters(
  disciplines: { semester?: string }[],
  courseSemesters?: number
): number {
  const maxPeriodoFromGrade = disciplines.reduce((max, d) => {
    const num = parseInt(d.semester?.replace(/\D/g, "") || "0", 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);

  if (maxPeriodoFromGrade > 0) {
    return maxPeriodoFromGrade;
  }

  if (courseSemesters && courseSemesters > 0) {
    return courseSemesters;
  }

  return 8;
}

/**
 * Gera a lista de abas de períodos/semestres dinamicamente para o curso:
 * ["Todos", "1º Semestre", ..., `${totalSemestres}º Semestre`, "Optativas" (se houver)]
 */
export function generateSemesterFilters(
  totalSemestres: number,
  hasOptativas: boolean = true
): string[] {
  const count = Math.max(1, totalSemestres);
  const filters = ["Todos"];
  for (let i = 1; i <= count; i++) {
    filters.push(`${i}º Semestre`);
  }
  if (hasOptativas) {
    filters.push("Optativas");
  }
  return filters;
}

