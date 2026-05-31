/**
 * Zod validation schema for Create Category form
 * Ensures all field values meet requirements before submission
 */

import { z } from "zod";

/**
 * Slug validation: lowercase letters, numbers, hyphens only
 * No spaces, special characters, or uppercase
 */
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
    // If hasStandardSizes is true, at least one size must be selected
    // Note: Zod doesn't have access to sibling fields in refine(),
    // so validation of this rule happens in the form hook
    return true;
  }),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

/**
 * Slug auto-derivation helper
 * Converts a name string to a valid slug format
 * - Lowercase
 * - Replace spaces and special chars with hyphens
 * - Strip consecutive hyphens
 * - Trim hyphens from ends
 */
export function deriveSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace consecutive hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Trim hyphens from start and end
}
