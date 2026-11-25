/* A category as sent by GET /categories, with its sub-categories (Econoris API, CategoriesTreeSchema) */
export interface CategoryDto {
  id: number;
  /* Stable identifier: unlike the label, it never changes */
  code: string;
  label: string;
  /* null for a main category */
  parent_id: number | null;
  /* Words that find the category in a search although its label does not contain them ("essence" for "Carburant") */
  search_keywords: string[];
  children: CategoryDto[];
}

/* The categories kept in the storage of the extension, so that the popup shows them at once */
export interface CategoriesCache {
  categories: CategoryDto[];
  fetchedAt: number;
}
