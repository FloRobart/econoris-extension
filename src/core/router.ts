export type ViewId = 'operation' | 'login' | 'verify';

export class Router {
  private views: Record<ViewId, HTMLElement>;

  constructor() {
    this.views = {
      operation: document.getElementById('view-operation') as HTMLElement,
      login: document.getElementById('view-login') as HTMLElement,
      verify: document.getElementById('view-verify') as HTMLElement
    };
  }

  navigate(view: ViewId): void {
    Object.values(this.views).forEach(el => el.classList.add('hidden'));
    this.views[view].classList.remove('hidden');
  }
}