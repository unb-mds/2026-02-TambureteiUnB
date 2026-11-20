import type { CampusFilter, Course } from "@/types/curso";

export function filterCourses(
  courses: Course[],
  searchQuery: string,
  selectedCampus: CampusFilter
): Course[] {
  const query = searchQuery.trim().toLocaleLowerCase("pt-BR");
  const normalizedCampus = selectedCampus.toLocaleLowerCase("pt-BR");

  return courses.filter((course) => {
    const matchesCampus =
      selectedCampus === "Todos" ||
      course.campus?.toLocaleLowerCase("pt-BR").includes(normalizedCampus);

    const matchesQuery =
      !query ||
      course.nome.toLocaleLowerCase("pt-BR").includes(query) ||
      course.departamento?.toLocaleLowerCase("pt-BR").includes(query) ||
      course.campus?.toLocaleLowerCase("pt-BR").includes(query);

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
