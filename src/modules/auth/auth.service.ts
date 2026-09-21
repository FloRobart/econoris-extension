import { AuthApiClient } from '../../core/auth.api';
import { StorageService } from '../../core/storage';
import { AuthResponseDto } from './auth.types';

export class AuthService {
  static async sendVerificationCode(email: string): Promise<void> {
    await AuthApiClient.request<void>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  static async verifyCode(email: string, code: string): Promise<void> {
    const data = await AuthApiClient.request<AuthResponseDto>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code })
    });
    await StorageService.setToken(data.token);
  }
}