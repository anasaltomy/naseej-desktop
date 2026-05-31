import { ipcMain } from "electron";
import { getDb } from "../db/database";

type Row = Record<string, unknown>;

/** IPC handlers for merchant configuration and sales report summary. */
export function registerMerchantHandlers(): void {
  const db = () => getDb();

  // Returns all config as a key-value map
  ipcMain.handle("merchant:getConfig", () => {
    const rows = db().prepare("SELECT key, value FROM merchant_config").all() as Row[];
    const config: Record<string, string> = {};
    for (const r of rows) config[r.key as string] = r.value as string;
    return {
      name: config.name ?? "Naseej",
      location: config.location ?? "Main Store",
      currency: config.currency ?? "SAR",
      taxRate: parseFloat(config.taxRate ?? "0.15"),
      taxLabel: config.taxLabel ?? "VAT (15%)",
      receiptHeader: config.receiptHeader ?? "",
      receiptFooter: config.receiptFooter ?? "",
    };
  });

  ipcMain.handle("merchant:setConfig", (_event, key: string, value: string) => {
    db().prepare(
      "INSERT INTO merchant_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).run(key, value);
  });

  // Aggregated sales report summary
  ipcMain.handle("salesReport:getSummary", (_event, { dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }) => {
    const whereClause = `
      AND (:dateFrom IS NULL OR date(created_at) >= :dateFrom)
      AND (:dateTo   IS NULL OR date(created_at) <= :dateTo)
    `;
    const params = { dateFrom: dateFrom ?? null, dateTo: dateTo ?? null };

    const summary = db().prepare(`
      SELECT
        COALESCE(SUM(total), 0)                                    AS totalSales,
        COUNT(*)                                                    AS totalOrders,
        CASE WHEN COUNT(*) > 0 THEN SUM(total) / COUNT(*) ELSE 0 END AS averageOrder
      FROM orders
      WHERE status = 'completed' ${whereClause}
    `).get(params) as Row;

    const topProductRow = db().prepare(`
      SELECT oi.product_name, SUM(oi.quantity) AS qty
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status = 'completed' ${whereClause}
      GROUP BY oi.product_name
      ORDER BY qty DESC
      LIMIT 1
    `).get(params) as Row | undefined;

    return {
      totalSales:   summary.totalSales ?? 0,
      totalOrders:  summary.totalOrders ?? 0,
      averageOrder: summary.averageOrder ?? 0,
      topProduct:   topProductRow?.product_name ?? "—",
    };
  });
}
