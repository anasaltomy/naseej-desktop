import { ipcMain } from "electron";
import { getDb } from "../db/database";

type Row = Record<string, unknown>;

export function registerColorHandlers(): void {
  const db = () => getDb();

  ipcMain.handle("colors:getAll", () => {
    return db().prepare("SELECT * FROM colors ORDER BY name").all() as Row[];
  });

  ipcMain.handle("colors:create", (_event, data: { name: string; hexCode: string }) => {
    const id = `c${Date.now()}`;
    db().prepare("INSERT INTO colors (id, name, hex_code) VALUES (?, ?, ?)").run(id, data.name, data.hexCode);
    return { id };
  });

  ipcMain.handle("colors:update", (_event, data: { id: string; name?: string; hexCode?: string }) => {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name); }
    if (data.hexCode !== undefined) { fields.push("hex_code = ?"); values.push(data.hexCode); }
    if (fields.length > 0) {
      values.push(data.id);
      db().prepare(`UPDATE colors SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    }
    return { id: data.id };
  });

  ipcMain.handle("colors:delete", (_event, id: string) => {
    db().prepare("DELETE FROM colors WHERE id = ?").run(id);
    return { id };
  });
}
