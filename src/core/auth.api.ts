import { CONFIG } from '../config/config';
import { createApiClient } from './http';

/* API d'authentification FlorAccess */
export const AuthApiClient = createApiClient(CONFIG.AUTH_API_URL);
