export interface AuthClaims {
  sub: string;
  email: string;
  aud: string;
  iss: string;
  exp: number;
}
