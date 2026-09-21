import { Router } from '../../core/router';
import { AuthService } from './auth.service';

export class AuthView {
  private pendingEmail: string = '';

  private formLogin!: HTMLFormElement;
  private inputEmail!: HTMLInputElement;
  private loginFeedback!: HTMLElement;

  private formVerify!: HTMLFormElement;
  private inputCode!: HTMLInputElement;
  private verifyFeedback!: HTMLElement;

  constructor(private router: Router) {
    this.bindElements();
    this.initEvents();
  }

  private bindElements(): void {
    const formLogin = document.getElementById('form-login');
    const inputEmail = document.getElementById('login-email');
    const loginFeedback = document.getElementById('login-feedback');
    const formVerify = document.getElementById('form-verify');
    const inputCode = document.getElementById('verify-code');
    const verifyFeedback = document.getElementById('verify-feedback');

    if (!formLogin || !formVerify) {
      console.error("Éléments DOM d'authentification introuvables : vérifie les IDs dans popup.html !");
      return;
    }

    this.formLogin = formLogin as HTMLFormElement;
    this.inputEmail = inputEmail as HTMLInputElement;
    this.loginFeedback = loginFeedback as HTMLElement;
    this.formVerify = formVerify as HTMLFormElement;
    this.inputCode = inputCode as HTMLInputElement;
    this.verifyFeedback = verifyFeedback as HTMLElement;
  }

  private initEvents(): void {
    if (!this.formLogin || !this.formVerify) return;

    this.formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      this.clearFeedback(this.loginFeedback);
      this.pendingEmail = this.inputEmail.value.trim();

      try {
        await AuthService.sendVerificationCode(this.pendingEmail);
        this.router.navigate('verify');
      } catch (err: unknown) {
        this.showError(this.loginFeedback, (err as Error).message);
      }
    });

    this.formVerify.addEventListener('submit', async (e) => {
      e.preventDefault();
      this.clearFeedback(this.verifyFeedback);
      const code = this.inputCode.value.trim();

      try {
        await AuthService.verifyCode(this.pendingEmail, code);
        this.inputCode.value = '';
        this.router.navigate('operation');
      } catch (err: unknown) {
        this.showError(this.verifyFeedback, (err as Error).message);
      }
    });
  }

  private showError(el: HTMLElement, msg: string): void {
    el.textContent = msg;
    el.className = 'feedback-msg error';
  }

  private clearFeedback(el: HTMLElement): void {
    el.textContent = '';
    el.className = 'feedback-msg';
  }
}