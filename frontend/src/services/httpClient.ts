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
    Object.setPrototypeOf(this, ApiError.prototype);
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

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: unknown) {
    const originalMessage = err instanceof Error ? err.message : String(err);
    const friendlyMessage =
      "Não foi possível conectar ao servidor. Verifique sua conexão com a internet ou se a API está ativa.";
    throw new ApiError(friendlyMessage, 0, { error: originalMessage });
  }

  if (!response.ok) {
    let errorMessage = `Erro HTTP ${response.status}`;
    let errorData: unknown = null;
    try {
      errorData = await response.json();
      const parsedData = errorData as Record<string, unknown> | null;
      if (typeof parsedData?.detail === "string") {
        errorMessage = parsedData.detail;
      } else if (Array.isArray(parsedData?.detail)) {
        const msgs = parsedData.detail
          .map((item: unknown) => {
            if (typeof item === "string") return item;
            if (item && typeof item === "object" && "msg" in item) {
              const msgStr = String((item as { msg: unknown }).msg);
              return msgStr.replace(/^Value error,\s*/i, "");
            }
            return null;
          })
          .filter(Boolean);
        if (msgs.length > 0) {
          errorMessage = msgs.join(" • ");
        }
      } else if (typeof parsedData?.message === "string") {
        errorMessage = parsedData.message;
      } else if (typeof parsedData?.error === "string") {
        errorMessage = parsedData.error;
      }
    } catch {
      try {
        const text = await response.text();
        if (text && text.trim().length > 0 && text.length < 300) {
          errorMessage = text.trim();
        }
      } catch {
        // Falha ao ler corpo como texto
      }
    }
    throw new ApiError(errorMessage, response.status, errorData);
  }

  return response.json() as Promise<T>;
}

export default request;
