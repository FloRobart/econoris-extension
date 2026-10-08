import { StorageService } from './storage';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /* Ajoute le JWT stocké dans l'en-tête Authorization */
  authenticated?: boolean;
}

/**
 * Client HTTP minimal partagé par les API FlorAccess et Econoris.
 * Les deux serveurs renvoient leurs erreurs sous forme de chaîne JSON (ex: "Invalid token").
 */
export function createApiClient(baseUrl: string) {
  return {
    async request<T>(endpoint: string, { method = 'GET', body, authenticated = false }: RequestOptions = {}): Promise<T> {
      const headers = new Headers({ Accept: 'application/json' });
      if (body !== undefined) {
        headers.set('Content-Type', 'application/json');
      }

      if (authenticated) {
        const token = await StorageService.getToken();
        if (!token) {
          throw new ApiError('Session expirée, veuillez vous reconnecter.', 401);
        }
        headers.set('Authorization', `Bearer ${token}`);
      }

      let response: Response;
      try {
        response = await fetch(`${baseUrl}${endpoint}`, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          credentials: 'omit'
        });
      } catch {
        throw new ApiError('Impossible de joindre le serveur. Vérifiez votre connexion.', 0);
      }

      const text = await response.text();
      const data: unknown = text ? safeJsonParse(text) : undefined;

      if (!response.ok) {
        const message = authenticated && response.status === 401
          ? 'Session expirée, veuillez vous reconnecter.'
          : extractErrorMessage(data, response.status);
        throw new ApiError(message, response.status);
      }

      return data as T;
    }
  };
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractErrorMessage(data: unknown, status: number): string {
  if (status === 429) return 'Trop de requêtes, réessayez dans quelques instants.';
  if (typeof data === 'string' && data.trim()) return data;
  if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
    return data.message;
  }
  return `Erreur HTTP ${status}`;
}
