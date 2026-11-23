export interface UserLoginInput {
  email: string;
  senha: string;
}

export interface UserRegisterInput {
  nome: string;
  email: string;
  senha: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  nome: string;
  email: string;
  role: string;
  is_active?: boolean;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  nova_senha: string;
}

export interface ChangePasswordInput {
  senha_atual: string;
  nova_senha: string;
}

export interface MessageResponse {
  message: string;
  reset_token?: string;
}
