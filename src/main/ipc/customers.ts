import { ipcMain } from "electron";
import { getDb } from "../db/database";

type Row = Record<string, unknown>;

function rowToCustomer(r: Row) {
  return {
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email ?? "",
    phone: r.phone ?? "",
    loyaltyPoints: r.loyalty_points,
    totalOrders: r.total_orders,
    totalSpent: r.total_spent,
  };
}

/** IPC handlers for customers. */
export function registerCustomerHandlers(): void {
  const db = () => getDb();

  ipcMain.handle("customers:getAll", () => {
    return (db().prepare("SELECT * FROM customers ORDER BY first_name").all() as Row[]).map(rowToCustomer);
  });

  ipcMain.handle("customers:getPage", (_event, {
    page = 0, pageSize = 50, search = "",
  }: { page?: number; pageSize?: number; search?: string }) => {
    const conditions: string[] = ["1=1"];
    const params: unknown[] = [];

    if (search) {
      conditions.push("(first_name || ' ' || last_name LIKE ? OR phone LIKE ? OR email LIKE ?)");
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const { n: total } = db()
      .prepare(`SELECT COUNT(*) as n FROM customers ${where}`)
      .get(...params) as { n: number };

    const rows = db()
      .prepare(`SELECT * FROM customers ${where} ORDER BY first_name LIMIT ? OFFSET ?`)
      .all(...params, pageSize, page * pageSize) as Row[];

    return {
      total,
      page,
      pageSize,
      customers: rows.map(rowToCustomer),
    };
  });

  ipcMain.handle("customers:search", (_event, query: string) => {
    const q = `%${query}%`;
    return (db().prepare(
      "SELECT * FROM customers WHERE first_name || ' ' || last_name LIKE ? OR phone LIKE ? OR email LIKE ? ORDER BY first_name LIMIT 20"
    ).all(q, q, q) as Row[]).map(rowToCustomer);
  });

  ipcMain.handle("customers:getById", (_event, id: string) => {
    const r = db().prepare("SELECT * FROM customers WHERE id = ?").get(id) as Row | undefined;
    return r ? rowToCustomer(r) : null;
  });

  ipcMain.handle("customers:create", (_event, data: { firstName: string; lastName: string; email?: string; phone?: string }) => {
    const id = `c-${Date.now()}`;
    db().prepare(
      "INSERT INTO customers (id, first_name, last_name, email, phone) VALUES (?, ?, ?, ?, ?)"
    ).run(id, data.firstName, data.lastName, data.email ?? null, data.phone ?? null);
    return { id };
  });

  ipcMain.handle("customers:update", (_event, { id, ...data }: { id: string; firstName?: string; lastName?: string; email?: string; phone?: string; loyaltyPoints?: number }) => {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (data.firstName !== undefined)     { fields.push("first_name = ?");     values.push(data.firstName);     }
    if (data.lastName !== undefined)      { fields.push("last_name = ?");      values.push(data.lastName);      }
    if (data.email !== undefined)         { fields.push("email = ?");          values.push(data.email);         }
    if (data.phone !== undefined)         { fields.push("phone = ?");          values.push(data.phone);         }
    if (data.loyaltyPoints !== undefined) { fields.push("loyalty_points = ?"); values.push(data.loyaltyPoints); }
    if (fields.length === 0) return;
    values.push(id);
    db().prepare(`UPDATE customers SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  });

  ipcMain.handle("customers:delete", (_event, id: string) => {
    db().prepare("DELETE FROM customers WHERE id = ?").run(id);
  });
}
