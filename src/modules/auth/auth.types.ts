export interface LoginRequestDto {
  email: string;
}

export interface VerifyRequestDto {
  email: string;
  code: string;
}

export interface AuthResponseDto {
  token: string;
}