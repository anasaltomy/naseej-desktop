import { ipcMain } from "electron";
import { getDb } from "../db/database";

type Row = Record<string, unknown>;

/** IPC handlers for inventory (variant stock per location). */
export function registerInventoryHandlers(): void {
  const db = () => getDb();

  // Returns all inventory items: each variant with all its location stock levels
  ipcMain.handle("inventory:getAll", () => {
    const variants = db().prepare(
      `SELECT pv.*, p.name AS product_name, p.brand_id, p.category_id
       FROM product_variants pv
       JOIN products p ON p.id = pv.product_id
       ORDER BY p.name, pv.size`
    ).all() as Row[];

    const levels = db().prepare(
      "SELECT il.*, l.name AS location_name FROM inventory_levels il JOIN locations l ON l.id = il.location_id"
    ).all() as Row[];

    return variants.map((v) => ({
      variantId: v.id,
      productId: v.product_id,
      productName: v.product_name,
      brandId: v.brand_id ?? undefined,
      categoryId: v.category_id ?? undefined,
      sku: v.sku,
      barcode: v.barcode ?? "",
      size: v.size,
      color: v.color,
      colorHex: v.color_hex,
      price: v.price,
      locations: levels
        .filter((l) => l.variant_id === v.id)
        .map((l) => ({
          locationId: l.location_id,
          locationName: l.location_name,
          qty: l.qty,
          lowStockThreshold: l.low_stock_threshold,
        })),
    }));
  });

  // Get stock for a specific variant across all locations
  ipcMain.handle("inventory:getByVariant", (_event, variantId: string) => {
    return db().prepare(
      "SELECT il.*, l.name AS location_name FROM inventory_levels il JOIN locations l ON l.id = il.location_id WHERE il.variant_id = ?"
    ).all(variantId) as Row[];
  });

  // Adjust stock by delta at a specific location
  ipcMain.handle("inventory:adjust", (_event, { variantId, locationId, delta }: { variantId: string; locationId: string; delta: number }) => {
    db().prepare(
      "UPDATE inventory_levels SET qty = MAX(0, qty + ?) WHERE variant_id = ? AND location_id = ?"
    ).run(delta, variantId, locationId);
  });

  // Set stock to an absolute quantity (for physical count reconciliation)
  ipcMain.handle("inventory:setQty", (_event, { variantId, locationId, qty }: { variantId: string; locationId: string; qty: number }) => {
    db().prepare(
      "UPDATE inventory_levels SET qty = MAX(0, ?) WHERE variant_id = ? AND location_id = ?"
    ).run(qty, variantId, locationId);
  });

  // Add a new inventory_levels row for a variant at a location
  ipcMain.handle("inventory:addLocation", (_event, { variantId, locationId, qty }: { variantId: string; locationId: string; qty: number }) => {
    const id = `il-${Date.now()}`;
    db().prepare(
      "INSERT OR IGNORE INTO inventory_levels (id, variant_id, location_id, qty) VALUES (?, ?, ?, ?)"
    ).run(id, variantId, locationId, qty);
  });
}
