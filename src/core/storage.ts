import { CONFIG } from '../config/config';

interface JwtPayload {
  exp?: number;
  [key: string]: unknown;
}

const extensionStorage = (typeof browser !== 'undefined' && browser.storage)
  ? browser.storage.local
  : chrome.storage.local;

export class StorageService {
  static async getToken(): Promise<string | null> {
    const data = await extensionStorage.get(CONFIG.TOKEN_STORAGE_KEY);
    return (data[CONFIG.TOKEN_STORAGE_KEY] as string) || null;
  }

  static async setToken(token: string): Promise<void> {
    await extensionStorage.set({ [CONFIG.TOKEN_STORAGE_KEY]: token });
  }

  static async clearToken(): Promise<void> {
    await extensionStorage.remove(CONFIG.TOKEN_STORAGE_KEY);
  }

  static isTokenValid(token: string | null): boolean {
    if (!token) return false;
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload: JwtPayload = JSON.parse(
        decodeURIComponent(
          atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        )
      );
      const now = Math.floor(Date.now() / 1000);
      return typeof payload.exp === 'number' && payload.exp > now;
    } catch {
      return false;
    }
  }
}