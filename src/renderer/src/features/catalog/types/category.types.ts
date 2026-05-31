/**
 * Category data types for Naseej POS
 * Categories can be root (no parent) or subcategories (with parent)
 */

export interface Size {
  /** Unique identifier for the size */
  id: string;
  /** Display name (e.g. "XS", "S", "M", "L", "XL", "XXL", "28", "30", "32", "One Size") */
  name: string;
}

export interface Category {
  /** Unique identifier */
  id: string;
  /** Category name */
  name: string;
  /** URL-friendly slug (auto-derived from name, editable) */
  slug: string;
  /** Parent category ID if this is a subcategory, null if root */
  parentId: string | null;
  /** Whether this category has standard sizes assigned */
  hasStandardSizes: boolean;
  /** Array of Size IDs that are standard for this category */
  standardSizes: Size[];
  /** ISO timestamp */
  createdAt: string;
}

/**
 * Form state for creating a new category
 * Includes all field values needed during creation flow
 */
export interface CreateCategoryFormState {
  name: string;
  slug: string;
  parentId: string | null;
  hasStandardSizes: boolean;
  selectedSizes: Set<string>;
}
