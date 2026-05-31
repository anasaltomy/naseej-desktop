import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  modelNumber: z.string().min(1, "Model number is required"),
  basePrice: z.number().min(0.01, "Price must be greater than 0"),
  brandId: z.string().min(1, "Brand is required"),
  categoryId: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  origin: z
    .array(z.enum(["website", "branch"]))
    .min(1, "Select at least one origin"),
});

export type CreateProductFormData = z.infer<typeof createProductSchema>;

export type Origin = "website" | "branch";

export interface SelectedColor {
  id: string;
  name: string;
  hexCode: string;
}

export interface SelectedSize {
  id: string;
  name: string;
}

export interface VariantQuantity {
  colorId: string;
  sizeId: string;
  quantity: number | null;
}

export interface SavedProductResult {
  id: string;
  name: string;
  modelNumber: string;
  variants: {
    id: string;
    colorName: string;
    colorHex: string;
    sizeName: string;
    quantity: number;
    price: number;
    sku: string;
    barcode: string;
  }[];
}
