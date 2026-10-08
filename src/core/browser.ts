/**
 * Namespace des API d'extension, commun à Chrome et Firefox.
 * Firefox expose `browser` (et `chrome` en compatibilité), Chrome uniquement `chrome`.
 * En Manifest V3, les deux renvoient des Promises.
 */
export const ext: typeof chrome = (globalThis as typeof globalThis & { browser?: typeof chrome }).browser ?? chrome;
