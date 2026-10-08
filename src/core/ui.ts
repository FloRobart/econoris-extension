export type FeedbackType = 'error' | 'success';

/**
 * Affiche (ou efface, sans message) un message sous un formulaire.
 */
export function setFeedback(el: HTMLElement, message = '', type?: FeedbackType): void {
  el.textContent = message;
  el.className = type ? `feedback-msg ${type}` : 'feedback-msg';
}

/**
 * Désactive un bouton pendant une requête pour éviter les doubles envois.
 */
export function setBusy(button: HTMLButtonElement | null, busy: boolean): void {
  if (!button) return;
  button.disabled = busy;
  button.setAttribute('aria-busy', String(busy));
}
