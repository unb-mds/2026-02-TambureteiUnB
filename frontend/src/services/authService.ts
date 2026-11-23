import type {
  UserLoginInput,
  UserRegisterInput,
  AuthToken,
  UserResponse,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  MessageResponse,
} from "../types/auth.ts";
import { request, setStoredToken, removeStoredToken, hasStoredToken, ApiError } from "./httpClient.ts";
import {
  clearImportedHistorico,
  loadImportedHistorico,
  saveImportedHistorico,
  HISTORICO_CHANGE_EVENT,
} from "./historicoService.ts";
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
  const previousUser = getStoredUser();
  const token = await request<AuthToken>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

  if (token?.access_token) {
    setStoredToken(token.access_token);
    try {
      const user = await request<UserResponse>("/auth/me");
      if (user) {
        if (previousUser?.id && user.id !== previousUser.id) {
          clearImportedHistorico();
        }
        setStoredUser(user);
        const userHistorico = loadImportedHistorico({ userId: user.id });
        if (userHistorico) {
          saveImportedHistorico(userHistorico);
        }
      }
    } catch {
      // Ignora falha inicial de perfil
    }
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
      window.dispatchEvent(new Event(HISTORICO_CHANGE_EVENT));
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
 * Solicita o envio do e-mail com link seguro de recuperação de senha via rota de API do Next.js (Nodemailer).
 */
export async function requestPasswordReset(data: ForgotPasswordInput): Promise<MessageResponse> {
  // Chamada para a rota interna Next.js que dispara o e-mail via Nodemailer
  const response = await fetch("/api/auth/esqueci-senha", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new ApiError(payload.message || "Erro ao solicitar recuperação de senha.", response.status);
  }

  return payload;
}

/**
 * Redefine a senha esquecida a partir do token de recuperação.
 */
export async function resetPassword(data: ResetPasswordInput): Promise<MessageResponse> {
  return request<MessageResponse>("/auth/redefinir-senha", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Altera a senha do usuário autenticado no sistema.
 */
export async function changePassword(data: ChangePasswordInput): Promise<MessageResponse> {
  return request<MessageResponse>("/auth/alterar-senha", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Remove a sessão e o token JWT ativo, notificando a interface.
 * O histórico do usuário continua salvo sob sua chave dedicada para restauração ao relogar.
 */
export function logout(): void {
  removeStoredToken();
  removeStoredUser();
  clearImportedHistorico();
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
  requestPasswordReset,
  resetPassword,
  changePassword,
  AUTH_CHANGE_EVENT,
};

export default authService;
