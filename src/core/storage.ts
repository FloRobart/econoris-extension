import { CONFIG } from '../config/config';
import { ext } from './browser';

export interface JwtPayload {
  exp?: number;
  iat?: number;
  id?: number;
  email?: string;
  [key: string]: unknown;
}

export interface PendingLogin {
  email: string;
  /* Token renvoyé par FlorAccess à l'étape 1, à renvoyer avec le code reçu par email */
  token: string;
  createdAt: number;
}

/* Marge pour ne pas envoyer un JWT qui expirerait pendant la requête */
const EXPIRATION_MARGIN_S = 30;

/**
 * Décode (sans vérifier la signature, c'est le rôle du serveur) le payload d'un JWT.
 */
export function decodeJwt(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const payload: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return payload && typeof payload === 'object' ? payload as JwtPayload : null;
  } catch {
    return null;
  }
}

/**
 * Stockage de la session.
 * - Le JWT est dans `storage.local` : propre à l'extension, inaccessible aux pages web et aux autres extensions.
 * - La connexion en cours (email + token de l'étape 1) est dans `storage.session` : en mémoire uniquement,
 *   effacée à la fermeture du navigateur et inaccessible aux content scripts.
 */
export class StorageService {
  static async getToken(): Promise<string | null> {
    const data = await ext.storage.local.get(CONFIG.TOKEN_STORAGE_KEY);
    const token = data[CONFIG.TOKEN_STORAGE_KEY];
    if (typeof token !== 'string') return null;

    if (!StorageService.isTokenValid(token)) {
      await StorageService.clearToken();
      return null;
    }
    return token;
  }

  static async setToken(token: string): Promise<void> {
    if (!StorageService.isTokenValid(token)) {
      throw new Error('Jeton de session invalide reçu du serveur.');
    }
    await ext.storage.local.set({ [CONFIG.TOKEN_STORAGE_KEY]: token });
    await ext.storage.local.remove(CONFIG.WEB_SYNC_AFTER_STORAGE_KEY);
  }

  static async clearToken(): Promise<void> {
    await ext.storage.local.remove(CONFIG.TOKEN_STORAGE_KEY);
  }

  /**
   * Déconnexion volontaire : on supprime le JWT et on empêche le content script de réimporter
   * aussitôt la session du site web, sauf si l'utilisateur s'y reconnecte (JWT émis plus tard).
   */
  static async logout(): Promise<void> {
    await ext.storage.local.set({ [CONFIG.WEB_SYNC_AFTER_STORAGE_KEY]: Math.floor(Date.now() / 1000) });
    await StorageService.clearToken();
  }

  static isTokenValid(token: string | null): boolean {
    if (!token) return false;
    const payload = decodeJwt(token);
    const now = Math.floor(Date.now() / 1000);
    return typeof payload?.exp === 'number' && payload.exp > now + EXPIRATION_MARGIN_S;
  }

  static onTokenChanged(listener: () => void): void {
    ext.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && CONFIG.TOKEN_STORAGE_KEY in changes) {
        listener();
      }
    });
  }

  static async getPendingLogin(): Promise<PendingLogin | null> {
    const data = await ext.storage.session.get(CONFIG.PENDING_LOGIN_STORAGE_KEY);
    const pending = data[CONFIG.PENDING_LOGIN_STORAGE_KEY] as PendingLogin | undefined;
    if (!pending) return null;

    if (Date.now() - pending.createdAt > CONFIG.LOGIN_TOKEN_TTL_MS) {
      await StorageService.clearPendingLogin();
      return null;
    }
    return pending;
  }

  static async setPendingLogin(pending: PendingLogin): Promise<void> {
    await ext.storage.session.set({ [CONFIG.PENDING_LOGIN_STORAGE_KEY]: pending });
  }

  static async clearPendingLogin(): Promise<void> {
    await ext.storage.session.remove(CONFIG.PENDING_LOGIN_STORAGE_KEY);
  }
}
