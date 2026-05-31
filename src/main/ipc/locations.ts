import { ipcMain } from "electron";
import { getDb } from "../db/database";

type Row = Record<string, unknown>;

/** IPC handlers for locations (warehouses / branches). */
export function registerLocationHandlers(): void {
  const db = () => getDb();

  ipcMain.handle("locations:getAll", () => {
    const locs = db().prepare("SELECT * FROM locations ORDER BY name").all() as Row[];
    // Include product count per location (number of distinct variants with stock)
    const counts = db().prepare(
      "SELECT location_id, COUNT(DISTINCT variant_id) AS product_count FROM inventory_levels WHERE qty > 0 GROUP BY location_id"
    ).all() as Row[];
    const countMap: Record<string, number> = {};
    for (const c of counts) countMap[c.location_id as string] = c.product_count as number;
    return locs.map((l) => ({
      id: l.id,
      name: l.name,
      location: l.city ?? "",
      address: l.address ?? "",
      phone: l.phone ?? "",
      productCount: countMap[l.id as string] ?? 0,
    }));
  });

  ipcMain.handle("locations:create", (_event, data: { name: string; city?: string; address?: string; phone?: string }) => {
    const id = `loc-${Date.now()}`;
    db().prepare("INSERT INTO locations (id, name, city, address, phone) VALUES (?, ?, ?, ?, ?)").run(id, data.name, data.city ?? null, data.address ?? null, data.phone ?? null);
    return { id };
  });

  ipcMain.handle("locations:update", (_event, { id, ...data }: { id: string; name?: string; city?: string; address?: string; phone?: string }) => {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (data.name !== undefined)    { fields.push("name = ?");    values.push(data.name);    }
    if (data.city !== undefined)    { fields.push("city = ?");    values.push(data.city);    }
    if (data.address !== undefined) { fields.push("address = ?"); values.push(data.address); }
    if (data.phone !== undefined)   { fields.push("phone = ?");   values.push(data.phone);   }
    if (fields.length === 0) return;
    values.push(id);
    db().prepare(`UPDATE locations SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  });

  ipcMain.handle("locations:delete", (_event, id: string) => {
    db().prepare("DELETE FROM locations WHERE id = ?").run(id);
  });
}
