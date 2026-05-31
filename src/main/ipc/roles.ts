import { ipcMain } from "electron";
import { getDb } from "../db/database";

type Row = Record<string, unknown>;

/** IPC handlers for roles. */
export function registerRoleHandlers(): void {
  const db = () => getDb();

  ipcMain.handle("roles:getAll", () => {
    return (db().prepare("SELECT * FROM roles ORDER BY name").all() as Row[]).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? "",
      permissions: JSON.parse(r.permissions as string) as string[],
      userCount: r.user_count,
    }));
  });

  ipcMain.handle("roles:create", (_event, data: { name: string; description?: string; permissions: string[] }) => {
    const id = `role-${Date.now()}`;
    db().prepare("INSERT INTO roles (id, name, description, permissions) VALUES (?, ?, ?, ?)").run(id, data.name, data.description ?? null, JSON.stringify(data.permissions));
    return { id };
  });

  ipcMain.handle("roles:update", (_event, { id, ...data }: { id: string; name?: string; description?: string; permissions?: string[] }) => {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (data.name !== undefined)        { fields.push("name = ?");        values.push(data.name);                      }
    if (data.description !== undefined) { fields.push("description = ?"); values.push(data.description);              }
    if (data.permissions !== undefined) { fields.push("permissions = ?"); values.push(JSON.stringify(data.permissions)); }
    if (fields.length === 0) return;
    values.push(id);
    db().prepare(`UPDATE roles SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  });

  ipcMain.handle("roles:delete", (_event, id: string) => {
    db().prepare("DELETE FROM roles WHERE id = ?").run(id);
  });
}
