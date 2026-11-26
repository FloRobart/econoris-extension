export const CONFIG = {
  /* URLs sans "/" final : les endpoints commencent tous par "/" */
  DATA_API_URL: 'https://api.econoris.fr',
  AUTH_API_URL: 'https://api.floraccess.florobart.fr',

  /* Site web Econoris (application Flutter) dont on peut récupérer la session */
  WEB_APP_URL: 'https://app.econoris.fr',

  /* Clés de stockage de l'extension (les deux premières sont dupliquées dans src/content/econoris-sync.ts) */
  TOKEN_STORAGE_KEY: 'econoris_token',
  WEB_SYNC_AFTER_STORAGE_KEY: 'econoris_web_sync_after',
  PENDING_LOGIN_STORAGE_KEY: 'econoris_pending_login',
  CATEGORIES_CACHE_STORAGE_KEY: 'econoris_categories_cache',
  RECENT_CATEGORIES_STORAGE_KEY: 'econoris_recent_categories',

  /* Durée de validité du token de connexion FlorAccess (TOKEN_EXPIRATION côté serveur) */
  LOGIN_TOKEN_TTL_MS: 30 * 60 * 1000,

  /* The categories change rarely: they are fetched again once a day */
  CATEGORIES_CACHE_TTL_MS: 24 * 60 * 60 * 1000,

  /* Number of categories chosen last, suggested first in the category field */
  RECENT_CATEGORIES_COUNT: 5
} as const;
