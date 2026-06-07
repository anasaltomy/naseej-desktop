import type { SavedProductResult } from "./Product.types";
import type { Variant } from "./Variants.types"; 

export type BarcodeLabel = {
  variantId: string;
  sku: string;
  barcode: string;
  colorName: string;
  sizeName: string;
  productName: string;
  modelNumber: string;
};

export type BarcodeScreenProps = {
  preloadedProduct?: SavedProductResult | null;
  autoOpenPrintPreview?: boolean;
};

export type VariantRow = Variant & {
  checked: boolean;
  printQty: number;
};
