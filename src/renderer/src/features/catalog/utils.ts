// Product-related utility functions
import type { InventoryItem } from "@/features/catalog/types/Product.types";

export const getTotalQty = (item: InventoryItem) =>
  item.locations.reduce((sum, loc) => sum + loc.qty, 0);

export const isLowStock = (item: InventoryItem) =>
  item.locations.some((loc) => loc.qty > 0 && loc.qty <= loc.lowStockThreshold);

export const isOutOfStock = (item: InventoryItem) =>
  item.locations.every((loc) => loc.qty === 0);

// _──────────────────────────────────────────────────────────────────────────────

// General utilities for inventory management

export function simulateAsync<T>(data: T, delayMs = 800): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delayMs);
  });
}

export function generateBarcode(modelNumber: string, index: number): string {
  return `NSJ-${modelNumber}-${String(index).padStart(3, "0")}`;
}

export function generateSku(
  modelNumber: string,
  colorName: string,
  sizeName: string,
): string {
  const colorCode = colorName.substring(0, 3).toUpperCase();
  const sizeCode = sizeName.toUpperCase();
  return `${modelNumber}-${colorCode}-${sizeCode}`;
}

export function generateId(): string {
  return crypto.randomUUID();
}
