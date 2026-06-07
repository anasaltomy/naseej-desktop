import { WarehouseItem } from "../types/Warehouses.types";

class WarehousesController {
  static async getAll(): Promise<WarehouseItem[]> {
    try {
      const data = await window.api?.warehouses.getAll();
      return (data ?? []).map((w) => ({
        id: w.id,
        name: w.name,
        location: w.location,
        address: w.address,
        phone: w.phone,
        productCount: w.productCount,
      }));
    } catch (err) {
      console.error("Error fetching warehouses:", err);
      return [];
    }
  }

  static async create(
    formData: Omit<WarehouseItem, "id" | "productCount">,
  ): Promise<void> {
    await window.api?.warehouses.create(formData);
  }

  static async update(
    id: string,
    updates: Partial<Omit<WarehouseItem, "id" | "productCount">>,
  ): Promise<void> {
    await window.api?.warehouses.update({ id, ...updates });
  }

  static async delete(id: string): Promise<void> {
    await window.api?.warehouses.delete(id);
  }
}

export default WarehousesController;
