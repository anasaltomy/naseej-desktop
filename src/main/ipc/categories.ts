import { ipcMain } from "electron";
import { getDb } from "../db/database";

type Row = Record<string, unknown>;

function rowToCategory(r: Row, allSizes: Row[]) {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    parentId: r.parent_id ?? null,
    hasStandardSizes: r.has_standard_sizes === 1,
    standardSizes: allSizes
      .filter((s) => s.category_id === r.id)
      .map((s) => ({ id: s.size_id, name: s.size_name })),
    createdAt: r.created_at,
  };
}

/** IPC handlers for categories and sizes. */
export function registerCategoryHandlers(): void {
  const db = () => getDb();

  ipcMain.handle("categories:getAll", () => {
    const cats = db().prepare("SELECT * FROM categories ORDER BY parent_id NULLS FIRST, name").all() as Row[];
    const sizes = db().prepare(
      "SELECT cs.category_id, cs.size_id, s.name AS size_name FROM category_sizes cs JOIN sizes s ON s.id = cs.size_id"
    ).all() as Row[];
    return cats.map((c) => rowToCategory(c, sizes));
  });

  ipcMain.handle("categories:create", (_event, data: { name: string; slug: string; parentId?: string | null; hasStandardSizes: boolean; sizeIds?: string[] }) => {
    const id = `cat-${Date.now()}`;
    const insertCat = db().prepare(
      "INSERT INTO categories (id, name, slug, parent_id, has_standard_sizes) VALUES (?, ?, ?, ?, ?)"
    );
    const insertSize = db().prepare(
      "INSERT INTO category_sizes (category_id, size_id) VALUES (?, ?)"
    );
    db().transaction(() => {
      insertCat.run(id, data.name, data.slug, data.parentId ?? null, data.hasStandardSizes ? 1 : 0);
      for (const sizeId of data.sizeIds ?? []) {
        insertSize.run(id, sizeId);
      }
    })();
    return { id };
  });

  ipcMain.handle("categories:update", (_event, { id, ...data }: { id: string; name?: string; slug?: string; parentId?: string | null; hasStandardSizes?: boolean; sizeIds?: string[] }) => {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (data.name !== undefined)             { fields.push("name = ?");               values.push(data.name);             }
    if (data.slug !== undefined)             { fields.push("slug = ?");               values.push(data.slug);             }
    if (data.parentId !== undefined)         { fields.push("parent_id = ?");          values.push(data.parentId);         }
    if (data.hasStandardSizes !== undefined) { fields.push("has_standard_sizes = ?"); values.push(data.hasStandardSizes ? 1 : 0); }
    db().transaction(() => {
      if (fields.length > 0) {
        values.push(id);
        db().prepare(`UPDATE categories SET ${fields.join(", ")} WHERE id = ?`).run(...values);
      }
      if (data.sizeIds !== undefined) {
        db().prepare("DELETE FROM category_sizes WHERE category_id = ?").run(id);
        const insertSize = db().prepare("INSERT INTO category_sizes (category_id, size_id) VALUES (?, ?)");
        for (const sizeId of data.sizeIds) {
          insertSize.run(id, sizeId);
        }
      }
    })();
  });

  ipcMain.handle("categories:delete", (_event, id: string) => {
    db().prepare("DELETE FROM categories WHERE id = ?").run(id);
  });

  // Sizes ——————————————————————————————————————

  ipcMain.handle("sizes:getAll", () => {
    return db().prepare("SELECT id, name, sort_order AS sortOrder FROM sizes ORDER BY sort_order, name").all();
  });
}
