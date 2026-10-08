export const CONFIG = {
  /* URLs sans "/" final : les endpoints commencent tous par "/" */
  DATA_API_URL: 'https://econoris-server.florobart.fr',
  AUTH_API_URL: 'https://floraccess-server.florobart.fr',

  /* Site web Econoris (application Flutter) dont on peut récupérer la session */
  WEB_APP_URL: 'https://econoris.florobart.fr',

  /* Clés de stockage de l'extension (les deux premières sont dupliquées dans src/content/econoris-sync.ts) */
  TOKEN_STORAGE_KEY: 'econoris_token',
  WEB_SYNC_AFTER_STORAGE_KEY: 'econoris_web_sync_after',
  PENDING_LOGIN_STORAGE_KEY: 'econoris_pending_login',

  /* Durée de validité du token de connexion FlorAccess (TOKEN_EXPIRATION côté serveur) */
  LOGIN_TOKEN_TTL_MS: 30 * 60 * 1000
} as const;

/* Liste des catégories de l'application Econoris (econoris_app/lib/config/constantes.dart) */
export const OPERATION_CATEGORIES: readonly string[] = [
  'Courses',
  'Restaurants',
  'Vêtements',
  'Cadeaux',
  'Animaux',
  'Enfants',
  'Salaire',
  'Primes et bonus',
  'Aides et subventions',
  'Indemnités',
  'Remboursements',
  'Epargne',
  'Bourse et actions',
  'Dividendes',
  'Cryptomonnaies',
  'Sports',
  'Cinémas et culture',
  'Bars',
  'Loisirs',
  'Esthétique',
  'Multimédia',
  'Vacances',
  'Loyer',
  'Eau, Electricité, Gaz',
  'Internet, téléphone',
  'Travaux',
  'Meubles',
  'Electroménager',
  'Prêt immobilier',
  'Santé',
  'Transports en commun',
  'Voiture',
  'Moto',
  'Carburant',
  'Parking',
  'Péage',
  'Entretien véhicule',
  'Frais bancaires',
  'Impôts',
  'Taxes',
  'Prêts et crédits',
  'Amendes',
  'Ordinateur',
  'Téléphone',
  'Montres',
  'Bijoux',
  'Accessoires high-tech',
  'Prêts étudiants',
  'Dépenses professionnelles',
  'Formations',
  'Matériel scolaire',
  'Autre'
];

export const DEFAULT_CATEGORY = 'Courses';
