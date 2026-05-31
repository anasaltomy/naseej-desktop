import { ipcMain } from "electron";
import { getDb } from "../db/database";
import { dialog } from "electron";
import { writeFileSync } from "fs";
import { readFileSync } from "fs";

type Row = Record<string, unknown>;

function rowsToVariants(rows: Row[]) {
  return rows.map((r) => ({
    id: r.id,
    productId: r.product_id,
    productName: r.product_name,
    sku: r.sku,
    barcode: (r.barcode as string) ?? "",
    size: r.size,
    color: r.color,
    colorHex: r.color_hex,
    price: r.price,
    compareAtPrice: r.compare_at_price ?? undefined,
    stockQty: (r.stock_qty as number) ?? 0,
    imageUrl: r.image_url ?? undefined,
  }));
}

/** IPC handlers for products and product variants. */
export function registerProductHandlers(): void {
  const db = () => getDb();

  // All products with their variants
  ipcMain.handle("products:getAll", () => {
    const products = db().prepare("SELECT p.*, b.name AS brand_name, c.name AS category_name FROM products p LEFT JOIN brands b ON b.id = p.brand_id LEFT JOIN categories c ON c.id = p.category_id ORDER BY p.name").all() as Row[];
    const variants = db().prepare(`
      SELECT pv.*, p.name AS product_name,
             (SELECT COALESCE(SUM(qty), 0) FROM inventory_levels WHERE variant_id = pv.id) AS stock_qty
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
    `).all() as Row[];
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      brand: p.brand_name ?? "",
      category: p.category_name ?? "",
      brandId: p.brand_id,
      categoryId: p.category_id,
      description: p.description ?? "",
      imageUrl: p.image_url ?? undefined,
      variants: rowsToVariants(variants.filter((v) => v.product_id === p.id)),
    }));
  });

  ipcMain.handle("products:getById", (_event, id: string) => {
    const p = db().prepare("SELECT p.*, b.name AS brand_name, c.name AS category_name FROM products p LEFT JOIN brands b ON b.id = p.brand_id LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?").get(id) as Row | undefined;
    if (!p) return null;
    const variants = db().prepare(`
      SELECT pv.*, p.name AS product_name,
             (SELECT COALESCE(SUM(qty), 0) FROM inventory_levels WHERE variant_id = pv.id) AS stock_qty
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE pv.product_id = ?
    `).all(id) as Row[];
    return { ...p, brand: p.brand_name ?? "", category: p.category_name ?? "", variants: rowsToVariants(variants) };
  });

  ipcMain.handle("products:create", (_event, data: {
    name: string; sku: string; barcode?: string; brandId?: string; categoryId?: string;
    description?: string; basePrice?: number;
    variants?: Array<{ colorId: string; sizeId: string; quantity: number; barcode?: string }>;
  }) => {
    const productId = `p-${Date.now()}`;
    const ts = Date.now();
    const create = db().transaction(() => {
      db().prepare(
        "INSERT INTO products (id, name, sku, barcode, brand_id, category_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(productId, data.name, data.sku, data.barcode ?? null, data.brandId ?? null, data.categoryId ?? null, data.description ?? null);

      if (data.variants?.length && data.basePrice != null) {
        const insertVariant = db().prepare(
          "INSERT INTO product_variants (id, product_id, sku, barcode, size, color, color_hex, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        const insertInventory = db().prepare(
          "INSERT OR IGNORE INTO inventory_levels (id, variant_id, location_id, qty) VALUES (?, ?, ?, ?)"
        );
        data.variants.forEach((v, idx) => {
          const color = db().prepare("SELECT name, hex_code FROM colors WHERE id = ?").get(v.colorId) as { name: string; hex_code: string } | undefined;
          const size = db().prepare("SELECT name FROM sizes WHERE id = ?").get(v.sizeId) as { name: string } | undefined;
          const colorName = color?.name ?? "Unknown";
          const colorHex = color?.hex_code ?? "#000000";
          const sizeName = size?.name ?? "Unknown";
          const variantSku = `${data.sku}-${sizeName.replace(/\s+/g, "").toUpperCase()}-${colorName.slice(0, 3).toUpperCase()}-${idx}`;
          const variantId = `v-${ts}-${idx}`;
          insertVariant.run(variantId, productId, variantSku, v.barcode ?? null, sizeName, colorName, colorHex, data.basePrice!);
          insertInventory.run(`il-${variantId}`, variantId, "loc1", v.quantity);
        });
      }
    });
    create();
    return { id: productId };
  });

  ipcMain.handle("products:update", (_event, { id, ...data }: { id: string; name?: string; sku?: string; barcode?: string; brandId?: string; categoryId?: string; description?: string }) => {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (data.name !== undefined)       { fields.push("name = ?");        values.push(data.name);        }
    if (data.sku !== undefined)        { fields.push("sku = ?");         values.push(data.sku);         }
    if (data.barcode !== undefined)    { fields.push("barcode = ?");     values.push(data.barcode);     }
    if (data.brandId !== undefined)    { fields.push("brand_id = ?");    values.push(data.brandId);     }
    if (data.categoryId !== undefined) { fields.push("category_id = ?"); values.push(data.categoryId); }
    if (data.description !== undefined){ fields.push("description = ?"); values.push(data.description); }
    if (fields.length === 0) return;
    values.push(id);
    db().prepare(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  });

  ipcMain.handle("products:delete", (_event, id: string) => {
    db().prepare("DELETE FROM products WHERE id = ?").run(id);
  });

  // Variants —————————————————————————————————

  ipcMain.handle("variants:getAll", () => {
    const rows = db().prepare(`
      SELECT pv.*, p.name AS product_name,
             COALESCE(SUM(il.qty), 0) AS stock_qty
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      LEFT JOIN inventory_levels il ON il.variant_id = pv.id
      GROUP BY pv.id
      ORDER BY p.name, pv.size
    `).all() as Row[];
    return rowsToVariants(rows);
  });

  ipcMain.handle("variants:getByBarcode", (_event, barcode: string) => {
    const row = db().prepare(`
      SELECT pv.*, p.name AS product_name,
             COALESCE(SUM(il.qty), 0) AS stock_qty
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      LEFT JOIN inventory_levels il ON il.variant_id = pv.id
      WHERE pv.barcode = ? OR pv.sku = ?
      GROUP BY pv.id
    `).get(barcode, barcode) as Row | undefined;
    return row ? rowsToVariants([row])[0] : null;
  });

  ipcMain.handle("variants:create", (_event, data: { productId: string; sku: string; barcode?: string; size: string; color: string; colorHex: string; price: number; compareAtPrice?: number }) => {
    const id = `v-${Date.now()}`;
    db().prepare("INSERT INTO product_variants (id, product_id, sku, barcode, size, color, color_hex, price, compare_at_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id, data.productId, data.sku, data.barcode ?? null, data.size, data.color, data.colorHex, data.price, data.compareAtPrice ?? null);
    return { id };
  });

  ipcMain.handle("variants:update", (_event, { id, ...data }: { id: string; sku?: string; barcode?: string; size?: string; color?: string; colorHex?: string; price?: number; compareAtPrice?: number }) => {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (data.sku !== undefined)            { fields.push("sku = ?");              values.push(data.sku);            }
    if (data.barcode !== undefined)        { fields.push("barcode = ?");          values.push(data.barcode);        }
    if (data.size !== undefined)           { fields.push("size = ?");             values.push(data.size);           }
    if (data.color !== undefined)          { fields.push("color = ?");            values.push(data.color);          }
    if (data.colorHex !== undefined)       { fields.push("color_hex = ?");        values.push(data.colorHex);       }
    if (data.price !== undefined)          { fields.push("price = ?");            values.push(data.price);          }
    if (data.compareAtPrice !== undefined) { fields.push("compare_at_price = ?"); values.push(data.compareAtPrice); }
    if (fields.length === 0) return;
    values.push(id);
    db().prepare(`UPDATE product_variants SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  });

  ipcMain.handle("variants:delete", (_event, id: string) => {
    db().prepare("DELETE FROM product_variants WHERE id = ?").run(id);
  });

  // Colors, Brands ——————————————————————————

  ipcMain.handle("colors:getAll", () => {
    return db().prepare("SELECT id, name, hex_code AS hexCode FROM colors ORDER BY name").all();
  });

  ipcMain.handle("brands:getAll", () => {
    return db().prepare("SELECT id, name FROM brands ORDER BY name").all();
  });

  // ── Search ────────────────────────────────────────────────────────────────

  ipcMain.handle("products:search", (_event, query: string) => {
    const like = `%${query}%`;
    const rows = db().prepare(`
      SELECT p.*, b.name AS brand_name, c.name AS category_name
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR b.name LIKE ?
      ORDER BY p.name
    `).all(like, like, like, like) as Row[];
    return rows.map((p) => ({
      id: p.id, name: p.name, sku: p.sku, barcode: p.barcode,
      brand: p.brand_name ?? "", category: p.category_name ?? "",
      brandId: p.brand_id ?? undefined, categoryId: p.category_id ?? undefined,
      description: p.description ?? "",
    }));
  });

  // ── CSV Export ────────────────────────────────────────────────────────────

  function escapeCsv(val: string): string {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }

  ipcMain.handle("products:exportCsv", async () => {
    const products = db().prepare(`
      SELECT p.*, b.name AS brand_name, c.name AS category_name
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
    `).all() as Row[];
    const variants = db().prepare("SELECT * FROM product_variants").all() as Row[];
    const locations = db().prepare("SELECT * FROM locations").all() as Row[];
    const inventory = db().prepare(
      "SELECT il.*, l.name AS location_name FROM inventory_levels il JOIN locations l ON l.id = il.location_id"
    ).all() as Row[];

    const locationNames = locations.map((l) => String(l.name ?? ""));
    const header = ["product_name","sku","barcode","brand","category","size","color","price","compare_at_price",...locationNames];
    const dataRows: string[][] = [];
    for (const p of products) {
      for (const v of variants.filter((x) => x.product_id === p.id)) {
        const vInventory = inventory.filter((i) => i.variant_id === v.id);
        const stockCols = locationNames.map((lName) => {
          const loc = vInventory.find((i) => i.location_name === lName);
          return String(loc?.qty ?? 0);
        });
        dataRows.push([
          String(p.name ?? ""), String(v.sku ?? ""), String(v.barcode ?? ""),
          String(p.brand_name ?? ""), String(p.category_name ?? ""),
          String(v.size ?? ""), String(v.color ?? ""),
          String(v.price ?? 0), String(v.compare_at_price ?? ""),
          ...stockCols,
        ]);
      }
    }
    const csv = [header.join(","), ...dataRows.map((r) => r.map(escapeCsv).join(","))].join("\n");

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Export Products",
      defaultPath: "products.csv",
      filters: [{ name: "CSV Files", extensions: ["csv"] }],
    });
    if (canceled || !filePath) return { success: false, canceled: true };
    writeFileSync(filePath, csv, "utf-8");
    return { success: true, filePath };
  });

  // ── CSV Import (batch) ────────────────────────────────────────────────────

  ipcMain.handle("products:openCsvFile", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Import Products from CSV",
      filters: [{ name: "CSV Files", extensions: ["csv"] }],
      properties: ["openFile"],
    });
    if (canceled || filePaths.length === 0) return null;
    return readFileSync(filePaths[0], "utf-8");
  });

  ipcMain.handle("products:importBatch", (_event, rows: Array<{
    productName: string; sku: string; barcode?: string; size: string;
    color: string; colorHex: string; price: number;
  }>) => {
    const ts = Date.now();
    let count = 0;
    const importAll = db().transaction(() => {
      rows.forEach((row, idx) => {
        const existing = db().prepare("SELECT id FROM products WHERE sku = ? LIMIT 1").get(row.sku) as { id: string } | undefined;
        const productId = existing?.id ?? `p-${ts}-${idx}`;
        if (!existing) {
          db().prepare("INSERT INTO products (id, name, sku, barcode) VALUES (?, ?, ?, ?)").run(productId, row.productName, row.sku, row.barcode ?? null);
        }
        const variantId = `v-${ts}-${idx}`;
        db().prepare("INSERT OR IGNORE INTO product_variants (id, product_id, sku, barcode, size, color, color_hex, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
          variantId, productId, `${row.sku}-${row.size}`, row.barcode ?? null, row.size, row.color, row.colorHex, row.price
        );
        const locs = db().prepare("SELECT id FROM locations").all() as { id: string }[];
        for (const loc of locs) {
          db().prepare("INSERT OR IGNORE INTO inventory_levels (id, variant_id, location_id, qty) VALUES (?, ?, ?, 0)").run(`il-${variantId}-${loc.id}`, variantId, loc.id);
        }
        count++;
      });
    });
    importAll();
    return { count };
  });
}
