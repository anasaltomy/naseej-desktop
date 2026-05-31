import { ipcMain } from "electron";
import { getDb } from "../db/database";

type Row = Record<string, unknown>;

function rowToOrder(r: Row, items: Row[]) {
  return {
    id: r.id,
    receiptNumber: r.receipt_number,
    createdAt: r.created_at,
    staffName: r.staff_name,
    customerName: r.customer_name ?? undefined,
    items: items
      .filter((i) => i.order_id === r.id)
      .map((i) => ({
        id: i.id,
        variantId: i.variant_id ?? undefined,
        productName: i.product_name,
        size: i.size,
        color: i.color,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        lineTotal: i.line_total,
      })),
    paymentMethod: r.payment_method as "CASH" | "CARD" | "SPLIT" | "LOYALTY",
    subtotal: r.subtotal,
    taxAmount: r.tax_amount,
    discountAmount: r.discount_amount,
    total: r.total,
    status: r.status as "completed" | "refunded" | "partial_refund",
    channel: r.channel as "POS",
  };
}

/** IPC handlers for orders. */
export function registerOrderHandlers(): void {
  const db = () => getDb();

  ipcMain.handle("orders:getAll", () => {
    const orders = db().prepare("SELECT * FROM orders ORDER BY created_at DESC").all() as Row[];
    const items = db().prepare("SELECT * FROM order_items").all() as Row[];
    return orders.map((o) => rowToOrder(o, items));
  });

  ipcMain.handle("orders:getById", (_event, id: string) => {
    const o = db().prepare("SELECT * FROM orders WHERE id = ?").get(id) as Row | undefined;
    if (!o) return null;
    const items = db().prepare("SELECT * FROM order_items WHERE order_id = ?").all(id) as Row[];
    return rowToOrder(o, items);
  });

  ipcMain.handle("orders:create", (_event, data: {
    receiptNumber?: string;
    staffName: string;
    customerId?: string;
    customerName?: string;
    paymentMethod: string;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    total: number;
    locationId?: string;
    status?: string;
    items: Array<{
      variantId?: string;
      productName: string;
      size: string;
      color: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }>;
  }) => {
    const id = `o-${Date.now()}`;
    const locationId = data.locationId ?? "loc1";

    // Compute today's date prefix for receipt number generation
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const todayStr = `${year}${month}${day}`;
    const todayPrefix = `POS-${todayStr}-`;

    const insertOrder = db().prepare(
      "INSERT INTO orders (id, receipt_number, staff_name, customer_id, customer_name, payment_method, subtotal, tax_amount, discount_amount, total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const insertItem = db().prepare(
      "INSERT INTO order_items (id, order_id, variant_id, product_name, size, color, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const countTodayOrders = db().prepare(
      "SELECT COUNT(*) as count FROM orders WHERE receipt_number LIKE ?"
    );
    const deductInventory = db().prepare(
      "UPDATE inventory_levels SET qty = MAX(0, qty - ?) WHERE variant_id = ? AND location_id = ?"
    );

    const create = db().transaction(() => {
      const { count } = countTodayOrders.get(todayPrefix + "%") as { count: number };
      const receiptNum = data.receiptNumber ?? `POS-${todayStr}-${String((count as number) + 1).padStart(4, "0")}`;

      insertOrder.run(
        id, receiptNum, data.staffName,
        data.customerId ?? null, data.customerName ?? null,
        data.paymentMethod, data.subtotal, data.taxAmount,
        data.discountAmount, data.total, data.status ?? "completed"
      );

      data.items.forEach((item, idx) => {
        insertItem.run(
          `oi-${id}-${idx}`, id, item.variantId ?? null,
          item.productName, item.size, item.color,
          item.quantity, item.unitPrice, item.lineTotal
        );
        if (item.variantId) {
          deductInventory.run(item.quantity, item.variantId, locationId);
        }
      });

      return receiptNum;
    });

    const receiptNum = create();
    return { id, receiptNumber: receiptNum };
  });

  ipcMain.handle("orders:getByReceiptNumber", (_event, receiptNumber: string) => {
    const o = db().prepare(
      "SELECT * FROM orders WHERE receipt_number = ?"
    ).get(receiptNumber) as Row | undefined;
    if (!o) return null;
    const items = db().prepare(
      "SELECT * FROM order_items WHERE order_id = ?"
    ).all(o.id as string) as Row[];
    return rowToOrder(o, items);
  });

  ipcMain.handle("orders:updateStatus", (_event, { id, status }: { id: string; status: string }) => {
    db().prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, id);
  });

  ipcMain.handle("orders:getPage", (_event, {
    date, page = 0, pageSize = 50, search = "",
  }: { date?: string; page?: number; pageSize?: number; search?: string }) => {
    const conditions: string[] = ["1=1"];
    const params: unknown[] = [];

    if (date) {
      conditions.push("date(created_at) = ?");
      params.push(date);
    }
    if (search) {
      conditions.push(
        "(receipt_number LIKE ? OR COALESCE(customer_name,'') LIKE ? OR staff_name LIKE ?)"
      );
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const { n: total } = db()
      .prepare(`SELECT COUNT(*) as n FROM orders ${where}`)
      .get(...params) as { n: number };

    const orders = db()
      .prepare(
        `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, page * pageSize) as Row[];

    const ids = orders.map((o) => `'${(o.id as string).replace(/'/g, "''")}'`).join(",");
    const items: Row[] = ids.length
      ? (db()
          .prepare(`SELECT * FROM order_items WHERE order_id IN (${ids})`)
          .all() as Row[])
      : [];

    return {
      total,
      page,
      pageSize,
      orders: orders.map((o) => rowToOrder(o, items)),
    };
  });
}
