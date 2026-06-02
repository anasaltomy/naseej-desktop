# Naseej POS — Recommendations, Fixes & Ideas

**Date:** 2026-06-02  
**Priority:** P0 (Must Fix) | P1 (Should Fix) | P2 (Nice to Have)

---

## 1. Security Fixes (P0 — Critical)

### REC-001: Implement PIN Hashing

**Problem:** PINs stored in plaintext.  
**Solution:** Use `bcryptjs` (pure JS, no native compilation needed for Electron).

```typescript
// Install: npm install bcryptjs @types/bcryptjs
import bcrypt from 'bcryptjs';

// On create/update staff
const pinHash = bcrypt.hashSync(pin, 10);
db.prepare("INSERT INTO staff (..., pin_hash) VALUES (..., ?)").run(..., pinHash);

// On authenticate
const staff = db.prepare("SELECT * FROM staff WHERE id = ?").get(staffId);
if (staff && bcrypt.compareSync(inputPin, staff.pin_hash)) {
  return staff; // authenticated
}
```

**Migration:** Rename column `pin` → `pin_hash`, hash all existing PINs in a one-time migration.

---

### REC-002: Add Authentication Rate Limiting

**Problem:** No brute-force protection.  
**Solution:** In-memory attempt counter per staff ID.

```typescript
const attempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

function checkRateLimit(staffId: string): boolean {
  const entry = attempts.get(staffId);
  if (!entry) return true;
  if (Date.now() < entry.lockedUntil) return false;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
    return false;
  }
  return true;
}
```

---

### REC-003: Add IPC Input Validation with Zod

**Problem:** No schema validation at IPC boundary.  
**Solution:** Zod is already installed. Create validation schemas for each handler.

```typescript
import { z } from 'zod';

const createOrderSchema = z.object({
  staffName: z.string().min(1),
  paymentMethod: z.enum(['CASH', 'CARD', 'SPLIT', 'LOYALTY']),
  subtotal: z.number().positive(),
  items: z.array(z.object({
    productName: z.string(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
    lineTotal: z.number().positive(),
  })).min(1),
});

ipcMain.handle("orders:create", (_event, rawData) => {
  const data = createOrderSchema.parse(rawData); // throws on invalid
  // ... proceed
});
```

---

## 2. Architecture Fixes (P0-P1)

### REC-004: Create `src/shared/` Directory

**Priority:** P1  
**Solution:** Create shared constants file for IPC channel names.

```
src/shared/
├── channels.ts    # All IPC channel name constants
├── types.ts       # Shared types between main and preload
└── index.ts       # Barrel export
```

---

### REC-005: Add Error Handling Wrapper for IPC

**Priority:** P1  
**Solution:** Create a higher-order function that wraps all IPC handlers with try/catch.

```typescript
// src/main/ipc/utils.ts
export function createHandler<T>(
  handler: (event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => T
) {
  return async (event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => {
    try {
      return { success: true, data: await handler(event, ...args) };
    } catch (error) {
      console.error('[IPC Error]', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };
}
```

---

### REC-006: Add React Error Boundaries

**Priority:** P1  
**Solution:** Wrap feature modules in error boundaries that show a recovery UI.

```tsx
class ErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}
```

---

### REC-007: Implement Database Migration System

**Priority:** P1  
**Solution:** Add version tracking and sequential migrations.

```typescript
// src/main/db/migrations.ts
interface Migration {
  version: number;
  up: (db: Database) => void;
  down: (db: Database) => void;
}

const migrations: Migration[] = [
  {
    version: 1,
    up: (db) => db.exec("ALTER TABLE staff RENAME COLUMN pin TO pin_hash"),
    down: (db) => db.exec("ALTER TABLE staff RENAME COLUMN pin_hash TO pin"),
  },
];

export function runMigrations(db: Database) {
  db.exec("CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')))");
  const current = (db.prepare("SELECT MAX(version) as v FROM schema_version").get() as any)?.v ?? 0;
  for (const m of migrations.filter(m => m.version > current)) {
    db.transaction(() => {
      m.up(db);
      db.prepare("INSERT INTO schema_version (version) VALUES (?)").run(m.version);
    })();
  }
}
```

---

## 3. Data Integrity Fixes (P1)

### REC-008: Fix Overselling Logic

**Problem:** `MAX(0, qty - ?)` silently allows overselling.  
**Solution:** Check stock before deducting; throw if insufficient.

```typescript
const checkStock = db.prepare(
  "SELECT qty FROM inventory_levels WHERE variant_id = ? AND location_id = ?"
);

for (const item of data.items) {
  if (item.variantId) {
    const stock = checkStock.get(item.variantId, locationId) as { qty: number } | undefined;
    if (!stock || stock.qty < item.quantity) {
      throw new Error(`Insufficient stock for variant ${item.variantId}`);
    }
  }
}
```

---

### REC-009: Update Customer Stats on Order

**Solution:** Inside the `orders:create` transaction, update customer totals.

```typescript
if (data.customerId) {
  db.prepare(`
    UPDATE customers 
    SET total_orders = total_orders + 1, 
        total_spent = total_spent + ?
    WHERE id = ?
  `).run(data.total, data.customerId);
}
```

---

### REC-010: Add Database Indexes

**Priority:** P1  
**Solution:** Add indexes to `schema.ts` for frequently queried columns.

```sql
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_receipt_number ON orders(receipt_number);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_product_variants_barcode ON product_variants(barcode);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_levels_variant_id ON inventory_levels(variant_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
```

---

## 4. Performance Recommendations (P1-P2)

### REC-011: Fix N+1 Query in `orders:getAll`

**Problem:** Loads all order items then filters in JS.  
**Solution:** Use JOIN or paginate.

```typescript
ipcMain.handle("orders:getAll", () => {
  const orders = db().prepare(`
    SELECT o.*, 
           json_group_array(json_object(
             'id', oi.id, 'productName', oi.product_name,
             'size', oi.size, 'color', oi.color,
             'quantity', oi.quantity, 'unitPrice', oi.unit_price,
             'lineTotal', oi.line_total
           )) as items_json
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    GROUP BY o.id
    ORDER BY o.created_at DESC
    LIMIT 100
  `).all();
  return orders.map(o => ({ ...o, items: JSON.parse(o.items_json) }));
});
```

---

### REC-012: Add Pagination to All List Endpoints

**Priority:** P2  
**Solution:** The `orders:getPage` handler already exists — apply same pattern to `products:getAll`, `inventory:getAll`, `customers:getAll`.

---

### REC-013: Bundle Fonts Locally

**Problem:** Google Fonts loaded from CDN breaks offline-first.  
**Solution:** Download font files and serve from `src/renderer/assets/fonts/`.

```css
@font-face {
  font-family: 'Nunito Sans';
  src: url('./assets/fonts/NunitoSans-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
```

---

## 5. Testing Recommendations (P0)

### REC-014: Set Up Vitest for Unit/Integration Tests

**Solution:**
```bash
npm install -D vitest @vitest/coverage-v8
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',  // for main process tests
    include: ['src/**/*.test.ts'],
  },
});
```

**Priority test targets:**
1. `src/main/ipc/orders.ts` — transaction creation logic
2. `src/main/ipc/staff.ts` — authentication flow
3. `src/main/db/seed.ts` — seed idempotency
4. Cart calculation logic in renderer

---

### REC-015: Add Playwright for E2E Tests

**Priority:** P2  
**Solution:** Test full POS flow (login → add to cart → pay → verify order).

---

## 6. UI/UX Recommendations (P1-P2)

### REC-016: Add Loading Skeletons

**Priority:** P2  
**Solution:** Show skeleton cards while IPC calls are in progress.

---

### REC-017: Add Confirmation Dialogs

**Priority:** P1  
**Solution:** Use the existing Dialog component for delete confirmations.

---

### REC-018: Add Toast Notifications for CRUD Operations

**Priority:** P2  
**Solution:** Toast system already exists — wire it to success/error responses from IPC.

---

## 7. Hardware Integration Ideas (P1)

### REC-019: Create Hardware Module Structure

```
src/main/hardware/
├── index.ts           # Hardware manager (detects available devices)
├── printer.ts         # ESC/POS thermal printer via serialport
├── scanner.ts         # Barcode scanner (keyboard emulation detector)
├── drawer.ts          # Cash drawer open signal
└── types.ts           # Hardware configuration types
```

**Dependencies needed:**
```bash
npm install serialport escpos escpos-serialport
```

---

### REC-020: Implement Barcode Scanner in Main Process

**Current state:** Scanner events are captured in renderer.  
**Recommendation:** Move to main process for reliability, send detected barcodes to renderer via IPC push event.

---

## 8. Infrastructure Ideas (P1-P2)

### REC-021: Add `electron-builder.yml`

```yaml
appId: com.naseej.pos
productName: Naseej POS
directories:
  output: dist
mac:
  target: dmg
  icon: resources/icon.icns
win:
  target: nsis
  icon: resources/icon.ico
```

---

### REC-022: Add Auto-Backup on App Close

```typescript
app.on("before-quit", () => {
  const dbPath = join(app.getPath("userData"), "naseej-pos.db");
  const backupPath = join(app.getPath("userData"), `backups/naseej-pos-${Date.now()}.db`);
  fs.copyFileSync(dbPath, backupPath);
});
```

---

### REC-023: Remove Unused Dependencies

- `react-router-dom` — not used (enum-based routing)
- Or: **Migrate to React Router** if the app will grow beyond current views

---

## 9. Quick Wins (Low Effort, High Impact)

| # | Fix | Effort | Impact |
|---|-----|--------|--------|
| 1 | Fix `any` types in `electron.d.ts` | 10 min | Type safety |
| 2 | Add database indexes | 15 min | Query performance |
| 3 | Bundle fonts locally | 20 min | Offline reliability |
| 4 | Add error boundary at App level | 30 min | Crash recovery |
| 5 | Remove `react-router-dom` from deps | 2 min | Bundle size |
| 6 | Add try/catch to IPC handlers | 1 hour | Error handling |
| 7 | Update customer stats on order | 10 min | Data accuracy |
