import { ipcMain } from "electron";
import { getDb } from "../db/database";

type Row = Record<string, unknown>;

/** IPC handlers for daily end-of-day summaries. */
export function registerDailySummaryHandlers(): void {
  const db = () => getDb();

  /** Computes a live Z-report from today's real orders — does NOT write to DB. */
  ipcMain.handle("dailySummary:computeForDate", (_event, date: string) => {
    const orderStats = db().prepare(`
      SELECT
        COUNT(*)                                                                        AS transaction_count,
        COALESCE(SUM(total), 0)                                                        AS total_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'CASH'  THEN total ELSE 0 END), 0)    AS cash_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'CARD'  THEN total ELSE 0 END), 0)    AS card_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'SPLIT' THEN total ELSE 0 END), 0)    AS split_sales,
        COALESCE(SUM(CASE WHEN status IN ('refunded','partial_refund') THEN total ELSE 0 END), 0) AS refunds_total
      FROM orders
      WHERE date(created_at) = ?
        AND status != 'cancelled'
    `).get(date) as Record<string, number>;

    const itemStats = db().prepare(`
      SELECT COALESCE(SUM(oi.quantity), 0) AS items_sold
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE date(o.created_at) = ?
        AND o.status = 'completed'
    `).get(date) as { items_sold: number };

    const prevDay = db().prepare(
      "SELECT closing_cash FROM daily_summaries WHERE date < ? ORDER BY date DESC LIMIT 1"
    ).get(date) as { closing_cash: number } | undefined;

    return {
      date,
      totalSales:       orderStats.total_sales,
      transactionCount: orderStats.transaction_count,
      itemsSold:        itemStats.items_sold,
      cashSales:        orderStats.cash_sales,
      cardSales:        orderStats.card_sales,
      splitSales:       orderStats.split_sales,
      refundsTotal:     orderStats.refunds_total,
      openingCash:      prevDay?.closing_cash ?? 0,
      closingCash:      0,
      variance:         0,
    };
  });

  ipcMain.handle("dailySummary:getByDate", (_event, date: string) => {
    const r = db().prepare("SELECT * FROM daily_summaries WHERE date = ?").get(date) as Row | undefined;
    if (!r) return null;
    return {
      date: r.date,
      totalSales: r.total_sales,
      transactionCount: r.transaction_count,
      itemsSold: r.items_sold,
      cashSales: r.cash_sales,
      cardSales: r.card_sales,
      splitSales: r.split_sales ?? 0,
      refundsTotal: r.refunds_total,
      openingCash: r.opening_cash,
      closingCash: r.closing_cash,
      variance: r.variance,
    };
  });

  ipcMain.handle("dailySummary:getLatest", () => {
    const r = db().prepare("SELECT * FROM daily_summaries ORDER BY date DESC LIMIT 1").get() as Row | undefined;
    if (!r) return null;
    return {
      date: r.date,
      totalSales: r.total_sales,
      transactionCount: r.transaction_count,
      itemsSold: r.items_sold,
      cashSales: r.cash_sales,
      cardSales: r.card_sales,
      splitSales: r.split_sales ?? 0,
      refundsTotal: r.refunds_total,
      openingCash: r.opening_cash,
      closingCash: r.closing_cash,
      variance: r.variance,
    };
  });

  ipcMain.handle("dailySummary:upsert", (_event, data: {
    date: string; totalSales: number; transactionCount: number; itemsSold: number;
    cashSales: number; cardSales: number; splitSales?: number; refundsTotal: number;
    openingCash: number; closingCash: number; variance: number;
  }) => {
    db().prepare(`
      INSERT INTO daily_summaries (date, total_sales, transaction_count, items_sold, cash_sales, card_sales, split_sales, refunds_total, opening_cash, closing_cash, variance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        total_sales = excluded.total_sales,
        transaction_count = excluded.transaction_count,
        items_sold = excluded.items_sold,
        cash_sales = excluded.cash_sales,
        card_sales = excluded.card_sales,
        split_sales = excluded.split_sales,
        refunds_total = excluded.refunds_total,
        opening_cash = excluded.opening_cash,
        closing_cash = excluded.closing_cash,
        variance = excluded.variance
    `).run(data.date, data.totalSales, data.transactionCount, data.itemsSold, data.cashSales, data.cardSales, data.splitSales ?? 0, data.refundsTotal, data.openingCash, data.closingCash, data.variance);
  });
}
