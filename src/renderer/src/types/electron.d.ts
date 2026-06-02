export interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  avatar_url?: string;
}

export interface ProductVariantRecord {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  size: string;
  color: string;
  colorHex: string;
  price: number;
  compareAtPrice?: number;
  stockQty: number;
  imageUrl?: string;
}

export interface ProductRecord {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  brand: string;
  category: string;
  brandId?: string;
  categoryId?: string;
  description?: string;
  imageUrl?: string;
  variants: ProductVariantRecord[];
}

export interface CustomerRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  loyaltyPoints: number;
  totalOrders: number;
  totalSpent: number;
}

export interface OrderItemRecord {
  id: string;
  variantId?: string;
  productName: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderRecord {
  id: string;
  receiptNumber: string;
  createdAt: string;
  staffName: string;
  customerName?: string;
  items: OrderItemRecord[];
  paymentMethod: "CASH" | "CARD" | "SPLIT" | "LOYALTY";
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  status: "completed" | "refunded" | "partial_refund";
  channel: "POS";
}

export interface InventoryLevelRecord {
  locationId: string;
  locationName: string;
  qty: number;
  lowStockThreshold: number;
}

export interface InventoryRecord {
  variantId: string;
  productId: string;
  productName: string;
  brandId?: string;
  categoryId?: string;
  sku: string;
  barcode: string;
  size: string;
  color: string;
  colorHex: string;
  price: number;
  locations: InventoryLevelRecord[];
}

export interface SizeRecord {
  id: string;
  name: string;
  sortOrder: number;
}

export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  hasStandardSizes: boolean;
  standardSizes: Array<{ id: string; name: string }>;
  createdAt: string;
}

export interface LocationRecord {
  id: string;
  name: string;
  location: string;
  address: string;
  phone: string;
  productCount: number;
}

export interface UserRecord {
  lastName: string;
  firstName: string;
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: "active" | "inactive";
}

export interface RoleRecord {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
}

export interface VariantTypeRecord {
  id: string;
  name: string;
  values: string[];
}

export interface DailySummaryRecord {
  date: string;
  totalSales: number;
  transactionCount: number;
  itemsSold: number;
  cashSales: number;
  cardSales: number;
  splitSales?: number;
  refundsTotal: number;
  openingCash: number;
  closingCash: number;
  variance: number;
}

export interface DiscountValidationResult {
  valid: boolean;
  reason?: string;
  type?: string;
  value?: number;
  amount?: number;
}

export interface MerchantConfig {
  name: string;
  location: string;
  currency: string;
  taxRate: number;
  taxLabel: string;
  receiptHeader: string;
  receiptFooter: string;
}

export interface SalesReportSummary {
  averageOrderValue: number;
  totalRevenue: number;
  totalSales: number;
  totalOrders: number;
  averageOrder: number;
  topProduct: string;
}

export interface ColorRecord {
  id: string;
  name: string;
  hexCode: string;
}

export interface BrandRecord {
  id: string;
  name: string;
}

// ── Full window.api type ──────────────────────────────────────────────────────

interface ElectronAPI {
  getPlatform: () => string;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  printReceipt: (data: unknown) => Promise<{ success: boolean }>;
  openCashDrawer: () => Promise<{ success: boolean }>;
  onBarcodeScanned: (callback: (barcode: string) => void) => () => void;
  getNetworkStatus: () => Promise<{ online: boolean }>;

  staff: {
    getAll: () => Promise<StaffMember[]>;
    authenticate: (args: {
      staffId?: string;
      pin: string;
    }) => Promise<StaffMember | null>;
    create: (data: {
      firstName: string;
      lastName: string;
      email: string;
      role: string;
      pin: string;
    }) => Promise<{ id: string }>;
    update: (data: {
      id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      role?: string;
      pin?: string;
    }) => Promise<void>;
    delete: (id: string) => Promise<void>;
  };

  products: {
    getAll: () => Promise<ProductRecord[]>;
    getById: (id: string) => Promise<ProductRecord | null>;
    create: (data: {
      name: string;
      sku: string;
      barcode?: string;
      brandId?: string;
      categoryId?: string;
      description?: string;
      basePrice?: number;
      variants?: Array<{
        colorId: string;
        sizeId: string;
        quantity: number;
        barcode?: string;
      }>;
    }) => Promise<{ id: string }>;
    update: (data: {
      id: string;
      name?: string;
      sku?: string;
      barcode?: string;
      brandId?: string;
      categoryId?: string;
      description?: string;
    }) => Promise<void>;
    delete: (id: string) => Promise<void>;
    search: (query: string) => Promise<ProductRecord[]>;
    exportCsv: () => Promise<{
      success: boolean;
      canceled?: boolean;
      filePath?: string;
    }>;
    openCsvFile: () => Promise<string | null>;
    importBatch: (
      rows: Array<{
        productName: string;
        sku: string;
        barcode?: string;
        size: string;
        color: string;
        colorHex: string;
        price: number;
      }>,
    ) => Promise<{ count: number }>;
  };

  variants: {
    getAll: () => Promise<ProductVariantRecord[]>;
    getByBarcode: (barcode: string) => Promise<ProductVariantRecord | null>;
    create: (data: {
      productId: string;
      sku: string;
      barcode?: string;
      size: string;
      color: string;
      colorHex: string;
      price: number;
      compareAtPrice?: number;
    }) => Promise<{ id: string }>;
    update: (data: {
      id: string;
      sku?: string;
      barcode?: string;
      size?: string;
      color?: string;
      colorHex?: string;
      price?: number;
      compareAtPrice?: number;
    }) => Promise<void>;
    delete: (id: string) => Promise<void>;
  };

  colors: {
    getAll: () => Promise<ColorRecord[]>;
    create: (data: { name: string; hexCode: string }) => Promise<{ id: string }>;
    update: (data: { id: string; name?: string; hexCode?: string }) => Promise<void>;
    delete: (id: string) => Promise<void>;
  };
  brands: { getAll: () => Promise<BrandRecord[]> };

  customers: {
    getAll: () => Promise<CustomerRecord[]>;
    search: (query: string) => Promise<CustomerRecord[]>;
    getById: (id: string) => Promise<CustomerRecord | null>;
    create: (data: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
    }) => Promise<{ id: string }>;
    update: (data: {
      id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      loyaltyPoints?: number;
    }) => Promise<void>;
    delete: (id: string) => Promise<void>;
  };

  orders: {
    getAll: () => Promise<OrderRecord[]>;
    getPage: (args: {
      date?: string;
      page?: number;
      pageSize?: number;
      search?: string;
    }) => Promise<{
      total: number;
      page: number;
      pageSize: number;
      orders: OrderRecord[];
    }>;
    getById: (id: string) => Promise<OrderRecord | null>;
    getByReceiptNumber: (receiptNumber: string) => Promise<OrderRecord | null>;
    create: (data: {
      receiptNumber?: string;
      staffName: string;
      customerId?: string;
      customerName?: string;
      paymentMethod: string;
      subtotal: number;
      taxAmount: number;
      discountAmount: number;
      total: number;
      locationId?: string;
      status?: string;
      items: Array<{
        variantId?: string;
        productName: string;
        size: string;
        color: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
      }>;
    }) => Promise<{ id: string; receiptNumber: string }>;
    updateStatus: (data: { id: string; status: string }) => Promise<void>;
  };

  inventory: {
    getAll: () => Promise<InventoryRecord[]>;
    getByVariant: (variantId: string) => Promise<InventoryLevelRecord[]>;
    adjust: (data: {
      variantId: string;
      locationId: string;
      delta: number;
    }) => Promise<void>;
    setQty: (data: {
      variantId: string;
      locationId: string;
      qty: number;
    }) => Promise<void>;
    addLocation: (data: {
      variantId: string;
      locationId: string;
      qty: number;
    }) => Promise<void>;
  };

  categories: {
    getAll: () => Promise<CategoryRecord[]>;
    create: (data: {
      name: string;
      slug: string;
      parentId?: string | null;
      hasStandardSizes: boolean;
      sizeIds?: string[];
    }) => Promise<{ id: string }>;
    update: (data: {
      id: string;
      name?: string;
      slug?: string;
      parentId?: string | null;
      hasStandardSizes?: boolean;
      sizeIds?: string[];
    }) => Promise<void>;
    delete: (id: string) => Promise<void>;
  };

  sizes: {
    getAll: () => Promise<SizeRecord[]>;
    create: (data: { name: string; sortOrder?: number }) => Promise<{ id: string }>;
    update: (data: { id: string; name?: string; sortOrder?: number }) => Promise<void>;
    delete: (id: string) => Promise<void>;
  };

  locations: {
    getAll: () => Promise<LocationRecord[]>;
    create: (data: {
      name: string;
      city?: string;
      address?: string;
      phone?: string;
    }) => Promise<{ id: string }>;
    update: (data: {
      id: string;
      name?: string;
      city?: string;
      address?: string;
      phone?: string;
    }) => Promise<void>;
    delete: (id: string) => Promise<void>;
  };

  users: {
    getAll: () => Promise<UserRecord[]>;
    create: (data: {
      name: string;
      email: string;
      phone?: string;
      role?: string;
      status?: "active" | "inactive";
    }) => Promise<{ id: string }>;
    update: (data: {
      id: string;
      name?: string;
      email?: string;
      phone?: string;
      role?: string;
      status?: string;
    }) => Promise<void>;
    delete: (id: string) => Promise<void>;
  };

  roles: {
    getAll: () => Promise<RoleRecord[]>;
    create: (data: {
      name: string;
      description?: string;
      permissions: string[];
    }) => Promise<{ id: string }>;
    update: (data: {
      id: string;
      name?: string;
      description?: string;
      permissions?: string[];
    }) => Promise<void>;
    delete: (id: string) => Promise<void>;
  };

  variantTypes: {
    getAll: () => Promise<VariantTypeRecord[]>;
    create: (data: {
      name: string;
      values: string[];
    }) => Promise<{ id: string }>;
    update: (data: {
      id: string;
      name?: string;
      values?: string[];
    }) => Promise<void>;
    delete: (id: string) => Promise<void>;
  };

  dailySummary: {
    getByDate: (date: string) => Promise<DailySummaryRecord | null>;
    getLatest: () => Promise<DailySummaryRecord | null>;
    computeForDate: (date: string) => Promise<DailySummaryRecord>;
    upsert: (data: {
      date: string;
      totalSales: number;
      transactionCount: number;
      itemsSold: number;
      cashSales: number;
      cardSales: number;
      splitSales?: number;
      refundsTotal: number;
      openingCash: number;
      closingCash: number;
      variance: number;
    }) => Promise<void>;
  };

  merchant: {
    getConfig: () => Promise<MerchantConfig>;
    setConfig: (key: string, value: string) => Promise<void>;
  };

  salesReport: {
    getSummary: (args?: {
      dateFrom?: string;
      dateTo?: string;
    }) => Promise<SalesReportSummary>;
  };

  discounts: {
    validate: (args: {
      code: string;
      orderTotal: number;
    }) => Promise<DiscountValidationResult>;
  };
}

declare global {
  interface Window {
    api?: ElectronAPI;
    electron?: unknown;
  }
}

export {};
