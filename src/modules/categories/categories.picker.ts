import { CategoryCatalog } from './categories.catalog';
import type { CategoryDto } from './categories.types';

const SEARCH_PLACEHOLDER = 'Rechercher : courses, essence, Netflix…';

/**
 * Category field of the operation form: a text field that lists the matching categories while the user types.
 * Without search, it lists the categories chosen last, then every category grouped by main category,
 * a main category being a choice too. It follows the ARIA combobox pattern:
 * the arrows move in the list, Enter chooses, Escape closes.
 */
export class CategoryPicker {
  private catalog = new CategoryCatalog([]);
  private recentCategoryIds: number[] = [];
  private selectedCategory: CategoryDto | null = null;

  /* The categories shown in the list, in order: the index of an option in the list */
  private listedCategories: CategoryDto[] = [];
  private activeIndex = -1;

  constructor(private readonly input: HTMLInputElement, private readonly list: HTMLUListElement) {
    this.initEvents();
  }

  get selectedCategoryId(): number | null {
    return this.selectedCategory?.id ?? null;
  }

  setCategories(categories: CategoryDto[], recentCategoryIds: number[]): void {
    this.catalog = new CategoryCatalog(categories);
    this.recentCategoryIds = recentCategoryIds;
    this.input.disabled = false;
    this.input.placeholder = SEARCH_PLACEHOLDER;
  }

  setRecentCategoryIds(recentCategoryIds: number[]): void {
    this.recentCategoryIds = recentCategoryIds;
  }

  /**
   * Disables the field while the categories load, or when they cannot be loaded.
   */
  setUnavailable(message: string): void {
    this.close();
    this.input.disabled = true;
    this.input.placeholder = message;
  }

  clear(): void {
    this.selectedCategory = null;
    this.input.value = '';
    this.close();
  }

  /**
   * Says in the field that a category of the list must be chosen: a typed text is not a category.
   */
  reportMissingCategory(): void {
    this.input.setCustomValidity('Choisissez une catégorie dans la liste.');
    this.input.reportValidity();
  }

  private initEvents(): void {
    this.input.addEventListener('focus', () => {
      /* Typing then replaces the chosen category instead of being added after it */
      this.input.select();
      this.open();
    });
    this.input.addEventListener('click', () => this.open());
    this.input.addEventListener('input', () => {
      this.selectedCategory = null;
      this.open();
    });
    this.input.addEventListener('keydown', (event) => this.onKeyDown(event));
    this.input.addEventListener('blur', () => this.close());

    /* Keeps the focus in the field, so that the click on an option is not lost by a blur */
    this.list.addEventListener('mousedown', (event) => event.preventDefault());
    this.list.addEventListener('click', (event) => this.onListClick(event));
  }

  private onKeyDown(event: KeyboardEvent): void {
    const isOpen = this.input.getAttribute('aria-expanded') === 'true';

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) this.open();
      this.moveActiveOption(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (event.key === 'Enter' && isOpen) {
      /* Chooses in the list instead of sending the form */
      event.preventDefault();
      this.chooseActiveOption();
      return;
    }

    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      this.close();
      this.showSelectedCategory();
    }
  }

  private onListClick(event: MouseEvent): void {
    const option = (event.target as HTMLElement).closest<HTMLElement>('[role="option"]');
    if (!option) return;

    const category = this.listedCategories[Number(option.dataset.index)];
    if (category) this.choose(category);
  }

  /**
   * Enter chooses the highlighted option, or else the best search result.
   */
  private chooseActiveOption(): void {
    const isSearching = this.selectedCategory === null && this.input.value.trim() !== '';
    const fallbackIndex = isSearching ? 0 : -1;
    const category = this.listedCategories[this.activeIndex >= 0 ? this.activeIndex : fallbackIndex];

    if (category) this.choose(category);
  }

  private choose(category: CategoryDto): void {
    this.selectedCategory = category;
    this.input.setCustomValidity('');
    this.showSelectedCategory();
    this.close();
  }

  private showSelectedCategory(): void {
    if (!this.selectedCategory) return;
    this.input.value = this.catalog.fullLabelOf(this.selectedCategory);
  }

  private open(): void {
    if (this.input.disabled) return;

    this.renderList();
    this.list.classList.remove('hidden');
    this.input.setAttribute('aria-expanded', 'true');
  }

  private close(): void {
    this.list.classList.add('hidden');
    this.input.setAttribute('aria-expanded', 'false');
    this.input.removeAttribute('aria-activedescendant');
    this.activeIndex = -1;
  }

  private moveActiveOption(step: number): void {
    if (this.listedCategories.length === 0) return;

    const optionsCount = this.listedCategories.length;
    this.activeIndex = (this.activeIndex + step + optionsCount) % optionsCount;

    this.list.querySelectorAll('[role="option"]').forEach((option, index) => {
      option.classList.toggle('active', index === this.activeIndex);
    });

    const activeOption = this.list.querySelector<HTMLElement>(`[data-index="${this.activeIndex}"]`);
    this.input.setAttribute('aria-activedescendant', activeOption?.id ?? '');
    activeOption?.scrollIntoView({ block: 'nearest' });
  }

  /**
   * Shows the search results while the user types, otherwise the recent categories then every category.
   */
  private renderList(): void {
    this.listedCategories = [];
    this.activeIndex = -1;

    const query = this.selectedCategory === null ? this.input.value.trim() : '';
    const items = query ? this.buildSearchItems(query) : this.buildBrowseItems();
    this.list.replaceChildren(...items);
  }

  private buildSearchItems(query: string): HTMLLIElement[] {
    const searchResults = this.catalog.search(query);
    if (searchResults.length === 0) {
      return [buildListMessage(`Aucune catégorie ne correspond à « ${query} ».`)];
    }

    return searchResults.map(category => {
      const parentLabel = this.catalog.findParent(category)?.label ?? 'Catégorie principale';
      return this.buildOption(category, 'category-result', parentLabel);
    });
  }

  private buildBrowseItems(): HTMLLIElement[] {
    const recentCategories = this.recentCategoryIds
      .map(categoryId => this.catalog.findById(categoryId))
      .filter((category): category is CategoryDto => category !== null);

    const items: HTMLLIElement[] = [];
    if (recentCategories.length > 0) {
      items.push(buildListGroupTitle('Utilisées récemment'));
      items.push(...recentCategories.map(category => this.buildOption(category, 'category-result', this.catalog.findParent(category)?.label)));
    }

    items.push(buildListGroupTitle('Toutes les catégories'));
    this.catalog.mainCategories.forEach(mainCategory => {
      items.push(this.buildOption(mainCategory, 'category-main'));
      items.push(...mainCategory.children.map(subCategory => this.buildOption(subCategory, 'category-sub')));
    });

    return items;
  }

  /**
   * Builds an option of the list. The texts are set with textContent: a label never becomes HTML.
   */
  private buildOption(category: CategoryDto, styleClass: string, parentLabel?: string): HTMLLIElement {
    const index = this.listedCategories.push(category) - 1;
    const isSelected = category.id === this.selectedCategory?.id;

    const option = document.createElement('li');
    option.id = `category-option-${index}`;
    option.dataset.index = String(index);
    option.setAttribute('role', 'option');
    option.setAttribute('aria-selected', String(isSelected));
    option.className = `category-option ${styleClass}`;

    const label = document.createElement('span');
    label.className = 'category-label';
    label.textContent = category.label;
    option.append(label);

    if (parentLabel) {
      const parent = document.createElement('span');
      parent.className = 'category-parent';
      parent.textContent = parentLabel;
      option.append(parent);
    }

    return option;
  }
}

function buildListGroupTitle(title: string): HTMLLIElement {
  const groupTitle = document.createElement('li');
  groupTitle.setAttribute('role', 'presentation');
  groupTitle.className = 'category-group';
  groupTitle.textContent = title;
  return groupTitle;
}

function buildListMessage(message: string): HTMLLIElement {
  const listMessage = document.createElement('li');
  listMessage.setAttribute('role', 'presentation');
  listMessage.className = 'category-empty';
  listMessage.textContent = message;
  return listMessage;
}
