# Phase 2 — Reporting & Data Flow

**Timeline:** Week 3–4  
**Goal:** Make every reporting screen show accurate, live data derived from real transactions. Wire up the end-of-day close workflow, fix the sales report, connect loyalty points to real customer balances, and make the discount system configurable.  
**Prerequisite:** Phase 1 complete — real orders are being written to SQLite.  
**Exit Criteria:** The store manager can close a shift and see a Z-report that matches actual sales. The sales report filters by date and shows correct totals. Customer loyalty points change when they buy or redeem.

---

## Status Snapshot (Before Phase 2)

With Phase 1 done, orders are persisting. But reporting is still broken:

| Screen | What's wrong |
|---|---|
| End-of-Day Z-Report | Reads from `daily_summaries` seed data, not from today's actual `orders` |
| "Generate Report" button | Sets `setReportGenerated(true)` locally — nothing saved to DB |
| Sales Report date filter | `<select>` changes `dateRange` state but it's never passed to the IPC call |
| Sales Report naming | IPC returns `totalSales` but the screen reads `data.totalRevenue` → shows 0 |
| Loyalty tab in PaymentModal | Hardcoded 1,240 pts regardless of which customer is attached |
| Loyalty points after purchase | Never updated on the customer record |
| Discount codes | Only "SAVE10" works; hardcoded in `RegisterPage.applyDiscount()` |

---

## Task Breakdown

### Task 2.1 — New IPC Handler: `dailySummary:computeForDate`

**Problem:** `EndOfDayPage` loads the `daily_summaries` table which is static seed data. There is no handler that aggregates today's real `orders` rows.

**Decision:** Add a new read-only IPC handler that computes the Z-report on demand from `orders` and `order_items`. It does **not** write to the database — that is the job of `dailySummary:upsert`, called explicitly when the manager closes the shift.

**Why separate compute vs. upsert?** The manager may preview the report multiple times before officially closing. Computing in real-time lets them see a live snapshot. The write only happens when they click "Close Shift & Save Report".

**New handler in `src/main/ipc/dailySummary.ts`:**
```typescript
ipcMain.handle("dailySummary:computeForDate", (_event, date: string) => {
  const orderStats = db().prepare(`
    SELECT
      COUNT(*)                                                    AS transaction_count,
      COALESCE(SUM(total), 0)                                    AS total_sales,
      COALESCE(SUM(CASE WHEN payment_method = 'CASH'  THEN total ELSE 0 END), 0) AS cash_sales,
      COALESCE(SUM(CASE WHEN payment_method = 'CARD'  THEN total ELSE 0 END), 0) AS card_sales,
      COALESCE(SUM(CASE WHEN payment_method = 'SPLIT' THEN total ELSE 0 END), 0) AS split_sales,
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

  // Opening cash: try to find yesterday's closing cash, else 0
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
    closingCash:      0,   // filled in by the manager on the form
    variance:         0,   // filled in by the manager on the form
  };
});
```

Expose in `src/preload/index.ts`:
```typescript
computeForDate: (date: string) =>
  ipcRenderer.invoke("dailySummary:computeForDate", date),
```

---

### Task 2.2 — Fix `EndOfDayPage.tsx`

**Problem 1:** On mount the page calls `dailySummary.getLatest()` which returns seed data. It should compute from today's actual orders.  
**Problem 2:** "Generate Report" only sets local state. Variance calculation is correct but the result is never saved.  
**Problem 3:** The "counted cash" and "safe drop" inputs exist but their values are never included in the upsert call.

**Decision: Load flow:**
1. On mount, call `dailySummary:computeForDate(today)` to get a live preview
2. If a saved summary for today already exists (shift was already closed), show that instead with a "read-only" badge
3. When manager enters counted cash and clicks "Close Shift & Save Report", call `dailySummary:upsert` with the full computed summary + cash reconciliation values

**Updated `useEffect` in `EndOfDayPage.tsx`:**
```typescript
useEffect(() => {
  const today = new Date().toISOString().split('T')[0];
  // Try to load a saved summary first
  window.api?.dailySummary.getByDate(today).then((saved) => {
    if (saved) {
      setSummary(saved as DailySummary);
      setReportGenerated(true);  // already closed
      setCountedCash(String(saved.closingCash));
    } else {
      // Compute live from today's orders
      window.api?.dailySummary.computeForDate(today).then((live) => {
        if (live) setSummary(live as DailySummary);
      });
    }
  });
  window.api?.merchant.getConfig().then((cfg) => {
    if (cfg?.location) setMerchantLocation(cfg.location);
  });
}, []);
```

**Updated `handleGenerateReport`:**
```typescript
const handleGenerateReport = async () => {
  const today = new Date().toISOString().split('T')[0];
  const counted = parseFloat(countedCash) || 0;
  const expectedCash = summary.openingCash + summary.cashSales - summary.refundsTotal;
  const variance = counted - expectedCash;

  await window.api?.dailySummary.upsert({
    date: today,
    totalSales:       summary.totalSales,
    transactionCount: summary.transactionCount,
    itemsSold:        summary.itemsSold,
    cashSales:        summary.cashSales,
    cardSales:        summary.cardSales,
    refundsTotal:     summary.refundsTotal,
    openingCash:      summary.openingCash,
    closingCash:      counted,
    variance,
  });

  setSummary(prev => ({ ...prev, closingCash: counted, variance }));
  setReportGenerated(true);
};
```

**Add a "re-open" guard:** Once a shift is closed (`reportGenerated === true` from a saved DB record), show a warning if the manager tries to close again on the same day.

**`DailySummary` type update** — add `splitSales` to the interface in `src/renderer/src/features/pos/types.ts`:
```typescript
export interface DailySummary {
  date: string;
  totalSales: number;
  transactionCount: number;
  itemsSold: number;
  cashSales: number;
  cardSales: number;
  splitSales?: number;    // ← new
  refundsTotal: number;
  openingCash: number;
  closingCash: number;
  variance: number;
}
```

---

### Task 2.3 — Fix `SalesReportPage.tsx`

**Three bugs to fix:**

**Bug A: Date filter not passed to IPC**  
The `<select>` sets `dateRange` state (`"today"`, `"week"`, `"month"`) but `getSummary()` is called with no arguments.

Fix — convert `dateRange` to `dateFrom`/`dateTo` strings and pass them:
```typescript
function getDateRange(range: string): { dateFrom: string; dateTo: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  switch (range) {
    case 'today':
      return { dateFrom: fmt(today), dateTo: fmt(today) };
    case 'week': {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      return { dateFrom: fmt(start), dateTo: fmt(today) };
    }
    case 'month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { dateFrom: fmt(start), dateTo: fmt(today) };
    }
    default:
      return { dateFrom: fmt(today), dateTo: fmt(today) };
  }
}

// In useEffect or when dateRange changes:
useEffect(() => {
  const { dateFrom, dateTo } = getDateRange(dateRange);
  window.api?.salesReport.getSummary({ dateFrom, dateTo }).then((data) => {
    if (data) {
      setSummary({
        totalSales:   data.totalSales ?? 0,   // was: data.totalRevenue — wrong key
        totalOrders:  data.totalOrders ?? 0,
        averageOrder: data.averageOrder ?? 0,
        topProduct:   data.topProduct ?? '-',
      });
    }
  });
}, [dateRange]);
```

**Bug B: Field name mismatch**  
IPC handler returns `totalSales`, `totalOrders`, `averageOrder`. The page reads `data.totalRevenue` (undefined → 0). Fixed in the `useEffect` above.

**Bug C: The IPC handler `salesReport:getSummary` uses rest params incorrectly**  
In `src/main/ipc/merchant.ts`, the handler does:
```typescript
const summary = db().prepare(`... WHERE status = 'completed' ${whereClause}`).get(...params);
```
`better-sqlite3`'s `.get()` does not accept a spread of parameters — it takes a single object or individual positional args. Since `whereClause` builds `AND created_at >= ? AND created_at <= ?`, the params array must be spread correctly. Fix:
```typescript
// Replace .get(...params) with:
const summary = db().prepare(`...`).get(params[0], params[1]) as Row;
// Or use a named parameter approach for safety:
```

The cleaner fix is to use named parameters:
```typescript
const whereClause = dateFrom || dateTo
  ? ` AND date(created_at) >= COALESCE(:dateFrom, date(created_at))
      AND date(created_at) <= COALESCE(:dateTo, date(created_at))`
  : '';
const summary = db().prepare(`
  SELECT
    COALESCE(SUM(total), 0)                    AS totalSales,
    COUNT(*)                                    AS totalOrders,
    CASE WHEN COUNT(*) > 0
      THEN SUM(total) / COUNT(*) ELSE 0 END    AS averageOrder
  FROM orders
  WHERE status = 'completed' ${whereClause}
`).get({ dateFrom: dateFrom ?? null, dateTo: dateTo ?? null }) as Row;
```

---

### Task 2.4 — Fix Loyalty Payment in `PaymentModal.tsx`

**Problem:** The Loyalty tab shows hardcoded `1,240 pts` and the `<input>` for "Points to Redeem" is uncontrolled with no `onChange`. Points are never deducted from the customer record.

**Decision: Points-to-SAR rate comes from merchant config** (key: `loyaltyRate`, default `"10"` meaning 10 pts = 1 SAR). Store this in `merchant_config` table.

**Decision: Loyalty payment flow:**
1. Customer must be attached to the cart before Loyalty tab is selectable
2. Show real `attachedCustomer.loyaltyPoints` from props
3. Minimum redemption: 100 pts (configurable)
4. On payment success, deduct redeemed points from `customers.loyalty_points`
5. On **any** completed purchase, add loyalty points (`floor(total)` pts per SAR is a common retail rule — keep it configurable)

**Add `loyaltyPointsToRedeem` state to PaymentModal:**
```typescript
const [loyaltyPts, setLoyaltyPts] = useState(0);
const loyaltyRate = 10; // pts per SAR — later from merchant config
const loyaltyDiscount = loyaltyPts / loyaltyRate;
const maxRedeemable = props.attachedCustomer
  ? Math.floor(props.attachedCustomer.loyaltyPoints / loyaltyRate) * loyaltyRate
  : 0;
```

**After successful order creation, update loyalty points:**
```typescript
// Deduct redeemed points
if (activeTab === 'LOYALTY' && loyaltyPts > 0 && props.attachedCustomer) {
  await window.api?.customers.update({
    id: props.attachedCustomer.id,
    loyaltyPoints: Math.max(0, props.attachedCustomer.loyaltyPoints - loyaltyPts),
  });
}

// Award loyalty points for purchase (1 pt per SAR, rounded down)
if (props.attachedCustomer) {
  const earned = Math.floor(props.total);
  await window.api?.customers.update({
    id: props.attachedCustomer.id,
    loyaltyPoints: (props.attachedCustomer.loyaltyPoints - (loyaltyPts > 0 ? loyaltyPts : 0)) + earned,
  });
}
```

**Guard the Loyalty tab** — disable it if no customer is attached:
```typescript
{id: 'LOYALTY', label: t('...'), icon: Star, disabled: !props.attachedCustomer}
```

---

### Task 2.5 — Make Discount System Configurable

**Problem:** `RegisterPage.applyDiscount()` has a single hardcoded condition: `if (discountCode.trim().toUpperCase() === "SAVE10")`.

**Decision: Add a `discount_codes` table** to the SQLite schema. This is simpler than a merchant_config JSON blob and allows CRUD management in Phase 3.

**Schema addition in `src/main/db/schema.ts`:**
```sql
-- Discount codes
CREATE TABLE IF NOT EXISTS discount_codes (
  id          TEXT PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  type        TEXT NOT NULL DEFAULT 'percentage',  -- 'percentage' | 'fixed'
  value       REAL NOT NULL,
  min_order   REAL NOT NULL DEFAULT 0,
  max_uses    INTEGER,
  used_count  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  expires_at  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**New IPC handlers in a new file `src/main/ipc/discounts.ts`:**
```typescript
ipcMain.handle("discounts:validate", (_event, { code, orderTotal }: { code: string; orderTotal: number }) => {
  const d = db().prepare(
    "SELECT * FROM discount_codes WHERE code = ? AND is_active = 1"
  ).get(code.trim().toUpperCase()) as Row | undefined;

  if (!d) return { valid: false, reason: 'Code not found' };
  if (d.expires_at && new Date(d.expires_at as string) < new Date())
    return { valid: false, reason: 'Code expired' };
  if (d.max_uses !== null && (d.used_count as number) >= (d.max_uses as number))
    return { valid: false, reason: 'Code usage limit reached' };
  if ((orderTotal as number) < (d.min_order as number))
    return { valid: false, reason: `Minimum order: ${d.min_order} SAR` };

  const amount = d.type === 'percentage'
    ? orderTotal * ((d.value as number) / 100)
    : (d.value as number);

  return { valid: true, type: d.type, value: d.value, amount };
});
```

**Seed an initial set of discount codes** in `seed.ts`:
```typescript
function seedDiscountCodes(db: Database.Database): void {
  if (count(db, "discount_codes") > 0) return;
  const insert = db.prepare(
    "INSERT INTO discount_codes (id, code, type, value, min_order) VALUES (?, ?, ?, ?, ?)"
  );
  db.transaction(() => {
    insert.run("dc1", "SAVE10",    "percentage", 10,  0);
    insert.run("dc2", "FLAT50",    "fixed",      50,  200);
    insert.run("dc3", "WELCOME15", "percentage", 15,  100);
  })();
}
```

**Update `RegisterPage.applyDiscount()`:**
```typescript
const applyDiscount = async () => {
  const result = await window.api?.discounts.validate({
    code: discountCode,
    orderTotal: subtotal,
  });
  if (!result?.valid) {
    setDiscountError(result?.reason ?? 'Invalid code');
    return;
  }
  setAppliedDiscount(result.amount);
  setDiscountError('');
};
```

**Register `registerDiscountHandlers()` in `src/main/index.ts`** and expose in `src/preload/index.ts`.

---

### Task 2.6 — Fix `orders:getAll` Performance

**Problem:** `orders:getAll` fetches ALL orders and ALL items in two separate queries, then does a JavaScript `.filter()` join. For a store with 10,000 orders, this loads all data into memory unnecessarily.

**Decision: Paginate `orders:getAll`** with optional `date` and `limit`/`offset` params. Add a separate endpoint `orders:getByDate` for the Orders page day filter. Keep `orders:getAll` for export use cases.

**Add `orders:getPage` handler:**
```typescript
ipcMain.handle("orders:getPage", (_event, {
  date, page = 0, pageSize = 50, search = ''
}: { date?: string; page?: number; pageSize?: number; search?: string }) => {
  let where = "WHERE 1=1";
  const params: unknown[] = [];

  if (date) { where += " AND date(created_at) = ?"; params.push(date); }
  if (search) {
    where += " AND (receipt_number LIKE ? OR customer_name LIKE ? OR staff_name LIKE ?)";
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  const total = (db().prepare(`SELECT COUNT(*) as n FROM orders ${where}`)
    .get(...params) as { n: number }).n;

  const orders = db().prepare(
    `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, pageSize, page * pageSize) as Row[];

  const ids = orders.map(o => `'${o.id}'`).join(',');
  const items = ids.length
    ? db().prepare(`SELECT * FROM order_items WHERE order_id IN (${ids})`).all() as Row[]
    : [];

  return {
    total,
    page,
    pageSize,
    orders: orders.map(o => rowToOrder(o, items)),
  };
});
```

**Update `OrdersPage.tsx`** to use `orders:getPage` with the search query as a server-side filter rather than client-side `.filter()`.

---

## Decisions Summary

| Decision | Choice | Reason |
|---|---|---|
| Z-report computation | New `dailySummary:computeForDate` IPC, reads from `orders` live | Separates the "view" from the "save" operation; manager can preview before committing |
| Opening cash for new shifts | Look up yesterday's `closing_cash` from `daily_summaries` | Automatic carry-forward, no manual entry needed for routine days |
| Loyalty rate | Stored in `merchant_config` as `loyaltyRate` key | Configurable per-store without code changes |
| Loyalty tab guard | Disabled if no customer attached | Prevents cashier confusion; loyalty requires a customer to credit/debit |
| Discount codes | Dedicated `discount_codes` table | Allows CRUD management in Phase 3, proper validation, expiry, usage limits |
| `orders:getAll` pagination | Add `orders:getPage` with server-side search | Prevents memory issues at scale; `orders:getAll` kept for CSV export only |
| Split sales tracking | Add `split_sales` to `daily_summaries` | Split payment is a real method; reporting should show its total separately |

---

## Exit Checklist

- [ ] End-of-Day page shows `totalSales` matching the sum of today's real orders
- [ ] "Close Shift & Save Report" persists the Z-report including counted cash and variance
- [ ] Opening cash on a new day equals yesterday's closing cash automatically
- [ ] Sales Report "Today / This Week / This Month" filters return different, correct totals
- [ ] Discount code `SAVE10` still works; `FLAT50` also works; invalid codes show an error message
- [ ] Loyalty tab is disabled until a customer is attached to the cart
- [ ] Attaching a customer shows their real loyalty points, not 1,240
- [ ] After a loyalty purchase, the customer's point balance decreases by the redeemed amount and increases by earned points
- [ ] Orders page search runs server-side (network tab shows only matching rows returned)
