import { ApiError } from '../../core/http';
import { setBusy, setFeedback } from '../../core/ui';
import { CategoryPicker } from '../categories/categories.picker';
import { CategoriesService } from '../categories/categories.service';
import { OperationsService } from './operations.service';
import type { CreateOperationDto, OperationType } from './operations.types';

/* Limite de la colonne NUMERIC(12, 2) côté serveur */
const MAX_AMOUNT = 9_999_999_999.99;

export interface OperationsViewCallbacks {
  onSessionExpired: (message: string) => void;
  onLogout: () => void;
}

export class OperationsView {
  private currentType: OperationType = 'EXPENSE';

  private form: HTMLFormElement;
  private inputAmount: HTMLInputElement;
  private inputName: HTMLInputElement;
  private categoryPicker: CategoryPicker;
  private inputDate: HTMLInputElement;
  private charCounter: HTMLElement;
  private feedback: HTMLElement;
  private btnSubmit: HTMLButtonElement;
  private btnDepense: HTMLButtonElement;
  private btnRevenu: HTMLButtonElement;
  private typeIndicator: HTMLElement;
  private accountEmail: HTMLElement;
  private btnLogout: HTMLButtonElement;

  constructor(private callbacks: OperationsViewCallbacks) {
    this.form = document.getElementById('form-operation') as HTMLFormElement;
    this.inputAmount = document.getElementById('op-amount') as HTMLInputElement;
    this.inputName = document.getElementById('op-name') as HTMLInputElement;
    this.categoryPicker = new CategoryPicker(
      document.getElementById('op-category') as HTMLInputElement,
      document.getElementById('op-category-list') as HTMLUListElement
    );
    this.inputDate = document.getElementById('op-date') as HTMLInputElement;
    this.charCounter = document.getElementById('char-counter') as HTMLElement;
    this.feedback = document.getElementById('op-feedback') as HTMLElement;
    this.btnSubmit = document.getElementById('btn-valider') as HTMLButtonElement;
    this.btnDepense = document.getElementById('btn-depense') as HTMLButtonElement;
    this.btnRevenu = document.getElementById('btn-revenu') as HTMLButtonElement;
    this.typeIndicator = document.getElementById('type-indicator') as HTMLElement;
    this.accountEmail = document.getElementById('account-email') as HTMLElement;
    this.btnLogout = document.getElementById('btn-logout') as HTMLButtonElement;

    this.resetForm();
    this.initEvents();
  }

  show(email: string | null): void {
    this.accountEmail.textContent = email ?? '';
    this.accountEmail.title = email ?? '';
    this.inputAmount.focus();
    void this.loadCategories();
  }

  /**
   * Loads the categories of the category field. The session must be open: GET /categories needs it.
   */
  private async loadCategories(): Promise<void> {
    this.categoryPicker.setUnavailable('Chargement des catégories…');

    try {
      const [categories, recentCategoryIds] = await Promise.all([
        CategoriesService.getCategories(),
        CategoriesService.getRecentCategoryIds()
      ]);
      this.categoryPicker.setCategories(categories, recentCategoryIds);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.isUnauthorized) {
        this.callbacks.onSessionExpired(err.message);
        return;
      }
      this.categoryPicker.setUnavailable('Catégories indisponibles');
      setFeedback(this.feedback, (err as Error).message, 'error');
    }
  }

  private resetForm(): void {
    this.form.reset();
    this.categoryPicker.clear();
    this.inputDate.value = toIsoDate(new Date());
    this.updateCharCounter();
  }

  private updateCharCounter(): void {
    this.charCounter.textContent = `${this.inputName.value.length}/${this.inputName.maxLength}`;
  }

  private initEvents(): void {
    this.inputName.addEventListener('input', () => this.updateCharCounter());

    this.inputAmount.addEventListener('input', () => this.inputAmount.setCustomValidity(''));

    this.btnDepense.addEventListener('click', () => this.setType('EXPENSE'));
    this.btnRevenu.addEventListener('click', () => this.setType('INCOME'));

    this.btnLogout.addEventListener('click', () => this.callbacks.onLogout());

    this.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      setFeedback(this.feedback);

      const amount = parseAmount(this.inputAmount.value);
      if (amount === null) {
        this.inputAmount.setCustomValidity('Montant invalide (ex : 12,50)');
        this.inputAmount.reportValidity();
        return;
      }

      const categoryId = this.categoryPicker.selectedCategoryId;
      if (categoryId === null) {
        this.categoryPicker.reportMissingCategory();
        return;
      }

      const levyDate = this.inputDate.value;
      const dto: CreateOperationDto = {
        levy_date: levyDate,
        label: this.inputName.value.trim(),
        amount: this.currentType === 'EXPENSE' ? -amount : amount,
        category_id: categoryId,
        /* Comme l'application : une opération passée ou du jour est validée, une opération future ne l'est pas */
        is_validate: levyDate <= toIsoDate(new Date())
      };

      setBusy(this.btnSubmit, true);
      try {
        await OperationsService.create(dto);
        this.categoryPicker.setRecentCategoryIds(await CategoriesService.rememberChosenCategory(categoryId));
        this.resetForm();
        setFeedback(this.feedback, 'Opération ajoutée avec succès !', 'success');
        this.inputAmount.focus();
      } catch (err: unknown) {
        if (err instanceof ApiError && err.isUnauthorized) {
          this.callbacks.onSessionExpired(err.message);
          return;
        }
        setFeedback(this.feedback, (err as Error).message, 'error');
      } finally {
        setBusy(this.btnSubmit, false);
      }
    });
  }

  private setType(type: OperationType): void {
    this.currentType = type;
    const isExpense = type === 'EXPENSE';
    this.btnDepense.classList.toggle('active', isExpense);
    this.btnRevenu.classList.toggle('active', !isExpense);
    this.btnDepense.setAttribute('aria-pressed', String(isExpense));
    this.btnRevenu.setAttribute('aria-pressed', String(!isExpense));
    this.typeIndicator.textContent = isExpense ? 'Dépense' : 'Revenu';
    this.typeIndicator.classList.toggle('income', !isExpense);
  }
}

/**
 * Montant saisi par l'utilisateur ("12,50", "12.5", "1 200") en nombre strictement positif, ou null.
 */
function parseAmount(raw: string): number | null {
  const normalized = raw.replace(/[\s  €]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  const value = Number(normalized);
  return value > 0 && value <= MAX_AMOUNT ? value : null;
}

/* Date locale au format AAAA-MM-JJ (toISOString() donnerait la date UTC, donc la veille entre minuit et 2 h en France) */
function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
