import { CONFIG } from '../../config/config';
import { ext } from '../../core/browser';
import { DataApiClient } from '../../core/data.api';
import { ApiError } from '../../core/http';
import type { CategoriesCache, CategoryDto } from './categories.types';

export class CategoriesService {
  /**
   * Gets the main categories with their sub-categories: from the cache while it is recent, otherwise from the API.
   * When the API cannot be reached, an older cache is used rather than no category at all.
   */
  static async getCategories(): Promise<CategoryDto[]> {
    const cache = await CategoriesService.readCache();
    if (cache && Date.now() - cache.fetchedAt < CONFIG.CATEGORIES_CACHE_TTL_MS) {
      return cache.categories;
    }

    try {
      const categories = await CategoriesService.fetchCategories();
      const newCache: CategoriesCache = { categories, fetchedAt: Date.now() };
      await ext.storage.local.set({ [CONFIG.CATEGORIES_CACHE_STORAGE_KEY]: newCache });
      return categories;
    } catch (err) {
      /* An expired session must reach the view, which asks the user to sign in again */
      const isSessionExpired = err instanceof ApiError && err.isUnauthorized;
      if (!cache || isSessionExpired) throw err;
      return cache.categories;
    }
  }

  /**
   * The ids of the categories chosen last, the most recent first.
   */
  static async getRecentCategoryIds(): Promise<number[]> {
    const data = await ext.storage.local.get(CONFIG.RECENT_CATEGORIES_STORAGE_KEY);
    const recentCategoryIds: unknown = data[CONFIG.RECENT_CATEGORIES_STORAGE_KEY];

    if (!Array.isArray(recentCategoryIds)) return [];
    return recentCategoryIds.filter((categoryId): categoryId is number => typeof categoryId === 'number');
  }

  /**
   * Remembers a category chosen for an operation, so that it is suggested first next time.
   * @returns The ids of the categories chosen last, the most recent first
   */
  static async rememberChosenCategory(categoryId: number): Promise<number[]> {
    const recentCategoryIds = await CategoriesService.getRecentCategoryIds();
    const updatedRecentCategoryIds = [categoryId, ...recentCategoryIds.filter(recentId => recentId !== categoryId)]
      .slice(0, CONFIG.RECENT_CATEGORIES_COUNT);

    await ext.storage.local.set({ [CONFIG.RECENT_CATEGORIES_STORAGE_KEY]: updatedRecentCategoryIds });
    return updatedRecentCategoryIds;
  }

  private static async fetchCategories(): Promise<CategoryDto[]> {
    /* 204 No Content, without body, when the server has no category */
    const categories = await DataApiClient.request<CategoryDto[] | undefined>('/categories', { authenticated: true });
    return categories ?? [];
  }

  private static async readCache(): Promise<CategoriesCache | null> {
    const data = await ext.storage.local.get(CONFIG.CATEGORIES_CACHE_STORAGE_KEY);
    const cache = data[CONFIG.CATEGORIES_CACHE_STORAGE_KEY] as Partial<CategoriesCache> | undefined;

    const isValidCache = Array.isArray(cache?.categories) && typeof cache?.fetchedAt === 'number';
    return isValidCache ? cache as CategoriesCache : null;
  }
}
