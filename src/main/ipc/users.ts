import { ipcMain } from "electron";
import { getDb } from "../db/database";

type Row = Record<string, unknown>;

/** IPC handlers for user management (staff management page, not POS login). */
export function registerUserHandlers(): void {
  const db = () => getDb();

  ipcMain.handle("users:getAll", () => {
    return (db().prepare("SELECT * FROM users ORDER BY name").all() as Row[]).map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone ?? "",
      role: r.role ?? "",
      status: r.status as "active" | "inactive",
    }));
  });

  ipcMain.handle("users:create", (_event, data: { name: string; email: string; phone?: string; role?: string; status?: "active" | "inactive" }) => {
    const id = `usr-${Date.now()}`;
    db().prepare("INSERT INTO users (id, name, email, phone, role, status) VALUES (?, ?, ?, ?, ?, ?)").run(id, data.name, data.email, data.phone ?? null, data.role ?? null, data.status ?? "active");
    return { id };
  });

  ipcMain.handle("users:update", (_event, { id, ...data }: { id: string; name?: string; email?: string; phone?: string; role?: string; status?: string }) => {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (data.name !== undefined)   { fields.push("name = ?");   values.push(data.name);   }
    if (data.email !== undefined)  { fields.push("email = ?");  values.push(data.email);  }
    if (data.phone !== undefined)  { fields.push("phone = ?");  values.push(data.phone);  }
    if (data.role !== undefined)   { fields.push("role = ?");   values.push(data.role);   }
    if (data.status !== undefined) { fields.push("status = ?"); values.push(data.status); }
    if (fields.length === 0) return;
    values.push(id);
    db().prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  });

  ipcMain.handle("users:delete", (_event, id: string) => {
    db().prepare("DELETE FROM users WHERE id = ?").run(id);
  });
}
