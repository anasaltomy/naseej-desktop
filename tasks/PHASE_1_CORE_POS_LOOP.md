# Phase 1 — Core POS Loop

**Timeline:** Week 1–2  
**Goal:** Make the full cashier workflow functional end-to-end — scan → cart → pay → persist → inventory updated.  
**Exit Criteria:** A cashier can complete a real sale. The order is saved in SQLite. Inventory goes down. The receipt number is meaningful. Refunds look up real orders.

---

## Status Snapshot (Before Phase 1)

The app launches, renders the login screen, and the cart UI works visually. But **nothing is real**:

| What looks like it works | What actually happens |
|---|---|
| Cashier pays via PaymentModal | `setTimeout(1200ms)` simulates processing — `orders.create` is never called |
| Inventory should go down after a sale | `inventory_levels.qty` is never touched during checkout |
| Barcode scanner adds items | The scan button opens the text search modal — there is no real barcode listener |
| Refund looks up an order by receipt | Loads static `MOCK_ORDER_ITEMS` array regardless of what was typed |
| Orders page shows real data | ✅ This one works — `orders:getAll` reads from SQLite |

---

## Task Breakdown

### Task 1.1 — Extend `CartItem` and `OrderItem` with `variantId`

**Problem:** When a cashier pays, we need to know which variant was sold so we can decrement the correct row in `inventory_levels`. Today, `CartItem` only stores the variant object, and `order_items` stores `product_name`/`size`/`color` as plain strings — there is no `variant_id` foreign key.

**Decision:** Add `variant_id` to `order_items` as a nullable column via an idempotent `ALTER TABLE` guard in `schema.ts`. This preserves existing data and is safe to run on every app launch.

**Why nullable?** Future-proofing for manual/imported orders that may not have a variant reference. Inventory deduction simply skips items where `variant_id` is `NULL`.

**Files to change:**

`src/main/db/schema.ts` — add after the `CREATE TABLE IF NOT EXISTS order_items` block:
```sql
-- Add variant_id to order_items if missing (idempotent migration)
CREATE TEMP TABLE IF NOT EXISTS _col_check AS
  SELECT 1 FROM pragma_table_info('order_items') WHERE name = 'variant_id';
-- SQLite doesn't support conditional ALTER, so we use a guard in TypeScript
```

The guard must be done in TypeScript (SQLite doesn't support `ALTER TABLE IF COLUMN NOT EXISTS`):
```typescript
// In runSchema(), after db.exec(schema):
const cols = db.prepare("PRAGMA table_info(order_items)").all() as {name: string}[];
if (!cols.some(c => c.name === 'variant_id')) {
  db.exec("ALTER TABLE order_items ADD COLUMN variant_id TEXT REFERENCES product_variants(id)");
}
```

`src/renderer/src/features/pos/types.ts` — add `variantId` to `OrderItem`:
```typescript
export interface OrderItem {
  id: string;
  variantId?: string;   // ← add this
  productName: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}
```

`src/preload/index.ts` — update `orders.create` items type to include optional `variantId`:
```typescript
items: Array<{
  variantId?: string;   // ← add this
  productName: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}>
```

---

### Task 1.2 — Fix `orders:create` IPC — Persist + Decrement Inventory Atomically

**Problem:** `src/main/ipc/orders.ts` inserts the order and items but never touches `inventory_levels`. The `db.transaction()` wrapping is already there — we just need to add the inventory deduction inside it.

**Decision: Use the `primary_location_id` from merchant config** for inventory deduction. The POS terminal is associated with one store location. If a variant has no inventory row at that location, skip silently (don't crash the sale).

**Decision: Receipt numbers must be sequential and date-stamped**, format: `POS-YYYYMMDD-NNNN`. Query the count of today's orders to get the next number. Do this inside the transaction to avoid race conditions (SQLite serializes writes anyway).

**Decision: Store the `variantId` in `order_items`** so refund/return flows can restore inventory accurately.

**Updated `orders:create` handler in `src/main/ipc/orders.ts`:**
```typescript
ipcMain.handle("orders:create", (_event, data: {
  receiptNumber: string;
  staffName: string;
  customerId?: string;
  customerName?: string;
  paymentMethod: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  locationId?: string;
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
  const locationId = data.locationId ?? 'loc1'; // fallback to Main Store

  const create = db().transaction(() => {
    // 1. Generate sequential receipt number if not provided
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const todayCount = (db().prepare(
      "SELECT COUNT(*) as n FROM orders WHERE date(created_at) = date('now')"
    ).get() as { n: number }).n;
    const receiptNum = data.receiptNumber ||
      `POS-${today}-${String(todayCount + 1).padStart(4, '0')}`;

    // 2. Insert order
    db().prepare(
      "INSERT INTO orders (id, receipt_number, staff_name, customer_id, customer_name, payment_method, subtotal, tax_amount, discount_amount, total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(id, receiptNum, data.staffName, data.customerId ?? null, data.customerName ?? null,
      data.paymentMethod, data.subtotal, data.taxAmount, data.discountAmount, data.total,
      data.status ?? 'completed');

    // 3. Insert order items + decrement inventory
    data.items.forEach((item, idx) => {
      db().prepare(
        "INSERT INTO order_items (id, order_id, variant_id, product_name, size, color, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(`oi-${id}-${idx}`, id, item.variantId ?? null,
        item.productName, item.size, item.color,
        item.quantity, item.unitPrice, item.lineTotal);

      // Decrement stock — only if variant_id is known
      if (item.variantId) {
        db().prepare(
          "UPDATE inventory_levels SET qty = MAX(0, qty - ?) WHERE variant_id = ? AND location_id = ?"
        ).run(item.quantity, item.variantId, locationId);
      }
    });

    // 4. Update customer totals if customer attached
    if (data.customerId) {
      db().prepare(
        "UPDATE customers SET total_orders = total_orders + 1, total_spent = total_spent + ? WHERE id = ?"
      ).run(data.total, data.customerId);
    }

    return receiptNum;
  });

  const receiptNum = create();
  return { id, receiptNumber: receiptNum };
});
```

**Also add `orders:getByReceiptNumber`** for the refund lookup:
```typescript
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
```

Also expose this in `src/preload/index.ts` under `orders`:
```typescript
getByReceiptNumber: (receiptNumber: string) =>
  ipcRenderer.invoke("orders:getByReceiptNumber", receiptNumber),
```

---

### Task 1.3 — Fix `PaymentModal.tsx` — Real Persistence

**Problem:** `handlePay` fires two `setTimeout` calls and generates a random receipt number. Nothing is written to SQLite.

**Decision: PaymentModal receives everything it needs via props** — `cartItems`, `attachedCustomer`, `currentUser` (for staffName), `subtotal`, `taxAmount`, `discountAmount`. The parent (`RegisterPage`) already owns all this state.

**Decision: Receipt number is generated on the main process** inside `orders:create` — the UI receives it back in the response and displays it.

**Decision: After successful payment:**
1. Call `window.api.orders.create(...)` → get back `{ id, receiptNumber }`
2. Call `window.api.printReceipt(receiptData)` → fire and forget (don't block UI on printer)
3. Call `window.api.openCashDrawer()` only if `paymentMethod === 'CASH'`
4. Call `onSuccess(receiptNumber)` to clear the cart in RegisterPage

**Updated `handlePay` in `PaymentModal.tsx`:**
```typescript
const handlePay = async () => {
  if (activeTab === 'CASH' && cashValue < total) return;
  setProcessing(true);
  try {
    const result = await window.api?.orders.create({
      receiptNumber: '',          // generated server-side
      staffName: props.staffName,
      customerId: props.attachedCustomer?.id,
      customerName: props.attachedCustomer
        ? `${props.attachedCustomer.firstName} ${props.attachedCustomer.lastName}`
        : undefined,
      paymentMethod: activeTab,
      subtotal: props.subtotal,
      taxAmount: props.taxAmount,
      discountAmount: props.discountAmount,
      total: props.total,
      items: props.cartItems.map(item => ({
        variantId: item.variant.id,
        productName: item.variant.productName,
        size: item.variant.size,
        color: item.variant.color,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
    });
    if (!result) throw new Error('Order creation failed');

    setProcessed(true);

    // Fire hardware signals — don't await, don't block
    window.api?.printReceipt({
      receiptNumber: result.receiptNumber,
      storeName: MERCHANT_CONFIG.name,
      storeLocation: MERCHANT_CONFIG.location,
      items: props.cartItems,
      subtotal: props.subtotal,
      taxAmount: props.taxAmount,
      discountAmount: props.discountAmount,
      total: props.total,
      paymentMethod: activeTab,
      cashPaid: activeTab === 'CASH' ? cashValue : undefined,
      changeDue: activeTab === 'CASH' ? changeDue : undefined,
    });
    if (activeTab === 'CASH') {
      window.api?.openCashDrawer();
    }

    await new Promise(r => setTimeout(r, 600));
    onSuccess(result.receiptNumber);
  } catch (err) {
    setError('Payment failed. Please try again.');
    setProcessing(false);
    setProcessed(false);
  }
};
```

**New props interface for `PaymentModal`:**
```typescript
interface PaymentModalProps {
  total: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  cartItems: CartItem[];
  attachedCustomer: Customer | null;
  staffName: string;
  onSuccess: (receiptNum: string) => void;
  onClose: () => void;
}
```

**`RegisterPage.tsx` must pass the new props:**
```tsx
<PaymentModal
  total={total}
  subtotal={subtotal}
  taxAmount={taxAmount}
  discountAmount={discountAmount}
  cartItems={cartItems}
  attachedCustomer={attachedCustomer}
  staffName={`${currentUser.firstName} ${currentUser.lastName}`}
  onSuccess={handlePaymentSuccess}
  onClose={() => setShowPayment(false)}
/>
```

`RegisterPage` must receive `currentUser` — it's already passed from `App.tsx` as the logged-in user, so just thread it through as a prop.

---

### Task 1.4 — Wire Barcode Scanner in `RegisterPage.tsx`

**Problem:** The preload exposes `window.api.onBarcodeScanned(callback)` but `RegisterPage` never subscribes to it. The main process also hasn't implemented the keyboard listener that triggers this event.

**Decision for renderer side:** A single `useEffect` inside `RegisterPage` subscribes on mount and unsubscribes on unmount. The callback looks up the barcode in `allVariants` (already loaded) and calls `addVariantToCart`.

**Decision for main process side (Phase 1 basic implementation):** The main process does NOT implement a global keyboard listener in Phase 1 (that is Phase 4 hardware work). Instead, a hidden `<input>` element in the renderer captures barcode scanner input locally. Most USB barcode scanners appear as keyboard devices and can be captured in the renderer with a focused input or `keydown` listener.

**Renderer-side barcode capture in `RegisterPage.tsx`:**
```typescript
// Listen for IPC barcode events (Phase 4 will drive this from main process)
useEffect(() => {
  const unsub = window.api?.onBarcodeScanned((barcode: string) => {
    const match = allVariants.find(v => v.barcode === barcode);
    if (match) addVariantToCart(match);
  });
  return () => unsub?.();
}, [allVariants, addVariantToCart]);

// Keyboard-based barcode capture (works for USB scanners in renderer focus)
useEffect(() => {
  let buffer = '';
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const handleKeyDown = (e: KeyboardEvent) => {
    // Skip if user is focused on an input/textarea
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (e.key === 'Enter') {
      if (buffer.length >= 6) {
        const match = allVariants.find(v => v.barcode === buffer);
        if (match) addVariantToCart(match);
      }
      buffer = '';
      if (timeout) clearTimeout(timeout);
      return;
    }

    if (e.key.length === 1) {
      buffer += e.key;
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => { buffer = ''; }, 150);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [allVariants, addVariantToCart]);
```

**Why 150ms timeout?** A human typing the same barcode length would take >150ms between keystrokes. A USB barcode scanner sends all characters in <50ms total. The buffer resets if input is too slow, preventing partial barcode accumulation from regular typing.

---

### Task 1.5 — Fix `RefundExchangeModal.tsx` — Real Order Lookup

**Problem:** The modal hardcodes `MOCK_ORDER_ITEMS` and ignores the receipt number input entirely.

**Decision: Lookup by receipt number**, not order ID. Cashiers type receipt numbers (e.g., `POS-20260530-0003`), not UUIDs. The new `orders:getByReceiptNumber` handler (added in Task 1.2) supports this.

**Decision: Inventory restoration on refund** — when the cashier confirms a refund, call `inventory:adjust` for each refunded item to add the quantity back, then call `orders:updateStatus` to mark the original order as `'refunded'` or `'partial_refund'`.

**Updated `handleSearch`:**
```typescript
const handleSearch = useCallback(async () => {
  if (!receiptNumber.trim()) return;
  setSearchError('');
  const order = await window.api?.orders.getByReceiptNumber(receiptNumber.trim());
  if (!order) {
    setSearchError('No order found with that receipt number.');
    return;
  }
  setLoadedOrder(order);
  setItems(order.items.map(item => ({
    ...item,
    selected: false,
    refundQty: 0,
  })));
  setOrderLoaded(true);
}, [receiptNumber]);
```

**Updated `handleRefund`:**
```typescript
const handleRefund = useCallback(async () => {
  if (!selectedItems.length || !loadedOrder) return;
  setIsProcessing(true);
  // 1. Mark order as refunded/partial
  const allItemsRefunded = selectedItems.length === loadedOrder.items.length;
  await window.api?.orders.updateStatus({
    id: loadedOrder.id,
    status: allItemsRefunded ? 'refunded' : 'partial_refund',
  });
  // 2. Restore inventory for each refunded variant
  for (const item of selectedItems) {
    if (item.variantId) {
      await window.api?.inventory.adjust({
        variantId: item.variantId,
        locationId: 'loc1',
        delta: item.refundQty,  // positive delta = add back
      });
    }
  }
  setIsProcessing(false);
  onRefund?.(selectedItems, refundMethod);
  onClose();
}, [selectedItems, loadedOrder, refundMethod, onRefund, onClose]);
```

---

### Task 1.6 — Fix `electron.d.ts` Type Declarations

The `types/electron.d.ts` file in the renderer must be updated to include the new `getByReceiptNumber` method and the updated `orders.create` signature with `variantId`. Without this, TypeScript will error on all new API calls.

```typescript
// Add to the orders object in Window.api type:
getByReceiptNumber: (receiptNumber: string) => Promise<Order | null>;

// Update orders.create items type:
items: Array<{
  variantId?: string;
  productName: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}>;
```

---

## Decisions Summary

| Decision | Choice | Reason |
|---|---|---|
| Receipt number format | `POS-YYYYMMDD-NNNN` generated server-side | Sequential, date-stamped, readable on receipts. No client-side randomness. |
| Inventory deduction location | Use `loc1` (Main Store) as default, override via `locationId` prop | Simple for single-store deployments; multi-location can override per-terminal in Phase 3 |
| Barcode capture strategy | Renderer `keydown` listener (USB scanner emulates keyboard) | No native driver needed in Phase 1; IPC path from main process added in Phase 4 |
| Inventory deduction failure | `MAX(0, qty - n)` — silent clamp, no error thrown | A sale must never fail because of a stock counter discrepancy; inventory can be corrected manually |
| `variant_id` in `order_items` | Nullable column added via idempotent `ALTER TABLE` guard | Safe migration, no data loss, preserves existing seed orders |
| Payment error handling | Show inline error in PaymentModal, don't close the modal | Cashier must see and acknowledge payment failures before the cart is cleared |

---

## Exit Checklist

- [ ] Complete a sale with 2+ items → `orders` table shows the new row
- [ ] `inventory_levels.qty` decreases by the correct quantities
- [ ] Receipt number is `POS-YYYYMMDD-NNNN` format, incrementing per day
- [ ] Scan a barcode with a USB scanner → item added to cart without clicking anything
- [ ] Open RefundModal, type a real receipt number → correct items load
- [ ] Confirm refund → `orders.status` becomes `'refunded'`, inventory increases
- [ ] PaymentModal shows an error if `orders.create` fails
- [ ] Cash drawer IPC fires after a cash payment (stub OK in Phase 1)
- [ ] Print receipt IPC fires after any payment (stub OK in Phase 1)
