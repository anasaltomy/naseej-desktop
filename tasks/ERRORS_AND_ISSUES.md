# Naseej POS — Errors, Issues & Technical Debt

**Date:** 2026-06-02  
**Severity Levels:** 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## 1. Security Issues

### 🔴 SEC-001: PIN Stored in Plaintext

**Location:** `src/main/ipc/staff.ts`, `src/main/db/seed.ts`  
**Description:** Staff PINs are stored and compared as plain text in SQLite. The PRD mandates bcrypt or Argon2 hashing.  
**Risk:** Any database file access exposes all staff PINs.  
**Evidence:**
```typescript
// staff.ts line 15-16
"SELECT ... FROM staff WHERE id = ? AND pin = ?"
).get(staffId, pin);
```
```typescript
// seed.ts line 68
insert.run("u1", "Anas", "Al-Toumi", "anas@naseej.sa", "admin", "1234");
```

---

### 🔴 SEC-002: No Rate Limiting on Authentication

**Location:** `src/main/ipc/staff.ts`  
**Description:** The `staff:authenticate` handler has no brute-force protection. An attacker can try unlimited PINs.  
**Risk:** 4-digit PINs can be brute-forced in 10,000 attempts (trivial).

---

### 🟠 SEC-003: Sandbox Disabled

**Location:** `src/main/index.ts` line 33  
**Description:** `sandbox: false` in webPreferences disables Chromium's process sandbox.  
**Risk:** If renderer is compromised, attacker has broader access.

---

### 🟠 SEC-004: No Input Validation at IPC Boundary

**Location:** All files in `src/main/ipc/`  
**Description:** IPC handlers accept data directly from the renderer without schema validation (no Zod/schema checks on incoming data). While SQLite parameterized queries prevent SQL injection, malformed data (wrong types, missing fields) can cause runtime crashes.  
**Risk:** Application crashes, data corruption.

---

### 🟡 SEC-005: `count()` Function Uses String Interpolation for Table Names

**Location:** `src/main/db/seed.ts` line 22  
**Description:**
```typescript
function count(db, table: string): number {
  const row = db.prepare(`SELECT COUNT(*) as n FROM ${table}`).get()
```
While this is only called with hardcoded table names internally, it's a dangerous pattern if ever extended.

---

## 2. Architectural Issues

### 🟠 ARCH-001: Missing `src/shared/` Directory

**Description:** Docs specify `src/shared/constants.ts` and `src/shared/types.ts` for IPC channel names, but this directory doesn't exist. Channel names are hardcoded strings across main and preload.  
**Impact:** Typos in channel names will silently fail; no single source of truth.

---

### 🟠 ARCH-002: Missing Hardware Module

**Description:** `src/main/hardware/` directory documented in BACKEND_STRUCTURE.md and POS_APP_STRUCTURE.md doesn't exist. Hardware operations are stubs in `index.ts`.  
**Impact:** Blocks Phase 4 delivery; no clear extension path for real hardware.

---

### 🟡 ARCH-003: No Database Migration System

**Description:** Schema uses `CREATE TABLE IF NOT EXISTS` (idempotent) but has no versioned migration mechanism. The `schema_version` table documented in DATA_MODELS_SCHEMAS.md is not implemented.  
**Impact:** Schema changes after users install will be extremely fragile (ALTER TABLE needed manually).

---

### 🟡 ARCH-004: No Error Handling Middleware in IPC

**Description:** IPC handlers have no try/catch wrapping. If any handler throws, Electron surfaces a generic rejection to the renderer with no structured error.  
**Impact:** Renderer cannot display meaningful error messages; difficult to debug.

---

### 🟡 ARCH-005: No React Error Boundaries

**Description:** No `ErrorBoundary` components exist. A single component crash will white-screen the entire app.  
**Impact:** In a POS environment, this means the cashier must restart the app.

---

### 🟢 ARCH-006: Unused react-router-dom Dependency

**Description:** `react-router-dom` is listed in `package.json` but the app uses enum-based view switching in `App.tsx` (no Router component).  
**Impact:** Unnecessary bundle size (~15KB gzipped).

---

## 3. Type Safety Issues

### 🟡 TYPE-001: `any` Types in Type Definitions

**Location:** `src/renderer/src/types/electron.d.ts`  
**Lines:** 125-126, 191
```typescript
export interface UserRecord {
  lastName: any;  // Should be string
  firstName: any; // Should be string
}
export interface ColorRecord {
  [x: string]: any;  // Should have explicit properties
}
```
**Violation:** Project convention prohibits `any` types.

---

### 🟡 TYPE-002: `any` Usage in Feature Components

**Locations:**
- `src/renderer/src/features/catalog/__mocks__/productMocks.ts` — `(c: any, i: number)`
- `src/renderer/src/features/pos/screens/OrdersPage.tsx` — JSX type assertions
- `src/renderer/src/components/ui/ChipMultiSelect.tsx` — Generic type erasure
- `src/renderer/src/features/Settings/components/DefaultSizesColorsSettings.tsx`

---

### 🟡 TYPE-003: Inconsistent Type Naming Between Layers

**Description:** The preload layer returns camelCase fields, but the database stores snake_case. Mapping is done ad-hoc in each IPC handler without a shared mapper utility.  
**Impact:** Risk of missed field mappings; maintenance burden.

---

## 4. Data Integrity Issues

### 🟠 DATA-001: No Backup System Implemented

**Description:** PRD requires automatic backups on daily close (FR-063) and manual backup to USB (FR-062). Neither is implemented.  
**Impact:** Any SQLite corruption = complete data loss.

---

### 🟡 DATA-002: `MAX(0, qty - ?)` Allows Silent Overselling

**Location:** `src/main/ipc/orders.ts`  
**Description:**
```sql
UPDATE inventory_levels SET qty = MAX(0, qty - ?) WHERE variant_id = ? AND location_id = ?
```
This prevents negative stock but silently allows selling more than available. The schema has `CHECK(qty >= 0)` but `MAX(0, ...)` circumvents it — stock just goes to 0 without error.  
**Impact:** Inventory accuracy lost; overselling not caught.

---

### 🟡 DATA-003: No Customer Update After Order

**Description:** When an order is created with a `customerId`, the customer's `total_orders` and `total_spent` fields are not updated in the transaction.  
**Impact:** Customer stats are always stale.

---

### 🟡 DATA-004: Seed Data Uses Hardcoded IDs

**Location:** `src/main/db/seed.ts`  
**Description:** Uses IDs like "u1", "b1", "loc1" which will conflict if users manually create records with similar patterns.

---

## 5. UI/UX Issues

### 🟡 UX-001: No Loading States for IPC Calls

**Description:** Many pages call `window.api.*.getAll()` on mount but don't show loading indicators while waiting for the database response.  
**Impact:** Brief flash of empty content.

---

### 🟡 UX-002: No Optimistic Updates

**Description:** CRUD operations wait for IPC round-trip before updating UI. For a local app, this adds perceived latency.

---

### 🟡 UX-003: No Confirmation Dialogs for Destructive Actions

**Description:** Delete operations (products, categories, users) may proceed without confirmation dialogs (varies by screen).  
**Impact:** Accidental data deletion.

---

### 🟢 UX-004: External Font Loading Requires Internet

**Location:** `src/renderer/src/index.css` line 1
```css
@import url('https://fonts.googleapis.com/css2?family=Nunito+Sans...');
```
**Description:** The offline-first app loads Google Fonts from CDN. If no internet on first launch, fonts won't render correctly.  
**Impact:** Font fallback in offline environments.

---

## 6. Performance Issues

### 🟡 PERF-001: `orders:getAll` Loads All Items for All Orders

**Location:** `src/main/ipc/orders.ts` line 40
```typescript
const items = db().prepare("SELECT * FROM order_items").all() as Row[];
```
**Description:** Fetches ALL order items into memory and filters in JS. With thousands of orders, this is O(n²).  
**Impact:** Degrading performance over time.

---

### 🟡 PERF-002: `products:getAll` Loads All Variants

**Description:** Similar pattern — loads all variants then filters by product_id in JavaScript.  
**Impact:** Slow with large catalogs.

---

### 🟢 PERF-003: No Database Indexes on Frequently Queried Columns

**Description:** While the schema in docs shows indexes, the actual `schema.ts` has no CREATE INDEX statements.  
**Impact:** Full table scans on lookups as data grows.

---

## 7. Missing Infrastructure

### 🔴 INFRA-001: Zero Test Coverage

**Description:** No testing framework configured (no Jest, Vitest, Playwright). No unit tests, integration tests, or E2E tests.  
**Impact:** Cannot refactor safely; regressions undetected.

---

### 🟠 INFRA-002: No Build/Package Configuration

**Description:** `electron-builder.yml` referenced in docs doesn't exist. No Windows/macOS installer configs.  
**Impact:** Cannot distribute the application.

---

### 🟠 INFRA-003: No Auto-Update Mechanism

**Description:** `electron-updater` is a dependency but no updater code exists.  
**Impact:** Users must manually reinstall for updates.

---

### 🟡 INFRA-004: No Environment Configuration

**Description:** No `.env` file, no environment-specific configs. Database path is hardcoded.

---

### 🟡 INFRA-005: Empty `tasks/` Directory

**Description:** Documentation references phase task files but the directory is empty.  
**Impact:** No task tracking for implementation progress.

---

## 8. Inconsistencies with Documentation

| Doc Says | Reality |
|----------|---------|
| `src/shared/constants.ts` for IPC channels | Directory doesn't exist |
| `src/main/hardware/` for device drivers | Directory doesn't exist |
| PIN hashed with bcrypt | PIN stored plaintext |
| `schema_version` table for migrations | Not implemented |
| `electron-builder.yml` for packaging | File doesn't exist |
| `staff` table has `pin_hash` column | Actual column is just `pin` |
| GraphQL mutation for orders | Uses IPC (doc outdated from pivot) |
| Receipt printing via ESC/POS driver | Console.log stub only |

---

## 9. Summary Statistics

| Severity | Count |
|----------|-------|
| 🔴 Critical | 3 |
| 🟠 High | 6 |
| 🟡 Medium | 16 |
| 🟢 Low | 4 |
| **Total Issues** | **29** |
