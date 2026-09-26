import coursesData from "./courses.json";

export type Campus = "FGA" | "Darcy Ribeiro" | "FCE" | "FUP";
export type CampusFilter = "Todos" | Campus;

export interface Course {
  id: string;
  codigo_mec?: string;
  nome: string;
  campus: Campus;
  grau: "Bacharelado" | "Licenciatura";
  turno: "Diurno" | "Noturno" | "Integral";
  slug: string;
  departamento?: string;
  semestres?: number;
  total_disciplinas?: number;
  descricao?: string;
}

export const COURSES: Course[] = coursesData as Course[];

export const CAMPUS_LIST: CampusFilter[] = [
  "Todos",
  "FGA",
  "Darcy Ribeiro",
  "FCE",
  "FUP",
];

export const getCoursesByCampus = (campus: CampusFilter): Course[] => {
  if (campus === "Todos") return COURSES;
  return COURSES.filter((c) => c.campus === campus);
};

export const searchCourses = (query: string, campus: CampusFilter = "Todos"): Course[] => {
  const normalized = query.trim().toLowerCase();
  const filtered = getCoursesByCampus(campus);

  if (!normalized) return filtered;

  return filtered.filter(
    (c) =>
      c.nome.toLowerCase().includes(normalized) ||
      (c.departamento && c.departamento.toLowerCase().includes(normalized)) ||
      c.campus.toLowerCase().includes(normalized) ||
      (c.codigo_mec && c.codigo_mec.includes(normalized))
  );
};

export default COURSES;
