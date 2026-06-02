/**
 * IPC Channel constants — single source of truth for all channel names.
 * Used by both main process handlers and preload bridge.
 */
export const IPC_CHANNELS = {
  // ── Window Controls ─────────────────────────────────────────────────────────
  WINDOW_MINIMIZE: "window:minimize",
  WINDOW_MAXIMIZE: "window:maximize",
  WINDOW_CLOSE: "window:close",

  // ── Hardware ────────────────────────────────────────────────────────────────
  HARDWARE_PRINT_RECEIPT: "hardware:print-receipt",
  HARDWARE_OPEN_DRAWER: "hardware:open-drawer",
  SCANNER_BARCODE: "scanner:barcode",
  SYSTEM_NETWORK_STATUS: "system:network-status",

  // ── Staff ───────────────────────────────────────────────────────────────────
  STAFF_GET_ALL: "staff:getAll",
  STAFF_AUTHENTICATE: "staff:authenticate",
  STAFF_CREATE: "staff:create",
  STAFF_UPDATE: "staff:update",
  STAFF_DELETE: "staff:delete",

  // ── Products ────────────────────────────────────────────────────────────────
  PRODUCTS_GET_ALL: "products:getAll",
  PRODUCTS_GET_BY_ID: "products:getById",
  PRODUCTS_CREATE: "products:create",
  PRODUCTS_UPDATE: "products:update",
  PRODUCTS_DELETE: "products:delete",
  PRODUCTS_SEARCH: "products:search",
  PRODUCTS_EXPORT_CSV: "products:exportCsv",
  PRODUCTS_OPEN_CSV_FILE: "products:openCsvFile",
  PRODUCTS_IMPORT_BATCH: "products:importBatch",

  // ── Variants ────────────────────────────────────────────────────────────────
  VARIANTS_GET_ALL: "variants:getAll",
  VARIANTS_GET_BY_BARCODE: "variants:getByBarcode",
  VARIANTS_CREATE: "variants:create",
  VARIANTS_UPDATE: "variants:update",
  VARIANTS_DELETE: "variants:delete",

  // ── Colors & Brands ─────────────────────────────────────────────────────────
  COLORS_GET_ALL: "colors:getAll",
  BRANDS_GET_ALL: "brands:getAll",

  // ── Customers ───────────────────────────────────────────────────────────────
  CUSTOMERS_GET_ALL: "customers:getAll",
  CUSTOMERS_SEARCH: "customers:search",
  CUSTOMERS_GET_BY_ID: "customers:getById",
  CUSTOMERS_CREATE: "customers:create",
  CUSTOMERS_UPDATE: "customers:update",
  CUSTOMERS_DELETE: "customers:delete",

  // ── Orders ──────────────────────────────────────────────────────────────────
  ORDERS_GET_ALL: "orders:getAll",
  ORDERS_GET_PAGE: "orders:getPage",
  ORDERS_GET_BY_ID: "orders:getById",
  ORDERS_GET_BY_RECEIPT: "orders:getByReceiptNumber",
  ORDERS_CREATE: "orders:create",
  ORDERS_UPDATE_STATUS: "orders:updateStatus",

  // ── Inventory ───────────────────────────────────────────────────────────────
  INVENTORY_GET_ALL: "inventory:getAll",
  INVENTORY_GET_BY_VARIANT: "inventory:getByVariant",
  INVENTORY_ADJUST: "inventory:adjust",
  INVENTORY_SET_QTY: "inventory:setQty",
  INVENTORY_ADD_LOCATION: "inventory:addLocation",

  // ── Categories & Sizes ──────────────────────────────────────────────────────
  CATEGORIES_GET_ALL: "categories:getAll",
  CATEGORIES_CREATE: "categories:create",
  CATEGORIES_UPDATE: "categories:update",
  CATEGORIES_DELETE: "categories:delete",
  SIZES_GET_ALL: "sizes:getAll",

  // ── Locations ───────────────────────────────────────────────────────────────
  LOCATIONS_GET_ALL: "locations:getAll",
  LOCATIONS_CREATE: "locations:create",
  LOCATIONS_UPDATE: "locations:update",
  LOCATIONS_DELETE: "locations:delete",

  // ── Users ───────────────────────────────────────────────────────────────────
  USERS_GET_ALL: "users:getAll",
  USERS_CREATE: "users:create",
  USERS_UPDATE: "users:update",
  USERS_DELETE: "users:delete",

  // ── Roles ───────────────────────────────────────────────────────────────────
  ROLES_GET_ALL: "roles:getAll",
  ROLES_CREATE: "roles:create",
  ROLES_UPDATE: "roles:update",
  ROLES_DELETE: "roles:delete",

  // ── Variant Types ───────────────────────────────────────────────────────────
  VARIANT_TYPES_GET_ALL: "variantTypes:getAll",
  VARIANT_TYPES_CREATE: "variantTypes:create",
  VARIANT_TYPES_UPDATE: "variantTypes:update",
  VARIANT_TYPES_DELETE: "variantTypes:delete",

  // ── Daily Summary ───────────────────────────────────────────────────────────
  DAILY_SUMMARY_GET_BY_DATE: "dailySummary:getByDate",
  DAILY_SUMMARY_GET_LATEST: "dailySummary:getLatest",
  DAILY_SUMMARY_COMPUTE: "dailySummary:computeForDate",
  DAILY_SUMMARY_UPSERT: "dailySummary:upsert",

  // ── Merchant & Reports ──────────────────────────────────────────────────────
  MERCHANT_GET_CONFIG: "merchant:getConfig",
  MERCHANT_SET_CONFIG: "merchant:setConfig",
  SALES_REPORT_GET_SUMMARY: "salesReport:getSummary",

  // ── Discounts ───────────────────────────────────────────────────────────────
  DISCOUNTS_VALIDATE: "discounts:validate",
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
