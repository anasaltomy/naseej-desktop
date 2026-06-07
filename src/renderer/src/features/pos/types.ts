// Core POS Types

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "cashier" | "senior_cashier" | "store_manager" | "admin";
  avatarUrl?: string;
  pin?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  brand: string;
  category: string;
  imageUrl?: string;
  variants: ProductVariant[];
}

export interface ProductVariant {
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

export interface CartItem {
  id: string;
  variant: ProductVariant;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  customerId?: string;
  customerName?: string;
  discountCode?: string;
  cartDiscount: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  loyaltyPoints: number;
  totalOrders: number;
  totalSpent: number;
}

export interface Order {
  id: string;
  receiptNumber: string;
  createdAt: string;
  staffName: string;
  customerName?: string;
  items: OrderItem[];
  paymentMethod: "CASH" | "CARD" | "SPLIT" | "LOYALTY";
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  status: "completed" | "refunded" | "partial_refund";
  channel: "POS";
}

export interface OrderItem {
  id: string;
  variantId?: string;
  productName: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InventoryItem {
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
  locations: InventoryLevel[];
}

export interface InventoryLevel {
  locationId: string;
  locationName: string;
  qty: number;
  lowStockThreshold: number;
}

export interface DailySummary {
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

export type PaymentMethod = "CASH" | "CARD" | "SPLIT" | "LOYALTY";

// POS layout views
export type POSView = "register" | "orders" | "end-of-day" | "sales-report";

// Catalog layout views
export type CatalogView =
  | "categories-list"
  | "variants"
  | "warehouses"
  | "inventory"
  | "print-barcodes";

// Users layout views
export type UsersView = "users-list" | "roles-list";


