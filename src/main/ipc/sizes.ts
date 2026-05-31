import { ipcMain } from "electron";
import { getDb } from "../db/database";

type Row = Record<string, unknown>;

export function registerSizeHandlers(): void {
  const db = () => getDb();

  ipcMain.handle("sizes:getAll", () => {
    return db().prepare("SELECT * FROM sizes ORDER BY sort_order, name").all() as Row[];
  });

  ipcMain.handle("sizes:create", (_event, data: { name: string; sortOrder?: number }) => {
    const id = `s${Date.now()}`;
    db().prepare("INSERT INTO sizes (id, name, sort_order) VALUES (?, ?, ?)").run(id, data.name, data.sortOrder ?? 0);
    return { id };
  });

  ipcMain.handle("sizes:update", (_event, data: { id: string; name?: string; sortOrder?: number }) => {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name); }
    if (data.sortOrder !== undefined) { fields.push("sort_order = ?"); values.push(data.sortOrder); }
    if (fields.length > 0) {
      values.push(data.id);
      db().prepare(`UPDATE sizes SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    }
    return { id: data.id };
  });

  ipcMain.handle("sizes:delete", (_event, id: string) => {
    db().prepare("DELETE FROM sizes WHERE id = ?").run(id);
    return { id };
  });
}
