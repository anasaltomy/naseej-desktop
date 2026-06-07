import { Variant } from "./Variants.types";

export interface InventoryItem {
  variantId: string;
  productId: string;
  productName: string;
  brandId?: string;
  categoryId?: string;
  sku: string;
  barcode: string;
  size: string;
  color: string;
  colorHex: string;
  price: number;
  locations: InventoryLevel[];
}

export type GroupedProduct = {
  productId: string;
  productName: string;
  brandId?: string;
  categoryId?: string;
  variants: InventoryItem[];
};

export interface SavedProductResult {
  id: string;
  name: string;
  modelNumber: string;
  variants: Variant[];
}

export type Origin = "website" | "branch";

export interface InventoryLevel {
  locationId: string;
  locationName: string;
  qty: number;
  lowStockThreshold: number;
}

export type StockFilter = "all" | "in" | "low" | "out";

export type SortKey =
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc"
  | "stock-asc"
  | "stock-desc";

export type ViewMode = "variant" | "product";

export type EditProductPayload = {
  id: string;
  name: string;
  modelNumber: string;
  basePrice: number;
  brandId: string;
  categoryId: string;
  description: string;
};

export type DeleteTarget = { productId: string; productName: string };

export type StockAdjustTarget = {
  variantId: string;
  variantLabel: string;
  locations: { locationId: string; locationName: string; currentQty: number }[];
};
