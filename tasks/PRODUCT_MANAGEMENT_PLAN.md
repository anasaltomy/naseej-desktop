# Full Product Management System — Implementation Plan

**Project:** Naseej POS Desktop  
**Scope:** Catalog feature module — complete, functional product management on local SQLite storage  
**Date:** 2026-05-30  
**Stack:** Electron · React 18 · TypeScript · better-sqlite3 · Tailwind CSS

---

## 1. Current State Audit

### 1.1 What Is Already Built

#### Backend IPC Handlers (all wired and working)

| Handler file | Channels | Status |
|---|---|---|
| `ipc/products.ts` | `products:getAll/getById/create/update/delete` | ✅ Working |
| `ipc/products.ts` | `variants:getAll/getByBarcode/create/update/delete` | ✅ Working |
| `ipc/products.ts` | `colors:getAll`, `brands:getAll` | ✅ Working |
| `ipc/categories.ts` | `categories:getAll/create/update/delete`, `sizes:getAll` | ✅ Working |
| `ipc/inventory.ts` | `inventory:getAll/getByVariant/adjust` | ✅ Working |
| `ipc/locations.ts` | `locations:getAll/create/update/delete` | ✅ Working |
| `ipc/variantTypes.ts` | `variantTypes:getAll/create/update/delete` | ✅ Working |

#### Database Schema (SQLite — fully initialized)

All tables exist and are seeded with demo data:
`products`, `product_variants`, `categories`, `category_sizes`, `brands`, `colors`, `sizes`, `locations`, `inventory_levels`, `variant_types`, `variant_type_values`

#### Frontend Screens (Catalog module)

| Screen | File | Status |
|---|---|---|
| Products/Inventory list | `screens/InventoryPage.tsx` | ⚠️ Partial — bugs listed below |
| Create product (modal) | `modals/CreateProductModal.tsx` | ✅ Working |
| Edit product (modal) | `modals/EditProductModal.tsx` | ⚠️ Partial — bugs listed below |
| Categories list + CRUD | `screens/CategoriesListPage.tsx` | ✅ Working |
| Variant types management | `screens/VariantsPage.tsx` | ✅ Working |
| Warehouses/locations | `screens/WarehousesPage.tsx` | ✅ Working |
| Barcode printing | `screens/BarcodeScreen.tsx` | ✅ Working |

---

### 1.2 Known Bugs & Gaps

#### Bug 1 — InventoryPage: Edit Opens With Empty Brand/Category/Description

**File:** `src/renderer/src/features/catalog/screens/InventoryPage.tsx`  
**Root cause:** `handleEditClick` constructs the edit payload from the `InventoryItem` type which does not carry `brandId`, `categoryId`, or `description`. It passes empty strings `""` for all three.  
**Impact:** Opening Edit Product always shows blank Brand and Category dropdowns even though the product has them in the DB.

```typescript
// Current (broken):
setEditProduct({
  id: item.productId,
  name: item.productName,
  modelNumber: item.sku,
  basePrice: item.price,
  brandId: "",        // ← always empty
  categoryId: "",     // ← always empty
  description: "",    // ← always empty
});
```

**Fix:** Call `window.api.products.getById(item.productId)` before opening the modal and populate all fields from the returned product record.

---

#### Bug 2 — EditProductModal: Updating Price Does Not Update Variants

**File:** `src/renderer/src/features/catalog/modals/EditProductModal.tsx`  
**Root cause:** `products:update` IPC only writes to the `products` table. The `product_variants` table has its own `price` column that is never touched. Changing price in the Edit modal has no effect at the variant level (which is the price used at checkout).  
**Impact:** Cashiers see stale prices after a manager updates a product price.

**Fix:** Add a `updateVariantPrices` checkbox to EditProductModal. When checked, after calling `products.update`, also call `variants.update` for each variant belonging to the product, setting the new price.

---

#### Bug 3 — InventoryPage: No Delete Product Functionality

**File:** `src/renderer/src/features/catalog/screens/InventoryPage.tsx`  
**Root cause:** No delete button exists. The `products:delete` IPC handler is implemented and working but is never called from the UI.  
**Impact:** Products can only be created, never removed.

---

#### Bug 4 — InventoryPage: No Stock Adjustment UI

**File:** `src/renderer/src/features/catalog/screens/InventoryPage.tsx`  
**Root cause:** The `inventory:adjust` IPC handler is wired in the backend but no modal/form in the UI calls it. The expanded row view shows stock levels per location but provides no way to change them.  
**Impact:** Stock can never be corrected manually (no restock, no damage writeoff, no count reconciliation).

---

#### Bug 5 — EditProductModal: Cannot Manage Variants

**File:** `src/renderer/src/features/catalog/modals/EditProductModal.tsx`  
**Root cause:** EditProductModal only edits top-level product fields (name, sku, price, brand, category, description). It has no section to view, add, edit, or delete the product's variants.  
**Impact:** After a product is created, its variants (size/color/price/barcode combinations) are frozen — they can never be changed.

---

#### Gap 6 — No Filter / Sort on InventoryPage

**Root cause:** Only free-text search exists. No category filter, brand filter, stock-status filter (all / low-stock / out-of-stock), or sort order controls.  
**Impact:** As the catalog grows, finding specific products becomes difficult.

---

#### Gap 7 — InventoryPage Shows Variant-Level Rows, Not Product-Level

**Root cause:** `inventory:getAll` returns one row per variant. The InventoryPage renders one row per variant, so a product with 6 size/color combos generates 6 rows — no product-level grouping.  
**Impact:** Visually cluttered list; no way to see all variants of a product at a glance before expanding. The product name is repeated on every variant row.

---

#### Gap 8 — No Product Detail / View Modal

**Root cause:** Clicking a product row only toggles the inline stock expansion. There is no dedicated "View Product" panel that shows all metadata: description, brand, category, all variants with individual prices, barcodes, and per-location stock.

---

## 2. Implementation Phases

---

### Phase A — Critical Bug Fixes (highest priority)

> Goal: Make existing Create / Edit / Delete flow fully functional.

---

#### Task A.1 — Fix handleEditClick to Fetch Real Product Data

**File to change:** `src/renderer/src/features/catalog/screens/InventoryPage.tsx`

**Change:**
1. Add async `handleEditClick` that calls `window.api.products.getById(item.productId)` to fetch the full product record (with `brandId`, `categoryId`, `description`).
2. Only open the modal after the data is loaded; show a loading spinner on the button while fetching.

```typescript
const handleEditClick = async (item: InventoryItem, e: React.MouseEvent) => {
  e.stopPropagation();
  const product = await window.api?.products.getById(item.productId);
  if (!product) return;
  setEditProduct({
    id: product.id,
    name: product.name,
    modelNumber: product.sku,
    basePrice: item.price,   // variant price as starting value
    brandId: product.brandId ?? "",
    categoryId: product.categoryId ?? "",
    description: product.description ?? "",
  });
};
```

---

#### Task A.2 — Add Delete Product to InventoryPage

**File to change:** `src/renderer/src/features/catalog/screens/InventoryPage.tsx`

**Change:**
1. Add a `Trash2` icon button in the expanded row actions section.
2. Show a confirmation dialog before deleting (use the existing `Dialog` component from `components/ui/custom/dialog`).
3. On confirm, call `window.api.products.delete(item.productId)` and reload.
4. Since `product_variants` has `ON DELETE CASCADE`, variants are deleted automatically.

**Note:** Warn the user that deleting a product with past order items will not delete those order records — it only removes the product from the catalog.

---

#### Task A.3 — Fix EditProductModal: Apply Price to All Variants

**File to change:** `src/renderer/src/features/catalog/modals/EditProductModal.tsx`

**Changes:**
1. Add a `boolean` state `updateAllVariantPrices` (default: `true`).
2. Show a checkbox: "Also update price for all existing variants".
3. After calling `products.update`, if `updateAllVariantPrices` is true:
   - Fetch variants for the product: `window.api.variants.getAll()` filtered by `productId`.
   - Call `window.api.variants.update({ id, price: parseFloat(basePrice) })` for each.

---

### Phase B — Variant Management on Edit Modal

> Goal: Allow adding, editing, and deleting a product's variants after creation.

---

#### Task B.1 — Add Variants Tab to EditProductModal

**File to change:** `src/renderer/src/features/catalog/modals/EditProductModal.tsx`

**Change:** Convert the single-form modal into a two-tab modal:
- **Tab 1: "Product Info"** — existing fields (name, sku, price, brand, category, description).
- **Tab 2: "Variants"** — new tab with the variant management table described below.

Tab implementation: Use two `<button>` elements with an `activeTab` state — no external library needed.

---

#### Task B.2 — Variant Management Table (inside Tab 2)

**New component:** `src/renderer/src/features/catalog/components/ProductVariantTable.tsx`

This component receives `productId: string` as a prop, loads the variants, and renders a table with:

| Column | Content |
|---|---|
| Size | `variant.size` (text) |
| Color | Color swatch (`variant.colorHex`) + name |
| SKU | Monospace text, editable inline |
| Barcode | Editable inline |
| Price (SAR) | Editable inline number input |
| Stock | Read-only sum across locations |
| Actions | Edit (pencil icon), Delete (trash icon) |

**Inline editing:** Clicking Edit on a row turns the row's fields into inputs. Save writes via `window.api.variants.update(...)`. Cancel restores original values.

**Add variant:** "Add Variant" button at the bottom opens the existing `CreateVariantModal` pre-filled with `productId`.

**Delete variant:** Shows confirmation dialog. Calls `window.api.variants.delete(id)`. Deleting a variant that has `order_items` referencing it should be blocked gracefully (the DB FK is nullable so it won't crash, but the UI should warn).

---

#### Task B.3 — Stock Per Location on Variant Row

**New component:** `src/renderer/src/features/catalog/components/VariantStockRow.tsx`

Expand a variant row to show stock per location (same as InventoryPage does today). This makes the full product editing experience a one-stop-shop.

---

### Phase C — Stock Adjustment Modal

> Goal: Allow cashiers and managers to correct inventory (restock, damage writeoff, count reconciliation).

---

#### Task C.1 — Create StockAdjustmentModal

**New file:** `src/renderer/src/features/catalog/modals/StockAdjustmentModal.tsx`

**Props:**
```typescript
interface StockAdjustmentModalProps {
  open: boolean;
  onClose: () => void;
  variantId: string;
  variantLabel: string;  // e.g. "Nike Air Max — Size 42 / Black"
  locations: Array<{ locationId: string; locationName: string; currentQty: number }>;
  onSuccess: () => void;
}
```

**Form fields:**
- Location selector (dropdown, shows current qty)
- Adjustment type: `restock` | `damage` | `loss` | `count` | `adjustment`
- New quantity input **OR** delta input (toggle between "set to" and "+/- by")
- Notes (optional textarea)
- Confirm button

**On confirm:**
1. Calculate `delta = newQty - currentQty` (or use entered delta directly).
2. Call `window.api.inventory.adjust({ variantId, locationId, delta })`.
3. Show success toast, reload data.

---

#### Task C.2 — Wire StockAdjustmentModal to InventoryPage

**File to change:** `src/renderer/src/features/catalog/screens/InventoryPage.tsx`

In the expanded row view, add an "Adjust Stock" button for each location row. Clicking it opens `StockAdjustmentModal` pre-populated with the variant's location data.

---

### Phase D — Advanced Search & Filtering

> Goal: Make large catalogs navigable with filters and sort.

---

#### Task D.1 — Add Filter Toolbar to InventoryPage

**File to change:** `src/renderer/src/features/catalog/screens/InventoryPage.tsx`

**New UI elements (add below the existing search bar):**

```
[Search input]  [Category ▼]  [Brand ▼]  [Stock Status ▼]  [Sort: Name ▼]
```

- **Category filter:** Dropdown populated from `window.api.categories.getAll()`. Multi-level (shows parent then children indented).
- **Brand filter:** Dropdown populated from `window.api.brands.getAll()`.
- **Stock status filter:** `All` | `In Stock` | `Low Stock` | `Out of Stock`.
- **Sort:** `Name A→Z` | `Name Z→A` | `Price ↑` | `Price ↓` | `Stock ↑` | `Stock ↓`.

**Filtering logic (all client-side, data already in memory):**
```typescript
const filtered = inventory
  .filter(item => !categoryFilter || item.categoryId === categoryFilter)
  .filter(item => !brandFilter || item.brandId === brandFilter)
  .filter(item => {
    if (stockFilter === 'out') return isOutOfStock(item);
    if (stockFilter === 'low') return isLowStock(item) && !isOutOfStock(item);
    return true; // 'all' or 'in-stock'
  })
  .filter(item => !searchQuery || /* existing text search */)
  .sort(/* by selected sort key */);
```

**Note:** `InventoryItem` type will need `categoryId` and `brandId` added so filters can work. Update `inventory:getAll` IPC handler to JOIN and include these fields, or add a separate `products:getAll` fetch.

---

#### Task D.2 — Product-Grouped View Mode

**File to change:** `src/renderer/src/features/catalog/screens/InventoryPage.tsx`

Add a view-mode toggle: **Variant View** (current, one row per variant) vs **Product View** (one card per product, variants listed inside).

**Product View** groups variants by `productId`. Each product card shows:
- Product name, SKU, brand, category
- Variant count
- Total stock across all variants and locations
- Stock status indicator
- Edit / Delete / Add Variant buttons

This mode is better for managers reviewing the catalog. Variant view is better for stock-level work.

---

### Phase E — Product Detail Modal

> Goal: A read-mostly "View Product" panel that shows everything about a product.

---

#### Task E.1 — Create ProductDetailModal

**New file:** `src/renderer/src/features/catalog/modals/ProductDetailModal.tsx`

**Trigger:** Clicking the product name text in InventoryPage opens this modal.

**Sections:**
1. **Header:** Product name, SKU, brand badge, category badge, description.
2. **Variants table:** Size, color, price, compare-at price, barcode, SKU — all read-only.
3. **Stock section:** Per-variant, per-location stock table. Total stock column.
4. **Actions bar:** Edit Product button (opens EditProductModal), Print Barcodes button (navigates to BarcodeScreen), Close.

---

### Phase F — Backend Enhancements

> Goal: Fill gaps in IPC handlers needed by Phase D and E.

---

#### Task F.1 — Add categoryId/brandId to inventory:getAll Response

**File to change:** `src/main/ipc/inventory.ts`

Update the SQL query to JOIN `products` and include `brand_id` and `category_id`:
```sql
SELECT 
  pv.*,
  p.name AS product_name,
  p.brand_id,
  p.category_id
FROM product_variants pv 
JOIN products p ON p.id = pv.product_id
ORDER BY p.name, pv.size
```

Return `brandId` and `categoryId` in the mapped result so the frontend filters work.

---

#### Task F.2 — Add products:search IPC Handler

**File to change:** `src/main/ipc/products.ts`

Add a dedicated search handler for full-text searches across multiple fields:
```typescript
ipcMain.handle("products:search", (_event, query: string) => {
  const like = `%${query}%`;
  return db().prepare(`
    SELECT p.*, b.name AS brand_name, c.name AS category_name
    FROM products p
    LEFT JOIN brands b ON b.id = p.brand_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.name LIKE ?
       OR p.sku  LIKE ?
       OR p.barcode LIKE ?
       OR b.name LIKE ?
    ORDER BY p.name
  `).all(like, like, like, like);
});
```

Add to `preload/index.ts`:
```typescript
search: (query: string) => ipcRenderer.invoke("products:search", query),
```

---

#### Task F.3 — Add inventory:setQty IPC Handler (for count reconciliation)

**File to change:** `src/main/ipc/inventory.ts`

The existing `inventory:adjust` takes a `delta` (relative change). Add `inventory:setQty` which takes an absolute new value. This is needed for "physical inventory count" where you type the actual counted qty rather than calculating a delta:
```typescript
ipcMain.handle("inventory:setQty", (_event, { variantId, locationId, qty }: { variantId: string; locationId: string; qty: number }) => {
  db().prepare(
    "UPDATE inventory_levels SET qty = MAX(0, ?) WHERE variant_id = ? AND location_id = ?"
  ).run(qty, variantId, locationId);
});
```

Add to `preload/index.ts` under `inventory`:
```typescript
setQty: (data: { variantId: string; locationId: string; qty: number }) =>
  ipcRenderer.invoke("inventory:setQty", data),
```

---

#### Task F.4 — Add inventory:addLocation IPC Handler

**File to change:** `src/main/ipc/inventory.ts`

Currently there is no way to add a new `inventory_levels` row for a variant at a location that was added after the product was created. Add:
```typescript
ipcMain.handle("inventory:addLocation", (_event, { variantId, locationId, qty }: { variantId: string; locationId: string; qty: number }) => {
  const id = `il-${Date.now()}`;
  db().prepare(
    "INSERT OR IGNORE INTO inventory_levels (id, variant_id, location_id, qty) VALUES (?, ?, ?, ?)"
  ).run(id, variantId, locationId, qty);
});
```

---

### Phase G — CSV Import / Export (Advanced)

> Goal: Allow bulk product management via spreadsheet.

---

#### Task G.1 — CSV Export of Products

**New file:** `src/renderer/src/features/catalog/hooks/useProductExport.ts`

Uses the `products:getAll` and `inventory:getAll` data already loaded in InventoryPage to build a CSV string and triggers a file-save dialog via Electron `dialog.showSaveDialog`.

Add IPC handler in main process:
```typescript
// src/main/ipc/products.ts
ipcMain.handle("products:exportCsv", () => {
  // Fetch all products + variants + stock levels
  // Build CSV string
  // Return CSV string to renderer which uses dialog API to save
});
```

CSV columns: `product_name, sku, barcode, brand, category, size, color, price, compare_at_price, stock_loc1, stock_loc2, ...`

---

#### Task G.2 — CSV Import of Products

**New modal:** `src/renderer/src/features/catalog/modals/ImportProductsModal.tsx`

1. File picker (Electron `dialog.showOpenDialog`) selects a CSV file.
2. Parse CSV in renderer (use `papaparse` or manual split — no new dependencies needed for simple CSVs).
3. Preview table: show first 10 rows, highlight validation errors in red.
4. Confirm import: sends parsed array to a new `products:importBatch` IPC handler.

IPC handler loops through rows and calls the same `products:create` transaction for each.

---

## 3. File Change Map

A complete reference of every file that needs to be created or modified.

### Files to MODIFY

| File | Change Summary |
|---|---|
| `src/main/ipc/products.ts` | Add `products:search`, `products:importBatch` |
| `src/main/ipc/inventory.ts` | Add `brandId/categoryId` to `inventory:getAll` response; add `inventory:setQty`, `inventory:addLocation` |
| `src/preload/index.ts` | Expose `products.search`, `inventory.setQty`, `inventory.addLocation` |
| `src/renderer/src/features/catalog/screens/InventoryPage.tsx` | Fix `handleEditClick`; add Delete; add Stock Adjustment trigger; add filter toolbar; add Product View toggle |
| `src/renderer/src/features/catalog/modals/EditProductModal.tsx` | Add variant tab; fix price cascade to variants |
| `src/renderer/src/features/pos/types.ts` | Add `brandId`, `categoryId` to `InventoryItem` type |

### Files to CREATE

| File | Purpose |
|---|---|
| `src/renderer/src/features/catalog/modals/StockAdjustmentModal.tsx` | Stock adjustment form (restock / damage / loss / count) |
| `src/renderer/src/features/catalog/modals/ProductDetailModal.tsx` | Read-only product detail view with all variants and stock |
| `src/renderer/src/features/catalog/components/ProductVariantTable.tsx` | Variant management table inside EditProductModal |
| `src/renderer/src/features/catalog/components/VariantStockRow.tsx` | Per-location stock row inside variant table |
| `src/renderer/src/features/catalog/modals/ImportProductsModal.tsx` | CSV bulk import wizard |
| `src/renderer/src/features/catalog/hooks/useProductExport.ts` | CSV export helper hook |

---

## 4. Execution Order (Task Sequence)

Work through these in order — each phase builds on the previous. Phases A and B are blockers for usable product management. Phases C–E are high-value additions. Phases F–G are backend improvements and advanced features.

```
Phase A (Bugs)          → immediate, no new files
  A.1  Fix handleEditClick
  A.2  Add Delete product
  A.3  Fix price cascade to variants

Phase B (Variant Mgmt)  → needs A.3 done first
  B.1  Two-tab EditProductModal
  B.2  ProductVariantTable component
  B.3  VariantStockRow component

Phase F (Backend)       → can be done in parallel with B
  F.1  Add brandId/categoryId to inventory:getAll
  F.2  Add products:search handler
  F.3  Add inventory:setQty handler
  F.4  Add inventory:addLocation handler

Phase C (Stock Adjust)  → needs F.3 done
  C.1  StockAdjustmentModal
  C.2  Wire to InventoryPage

Phase D (Search/Filter) → needs F.1 and F.2 done
  D.1  Filter toolbar
  D.2  Product-grouped view mode

Phase E (Detail Modal)  → can start anytime after Phase A
  E.1  ProductDetailModal

Phase G (CSV)           → last, independent
  G.1  CSV Export
  G.2  CSV Import
```

---

## 5. UI/UX Principles for New Screens

Follow the existing patterns established in the codebase:

1. **Colors:** Use CSS variables (`bg-card`, `text-foreground`, `border-border`, `text-muted-foreground`, `bg-muted`, `text-accent`, `bg-destructive/10`, `text-destructive`, `text-warning`). Never hardcode hex values.
2. **Buttons:** Use `btn-primary` for primary actions, `bg-muted text-foreground hover:bg-muted/80` for secondary, `text-destructive hover:bg-destructive/10` for dangerous.
3. **Inputs:** Use the `pos-input` CSS class for all form inputs.
4. **Modals:** Use the existing `Modal` component from `components/ui/custom/modal/Modal`.
5. **Icons:** Use only `lucide-react` icons.
6. **Loading states:** Show `<Loader2 className="animate-spin" />` on buttons while async operations are in flight.
7. **Toast feedback:** Use `useToast` from `components/ui/custom/toast` for success/error notifications.
8. **Confirmations:** Use `Dialog` from `components/ui/custom/dialog` for destructive confirmations.
9. **RTL:** All text and layout must support both LTR and RTL (i18n keys in `ar.json` / `en.json`).
10. **Accessibility:** All interactive elements need `aria-label`, `role`, focus rings (`focus:ring-2 focus:ring-ring`), and keyboard `onKeyDown` handlers.

---

## 6. Exit Criteria (Definition of Done)

The product management system is considered complete when ALL of the following are true:

| # | Criteria | Tests |
|---|---|---|
| 1 | Create a product with 6 variants (3 sizes × 2 colors) — saved in SQLite | Check `products` + `product_variants` tables directly |
| 2 | Edit a product's name, brand, category, and price — all changes reflect in the list | Reopen edit modal; check variant prices in DB |
| 3 | Delete a product — it disappears from the list and all its variants are gone | Check `product_variants` table |
| 4 | Search by product name returns correct results | Type partial name; verify filtered list |
| 5 | Search by SKU returns correct results | Type variant SKU |
| 6 | Search by barcode returns correct results | Type barcode string |
| 7 | Filter by category shows only products in that category | Select category; verify all rows match |
| 8 | Filter by brand shows only products from that brand | Select brand |
| 9 | Low-stock filter shows only variants below threshold | Adjust a variant to qty 2 |
| 10 | Out-of-stock filter shows only variants with qty 0 | Adjust a variant to qty 0 |
| 11 | Add a new variant to an existing product | Open Edit → Variants tab → Add Variant |
| 12 | Edit a variant's price individually | Edit inline in ProductVariantTable |
| 13 | Delete a variant | Confirm dialog → variant disappears |
| 14 | Adjust stock (restock +10) for a variant at a specific location | Open StockAdjustmentModal; check `inventory_levels` qty |
| 15 | Adjust stock (damage −3) for a variant | Same as above, qty decreases by 3 |
| 16 | Product Detail modal shows all variants and stock levels | Click product name → modal opens |
| 17 | Export products to CSV | CSV file saved to disk with all variants |
| 18 | Import products from CSV — new products appear in list | Import a 5-row CSV |

---

## 7. Key Data Flows Illustrated

### Create Product Flow

```
CreateProductModal
  ↓ user fills name, sku, brand, category, description
  ↓ user adds colors + sizes → VariantMatrix shows grid
  ↓ user fills qty per variant cell
  ↓ clicks "Save"
  → window.api.products.create(data)
      → IPC: "products:create"
          → INSERT INTO products
          → for each variant:
              → INSERT INTO product_variants
              → INSERT OR IGNORE INTO inventory_levels
  ← { id: "p-..." }
  → PostSaveModal: "Print Barcodes?" / "Add Another?" / "Go to Inventory"
```

### Edit Product Flow (after fix)

```
InventoryPage row → Edit button
  → window.api.products.getById(productId)  ← async fetch
  ← { id, name, sku, brandId, categoryId, description, variants: [...] }
  → EditProductModal opens, Tab 1: Product Info
    ↓ user changes price, checks "update all variants"
    → window.api.products.update({ id, name, sku, brandId, categoryId, description })
    → for each variant:
        → window.api.variants.update({ id: v.id, price: newPrice })
  → Tab 2: Variants
    → ProductVariantTable loads variants via window.api.variants.getAll() filtered by productId
    → user edits inline → window.api.variants.update(...)
    → user deletes variant → window.api.variants.delete(id)
    → user clicks "Add Variant" → CreateVariantModal (productId pre-set)
```

### Stock Adjustment Flow

```
InventoryPage expanded row → "Adjust Stock" button
  → StockAdjustmentModal opens
    { variantId, variantLabel, locations: [{ locationId, locationName, currentQty }] }
  ↓ user selects location: "Riyadh Store" (currentQty: 12)
  ↓ user selects type: "restock"
  ↓ user enters: "+20" (delta mode) OR "32" (set mode)
  ↓ clicks "Confirm Adjustment"
  → window.api.inventory.adjust({ variantId, locationId, delta: 20 })
      → IPC: "inventory:adjust"
          → UPDATE inventory_levels SET qty = MAX(0, qty + 20) WHERE ...
  → toast: "Stock updated: Riyadh Store now has 32 units"
  → reloadInventory()
```

---

## 8. Notes & Conventions

- **IDs:** All new records use the pattern `{prefix}-{Date.now()}` (e.g., `p-1748500000000`). For batch inserts, append an index: `v-1748500000000-0`, `v-1748500000000-1`.
- **No external state management:** Use local React state + `useEffect` data loading. No Redux/Zustand needed for this scale.
- **Parameterized queries only:** Never concatenate user input into SQL strings. Every IPC handler already uses `db.prepare().run()` with `?` placeholders — maintain this pattern.
- **Transactions for multi-table writes:** Any operation that writes to more than one table (create product + variants + inventory, or delete product + related records) must be wrapped in `db.transaction(() => { ... })()`.
- **Idempotent schema:** All future `ALTER TABLE` migrations must be guarded with a TypeScript check on `PRAGMA table_info(...)` before running, matching the pattern in `PHASE_1_CORE_POS_LOOP.md`.
- **TypeScript strict:** No `any` types. Use `Record<string, unknown>` for raw DB rows and map to typed interfaces before returning from IPC handlers.
