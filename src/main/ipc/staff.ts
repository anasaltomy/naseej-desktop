import { ipcMain } from "electron";
import { getDb } from "../db/database";

/** IPC handlers for staff (PIN-authenticated POS users). */
export function registerStaffHandlers(): void {
  const db = () => getDb();

  ipcMain.handle("staff:getAll", () => {
    return db().prepare("SELECT id, first_name, last_name, email, role, avatar_url FROM staff ORDER BY first_name").all();
  });

  ipcMain.handle("staff:authenticate", (_event, { staffId, pin }: { staffId?: string; pin: string }) => {
    if (staffId) {
      const staff = db().prepare(
        "SELECT id, first_name, last_name, email, role, avatar_url FROM staff WHERE id = ? AND pin = ?"
      ).get(staffId, pin);
      return staff ?? null;
    }
    const staff = db().prepare(
      "SELECT id, first_name, last_name, email, role, avatar_url FROM staff WHERE pin = ?"
    ).get(pin);
    return staff ?? null;
  });

  ipcMain.handle("staff:create", (_event, data: { firstName: string; lastName: string; email: string; role: string; pin: string }) => {
    const id = `u-${Date.now()}`;
    db().prepare(
      "INSERT INTO staff (id, first_name, last_name, email, role, pin) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, data.firstName, data.lastName, data.email, data.role, data.pin);
    return { id };
  });

  ipcMain.handle("staff:update", (_event, { id, ...data }: { id: string; firstName?: string; lastName?: string; email?: string; role?: string; pin?: string }) => {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (data.firstName !== undefined) { fields.push("first_name = ?"); values.push(data.firstName); }
    if (data.lastName !== undefined)  { fields.push("last_name = ?");  values.push(data.lastName);  }
    if (data.email !== undefined)     { fields.push("email = ?");       values.push(data.email);     }
    if (data.role !== undefined)      { fields.push("role = ?");        values.push(data.role);      }
    if (data.pin !== undefined)       { fields.push("pin = ?");         values.push(data.pin);       }
    if (fields.length === 0) return;
    values.push(id);
    db().prepare(`UPDATE staff SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  });

  ipcMain.handle("staff:delete", (_event, id: string) => {
    db().prepare("DELETE FROM staff WHERE id = ?").run(id);
  });
}
