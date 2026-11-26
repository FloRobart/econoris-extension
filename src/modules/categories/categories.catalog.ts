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
   * When nothing matches, the search tolerates typos: "esence" still finds "Carburant et recharge".
   */
  search(query: string): CategoryDto[] {
    const normalizedQuery = normalizeForSearch(query);
    if (!normalizedQuery) return [];

    const queryWords = normalizedQuery.split(' ');
    const exactMatches = this.rankedCategories(searchEntry => rankOf(searchEntry, normalizedQuery, queryWords));
    if (exactMatches.length > 0) return exactMatches;

    /* Only as a fallback: with typos allowed, a correct query would also bring many unrelated categories */
    return this.rankedCategories(searchEntry => typoRankOf(searchEntry, queryWords));
  }

  /**
   * The categories that get a rank, the best rank first, in display order for a same rank.
   */
  private rankedCategories(rankOfEntry: (searchEntry: CategorySearchEntry) => number | null): CategoryDto[] {
    const matches: { category: CategoryDto; rank: number; displayOrder: number }[] = [];

    this.searchEntries.forEach((searchEntry, displayOrder) => {
      const rank = rankOfEntry(searchEntry);
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

/**
 * The rank of a category for a query with typos, or null if it does not match.
 * The fewer typos the better and, for a same number of typos, the labels that start with the first word of the query
 * come first, as in the search without typos: "logment" finds "Logement" before "Épargne logement".
 */
function typoRankOf(searchEntry: CategorySearchEntry, queryWords: string[]): number | null {
  const typoCount = typoCountOf(searchEntry, queryWords);
  if (typoCount === null) return null;

  const firstQueryWord = queryWords[0];
  const firstLabelWord = searchEntry.normalizedLabel.split(' ')[0];
  const labelStartsWithQuery = prefixEditDistance(firstQueryWord, firstLabelWord) <= allowedTypoCountOf(firstQueryWord);

  /* Two ranks per typo count: one more typo always ranks lower, whatever the label starts with */
  return typoCount * 2 + (labelStartsWithQuery ? 0 : 1);
}

/**
 * The number of typos to fix so that every word of the query starts a word of the category or of its parent,
 * or null if a word of the query needs more typo fixes than its length allows.
 */
function typoCountOf(searchEntry: CategorySearchEntry, queryWords: string[]): number | null {
  const categoryWords = [...searchEntry.ownWords, ...searchEntry.parentWords];
  let typoCount = 0;

  for (const queryWord of queryWords) {
    const wordTypoCount = Math.min(queryWord.length, ...categoryWords.map(word => prefixEditDistance(queryWord, word)));
    if (wordTypoCount > allowedTypoCountOf(queryWord)) return null;
    typoCount += wordTypoCount;
  }

  return typoCount;
}

/**
 * How many typos a query word may contain: none in a short word, where one typo already makes another word.
 */
export function allowedTypoCountOf(queryWord: string): number {
  if (queryWord.length < 4) return 0;
  if (queryWord.length < 8) return 1;
  return 2;
}

/**
 * The Damerau-Levenshtein distance (optimal string alignment) between a query word and the closest beginning of a word:
 * the fewest inserted, deleted, replaced or swapped letters that turn the query word into a beginning of the word.
 * "esence" is 1 typo away from "essence", "lyoer" 1 typo away from "loyer", "carbu" 0 typo away from "carburant".
 */
export function prefixEditDistance(queryWord: string, word: string): number {
  /* distances[i][j]: distance between the first i letters of the query word and the first j letters of the word */
  const distances: number[][] = [];
  for (let i = 0; i <= queryWord.length; i++) {
    distances.push([i]);
  }
  for (let j = 1; j <= word.length; j++) {
    distances[0].push(j);
  }

  for (let i = 1; i <= queryWord.length; i++) {
    for (let j = 1; j <= word.length; j++) {
      distances[i][j] = editDistanceStep(distances, queryWord, word, i, j);
    }
  }

  /* Any beginning of the word will do: the user may not have typed the whole word yet */
  return Math.min(...distances[queryWord.length]);
}

/**
 * The distance between the first i letters of the query word and the first j letters of the word,
 * from the distances of the shorter beginnings.
 */
function editDistanceStep(distances: number[][], queryWord: string, word: string, i: number, j: number): number {
  const replacementCost = queryWord[i - 1] === word[j - 1] ? 0 : 1;
  const bestDistance = Math.min(
    distances[i - 1][j] + 1,
    distances[i][j - 1] + 1,
    distances[i - 1][j - 1] + replacementCost
  );

  const isSwappedPair = i > 1 && j > 1 && queryWord[i - 1] === word[j - 2] && queryWord[i - 2] === word[j - 1];
  if (!isSwappedPair) return bestDistance;

  return Math.min(bestDistance, distances[i - 2][j - 2] + 1);
}

function searchWordsOf(text: string): string[] {
  const normalizedText = normalizeForSearch(text);
  return normalizedText ? normalizedText.split(' ') : [];
}
