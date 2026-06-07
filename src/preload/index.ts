import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

const api = {
  // Platform detection
  getPlatform: () => process.platform,

  // Window controls
  minimizeWindow: () => ipcRenderer.send("window:minimize"),
  maximizeWindow: () => ipcRenderer.send("window:maximize"),
  closeWindow: () => ipcRenderer.send("window:close"),

  // Hardware
  printReceipt: (data: unknown) =>
    ipcRenderer.invoke("hardware:print-receipt", data),
  openCashDrawer: () => ipcRenderer.invoke("hardware:open-drawer"),

  // Scanner events (main → renderer)
  onBarcodeScanned: (callback: (barcode: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, barcode: string) =>
      callback(barcode);
    ipcRenderer.on("scanner:barcode", listener);
    return () => ipcRenderer.removeListener("scanner:barcode", listener);
  },

  // System
  getNetworkStatus: () => ipcRenderer.invoke("system:network-status"),

  // ── Database: Staff ───────────────────────────────────────────────────────
  staff: {
    getAll: () => ipcRenderer.invoke("staff:getAll"),
    authenticate: (args: { staffId?: string; pin: string }) =>
      ipcRenderer.invoke("staff:authenticate", args),
    create: (data: { firstName: string; lastName: string; email: string; role: string; pin: string }) =>
      ipcRenderer.invoke("staff:create", data),
    update: (data: { id: string; firstName?: string; lastName?: string; email?: string; role?: string; pin?: string }) =>
      ipcRenderer.invoke("staff:update", data),
    delete: (id: string) => ipcRenderer.invoke("staff:delete", id),
  },

  // ── Database: Products & Variants ────────────────────────────────────────
  products: {
    getAll: () => ipcRenderer.invoke("products:getAll"),
    getById: (id: string) => ipcRenderer.invoke("products:getById", id),
    create: (data: { name: string; sku: string; barcode?: string; brandId?: string; categoryId?: string; description?: string; basePrice?: number; variants?: Array<{ colorId: string; sizeId: string; quantity: number; barcode?: string }> }) =>
      ipcRenderer.invoke("products:create", data),
    update: (data: { id: string; name?: string; sku?: string; barcode?: string; brandId?: string; categoryId?: string; description?: string }) =>
      ipcRenderer.invoke("products:update", data),
    delete: (id: string) => ipcRenderer.invoke("products:delete", id),
    search: (query: string) => ipcRenderer.invoke("products:search", query),
    exportCsv: () => ipcRenderer.invoke("products:exportCsv"),
    openCsvFile: () => ipcRenderer.invoke("products:openCsvFile"),
    importBatch: (rows: Array<{ productName: string; sku: string; barcode?: string; size: string; color: string; colorHex: string; price: number }>) =>
      ipcRenderer.invoke("products:importBatch", rows),
  },
  variants: {
    getAll: () => ipcRenderer.invoke("variants:getAll"),
    getByBarcode: (barcode: string) => ipcRenderer.invoke("variants:getByBarcode", barcode),
    create: (data: { productId: string; sku: string; barcode?: string; size: string; color: string; colorHex: string; price: number; compareAtPrice?: number }) =>
      ipcRenderer.invoke("variants:create", data),
    update: (data: { id: string; sku?: string; barcode?: string; size?: string; color?: string; colorHex?: string; price?: number; compareAtPrice?: number }) =>
      ipcRenderer.invoke("variants:update", data),
    delete: (id: string) => ipcRenderer.invoke("variants:delete", id),
  },
  colors: {
    getAll: () => ipcRenderer.invoke("colors:getAll"),
    create: (data: { name: string; hexCode: string }) => ipcRenderer.invoke("colors:create", data),
    update: (data: { id: string; name?: string; hexCode?: string }) => ipcRenderer.invoke("colors:update", data),
    delete: (id: string) => ipcRenderer.invoke("colors:delete", id),
  },
  brands: {
    getAll: () => ipcRenderer.invoke("brands:getAll"),
  },

  // ── Database: Customers ───────────────────────────────────────────────────
  customers: {
    getAll: () => ipcRenderer.invoke("customers:getAll"),
    search: (query: string) => ipcRenderer.invoke("customers:search", query),
    getById: (id: string) => ipcRenderer.invoke("customers:getById", id),
    create: (data: { firstName: string; lastName: string; email?: string; phone?: string }) =>
      ipcRenderer.invoke("customers:create", data),
    update: (data: { id: string; firstName?: string; lastName?: string; email?: string; phone?: string; loyaltyPoints?: number }) =>
      ipcRenderer.invoke("customers:update", data),
    delete: (id: string) => ipcRenderer.invoke("customers:delete", id),
  },

  // ── Database: Orders ──────────────────────────────────────────────────────
  orders: {
    getAll: () => ipcRenderer.invoke("orders:getAll"),
    getPage: (args: { date?: string; page?: number; pageSize?: number; search?: string }) =>
      ipcRenderer.invoke("orders:getPage", args),
    getById: (id: string) => ipcRenderer.invoke("orders:getById", id),
    getByReceiptNumber: (receiptNumber: string) =>
      ipcRenderer.invoke("orders:getByReceiptNumber", receiptNumber),
    create: (data: {
      receiptNumber?: string; staffName: string; customerId?: string; customerName?: string;
      paymentMethod: string; subtotal: number; taxAmount: number; discountAmount: number; total: number;
      locationId?: string; status?: string;
      items: Array<{ variantId?: string; productName: string; size: string; color: string; quantity: number; unitPrice: number; lineTotal: number }>;
    }) => ipcRenderer.invoke("orders:create", data),
    updateStatus: (data: { id: string; status: string }) =>
      ipcRenderer.invoke("orders:updateStatus", data),
  },

  // ── Database: Inventory ───────────────────────────────────────────────────
  inventory: {
    getAll: () => ipcRenderer.invoke("inventory:getAll"),
    getByVariant: (variantId: string) => ipcRenderer.invoke("inventory:getByVariant", variantId),
    adjust: (data: { variantId: string; locationId: string; delta: number }) =>
      ipcRenderer.invoke("inventory:adjust", data),
    setQty: (data: { variantId: string; locationId: string; qty: number }) =>
      ipcRenderer.invoke("inventory:setQty", data),
    addLocation: (data: { variantId: string; locationId: string; qty: number }) =>
      ipcRenderer.invoke("inventory:addLocation", data),
  },

  // ── Database: Categories & Sizes ─────────────────────────────────────────
  categories: {
    getAll: () => ipcRenderer.invoke("categories:getAll"),
    create: (data: { name: string; slug: string; parentId?: string | null; hasStandardSizes: boolean; sizeIds?: string[] }) =>
      ipcRenderer.invoke("categories:create", data),
    update: (data: { id: string; name?: string; slug?: string; parentId?: string | null; hasStandardSizes?: boolean; sizeIds?: string[] }) =>
      ipcRenderer.invoke("categories:update", data),
    delete: (id: string) => ipcRenderer.invoke("categories:delete", id),
  },
  sizes: {
    getAll: () => ipcRenderer.invoke("sizes:getAll"),
    create: (data: { name: string; sortOrder?: number }) => ipcRenderer.invoke("sizes:create", data),
    update: (data: { id: string; name?: string; sortOrder?: number }) => ipcRenderer.invoke("sizes:update", data),
    delete: (id: string) => ipcRenderer.invoke("sizes:delete", id),
  },

  // ── Database: Locations / Warehouses ─────────────────────────────────────
  locations: {
    getAll: () => ipcRenderer.invoke("locations:getAll"),
    create: (data: { name: string; city?: string; address?: string; phone?: string }) =>
      ipcRenderer.invoke("locations:create", data),
    update: (data: { id: string; name?: string; city?: string; address?: string; phone?: string }) =>
      ipcRenderer.invoke("locations:update", data),
    delete: (id: string) => ipcRenderer.invoke("locations:delete", id),
  },

  // ── Database: Users (staff management page) ───────────────────────────────
  users: {
    getAll: () => ipcRenderer.invoke("users:getAll"),
    create: (data: { name: string; email: string; phone?: string; role?: string; status?: "active" | "inactive" }) =>
      ipcRenderer.invoke("users:create", data),
    update: (data: { id: string; name?: string; email?: string; phone?: string; role?: string; status?: string }) =>
      ipcRenderer.invoke("users:update", data),
    delete: (id: string) => ipcRenderer.invoke("users:delete", id),
  },

  // ── Database: Roles ───────────────────────────────────────────────────────
  roles: {
    getAll: () => ipcRenderer.invoke("roles:getAll"),
    create: (data: { name: string; description?: string; permissions: string[] }) =>
      ipcRenderer.invoke("roles:create", data),
    update: (data: { id: string; name?: string; description?: string; permissions?: string[] }) =>
      ipcRenderer.invoke("roles:update", data),
    delete: (id: string) => ipcRenderer.invoke("roles:delete", id),
  },

  // ── Database: Variant Types ───────────────────────────────────────────────
  variantTypes: {
    getAll: () => ipcRenderer.invoke("variantTypes:getAll"),
    create: (data: { name: string; values: string[] }) =>
      ipcRenderer.invoke("variantTypes:create", data),
    update: (data: { id: string; name?: string; values?: string[] }) =>
      ipcRenderer.invoke("variantTypes:update", data),
    delete: (id: string) => ipcRenderer.invoke("variantTypes:delete", id),
  },

  // ── Database: Daily Summary ───────────────────────────────────────────────
  dailySummary: {
    getByDate: (date: string) => ipcRenderer.invoke("dailySummary:getByDate", date),
    getLatest: () => ipcRenderer.invoke("dailySummary:getLatest"),
    computeForDate: (date: string) => ipcRenderer.invoke("dailySummary:computeForDate", date),
    upsert: (data: {
      date: string; totalSales: number; transactionCount: number; itemsSold: number;
      cashSales: number; cardSales: number; splitSales?: number; refundsTotal: number;
      openingCash: number; closingCash: number; variance: number;
    }) => ipcRenderer.invoke("dailySummary:upsert", data),
  },

  // ── Database: Merchant Config & Sales Report ──────────────────────────────
  merchant: {
    getConfig: () => ipcRenderer.invoke("merchant:getConfig"),
    setConfig: (key: string, value: string) => ipcRenderer.invoke("merchant:setConfig", key, value),
  },
  salesReport: {
    getSummary: (args?: { dateFrom?: string; dateTo?: string }) =>
      ipcRenderer.invoke("salesReport:getSummary", args ?? {}),
  },

  // ── Database: Discounts ───────────────────────────────────────────────────
  discounts: {
    validate: (args: { code: string; orderTotal: number }) =>
      ipcRenderer.invoke("discounts:validate", args),
  },
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in d.ts)
  window.electron = electronAPI;
  // @ts-ignore (define in d.ts)
  window.api = api;
}

