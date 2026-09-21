import { Router } from '../../core/router';
import { StorageService } from '../../core/storage';
import { OperationsService } from './operations.service';
import { OperationType } from './operations.types';

export class OperationsView {
  private currentType: OperationType = 'EXPENSE';

  private form!: HTMLFormElement;
  private inputAmount!: HTMLInputElement;
  private inputName!: HTMLInputElement;
  private inputCategory!: HTMLSelectElement;
  private inputDate!: HTMLInputElement;
  private charCounter!: HTMLElement;
  private feedback!: HTMLElement;
  private btnDepense!: HTMLButtonElement;
  private btnRevenu!: HTMLButtonElement;
  private typeIndicator!: HTMLElement;

  constructor(private router: Router) {
    this.bindElements();
    this.initDate();
    this.initEvents();
  }

  private bindElements(): void {
    this.form = document.getElementById('form-operation') as HTMLFormElement;
    this.inputAmount = document.getElementById('op-amount') as HTMLInputElement;
    this.inputName = document.getElementById('op-name') as HTMLInputElement;
    this.inputCategory = document.getElementById('op-category') as HTMLSelectElement;
    this.inputDate = document.getElementById('op-date') as HTMLInputElement;
    this.charCounter = document.getElementById('char-counter') as HTMLElement;
    this.feedback = document.getElementById('op-feedback') as HTMLElement;
    this.btnDepense = document.getElementById('btn-depense') as HTMLButtonElement;
    this.btnRevenu = document.getElementById('btn-revenu') as HTMLButtonElement;
    this.typeIndicator = document.getElementById('type-indicator') as HTMLElement;
  }

  private initDate(): void {
    if (this.inputDate) {
      this.inputDate.value = new Date().toISOString().split('T')[0];
    }
  }

  private initEvents(): void {
    if (!this.form) return;

    this.inputName.addEventListener('input', () => {
      this.charCounter.textContent = `${this.inputName.value.length}/200`;
    });

    this.btnDepense.addEventListener('click', () => this.setType('EXPENSE'));
    this.btnRevenu.addEventListener('click', () => this.setType('INCOME'));

    this.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      this.clearFeedback();

      const token = await StorageService.getToken();
      if (!StorageService.isTokenValid(token)) {
        this.router.navigate('login');
        return;
      }

      const dto = {
        amount: parseFloat(this.inputAmount.value),
        name: this.inputName.value.trim(),
        category: this.inputCategory.value,
        date: this.inputDate.value,
        type: this.currentType
      };

      try {
        await OperationsService.create(dto);
        this.feedback.textContent = 'Opération ajoutée avec succès !';
        this.feedback.className = 'feedback-msg success';
        this.form.reset();
        this.initDate();
        this.charCounter.textContent = '0/200';
      } catch (err: unknown) {
        this.feedback.textContent = (err as Error).message;
        this.feedback.className = 'feedback-msg error';
      }
    });
  }

  private setType(type: OperationType): void {
    this.currentType = type;
    if (type === 'EXPENSE') {
      this.btnDepense.classList.add('active');
      this.btnRevenu.classList.remove('active');
      this.typeIndicator.textContent = 'Depense';
      this.typeIndicator.style.color = 'var(--accent-red)';
    } else {
      this.btnRevenu.classList.add('active');
      this.btnDepense.classList.remove('active');
      this.typeIndicator.textContent = 'Revenu';
      this.typeIndicator.style.color = '#5bb381';
    }
  }

  private clearFeedback(): void {
    this.feedback.textContent = '';
    this.feedback.className = 'feedback-msg';
  }
}