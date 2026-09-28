import { Course, CourseDetail } from "@/types/curso";
import { request } from "./httpClient";

/**
 * Consulta a lista de cursos de graduação da UnB, com filtros opcionais
 * por busca textual e campus.
 */
export async function getCourses(filters?: {
  q?: string;
  campus?: string;
}): Promise<Course[]> {
  const params = new URLSearchParams();
  if (filters?.q) params.set("q", filters.q);
  if (filters?.campus && filters.campus !== "Todos") {
    params.set("campus", filters.campus);
  }

  const queryStr = params.toString() ? `?${params.toString()}` : "";
  return request<Course[]>(`/cursos${queryStr}`);
}

/**
 * Obtém os detalhes completos de um curso pelo seu slug (ou MEC code),
 * incluindo suas métricas de fluxo e grade de disciplinas recomendada.
 */
export async function getCourseBySlug(slug: string): Promise<CourseDetail> {
  return request<CourseDetail>(`/cursos/${encodeURIComponent(slug)}`);
}

export const courseService = {
  getCourses,
  getCourseBySlug,
};

export default courseService;
