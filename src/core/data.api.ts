import { CONFIG } from '../config/config';
import { createApiClient } from './http';

/* API de données Econoris */
export const DataApiClient = createApiClient(CONFIG.DATA_API_URL);
