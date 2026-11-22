import type { UserLoginInput, UserRegisterInput, AuthToken, UserResponse } from "../types/auth.ts";
import { request, setStoredToken, removeStoredToken, hasStoredToken } from "./httpClient.ts";

export const AUTH_CHANGE_EVENT = "tamburetei-auth-change";
const USER_STORAGE_KEY = "tamburetei_user";

export function getStoredUser(): UserResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: UserResponse): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }
}

export function removeStoredUser(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

/**
 * Consulta os dados do usuário autenticado no backend (/auth/me)
 * e atualiza o cache local.
 */
export async function getCurrentUser(): Promise<UserResponse | null> {
  if (!hasStoredToken()) {
    removeStoredUser();
    return null;
  }

  try {
    const user = await request<UserResponse>("/auth/me");
    if (user?.id) {
      setStoredUser(user);
      return user;
    }
    return getStoredUser();
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    if (status === 401) {
      logout();
      return null;
    }
    return getStoredUser();
  }
}

/**
 * Autentica o usuário com email e senha, armazenando
 * o JWT retornado no localStorage e obtendo o perfil.
 */
export async function login(credentials: UserLoginInput): Promise<AuthToken> {
  const token = await request<AuthToken>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

  if (token?.access_token) {
    setStoredToken(token.access_token);
    try {
      const user = await request<UserResponse>("/auth/me");
      if (user) {
        setStoredUser(user);
      }
    } catch {
      // Ignora falha inicial de perfil
    }
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
    }
  }
  return token;
}

/**
 * Registra um novo usuário no sistema do Tamburetei UnB.
 */
export async function register(data: UserRegisterInput): Promise<UserResponse> {
  return request<UserResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Remove a sessão e o token JWT ativo, notificando a interface.
 */
export function logout(): void {
  removeStoredToken();
  removeStoredUser();
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}

/**
 * Verifica se existe uma sessão ativa (token persistido).
 */
export function isAuthenticated(): boolean {
  return hasStoredToken();
}

/**
 * Determina se o banner de acesso visitante deve ser exibido com base
 * no estado de autenticacao atual e no estado de dispensa manual.
 */
export function shouldShowGuestBanner(
  authenticated: boolean = isAuthenticated(),
  dismissed: boolean = false
): boolean {
  return !authenticated && !dismissed;
}

/**
 * Registra um listener para mudancas no estado de autenticacao
 * (AUTH_CHANGE_EVENT e storage) e retorna a funcao de limpeza.
 */
export function subscribeAuthChange(listener: () => void): () => void {
  if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
    return () => {};
  }
  window.addEventListener(AUTH_CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    if (typeof window.removeEventListener === "function") {
      window.removeEventListener(AUTH_CHANGE_EVENT, listener);
      window.removeEventListener("storage", listener);
    }
  };
}

export const authService = {
  login,
  register,
  logout,
  isAuthenticated,
  shouldShowGuestBanner,
  subscribeAuthChange,
  getCurrentUser,
  getStoredUser,
  setStoredUser,
  removeStoredUser,
  AUTH_CHANGE_EVENT,
};

export default authService;
