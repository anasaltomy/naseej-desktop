export { default as CatalogSettingsPage } from "./screens/CatalogSettingsPage";
/**
 * Categories feature - create and manage product categories
 */

import InventoryPage from "./screens/InventoryPage";

export { CategoriesListPage } from "./screens/CategoriesListPage";
export { default as InventoryPage } from "./screens/InventoryPage";
export { default as BarcodeScreen } from "./screens/BarcodeScreen";

export { useCreateCategoryForm } from "./hooks/useCreateCategoryForm";
export {
  createCategorySchema,
  deriveSlug,
} from "./types/createCategory.schema";
export {
  mockCategories,
  mockSizes,
  simulateAsync,
} from "./__mocks__/categoryMocks";
export type {
  Category,
  Size,
  CreateCategoryFormState,
} from "./types/category.types";
