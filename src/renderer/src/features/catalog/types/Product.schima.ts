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

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(60, "Category name must be 60 characters or less")
    .trim(),

  slug: z
    .string()
    .min(1, "Slug is required")
    .max(60, "Slug must be 60 characters or less")
    .regex(
      slugRegex,
      "Slug must contain only lowercase letters, numbers, and hyphens",
    ),

  parentId: z.string().nullable(),

  hasStandardSizes: z.boolean(),

  selectedSizes: z.set(z.string()).refine((sizes) => {
    return true;
  }),
});

export type CreateProductFormData = z.infer<typeof createProductSchema>;

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const deriveSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace consecutive hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Trim hyphens from start and end
};
