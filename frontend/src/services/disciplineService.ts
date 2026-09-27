import {
  Discipline,
  BackendDisciplinaResumo,
  BackendDisciplinaResponse,
  PaginatedDisciplines,
  adaptBackendDisciplina,
} from "@/types/disciplina";
import { request } from "./httpClient";

/**
 * Consulta a lista simplificada de disciplinas (cadeiras), com filtros por nome,
 * código ou departamento.
 */
export async function getDisciplines(filters?: {
  q?: string;
  codigo?: string;
  departamento?: string;
  limit?: number;
}): Promise<Discipline[]> {
  const params = new URLSearchParams();
  if (filters?.q) params.set("q", filters.q);
  if (filters?.codigo) params.set("codigo", filters.codigo);
  if (filters?.departamento && filters.departamento !== "Todos os Departamentos") {
    params.set("departamento", filters.departamento);
  }
  if (filters?.limit) params.set("limit", String(filters.limit));

  const queryStr = params.toString() ? `?${params.toString()}` : "";
  const items = await request<BackendDisciplinaResumo[]>(`/cadeiras${queryStr}`);
  return items.map(adaptBackendDisciplina);
}

/**
 * Consulta o catálogo paginado de cadeiras da UnB (RF04).
 */
export async function getCatalogDisciplines(params?: {
  nome?: string;
  codigo?: string;
  departamento?: string;
  page?: number;
  size?: number;
}): Promise<{ items: Discipline[]; total: number; page: number; size: number; pages: number }> {
  const searchParams = new URLSearchParams();
  if (params?.nome) searchParams.set("nome", params.nome);
  if (params?.codigo) searchParams.set("codigo", params.codigo);
  if (params?.departamento && params.departamento !== "Todos os Departamentos") {
    searchParams.set("departamento", params.departamento);
  }
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.size) searchParams.set("size", String(params.size));

  const queryStr = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const res = await request<PaginatedDisciplines>(`/catalogo/cadeiras${queryStr}`);

  return {
    ...res,
    items: res.items.map(adaptBackendDisciplina),
  };
}

/**
 * Obtém os detalhes completos de uma disciplina individual (Hub Colaborativo RF07/RF08),
 * incluindo ementa, pré-requisitos, equivalências e métricas consolidadas/históricas.
 */
export async function getDisciplineBySlug(slug: string): Promise<Discipline> {
  const raw = await request<BackendDisciplinaResponse>(`/cadeiras/${encodeURIComponent(slug)}`);
  return adaptBackendDisciplina(raw);
}

/**
 * Lista os comentários e avaliações de estudantes em uma disciplina/turma.
 */
export async function getComments(
  disciplinaId: number,
  params?: { turmaId?: number; page?: number; size?: number }
): Promise<{ items: unknown[]; total: number; page: number; size: number; pages: number }> {
  const query = new URLSearchParams();
  if (params?.turmaId) query.set("turma_id", String(params.turmaId));
  if (params?.page) query.set("page", String(params.page));
  if (params?.size) query.set("size", String(params.size));

  const queryStr = query.toString() ? `?${query.toString()}` : "";
  return request<{ items: unknown[]; total: number; page: number; size: number; pages: number }>(
    `/cadeiras/${disciplinaId}/comentarios${queryStr}`
  );
}

export const disciplineService = {
  getDisciplines,
  getCatalogDisciplines,
  getDisciplineBySlug,
  getComments,
};

export default disciplineService;
