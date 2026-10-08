/* POST /users/login/request (FlorAccess) */
export interface LoginRequestDto {
  email: string;
}

export interface LoginRequestResponseDto {
  token: string;
}

/* POST /users/login/confirm (FlorAccess) */
export interface LoginConfirmDto {
  email: string;
  token: string;
  /* Code reçu par email */
  secret: string;
}

export interface JwtResponseDto {
  jwt: string;
}
