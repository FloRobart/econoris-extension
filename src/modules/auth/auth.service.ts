import { AuthApiClient } from '../../core/auth.api';
import { ApiError } from '../../core/http';
import { decodeJwt, StorageService } from '../../core/storage';
import type { JwtResponseDto, LoginConfirmDto, LoginRequestDto, LoginRequestResponseDto } from './auth.types';

export class AuthService {
  /* Même normalisation que FlorAccess (minuscules, sans espaces) */
  static normalizeEmail(email: string): string {
    return email.toLowerCase().replace(/\s+/g, '');
  }

  /**
   * Étape 1 : FlorAccess envoie un code par email et renvoie un token à présenter avec ce code.
   * La demande est mémorisée pour survivre à la fermeture de la popup (qui se ferme dès qu'on va lire ses emails).
   */
  static async requestCode(rawEmail: string): Promise<void> {
    const email = AuthService.normalizeEmail(rawEmail);
    const body: LoginRequestDto = { email };
    const data = await AuthApiClient.request<LoginRequestResponseDto>('/users/login/request', { method: 'POST', body });

    if (typeof data?.token !== 'string' || !data.token) {
      throw new Error('Réponse inattendue du serveur d’authentification.');
    }
    await StorageService.setPendingLogin({ email, token: data.token, createdAt: Date.now() });
  }

  /**
   * Étape 2 : échange du code reçu par email contre un JWT.
   */
  static async confirmCode(rawCode: string): Promise<void> {
    const pending = await StorageService.getPendingLogin();
    if (!pending) {
      throw new Error('La demande de connexion a expiré, veuillez recommencer.');
    }

    const body: LoginConfirmDto = {
      email: pending.email,
      token: pending.token,
      secret: rawCode.trim().replace(/\s+/g, '')
    };

    let data: JwtResponseDto;
    try {
      data = await AuthApiClient.request<JwtResponseDto>('/users/login/confirm', { method: 'POST', body });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        throw new Error('Code invalide ou expiré.');
      }
      throw err;
    }

    await StorageService.setToken(data?.jwt);
    await StorageService.clearPendingLogin();
  }

  static async getPendingEmail(): Promise<string | null> {
    return (await StorageService.getPendingLogin())?.email ?? null;
  }

  static async cancelLogin(): Promise<void> {
    await StorageService.clearPendingLogin();
  }

  /**
   * Déconnexion de l'extension uniquement. On n'appelle pas POST /users/logout :
   * côté FlorAccess cela déconnecte l'utilisateur de tous ses appareils.
   */
  static async logout(): Promise<void> {
    await StorageService.logout();
  }

  static async getCurrentEmail(): Promise<string | null> {
    const token = await StorageService.getToken();
    const email = token ? decodeJwt(token)?.email : undefined;
    return typeof email === 'string' ? email : null;
  }
}
