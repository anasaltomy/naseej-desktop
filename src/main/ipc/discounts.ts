import { ipcMain } from "electron";
import { getDb } from "../db/database";

type Row = Record<string, unknown>;

/** IPC handlers for discount code validation. */
export function registerDiscountHandlers(): void {
  const db = () => getDb();

  ipcMain.handle(
    "discounts:validate",
    (_event, { code, orderTotal }: { code: string; orderTotal: number }) => {
      const d = db()
        .prepare("SELECT * FROM discount_codes WHERE code = ? AND is_active = 1")
        .get(code.trim().toUpperCase()) as Row | undefined;

      if (!d) return { valid: false, reason: "Code not found" };

      if (d.expires_at && new Date(d.expires_at as string) < new Date())
        return { valid: false, reason: "Code expired" };

      if (
        d.max_uses !== null &&
        d.max_uses !== undefined &&
        (d.used_count as number) >= (d.max_uses as number)
      )
        return { valid: false, reason: "Code usage limit reached" };

      if (orderTotal < (d.min_order as number))
        return {
          valid: false,
          reason: `Minimum order: ${(d.min_order as number).toFixed(2)} SAR`,
        };

      const amount =
        d.type === "percentage"
          ? orderTotal * ((d.value as number) / 100)
          : (d.value as number);

      return { valid: true, type: d.type, value: d.value, amount };
    }
  );
}
