# Phase 3 — Advanced Features

**Timeline:** Week 5–7  
**Goal:** Complete the feature set that makes this a professional retail POS — split payments, merchant settings, hold/recall carts, low-stock alerts, CSV exports, shift management, and a settings module.  
**Prerequisite:** Phase 1 and Phase 2 complete — real orders persist, reports reflect real data.  
**Exit Criteria:** A store can configure the app for their specific setup, managers can hold and recall transactions, low-stock alerts surface automatically, and all data can be exported.

---

## Status Snapshot (Before Phase 3)

After Phase 2, the core POS loop works and reporting is accurate. What remains:

| Feature | Current State |
|---|---|
| Split payment | Placeholder UI — "coming in next update" |
| Merchant settings | Hardcoded `MERCHANT_CONFIG` object in `dummy-data.ts`; no edit screen |
| Hold / recall carts | `HoldingPage.tsx` modal exists but has no state management or DB backing |
| Low-stock alerts | `inventory_levels.low_stock_threshold` column exists but is never queried for alerts |
| CSV export | No export functionality anywhere |
| Shift management | No shift_open / shift_close tracking; any staff can operate without a shift |
| Settings layout | `Settings/` feature directory exists but is empty |

---

## Task Breakdown

### Task 3.1 — Split Payment

**Problem:** The Split tab in `PaymentModal` shows a message saying "Split payment coming in next update." The `SPLIT` payment method is already a valid value in the `orders` schema and IPC handlers.

**Decision: Support exactly two-method split in Phase 3 (Cash + Card).** Multi-way splits (3+ methods) are rare in retail and add UI complexity. Cash + Card covers 95% of split scenarios.

**Decision: The split must fully cover the total.** Both portions must sum to `total`. Neither can be negative.

**UI design for the Split tab:**
```
Split Payment
Total: 399.00 SAR
─────────────────────────────
Cash portion:    [ 200.00  ]
Card portion:    [ 199.00  ] ← auto-fills remaining
─────────────────────────────
Remaining:       0.00 ✓
```

**State additions to `PaymentModal.tsx`:**
```typescript
const [splitCash, setSplitCash] = useState('');
const [splitCard, setSplitCard] = useState('');

const splitCashVal = parseFloat(splitCash) || 0;
const splitCardVal = parseFloat(splitCard) || 0;
const splitRemaining = total - splitCashVal - splitCardVal;
const splitValid = Math.abs(splitRemaining) < 0.01;

// Auto-fill card when cash is entered
const handleSplitCashChange = (val: string) => {
  setSplitCash(val);
  const cashNum = parseFloat(val) || 0;
  const remaining = total - cashNum;
  if (remaining >= 0) setSplitCard(remaining.toFixed(2));
  else setSplitCard('');
};
```

**`orders:create` payload for split:** Pass `paymentMethod: 'SPLIT'` and add optional `paymentDetails` as a JSON string to the `orders` table. The `paymentDetails` records the split breakdown:

```sql
-- Add to orders table via idempotent ALTER in schema.ts:
ALTER TABLE orders ADD COLUMN payment_details TEXT;
```

```typescript
// In the create payload:
paymentDetails: activeTab === 'SPLIT'
  ? JSON.stringify({ cash: splitCashVal, card: splitCardVal })
  : undefined,
```

**IPC handler update in `orders.ts`:** Accept optional `paymentDetails` and insert it.

**Cash drawer for split:** Open the cash drawer if `splitCashVal > 0`.

---

### Task 3.2 — Merchant Settings Screen

**Problem:** `MERCHANT_CONFIG` in `dummy-data.ts` is a hardcoded object used throughout the app for store name, location, currency, tax rate, receipt header/footer. The `merchant_config` table exists in SQLite and `merchant:getConfig` / `merchant:setConfig` IPC handlers exist — but there is no UI to edit them.

**Decision: Create a dedicated `MerchantSettingsPage.tsx`** under `src/renderer/src/features/Settings/screens/`.

**Decision: The Settings layout already has a `Settings/` feature directory** with `layout.tsx`, `index.ts`, `screens/`, `components/`. Add a new `AppLayout` value `"settings"` to the type in `pos/types.ts` and a navigation entry in `Sidebar.tsx`.

**Decision: Migrate all hardcoded `MERCHANT_CONFIG` usages to live IPC calls.** `RegisterPage`, `PaymentModal`, and `EndOfDayPage` currently import from `dummy-data.ts`. Replace with a `useMerchantConfig()` hook that fetches once on app load and caches in React context.

**New hook `src/renderer/src/features/Settings/hooks/useMerchantConfig.ts`:**
```typescript
import { useState, useEffect } from 'react';

export interface MerchantConfig {
  name: string;
  location: string;
  currency: string;
  taxRate: number;
  taxLabel: string;
  receiptHeader: string;
  receiptFooter: string;
  loyaltyRate: number;    // pts earned per SAR spent
  loyaltyMinRedeem: number; // minimum pts for redemption
}

export function useMerchantConfig() {
  const [config, setConfig] = useState<MerchantConfig | null>(null);

  useEffect(() => {
    window.api?.merchant.getConfig().then((cfg) => {
      if (cfg) setConfig({
        ...cfg,
        loyaltyRate:     parseFloat(cfg.loyaltyRate ?? '1'),
        loyaltyMinRedeem: parseFloat(cfg.loyaltyMinRedeem ?? '100'),
      });
    });
  }, []);

  const updateConfig = async (key: string, value: string) => {
    await window.api?.merchant.setConfig(key, value);
    setConfig(prev => prev ? { ...prev, [key]: isNaN(Number(value)) ? value : Number(value) } : prev);
  };

  return { config, updateConfig };
}
```

**`MerchantSettingsPage.tsx` sections:**

1. **Store Information** — name, location (display only), currency
2. **Tax Settings** — tax rate (%), tax label (e.g., "VAT (15%)")
3. **Loyalty Program** — earning rate (pts/SAR), minimum redemption, enable/disable
4. **Receipt Customization** — header text, footer text, show/hide fields
5. **Discount Codes** — table of active codes with add/deactivate actions (reuses the `discount_codes` table from Phase 2)

**Sidebar update in `Sidebar.tsx`:** Add a gear icon nav item for Settings layout. Only visible to `admin` and `store_manager` roles.

---

### Task 3.3 — Hold / Recall Carts

**Problem:** `HoldingPage.tsx` exists as a modal component with no logic. A cashier cannot save the current cart to serve a different customer and come back.

**Decision: Use an in-memory store for held carts** (not SQLite). Held carts are temporary by design — if the app closes, they are gone. Persisting to SQLite adds complexity without meaningful benefit (a power outage during a hold is an edge case, not a workflow).

**Decision: Max 5 held carts.** Displaying more than 5 is cluttered on a POS screen and indicates an operational problem (staff not completing transactions), not a software limitation.

**New context: `src/renderer/src/features/pos/hooks/useHeldCarts.ts`:**
```typescript
export interface HeldCart {
  id: string;
  heldAt: string;          // ISO timestamp
  items: CartItem[];
  attachedCustomer: Customer | null;
  discountAmount: number;
  note?: string;
}

// Stored in module-level variable (survives component remounts but not app restart)
let heldCarts: HeldCart[] = [];

export function useHeldCarts() {
  const [carts, setCarts] = useState<HeldCart[]>(heldCarts);

  const holdCurrent = (cart: Omit<HeldCart, 'id' | 'heldAt'>) => {
    if (heldCarts.length >= 5) return false;  // limit reached
    const held: HeldCart = {
      ...cart,
      id: `held-${Date.now()}`,
      heldAt: new Date().toISOString(),
    };
    heldCarts = [...heldCarts, held];
    setCarts([...heldCarts]);
    return true;
  };

  const recallCart = (id: string): HeldCart | null => {
    const found = heldCarts.find(c => c.id === id) ?? null;
    heldCarts = heldCarts.filter(c => c.id !== id);
    setCarts([...heldCarts]);
    return found;
  };

  const deleteHeld = (id: string) => {
    heldCarts = heldCarts.filter(c => c.id !== id);
    setCarts([...heldCarts]);
  };

  return { carts, holdCurrent, recallCart, deleteHeld };
}
```

**Integration in `RegisterPage.tsx`:**
- "Hold" button (H keyboard shortcut) calls `holdCurrent({ items: cartItems, attachedCustomer, discountAmount: appliedDiscount })` then `clearCart()`
- A held cart badge shows on the Orders nav item showing count: `Orders (2)`
- `HoldingPage.tsx` modal receives `{ carts, recallCart, deleteHeld }` and renders a list of held carts with timestamps and item summaries
- "Resume" button calls `recallCart(id)` and populates `cartItems`, `attachedCustomer`, `appliedDiscount` in RegisterPage

---

### Task 3.4 — Low-Stock Alerts

**Problem:** `inventory_levels.low_stock_threshold` is set per variant-location row (default 5) but is never queried for alerts. There is no visual indicator anywhere in the app.

**Decision: Surface alerts at three levels:**
1. **Inventory page** — a "Low Stock" tab/filter shows all variants where `qty <= low_stock_threshold`
2. **Sidebar badge** — a number badge on the "Inventory" nav item shows the count of low-stock variants
3. **RegisterPage** — when a variant is added to cart, if `qty - cartQty <= low_stock_threshold`, show an inline yellow warning on the cart item ("Low stock: 3 remaining")

**New IPC handler `inventory:getLowStock`:**
```typescript
ipcMain.handle("inventory:getLowStock", () => {
  return db().prepare(`
    SELECT
      il.variant_id,
      il.location_id,
      il.qty,
      il.low_stock_threshold,
      l.name AS location_name,
      pv.sku,
      pv.size,
      pv.color,
      p.name AS product_name
    FROM inventory_levels il
    JOIN product_variants pv ON pv.id = il.variant_id
    JOIN products p ON p.id = pv.product_id
    JOIN locations l ON l.id = il.location_id
    WHERE il.qty <= il.low_stock_threshold
    ORDER BY il.qty ASC
  `).all();
});
```

**Sidebar badge:** Load low-stock count on app mount and refresh every 5 minutes (or after every successful sale). Pass count down via `App.tsx` state to `Sidebar.tsx`.

**In `RegisterPage`, check stock after adding to cart:**
```typescript
const addVariantToCart = useCallback((variant: ProductVariant) => {
  setCartItems((prev) => {
    // ... existing add logic ...
    return [...prev, newItem];
  });
  // Warn if low stock
  const newCartQty = (cartItems.find(i => i.variant.id === variant.id)?.quantity ?? 0) + 1;
  if (variant.stockQty - newCartQty <= 3) {
    // Set a warning state: Map<variantId, stockRemaining>
    setStockWarnings(prev => new Map(prev).set(variant.id, variant.stockQty - newCartQty));
  }
}, [cartItems]);
```

**`inventory:adjust` — add threshold check:** After adjusting stock, check if the new qty crosses the threshold and return a `lowStockWarning: boolean` in the response so the inventory screen can show a confirmation toast.

---

### Task 3.5 — CSV Export

**Problem:** There is no way to get data out of the app for accounting, external analysis, or backup review.

**Decision: Export two report types:**
1. **Orders export** — all orders in a date range with their items (flat format, one row per item)
2. **Inventory snapshot** — all variants with current stock across all locations

**Decision: Use Electron's `dialog.showSaveDialog`** to let the user pick the save location. Write via Node.js `fs.writeFileSync`. No third-party CSV library needed — the data is simple enough to build manually.

**New IPC handler `export:ordersCSV`:**
```typescript
ipcMain.handle("export:ordersCSV", async (_event, { dateFrom, dateTo }: { dateFrom: string; dateTo: string }) => {
  const { dialog } = require('electron');
  const { filePath } = await dialog.showSaveDialog({
    title: 'Export Orders',
    defaultPath: `orders-${dateFrom}-${dateTo}.csv`,
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });
  if (!filePath) return { cancelled: true };

  const rows = db().prepare(`
    SELECT
      o.receipt_number, o.created_at, o.staff_name, o.customer_name,
      o.payment_method, o.subtotal, o.tax_amount, o.discount_amount, o.total,
      o.status,
      oi.product_name, oi.size, oi.color, oi.quantity, oi.unit_price, oi.line_total
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE date(o.created_at) >= ? AND date(o.created_at) <= ?
    ORDER BY o.created_at DESC
  `).all(dateFrom, dateTo) as Row[];

  const headers = [
    'Receipt #','Date','Staff','Customer','Payment','Subtotal',
    'Tax','Discount','Total','Status',
    'Product','Size','Color','Qty','Unit Price','Line Total'
  ];
  const csv = [
    headers.join(','),
    ...rows.map(r => [
      r.receipt_number, r.created_at, r.staff_name, r.customer_name ?? '',
      r.payment_method, r.subtotal, r.tax_amount, r.discount_amount, r.total, r.status,
      `"${r.product_name}"`, r.size, r.color, r.quantity, r.unit_price, r.line_total,
    ].join(','))
  ].join('\n');

  require('fs').writeFileSync(filePath, '\uFEFF' + csv, 'utf-8'); // BOM for Arabic in Excel
  return { success: true, path: filePath };
});
```

**Note: `\uFEFF` BOM prefix** ensures Arabic characters render correctly when opened in Excel on Windows.

**New IPC handler `export:inventoryCSV`:** Similar pattern, queries `inventory_levels JOIN product_variants JOIN products JOIN locations`.

**Export buttons:**
- In `OrdersPage.tsx` header: "Export CSV" button with a date range picker
- In `InventoryPage.tsx` header: "Export Snapshot" button (no date range needed)
- Both call the respective IPC handler and show a success toast with the file path

---

### Task 3.6 — Shift Management

**Problem:** Any staff member can use the POS without opening a shift. There is no tracking of who operated the register during what period, and no formal "open register" / "close register" workflow.

**Decision: Add a lightweight `shifts` table.** Shifts are opened when a manager or cashier starts their session and closed when the End-of-Day report is generated. A shift must be open to process sales.

**New table in `schema.ts`:**
```sql
CREATE TABLE IF NOT EXISTS shifts (
  id           TEXT PRIMARY KEY,
  staff_id     TEXT NOT NULL REFERENCES staff(id),
  opened_at    TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at    TEXT,
  opening_cash REAL NOT NULL DEFAULT 0,
  closing_cash REAL,
  status       TEXT NOT NULL DEFAULT 'open'  -- 'open' | 'closed'
);
```

**Decision: One open shift at a time per terminal.** If a shift is already open, the login screen shows a "Resume Shift" button instead of opening a new one. Closing a shift requires manager role or the same staff member who opened it.

**New `shifts` IPC handlers in `src/main/ipc/shifts.ts`:**
```typescript
ipcMain.handle("shifts:getCurrent", () => {
  return db().prepare(
    "SELECT * FROM shifts WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1"
  ).get();
});

ipcMain.handle("shifts:open", (_event, { staffId, openingCash }: { staffId: string; openingCash: number }) => {
  const existing = db().prepare(
    "SELECT id FROM shifts WHERE status = 'open'"
  ).get();
  if (existing) return { error: 'A shift is already open' };

  const id = `shift-${Date.now()}`;
  db().prepare(
    "INSERT INTO shifts (id, staff_id, opening_cash) VALUES (?, ?, ?)"
  ).run(id, staffId, openingCash);
  return { id };
});

ipcMain.handle("shifts:close", (_event, { id, closingCash }: { id: string; closingCash: number }) => {
  db().prepare(
    "UPDATE shifts SET status = 'closed', closed_at = datetime('now'), closing_cash = ? WHERE id = ?"
  ).run(closingCash, id);
});
```

**Login flow update:** After PIN auth, check `shifts:getCurrent`. If no open shift, prompt "Open Shift" modal where staff enters opening cash count. This replaces the current direct redirect to `/register`.

**EndOfDay update:** "Close Shift & Save Report" also calls `shifts:close` with the counted cash.

---

### Task 3.7 — Populate the Settings Layout

**Problem:** `src/renderer/src/features/Settings/` directory exists but all screens are empty. The `AppLayout` type doesn't include `"settings"`.

**Decision: Phase 3 adds three settings screens:**
1. `MerchantSettingsPage.tsx` — store info, tax, loyalty, receipt (from Task 3.2)
2. `DiscountCodesPage.tsx` — CRUD for discount codes (from Phase 2 foundation)
3. `ShiftHistoryPage.tsx` — read-only log of past shifts with totals

**Type update in `pos/types.ts`:**
```typescript
export type AppLayout = "pos" | "catalog" | "users" | "settings";
export type SettingsView = "merchant" | "discounts" | "shift-history";
```

**`Sidebar.tsx` update:** Add Settings icon (gear) at the bottom of the nav rail, visible to `admin` and `store_manager` roles. Cashiers do not see Settings.

**`App.tsx` routing update:** Add `settings` to the layout switch and map `SettingsView` values to the appropriate page components.

---

## Decisions Summary

| Decision | Choice | Reason |
|---|---|---|
| Split payment methods | Cash + Card only (two-way) | 95% of real split scenarios; avoids complex UI for 3-way splits |
| Split payment breakdown storage | `payment_details` JSON column on `orders` | Flexible, schema-additive, no separate table needed |
| Held carts storage | In-memory module variable (not SQLite) | Held carts are intentionally ephemeral; DB overhead not justified |
| Max held carts | 5 | More than 5 indicates an operational problem, not a software gap |
| Low-stock alert levels | Cart warning + Inventory tab + Sidebar badge | Layered approach: passive awareness (badge) → active investigation (tab) → transactional warning (cart) |
| CSV encoding | UTF-8 BOM | Required for Arabic text to display correctly in Microsoft Excel on Windows |
| Export UI pattern | `dialog.showSaveDialog` (native file picker) | Correct Electron pattern; avoids storing files in unexpected locations |
| Settings visibility | `admin` and `store_manager` only | Cashiers should not change tax rates or discount codes |
| Shift model | One open shift per terminal | Keeps shift logic simple; multi-terminal scenarios are Phase 4 |

---

## Exit Checklist

- [ ] Split payment with Cash 200 + Card 199 on a 399 SAR order persists correctly
- [ ] `payment_details` column shows JSON breakdown in the orders table
- [ ] Merchant settings screen saves tax rate change; new sales use the updated rate immediately
- [ ] `MERCHANT_CONFIG` import from `dummy-data.ts` is removed from all components
- [ ] "Hold" button saves cart; "Resume" restores it with all items and customer attached
- [ ] Held cart count badge shows on Orders nav item
- [ ] Inventory page "Low Stock" tab shows variants at or below their threshold
- [ ] Sidebar inventory badge shows count of low-stock items
- [ ] Cart shows a yellow warning when a variant has ≤ 3 units remaining
- [ ] "Export Orders CSV" prompts file save dialog, produces a readable .csv with Arabic text intact
- [ ] "Export Inventory CSV" exports all variants with stock levels across all locations
- [ ] Login flow checks for open shift; prompts opening cash entry if no shift is open
- [ ] Closing shift via End-of-Day also closes the `shifts` record in DB
- [ ] Settings gear icon visible only to `admin` and `store_manager`
- [ ] Discount codes can be added and deactivated from the Settings screen
