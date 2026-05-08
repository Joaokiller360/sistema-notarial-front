export type Role = "SUPER_ADMIN" | "NOTARIO" | "MATRIZADOR" | "ARCHIVADOR";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  permissions: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  roles: Role[];
  permissions: string[];
  iat: number;
  exp: number;
}

export interface BackendApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}
