export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("tamburetei_auth_token");
}

export function setStoredToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("tamburetei_auth_token", token);
  }
}

export function removeStoredToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("tamburetei_auth_token");
  }
}

export function hasStoredToken(): boolean {
  return !!getStoredToken();
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Token de autenticação injetado automaticamente caso presente no client
  const token = getStoredToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
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

export default request;
