import { Router } from '../../core/router';
import { setBusy, setFeedback } from '../../core/ui';
import { AuthService } from './auth.service';

export class AuthView {
  private formLogin: HTMLFormElement;
  private inputEmail: HTMLInputElement;
  private loginFeedback: HTMLElement;

  private formVerify: HTMLFormElement;
  private inputCode: HTMLInputElement;
  private verifyEmail: HTMLElement;
  private verifyFeedback: HTMLElement;
  private btnResend: HTMLButtonElement;
  private btnChangeEmail: HTMLButtonElement;

  constructor(private router: Router, private onLoggedIn: () => void) {
    this.formLogin = document.getElementById('form-login') as HTMLFormElement;
    this.inputEmail = document.getElementById('login-email') as HTMLInputElement;
    this.loginFeedback = document.getElementById('login-feedback') as HTMLElement;
    this.formVerify = document.getElementById('form-verify') as HTMLFormElement;
    this.inputCode = document.getElementById('verify-code') as HTMLInputElement;
    this.verifyEmail = document.getElementById('verify-email') as HTMLElement;
    this.verifyFeedback = document.getElementById('verify-feedback') as HTMLElement;
    this.btnResend = document.getElementById('btn-resend-code') as HTMLButtonElement;
    this.btnChangeEmail = document.getElementById('btn-change-email') as HTMLButtonElement;

    this.initEvents();
  }

  /**
   * Affiche l'étape de connexion adaptée : saisie du code si une demande est en cours, sinon saisie de l'email.
   */
  async show(message?: string): Promise<void> {
    const pendingEmail = await AuthService.getPendingEmail();
    if (pendingEmail) {
      this.showVerify(pendingEmail);
      if (message) setFeedback(this.verifyFeedback, message, 'error');
    } else {
      this.router.navigate('login');
      this.inputEmail.focus();
      if (message) setFeedback(this.loginFeedback, message, 'error');
    }
  }

  private showVerify(email: string): void {
    this.verifyEmail.textContent = email;
    this.router.navigate('verify');
    this.inputCode.focus();
  }

  private initEvents(): void {
    this.formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      setFeedback(this.loginFeedback);
      const submit = this.formLogin.querySelector<HTMLButtonElement>('button[type="submit"]');

      setBusy(submit, true);
      try {
        await AuthService.requestCode(this.inputEmail.value);
        setFeedback(this.verifyFeedback);
        this.inputCode.value = '';
        this.showVerify(AuthService.normalizeEmail(this.inputEmail.value));
      } catch (err: unknown) {
        setFeedback(this.loginFeedback, (err as Error).message, 'error');
      } finally {
        setBusy(submit, false);
      }
    });

    this.formVerify.addEventListener('submit', async (e) => {
      e.preventDefault();
      setFeedback(this.verifyFeedback);
      const submit = this.formVerify.querySelector<HTMLButtonElement>('button[type="submit"]');

      setBusy(submit, true);
      try {
        await AuthService.confirmCode(this.inputCode.value);
        this.inputCode.value = '';
        this.onLoggedIn();
      } catch (err: unknown) {
        setFeedback(this.verifyFeedback, (err as Error).message, 'error');
      } finally {
        setBusy(submit, false);
      }
    });

    this.btnResend.addEventListener('click', async () => {
      setFeedback(this.verifyFeedback);
      const email = this.verifyEmail.textContent ?? '';

      setBusy(this.btnResend, true);
      try {
        await AuthService.requestCode(email);
        this.inputCode.value = '';
        setFeedback(this.verifyFeedback, 'Un nouveau code vous a été envoyé.', 'success');
      } catch (err: unknown) {
        setFeedback(this.verifyFeedback, (err as Error).message, 'error');
      } finally {
        setBusy(this.btnResend, false);
      }
    });

    this.btnChangeEmail.addEventListener('click', async () => {
      await AuthService.cancelLogin();
      setFeedback(this.verifyFeedback);
      this.inputCode.value = '';
      this.router.navigate('login');
      this.inputEmail.focus();
    });
  }
}
