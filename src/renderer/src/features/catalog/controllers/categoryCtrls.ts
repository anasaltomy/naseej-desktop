import type {
  Category,
  CreateCategoryFormState,
} from "../types/Variants.types";

class CategoriesController {
  static async getAll(): Promise<Category[]> {
    try {
      const data = await window.api?.categories.getAll();
      return (data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        parentId: c.parentId,
        hasStandardSizes: c.hasStandardSizes,
        standardSizes: c.standardSizes,
        createdAt: c.createdAt,
      }));
    } catch (err) {
      console.error("Error fetching categories:", err);
      return [];
    }
  }

  static async create(formData: CreateCategoryFormState): Promise<void> {
    await window.api?.categories.create(formData);
  }

  static async update(
    id: string,
    updates: Partial<Omit<CreateCategoryFormState, "id" | "createdAt">>,
  ): Promise<void> {
    await window.api?.categories.update({ id, ...updates });
  }

  static async delete(id: string): Promise<void> {
    await window.api?.categories.delete(id);
  }
}

export default CategoriesController;
