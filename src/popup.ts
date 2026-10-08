import './styles/popup.css';

import { CONFIG } from './config/config';
import { ext } from './core/browser';
import { Router } from './core/router';
import { StorageService } from './core/storage';
import { applySavedTheme, initThemeToggle } from './core/theme';
import { localizeValidation } from './core/validation';
import { AuthService } from './modules/auth/auth.service';
import { AuthView } from './modules/auth/auth.view';
import { OperationsView } from './modules/operations/operations.view';

applySavedTheme();

/* Origines dont l'extension a besoin (Firefox permet à l'utilisateur de les retirer) */
const REQUIRED_ORIGINS = [CONFIG.AUTH_API_URL, CONFIG.DATA_API_URL, CONFIG.WEB_APP_URL].map(url => `${url}/*`);

async function init(): Promise<void> {
  const router = new Router();

  initThemeToggle(document.getElementById('btn-theme') as HTMLButtonElement);
  document.querySelectorAll('form').forEach(localizeValidation);

  const authView = new AuthView(router, () => void refresh());
  const operationsView = new OperationsView({
    onSessionExpired: (message) => {
      void StorageService.clearToken().then(() => authView.show(message));
    },
    onLogout: () => {
      void AuthService.logout();
    }
  });

  async function refresh(): Promise<void> {
    const token = await StorageService.getToken();
    if (token) {
      router.navigate('operation');
      operationsView.show(await AuthService.getCurrentEmail());
    } else {
      await authView.show();
    }
  }

  /* Connexion, déconnexion, ou session récupérée depuis le site Econoris pendant que la popup est ouverte */
  StorageService.onTokenChanged(() => void refresh());

  await checkPermissions();
  await refresh();
}

async function checkPermissions(): Promise<void> {
  const banner = document.getElementById('permission-banner') as HTMLElement;
  const button = document.getElementById('btn-grant-permissions') as HTMLButtonElement;

  const granted = await ext.permissions.contains({ origins: REQUIRED_ORIGINS });
  banner.classList.toggle('hidden', granted);

  button.addEventListener('click', async () => {
    /* permissions.request doit être appelé directement dans le gestionnaire du clic */
    if (await ext.permissions.request({ origins: REQUIRED_ORIGINS })) {
      banner.classList.add('hidden');
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void init());
} else {
  void init();
}
