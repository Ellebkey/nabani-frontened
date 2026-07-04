export interface RegisterModel {
  username: string;
  password: string;
  email: string;
  displayName?: string;
}

export interface CredentialsModel {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface JWTResponse {
  token: string;
  refreshToken: string;
  roles: string[];
  username: string;
  expiresIn: string;
}
