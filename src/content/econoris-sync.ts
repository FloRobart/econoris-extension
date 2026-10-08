/**
 * Content script injecté uniquement sur le site Econoris (voir "content_scripts" dans le manifest).
 *
 * L'application web (Flutter) stocke son JWT dans le localStorage, sous la clé "flutter.jwt"
 * (préfixe du plugin shared_preferences, valeur encodée en JSON). Si l'extension n'a pas de session valide,
 * on reprend celle du site : l'utilisateur n'a pas à se reconnecter dans l'extension.
 *
 * Ce fichier doit rester autonome (aucun import) : un content script ne peut pas charger de module ES,
 * un import créerait un chunk partagé avec la popup.
 */
export {};

(() => {
  const ext: typeof chrome = (globalThis as typeof globalThis & { browser?: typeof chrome }).browser ?? chrome;

  const WEB_JWT_KEY = 'flutter.jwt';
  /* Doivent rester identiques à CONFIG.TOKEN_STORAGE_KEY et CONFIG.WEB_SYNC_AFTER_STORAGE_KEY */
  const TOKEN_STORAGE_KEY = 'econoris_token';
  const WEB_SYNC_AFTER_STORAGE_KEY = 'econoris_web_sync_after';
  const EXPIRATION_MARGIN_S = 30;
  const SYNC_INTERVAL_MS = 3000;

  function decodePayload(token: string): { exp?: unknown; iat?: unknown } | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
      const bytes = Uint8Array.from(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
      const payload: unknown = JSON.parse(new TextDecoder().decode(bytes));
      return payload && typeof payload === 'object' ? payload as { exp?: unknown; iat?: unknown } : null;
    } catch {
      return null;
    }
  }

  function isValid(token: unknown): token is string {
    if (typeof token !== 'string') return false;
    const exp = decodePayload(token)?.exp;
    return typeof exp === 'number' && exp > Date.now() / 1000 + EXPIRATION_MARGIN_S;
  }

  function readWebJwt(): string | null {
    const raw = window.localStorage.getItem(WEB_JWT_KEY);
    if (!raw) return null;
    try {
      const value: unknown = JSON.parse(raw);
      return typeof value === 'string' ? value : null;
    } catch {
      return raw;
    }
  }

  async function sync(): Promise<void> {
    const webJwt = readWebJwt();
    if (!isValid(webJwt)) return;

    const stored = await ext.storage.local.get([TOKEN_STORAGE_KEY, WEB_SYNC_AFTER_STORAGE_KEY]);

    /* On ne remplace jamais une session valide de l'extension */
    if (isValid(stored[TOKEN_STORAGE_KEY])) return;

    /* Après une déconnexion de l'extension, on n'accepte qu'une session ouverte plus tard sur le site */
    const syncAfter = stored[WEB_SYNC_AFTER_STORAGE_KEY];
    if (typeof syncAfter === 'number') {
      const iat = decodePayload(webJwt)?.iat;
      if (typeof iat !== 'number' || iat <= syncAfter) return;
    }

    await ext.storage.local.set({ [TOKEN_STORAGE_KEY]: webJwt });
  }

  /* L'application Flutter écrit le JWT sans recharger la page (connexion) : on revérifie régulièrement */
  const timer = window.setInterval(() => {
    if (!document.hidden) run();
  }, SYNC_INTERVAL_MS);

  function run(): void {
    sync().catch(() => {
      /* Extension mise à jour ou désinstallée : ce script orphelin n'a plus accès aux API */
      window.clearInterval(timer);
    });
  }

  run();
})();
