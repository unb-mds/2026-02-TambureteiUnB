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
  id: string | number;
  nome: string;
  email: string;
  role: string;
  is_active: boolean;
}
