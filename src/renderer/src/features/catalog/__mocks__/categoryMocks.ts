/**
 * Category mock data for development and testing
 * Includes varied categories (root and subcategories) and size presets
 */

import type { Category, Size } from "../types/Variants.types";

/**
 * Mock sizes - at least 12 varied sizes for different product types
 */
export const mockSizes: Size[] = [
  { id: "size-xs", name: "XS" },
  { id: "size-s", name: "S" },
  { id: "size-m", name: "M" },
  { id: "size-l", name: "L" },
  { id: "size-xl", name: "XL" },
  { id: "size-xxl", name: "XXL" },
  { id: "size-28", name: "28" },
  { id: "size-30", name: "30" },
  { id: "size-32", name: "32" },
  { id: "size-34", name: "34" },
  { id: "size-36", name: "36" },
  { id: "size-onesize", name: "One Size" },
];

/**
 * Mock categories - at least 8 categories with varied hierarchy and standard sizes
 * Some are root categories, some are subcategories with parentId set
 */
export const mockCategories: Category[] = [
  {
    id: "cat-mens",
    name: "Men",
    slug: "men",
    parentId: null,
    hasStandardSizes: true,
    standardSizes: [
      mockSizes[1], // S
      mockSizes[2], // M
      mockSizes[3], // L
      mockSizes[4], // XL
      mockSizes[5], // XXL
    ],
    createdAt: new Date("2024-01-01").toISOString(),
  },
  {
    id: "cat-womens",
    name: "Women",
    slug: "women",
    parentId: null,
    hasStandardSizes: true,
    standardSizes: [
      mockSizes[0], // XS
      mockSizes[1], // S
      mockSizes[2], // M
      mockSizes[3], // L
      mockSizes[4], // XL
    ],
    createdAt: new Date("2024-01-01").toISOString(),
  },
  {
    id: "cat-shirts",
    name: "Shirts",
    slug: "shirts",
    parentId: "cat-mens",
    hasStandardSizes: false,
    standardSizes: [],
    createdAt: new Date("2024-01-05").toISOString(),
  },
  {
    id: "cat-pants",
    name: "Pants",
    slug: "pants",
    parentId: "cat-mens",
    hasStandardSizes: true,
    standardSizes: [
      mockSizes[6], // 28
      mockSizes[7], // 30
      mockSizes[8], // 32
      mockSizes[9], // 34
    ],
    createdAt: new Date("2024-01-05").toISOString(),
  },
  {
    id: "cat-dresses",
    name: "Dresses",
    slug: "dresses",
    parentId: "cat-womens",
    hasStandardSizes: false,
    standardSizes: [],
    createdAt: new Date("2024-01-06").toISOString(),
  },
  {
    id: "cat-accessories",
    name: "Accessories",
    slug: "accessories",
    parentId: null,
    hasStandardSizes: false,
    standardSizes: [],
    createdAt: new Date("2024-01-02").toISOString(),
  },
  {
    id: "cat-shoes",
    name: "Shoes",
    slug: "shoes",
    parentId: null,
    hasStandardSizes: true,
    standardSizes: [
      mockSizes[6], // 28
      mockSizes[7], // 30
      mockSizes[8], // 32
      mockSizes[9], // 34
      mockSizes[10], // 36
    ],
    createdAt: new Date("2024-01-03").toISOString(),
  },
  {
    id: "cat-outerwear",
    name: "Outerwear",
    slug: "outerwear",
    parentId: "cat-womens",
    hasStandardSizes: true,
    standardSizes: [
      mockSizes[1], // S
      mockSizes[2], // M
      mockSizes[3], // L
      mockSizes[4], // XL
    ],
    createdAt: new Date("2024-01-07").toISOString(),
  },
];

/**
 * Simulate async operation with delay
 * @template T The type of data to return
 * @param data The data to return after delay
 * @param ms Milliseconds to delay (default 800)
 * @returns Promise that resolves with the data
 */
export function simulateAsync<T>(data: T, ms: number = 800): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(data);
    }, ms);
  });
}
