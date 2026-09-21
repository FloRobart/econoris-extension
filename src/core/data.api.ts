import { CONFIG } from '../config/config';
import { StorageService } from './storage';

export class DataApiClient {
  static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await StorageService.getToken();
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${CONFIG.DATA_API_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      let errorMsg = `Erreur HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || errorMsg;
      } catch {
        // Corps de réponse non-JSON
      }
      throw new Error(errorMsg);
    }

    return response.json() as Promise<T>;
  }
}