// En tout premier dans src/popup.ts :
import './styles/popup.css';

import { Router } from './core/router';
import { StorageService } from './core/storage';
import { AuthView } from './modules/auth/auth.view';
import { OperationsView } from './modules/operations/operations.view';

async function init() {
  const router = new Router();
  new AuthView(router);
  new OperationsView(router);

  const token = await StorageService.getToken();
  if (StorageService.isTokenValid(token)) {
    router.navigate('operation');
  } else {
    router.navigate('login');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  setTimeout(init, 0);
}