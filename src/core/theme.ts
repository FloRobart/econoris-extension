export type ThemeMode = 'system' | 'dark' | 'light';

const THEME_STORAGE_KEY = 'econoris_theme';

/* Ordre de rotation au clic : système → sombre → clair → système */
const NEXT_MODE: Record<ThemeMode, ThemeMode> = { system: 'dark', dark: 'light', light: 'system' };

const LABELS: Record<ThemeMode, string> = {
  system: 'Thème : système',
  dark: 'Thème : sombre',
  light: 'Thème : clair'
};

/* Préférence d'affichage propre à la popup : le localStorage (synchrone) évite un flash au chargement */
function readMode(): ThemeMode {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'dark' || value === 'light' ? value : 'system';
  } catch {
    return 'system';
  }
}

function saveMode(mode: ThemeMode): void {
  try {
    if (mode === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* Stockage indisponible : le thème reste valable pour cette ouverture */
  }
}

function applyMode(mode: ThemeMode): void {
  if (mode === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = mode;
}

/* À appeler au plus tôt pour appliquer le thème avant l'affichage */
export function applySavedTheme(): void {
  applyMode(readMode());
}

export function initThemeToggle(button: HTMLButtonElement): void {
  let mode = readMode();
  let rotation = 0;

  const render = () => {
    button.dataset.mode = mode;
    button.title = LABELS[mode];
    button.setAttribute('aria-label', LABELS[mode]);
    button.style.setProperty('--rotation', `${rotation}deg`);
  };

  button.addEventListener('click', () => {
    mode = NEXT_MODE[mode];
    rotation += 120;
    applyMode(mode);
    saveMode(mode);
    render();
  });

  render();
}
