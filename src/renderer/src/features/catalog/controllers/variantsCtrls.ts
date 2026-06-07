import { DbColor, DbSize } from "../types/Variants.types";

class VariantsController {
  // ── Sizes ──────────────────────────────────────────────────────────────
  static async getSizes() {
    try {
      const data = await window.api?.sizes.getAll();
      return (data as DbSize[]) ?? [];
    } catch (err) {
      console.error("Error fetching Sizes:", err);
      return [];
    }
  }

  static async createSize(name: string) {
    try {
      await window.api?.sizes.create({ name });
    } catch (err) {
      console.error("Error creating Size:", err);
    }
  }

  static async deleteSize(id: string) {
    try {
      await window.api?.sizes.delete(id);
    } catch (err) {
      console.error("Error deleting Size:", err);
    }
  }

  // ── Colors ──────────────────────────────────────────────────────────────
  static async getColors() {
    try {
      const data = await window.api?.colors.getAll();
      return (data as unknown as DbColor[]) ?? [];
    } catch (err) {
      console.error("Error fetching Colors:", err);
      return [];
    }
  }

  static async createColor(name: string, hexCode: string) {
    try {
      await window.api?.colors.create({ name, hexCode });
    } catch (err) {
      console.error("Error creating Color:", err);
    }
  }

  static async deleteColor(id: string) {
    try {
      await window.api?.colors.delete(id);
    } catch (err) {
      console.error("Error deleting Color:", err);
    }
  }
}

export default VariantsController;
