import type { CategoryDto } from './categories.types';

/* Ranks of a search result, the lower the better: the same rules as the Econoris application */
const LABEL_STARTS_WITH_QUERY_RANK = 0;
const OWN_WORDS_MATCH_QUERY_RANK = 1;
const PARENT_WORDS_MATCH_QUERY_RANK = 2;

/* The words of a category that a search compares with the query, normalized once for every search */
interface CategorySearchEntry {
  category: CategoryDto;
  normalizedLabel: string;
  ownWords: string[];
  parentWords: string[];
}

/**
 * Normalizes a text for a search that ignores the case and the accents.
 * The words are separated by single spaces: "Taxe d'Habitation" becomes "taxe d habitation".
 */
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Every category: finds a category by its id, and searches the categories by text.
 */
export class CategoryCatalog {
  private readonly categoriesById = new Map<number, CategoryDto>();
  /* In display order: each category comes right before its sub-categories */
  private readonly searchEntries: CategorySearchEntry[] = [];

  constructor(readonly mainCategories: readonly CategoryDto[]) {
    mainCategories.forEach(mainCategory => this.register(mainCategory, null));
  }

  findById(categoryId: number): CategoryDto | null {
    return this.categoriesById.get(categoryId) ?? null;
  }

  findParent(category: CategoryDto): CategoryDto | null {
    return category.parent_id === null ? null : this.findById(category.parent_id);
  }

  /**
   * The label of a category, after the label of its parent: "Logement › Loyer".
   */
  fullLabelOf(category: CategoryDto): string {
    const parent = this.findParent(category);
    return parent ? `${parent.label} › ${category.label}` : category.label;
  }

  /**
   * Searches the categories that match every word of the query, ignoring the case and the accents.
   * A word matches the beginning of a word of the label, of a search keyword, or of the label of the parent:
   * "logement" finds "Logement" then all its sub-categories, "essence" finds "Carburant et recharge".
   * The labels that start with the query come first, then the other own matches, then the matches through the parent.
   */
  search(query: string): CategoryDto[] {
    const normalizedQuery = normalizeForSearch(query);
    if (!normalizedQuery) return [];

    const queryWords = normalizedQuery.split(' ');
    const matches: { category: CategoryDto; rank: number; displayOrder: number }[] = [];

    this.searchEntries.forEach((searchEntry, displayOrder) => {
      const rank = rankOf(searchEntry, normalizedQuery, queryWords);
      if (rank === null) return;
      matches.push({ category: searchEntry.category, rank, displayOrder });
    });

    matches.sort((first, second) => first.rank - second.rank || first.displayOrder - second.displayOrder);
    return matches.map(match => match.category);
  }

  /**
   * Registers a category and its sub-categories, at any depth.
   */
  private register(category: CategoryDto, parent: CategoryDto | null): void {
    this.categoriesById.set(category.id, category);
    this.searchEntries.push({
      category,
      normalizedLabel: normalizeForSearch(category.label),
      ownWords: [category.label, ...category.search_keywords].flatMap(searchWordsOf),
      parentWords: parent ? searchWordsOf(parent.label) : []
    });

    category.children.forEach(subCategory => this.register(subCategory, category));
  }
}

/**
 * The rank of a category for a query, or null if it does not match.
 */
function rankOf(searchEntry: CategorySearchEntry, normalizedQuery: string, queryWords: string[]): number | null {
  if (searchEntry.normalizedLabel.startsWith(normalizedQuery)) return LABEL_STARTS_WITH_QUERY_RANK;

  const matchesOwnWord = (queryWord: string) => startsAWord(searchEntry.ownWords, queryWord);
  if (queryWords.every(matchesOwnWord)) return OWN_WORDS_MATCH_QUERY_RANK;

  const matchesAnyWord = (queryWord: string) => matchesOwnWord(queryWord) || startsAWord(searchEntry.parentWords, queryWord);
  if (queryWords.every(matchesAnyWord)) return PARENT_WORDS_MATCH_QUERY_RANK;

  return null;
}

function startsAWord(words: string[], queryWord: string): boolean {
  return words.some(word => word.startsWith(queryWord));
}

function searchWordsOf(text: string): string[] {
  const normalizedText = normalizeForSearch(text);
  return normalizedText ? normalizedText.split(' ') : [];
}
