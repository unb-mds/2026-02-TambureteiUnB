import { UserLoginInput, UserRegisterInput, AuthToken, UserResponse } from "@/types/auth";
import { request, setStoredToken, removeStoredToken, hasStoredToken } from "./httpClient";

/**
 * Autentica o usuário com email institucional e senha, armazenando
 * o JWT retornado no localStorage.
 */
export async function login(credentials: UserLoginInput): Promise<AuthToken> {
  const token = await request<AuthToken>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

  if (token?.access_token) {
    setStoredToken(token.access_token);
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
 * Remove a sessão e o token JWT ativo.
 */
export function logout(): void {
  removeStoredToken();
}

/**
 * Verifica se existe uma sessão ativa (token persistido).
 */
export function isAuthenticated(): boolean {
  return hasStoredToken();
}

export const authService = {
  login,
  register,
  logout,
  isAuthenticated,
};

export default authService;
