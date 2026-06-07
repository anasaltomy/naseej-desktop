import type { InventoryItem } from "@/features/catalog/types/Product.types";

class ProductController {
  // ── Inventory ──────────────────────────────────────────────────────────────
  static async getInventory(): Promise<InventoryItem[]> {
    try {
      const data = await window.api?.inventory.getAll();
      return (data as InventoryItem[]) ?? [];
    } catch (error) {
      console.error("Error fetching inventory:", error);
      return [];
    }
  }

  // ── Products ───────────────────────────────────────────────────────────────
  static async getProductById(id: string) {
    try {
      return (await window.api?.products.getById(id)) ?? null;
    } catch (error) {
      console.error(`Error fetching product ${id}:`, error);
      return null;
    }
  }

  // ── Delete Products ───────────────────────────────────────────────────────────────

  static async deleteProduct(id: string): Promise<boolean> {
    try {
      await window.api?.products.delete(id);
      return true;
    } catch (error) {
      console.error(`Error deleting product ${id}:`, error);
      return false;
    }
  }

  // ── Categories ─────────────────────────────────────────────────────────────

  static async getCategories(): Promise<{ id: string; name: string }[]> {
    try {
      const data = await window.api?.categories.getAll();
      return (data ?? []).map((c) => ({ id: c.id, name: c.name }));
    } catch (error) {
      console.error("Error fetching categories:", error);
      return [];
    }
  }

  // ── Brands ───────────────────────────────────────────────────────────────

  static async getBrands(): Promise<{ id: string; name: string }[]> {
    try {
      const data = await window.api?.brands.getAll();
      return (data ?? []).map((b) => ({ id: b.id, name: b.name }));
    } catch (error) {
      console.error("Error fetching brands:", error);
      return [];
    }
  }
}

export default ProductController;
