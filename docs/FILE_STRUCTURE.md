# Naseej Desktop — File Structure

> Generated: 2026-05-30  
> Stack: Electron + Vite + React + TypeScript + SQLite (better-sqlite3) + Tailwind CSS

---

## Root

```
naseej-desktop/
├── electron.vite.config.ts     # Vite build config for Electron (main + preload + renderer)
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json               # Root TypeScript config (references node + web)
├── tsconfig.node.json          # TypeScript config for main process & preload
├── tsconfig.web.json           # TypeScript config for renderer (React)
├── docs/                       # Project documentation
├── tasks/                      # Phase-by-phase implementation plans
└── src/                        # All application source code
```

---

## `src/main/` — Electron Main Process

The main process owns the SQLite database, all IPC handlers, and native OS integration.

```
src/main/
├── index.ts                    # Entry point: creates BrowserWindow, registers IPC, handles lifecycle
│
├── db/
│   ├── database.ts             # Singleton SQLite connection (getDb / closeDb)
│   ├── schema.ts               # CREATE TABLE IF NOT EXISTS for all tables + idempotent migrations
│   └── seed.ts                 # Seeds demo data on first launch (staff, products, variants, inventory)
│
└── ipc/                        # One file per domain — each exports registerXxxHandlers()
    ├── categories.ts           # categories:getAll/create/update/delete, sizes:getAll
    ├── customers.ts            # customers:getAll/search/getById/create/update/delete
    ├── dailySummary.ts         # dailySummary:getByDate/getLatest/upsert
    ├── inventory.ts            # inventory:getAll/getByVariant/adjust
    ├── locations.ts            # locations:getAll/create/update/delete
    ├── merchant.ts             # merchant:getConfig/setConfig, salesReport:getSummary
    ├── orders.ts               # orders:getAll/getById/getByReceiptNumber/create/updateStatus
    ├── products.ts             # products:getAll/getById/create/update/delete
    │                           # variants:getAll/getByBarcode/create/update/delete
    │                           # colors:getAll, brands:getAll
    ├── roles.ts                # roles:getAll/create/update/delete
    ├── staff.ts                # staff:getAll/authenticate/create/update/delete
    ├── users.ts                # users:getAll/create/update/delete
    └── variantTypes.ts         # variantTypes:getAll/create/update/delete
```

### Database Schema (SQLite tables)

| Table | Purpose |
|---|---|
| `staff` | POS users authenticated by PIN (cashiers, managers) |
| `brands` | Product brands |
| `colors` | Color palette with hex codes |
| `sizes` | Size definitions with sort order |
| `categories` | Hierarchical product categories |
| `category_sizes` | Category ↔ Size junction |
| `products` | Base product definitions |
| `product_variants` | Atomic sellable SKUs (size × color × price) |
| `locations` | Store branches / warehouses |
| `inventory_levels` | Stock qty per variant per location |
| `customers` | Customer CRM with loyalty points |
| `orders` | Completed sales transactions |
| `order_items` | Line items per order (includes `variant_id` FK) |
| `daily_summaries` | End-of-day report snapshots |
| `roles` | RBAC role definitions |
| `users` | Staff management users |
| `variant_types` | Variant attribute types (Size, Color, Material…) |
| `variant_type_values` | Values per variant type |
| `merchant_config` | Key-value store for merchant settings |

---

## `src/preload/` — Preload Script

```
src/preload/
└── index.ts                    # Exposes window.api to renderer via contextBridge
                                # All IPC invoke calls are wrapped here as typed functions
```

The `window.api` object groups all IPC calls by domain:
`staff`, `products`, `variants`, `colors`, `brands`, `customers`, `orders`, `inventory`,
`categories`, `sizes`, `locations`, `users`, `roles`, `variantTypes`, `dailySummary`,
`merchant`, `salesReport`

Plus hardware stubs: `printReceipt`, `openCashDrawer`, `onBarcodeScanned`

---

## `src/renderer/` — React Renderer

```
src/renderer/
├── index.html                  # Vite HTML entry point
│
├── content/
│   ├── ar.json                 # Arabic i18n translations
│   └── en.json                 # English i18n translations
│
└── src/
    ├── App.tsx                 # Root component: auth gate, layout switcher, keyboard shortcuts
    ├── main.tsx                # ReactDOM.createRoot entry
    └── index.css               # Tailwind base + custom CSS variables (design tokens)
```

### `src/renderer/src/components/` — Shared UI Components

```
components/
├── layout/
│   ├── Sidebar.tsx             # Left navigation rail with layout switcher (POS / Catalog / Users)
│   └── StatusBar.tsx           # Top title bar: clock, network, user info, window controls
│
└── ui/
    ├── ChipMultiSelect.tsx     # Multi-select chip input
    ├── LanguageSwitcher.tsx    # AR / EN toggle
    ├── ToggleSwitch.tsx        # Boolean toggle
    └── custom/
        ├── dialog/Dialog.tsx   # Accessible dialog wrapper
        ├── drawer/Drawer.tsx   # Slide-in drawer
        ├── modal/Modal.tsx     # General-purpose modal with header/footer slots
        ├── popover/Popover.tsx # Floating popover
        └── toast/              # Toast notification system
            ├── ToastProvider.tsx
            ├── useToast.ts
            ├── toast.types.ts
            └── index.ts
```

### `src/renderer/src/features/` — Feature Modules

Each feature module follows the same structure:
```
feature/
├── index.ts        # Public exports (screens, types, layout)
├── layout.tsx      # Feature-level layout wrapper (navigation tabs, breadcrumbs)
├── types.ts        # Domain type definitions
├── components/     # Reusable UI pieces scoped to this feature
├── hooks/          # Custom React hooks scoped to this feature
├── modals/         # Modal dialogs scoped to this feature
└── screens/        # Full page views (routed from App.tsx)
```

---

#### `features/pos/` — Point of Sale

```
pos/
├── types.ts                    # User, Product, ProductVariant, CartItem, Cart, Customer,
│                               # Order, OrderItem, InventoryItem, PaymentMethod
│
├── screens/
│   ├── RegisterPage.tsx        # Main cashier screen: cart, search, barcode scanner, payment
│   ├── OrdersPage.tsx          # Order history with search and status filters
│   ├── EndOfDayPage.tsx        # End-of-day cash reconciliation
│   └── SalesReportPage.tsx     # Sales summary and analytics
│
└── modals/
    ├── PaymentModal.tsx        # Payment processing: CASH/CARD/SPLIT/LOYALTY tabs + real IPC
    ├── RefundExchangeModal.tsx # Refund by receipt number + real inventory restoration
    ├── CloseCashModal.tsx      # Cash count modal
    ├── CloseShiftModal.tsx     # Shift close confirmation
    ├── CompleteOrderModal.tsx  # Post-payment confirmation
    ├── HoldingPage.tsx         # Held orders management
    ├── ProductsModal.tsx       # Product selection overlay
    └── ReceiptExecutionModal.tsx # Receipt print preview
```

---

#### `features/catalog/` — Product Catalog Management

```
catalog/
├── screens/
│   ├── InventoryPage.tsx       # Products list with variants and stock
│   ├── CategoriesListPage.tsx  # Category tree management
│   ├── CreateCategoryPage.tsx  # Category creation wizard
│   ├── CreateProductPage.tsx   # Product + variant matrix creation
│   ├── VariantsPage.tsx        # Variant types and values management
│   ├── BarcodeScreen.tsx       # Barcode label printing
│   └── WarehousesPage.tsx      # Warehouse/location management
│
├── modals/
│   ├── CreateCategoryModal.tsx
│   ├── CreateProductModal.tsx
│   ├── CreateVariantModal.tsx
│   ├── CreateWarehouseModal.tsx
│   ├── EditCategoryModal.tsx
│   ├── EditProductModal.tsx
│   ├── EditVariantModal.tsx
│   └── EditWarehouseModal.tsx
│
├── components/
│   ├── VariantMatrix.tsx       # Size × Color grid for variant management
│   ├── CategoryInfoFields.tsx
│   ├── MatrixCell.tsx
│   ├── PostSaveModal.tsx
│   ├── SearchableCombobox.tsx
│   ├── StandardSizesToggle.tsx
│   ├── SuccessToast.tsx
│   ├── TagInput.tsx
│   ├── UnsavedChangesBar.tsx
│   └── ...
│
├── hooks/
│   ├── useCreateCategoryForm.ts
│   └── usePrintBarcodes.ts
│
└── types/
    ├── product.ts
    ├── category.types.ts
    └── createCategory.schema.ts
```

---

#### `features/users/` — Staff & Role Management

```
users/
├── screens/
│   ├── UsersPage.tsx           # Staff list with create/edit/delete
│   ├── UserPage.tsx            # Individual user detail
│   ├── RolesPage.tsx           # Role list with permission overview
│   ├── CreateRolePage.tsx
│   └── EditRolePage.tsx
│
└── modals/
    ├── CreateUserModal.tsx
    ├── EditUserModal.tsx
    ├── CreateRoleModal.tsx
    └── EditRoleModal.tsx
```

---

#### `features/loyality/` — Loyalty & Customers

```
loyality/
└── screens/
    ├── CustomersPage.tsx       # Customer CRM list
    ├── CouponsPage.tsx         # Discount coupon management
    ├── LoyaltyActionsPage.tsx  # Loyalty point rules
    └── LoyaltySettingsPage.tsx # Loyalty program configuration
```

---

#### `features/Settings/` — Application Settings

```
Settings/
└── screens/
    ├── GeneralSettingsPage.tsx
    ├── MerchantSettingsPage.tsx
    ├── PrintingSettingsPage.tsx
    ├── PaymentGatewaysPage.tsx
    ├── DevicesPage.tsx
    └── NotificationsPage.tsx
```

---

#### `features/assets/` — Asset / Warehouse Management (stub)

```
assets/
└── screens/
    ├── BranchesPage.tsx
    ├── OrdersPage.tsx
    ├── PurchasesPage.tsx
    └── WareHousesPage.tsx
```

---

#### `features/hr/` — Human Resources (stub)

```
hr/
├── layout.tsx
└── types.ts
```

---

### `src/renderer/src/lib/` — Utilities

```
lib/
├── i18n.ts     # i18next setup: AR / EN, RTL detection, namespace loading
└── utils.ts    # cn() (clsx+twMerge), formatSAR(), generateId(), formatDate()
```

### `src/renderer/src/types/`

```
types/
└── electron.d.ts   # Full TypeScript declaration for window.api (ElectronAPI interface)
                    # Includes all record shapes and IPC method signatures
```

### `src/renderer/src/data/`

```
data/
├── dummy-data.ts    # MERCHANT_CONFIG constant (used by UI until merchant:getConfig loads)
└── ui-demo-data.ts  # Static data for UIShowcasePage
```

### `src/renderer/src/pages/`

```
pages/
├── LoginPage.tsx      # PIN-based staff authentication screen
└── UIShowcasePage.tsx # Design system component showcase (dev only)
```

---

## `docs/` — Documentation

```
docs/
├── BACKEND_STRUCTURE.md        # Database schema and IPC API reference
├── CODE_INSTRUCTIONS.md        # Coding conventions and patterns
├── DATA_MODELS_SCHEMAS.md      # Data model definitions and relationships
├── FILE_STRUCTURE.md           # ← This file
├── FRONTEND_PAGES_FEATURES.md  # Page-by-page feature breakdown
├── IMPLEMENTATION_PLAN.md      # High-level phased roadmap
├── NASEEJ_BRD.md               # Business Requirements Document
├── NASEEJ_PRD.md               # Product Requirements Document
├── POS_APP_MAP.md              # Screen flow and navigation map
└── POS_APP_STRUCTURE.md        # POS feature architecture
```

---

## `tasks/` — Phase Implementation Plans

```
tasks/
├── PHASE_1_CORE_POS_LOOP.md        # Scan → Cart → Pay → Persist → Inventory (Week 1–2)
├── PHASE_2_REPORTING_AND_DATA_FLOW.md
├── PHASE_3_ADVANCED_FEATURES.md
└── PHASE_4_HARDWARE_AND_PRODUCTION.md
```

---

## Key Architecture Decisions

| Decision | Details |
|---|---|
| **Process isolation** | Main process owns SQLite; renderer never touches the DB directly |
| **IPC pattern** | All DB access via `ipcMain.handle` + `ipcRenderer.invoke` through typed `window.api` |
| **Context isolation** | `nodeIntegration: false`, `contextIsolation: true` — security-first |
| **State management** | React `useState` + `useCallback` only; no global state library |
| **Routing** | Enum-based view switching in `App.tsx` — no React Router (desktop single-window) |
| **i18n** | i18next with AR/EN JSON files; RTL layout via Tailwind `dir` attribute |
| **Inventory deduction** | Inside `orders:create` transaction — atomic with order insert |
| **Receipt numbers** | `POS-YYYYMMDD-NNNN` generated server-side; sequential per day |
| **Barcode scanning** | USB scanner keyboard emulation captured in renderer; IPC path added in Phase 4 |
