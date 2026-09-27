import { Course, CourseDetail } from "@/types/curso";
import {
  Discipline,
  BackendDisciplinaResumo,
  BackendDisciplinaResponse,
  PaginatedDisciplines,
  adaptBackendDisciplina,
} from "@/types/disciplina";
import { UserLoginInput, UserRegisterInput, AuthToken, UserResponse } from "@/types/auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Token de autenticação se disponível no cliente
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("tamburetei_auth_token");
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `Erro HTTP ${response.status}`;
    let errorData = null;
    try {
      errorData = await response.json();
      if (typeof errorData?.detail === "string") {
        errorMessage = errorData.detail;
      } else if (Array.isArray(errorData?.detail) && errorData.detail[0]?.msg) {
        errorMessage = errorData.detail[0].msg;
      }
    } catch {
      // Falha ao converter JSON do erro
    }
    throw new ApiError(errorMessage, response.status, errorData);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Cursos
  async getCourses(filters?: { q?: string; campus?: string }): Promise<Course[]> {
    const params = new URLSearchParams();
    if (filters?.q) params.set("q", filters.q);
    if (filters?.campus && filters.campus !== "Todos") params.set("campus", filters.campus);

    const queryStr = params.toString() ? `?${params.toString()}` : "";
    return request<Course[]>(`/cursos${queryStr}`);
  },

  async getCourseBySlug(slug: string): Promise<CourseDetail> {
    return request<CourseDetail>(`/cursos/${encodeURIComponent(slug)}`);
  },

  // Disciplinas / Cadeiras
  async getDisciplines(filters?: {
    q?: string;
    codigo?: string;
    departamento?: string;
  }): Promise<Discipline[]> {
    const params = new URLSearchParams();
    if (filters?.q) params.set("q", filters.q);
    if (filters?.codigo) params.set("codigo", filters.codigo);
    if (filters?.departamento && filters.departamento !== "Todos os Departamentos") {
      params.set("departamento", filters.departamento);
    }

    const queryStr = params.toString() ? `?${params.toString()}` : "";
    const items = await request<BackendDisciplinaResumo[]>(`/cadeiras${queryStr}`);
    return items.map(adaptBackendDisciplina);
  },

  async getCatalogDisciplines(params?: {
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
  },

  async getDisciplineBySlug(slug: string): Promise<Discipline> {
    const raw = await request<BackendDisciplinaResponse>(`/cadeiras/${encodeURIComponent(slug)}`);
    return adaptBackendDisciplina(raw);
  },

  async getComments(
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
  },

  // Autenticação
  async login(credentials: UserLoginInput): Promise<AuthToken> {
    const token = await request<AuthToken>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    if (typeof window !== "undefined" && token?.access_token) {
      localStorage.setItem("tamburetei_auth_token", token.access_token);
    }
    return token;
  },

  async register(data: UserRegisterInput): Promise<UserResponse> {
    return request<UserResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("tamburetei_auth_token");
    }
  },

  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("tamburetei_auth_token");
  },
};

export default api;
