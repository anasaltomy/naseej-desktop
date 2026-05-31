import type {
  User,
  Product,
  ProductVariant,
  Customer,
  Order,
  InventoryItem,
  DailySummary,
} from "@/features/pos/types";

// ──────────────────────────────────────────────
// STAFF
// ──────────────────────────────────────────────

export const DUMMY_STAFF: User[] = [
  {
    id: "u1",
    firstName: "Ahmad",
    lastName: "Al-Rashidi",
    email: "ahmad@naseej.sa",
    role: "store_manager",
    pin: "1234",
  },
  {
    id: "u2",
    firstName: "Sara",
    lastName: "Al-Otaibi",
    email: "sara@naseej.sa",
    role: "cashier",
    pin: "5678",
  },
  {
    id: "u3",
    firstName: "Khalid",
    lastName: "Al-Shammari",
    email: "khalid@naseej.sa",
    role: "senior_cashier",
    pin: "9012",
  },
];

// ──────────────────────────────────────────────
// PRODUCTS & VARIANTS
// ──────────────────────────────────────────────

export const DUMMY_VARIANTS: ProductVariant[] = [
  // Slim Fit Oxford Shirt
  {
    id: "v1",
    productId: "p1",
    productName: "Slim Fit Oxford Shirt",
    sku: "SH-OXF-S-WHT",
    barcode: "6291012345001",
    size: "S",
    color: "White",
    colorHex: "#FFFFFF",
    price: 149,
    compareAtPrice: 199,
    stockQty: 12,
    imageUrl: undefined,
  },
  {
    id: "v2",
    productId: "p1",
    productName: "Slim Fit Oxford Shirt",
    sku: "SH-OXF-M-WHT",
    barcode: "6291012345002",
    size: "M",
    color: "White",
    colorHex: "#FFFFFF",
    price: 149,
    compareAtPrice: 199,
    stockQty: 8,
    imageUrl: undefined,
  },
  {
    id: "v3",
    productId: "p1",
    productName: "Slim Fit Oxford Shirt",
    sku: "SH-OXF-L-NAV",
    barcode: "6291012345003",
    size: "L",
    color: "Navy",
    colorHex: "#1E3A5F",
    price: 149,
    stockQty: 5,
    imageUrl: undefined,
  },
  // Classic Chino Pants
  {
    id: "v4",
    productId: "p2",
    productName: "Classic Chino Pants",
    sku: "PT-CHN-30-BEI",
    barcode: "6291012346001",
    size: "30",
    color: "Beige",
    colorHex: "#C8B89A",
    price: 229,
    compareAtPrice: 280,
    stockQty: 7,
    imageUrl: undefined,
  },
  {
    id: "v5",
    productId: "p2",
    productName: "Classic Chino Pants",
    sku: "PT-CHN-32-BEI",
    barcode: "6291012346002",
    size: "32",
    color: "Beige",
    colorHex: "#C8B89A",
    price: 229,
    stockQty: 4,
    imageUrl: undefined,
  },
  {
    id: "v6",
    productId: "p2",
    productName: "Classic Chino Pants",
    sku: "PT-CHN-32-OLV",
    barcode: "6291012346003",
    size: "32",
    color: "Olive",
    colorHex: "#6B7C45",
    price: 229,
    stockQty: 9,
    imageUrl: undefined,
  },
  // Premium Leather Belt
  {
    id: "v7",
    productId: "p3",
    productName: "Premium Leather Belt",
    sku: "BT-LTH-M-BLK",
    barcode: "6291012347001",
    size: "M",
    color: "Black",
    colorHex: "#1A1A1A",
    price: 89,
    stockQty: 20,
    imageUrl: undefined,
  },
  // Floral Abaya
  {
    id: "v8",
    productId: "p4",
    productName: "Floral Abaya",
    sku: "AB-FLR-S-BLK",
    barcode: "6291012348001",
    size: "S",
    color: "Black",
    colorHex: "#0A0A0A",
    price: 349,
    compareAtPrice: 420,
    stockQty: 3,
    imageUrl: undefined,
  },
  {
    id: "v9",
    productId: "p4",
    productName: "Floral Abaya",
    sku: "AB-FLR-M-BLK",
    barcode: "6291012348002",
    size: "M",
    color: "Black",
    colorHex: "#0A0A0A",
    price: 349,
    stockQty: 6,
    imageUrl: undefined,
  },
  // Casual Sneakers
  {
    id: "v10",
    productId: "p5",
    productName: "Urban Sneakers",
    sku: "SN-URB-42-WHT",
    barcode: "6291012349001",
    size: "42",
    color: "White",
    colorHex: "#F5F5F5",
    price: 299,
    stockQty: 2,
    imageUrl: undefined,
  },
  {
    id: "v11",
    productId: "p5",
    productName: "Urban Sneakers",
    sku: "SN-URB-43-BLK",
    barcode: "6291012349002",
    size: "43",
    color: "Black",
    colorHex: "#1A1A1A",
    price: 299,
    compareAtPrice: 350,
    stockQty: 5,
    imageUrl: undefined,
  },
];

export const DUMMY_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Slim Fit Oxford Shirt",
    sku: "SH-OXF",
    barcode: "6291012345001",
    brand: "Naseej",
    category: "Men's Shirts",
    variants: DUMMY_VARIANTS.filter((v) => v.productId === "p1"),
  },
  {
    id: "p2",
    name: "Classic Chino Pants",
    sku: "PT-CHN",
    barcode: "6291012346001",
    brand: "Naseej",
    category: "Men's Pants",
    variants: DUMMY_VARIANTS.filter((v) => v.productId === "p2"),
  },
  {
    id: "p3",
    name: "Premium Leather Belt",
    sku: "BT-LTH",
    barcode: "6291012347001",
    brand: "Naseej",
    category: "Accessories",
    variants: DUMMY_VARIANTS.filter((v) => v.productId === "p3"),
  },
  {
    id: "p4",
    name: "Floral Abaya",
    sku: "AB-FLR",
    barcode: "6291012348001",
    brand: "Naseej",
    category: "Women's Abayas",
    variants: DUMMY_VARIANTS.filter((v) => v.productId === "p4"),
  },
  {
    id: "p5",
    name: "Urban Sneakers",
    sku: "SN-URB",
    barcode: "6291012349001",
    brand: "Naseej",
    category: "Footwear",
    variants: DUMMY_VARIANTS.filter((v) => v.productId === "p5"),
  },
];

// ──────────────────────────────────────────────
// CUSTOMERS
// ──────────────────────────────────────────────

export const DUMMY_CUSTOMERS: Customer[] = [
  {
    id: "c1",
    firstName: "Nora",
    lastName: "Al-Harbi",
    email: "nora@email.com",
    phone: "+966 50 111 2233",
    loyaltyPoints: 1240,
    totalOrders: 18,
    totalSpent: 4720,
  },
  {
    id: "c2",
    firstName: "Fahad",
    lastName: "Al-Dosari",
    email: "fahad@email.com",
    phone: "+966 55 887 6612",
    loyaltyPoints: 340,
    totalOrders: 5,
    totalSpent: 1180,
  },
  {
    id: "c3",
    firstName: "Maha",
    lastName: "Al-Ghamdi",
    email: "maha@email.com",
    phone: "+966 56 330 8871",
    loyaltyPoints: 780,
    totalOrders: 11,
    totalSpent: 2890,
  },
];

// ──────────────────────────────────────────────
// ORDERS (Transaction History)
// ──────────────────────────────────────────────

export const DUMMY_ORDERS: Order[] = [
  {
    id: "o1",
    receiptNumber: "POS-2026-0834",
    createdAt: "2026-05-18T09:14:22Z",
    staffName: "Ahmad Al-Rashidi",
    customerName: "Nora Al-Harbi",
    items: [
      {
        id: "oi1",
        productName: "Slim Fit Oxford Shirt",
        size: "M",
        color: "White",
        quantity: 2,
        unitPrice: 149,
        lineTotal: 298,
      },
      {
        id: "oi2",
        productName: "Classic Chino Pants",
        size: "32",
        color: "Beige",
        quantity: 1,
        unitPrice: 229,
        lineTotal: 229,
      },
    ],
    paymentMethod: "CARD",
    subtotal: 527,
    taxAmount: 79.05,
    discountAmount: 0,
    total: 606.05,
    status: "completed",
    channel: "POS",
  },
  {
    id: "o2",
    receiptNumber: "POS-2026-0833",
    createdAt: "2026-05-18T08:57:03Z",
    staffName: "Sara Al-Otaibi",
    customerName: undefined,
    items: [
      {
        id: "oi3",
        productName: "Premium Leather Belt",
        size: "M",
        color: "Black",
        quantity: 1,
        unitPrice: 89,
        lineTotal: 89,
      },
    ],
    paymentMethod: "CASH",
    subtotal: 89,
    taxAmount: 13.35,
    discountAmount: 0,
    total: 102.35,
    status: "completed",
    channel: "POS",
  },
  {
    id: "o3",
    receiptNumber: "POS-2026-0832",
    createdAt: "2026-05-18T08:31:47Z",
    staffName: "Ahmad Al-Rashidi",
    customerName: "Fahad Al-Dosari",
    items: [
      {
        id: "oi4",
        productName: "Urban Sneakers",
        size: "43",
        color: "Black",
        quantity: 1,
        unitPrice: 299,
        lineTotal: 299,
      },
      {
        id: "oi5",
        productName: "Slim Fit Oxford Shirt",
        size: "L",
        color: "Navy",
        quantity: 1,
        unitPrice: 149,
        lineTotal: 149,
      },
    ],
    paymentMethod: "SPLIT",
    subtotal: 448,
    taxAmount: 67.2,
    discountAmount: 44.8,
    total: 470.4,
    status: "completed",
    channel: "POS",
  },
  {
    id: "o4",
    receiptNumber: "POS-2026-0831",
    createdAt: "2026-05-18T07:55:19Z",
    staffName: "Khalid Al-Shammari",
    customerName: "Maha Al-Ghamdi",
    items: [
      {
        id: "oi6",
        productName: "Floral Abaya",
        size: "M",
        color: "Black",
        quantity: 1,
        unitPrice: 349,
        lineTotal: 349,
      },
    ],
    paymentMethod: "LOYALTY",
    subtotal: 349,
    taxAmount: 52.35,
    discountAmount: 0,
    total: 401.35,
    status: "completed",
    channel: "POS",
  },
  {
    id: "o5",
    receiptNumber: "POS-2026-0830",
    createdAt: "2026-05-18T07:22:08Z",
    staffName: "Sara Al-Otaibi",
    customerName: undefined,
    items: [
      {
        id: "oi7",
        productName: "Classic Chino Pants",
        size: "30",
        color: "Beige",
        quantity: 1,
        unitPrice: 229,
        lineTotal: 229,
      },
      {
        id: "oi8",
        productName: "Premium Leather Belt",
        size: "M",
        color: "Black",
        quantity: 1,
        unitPrice: 89,
        lineTotal: 89,
      },
    ],
    paymentMethod: "CASH",
    subtotal: 318,
    taxAmount: 47.7,
    discountAmount: 31.8,
    total: 333.9,
    status: "refunded",
    channel: "POS",
  },
];

// ──────────────────────────────────────────────
// INVENTORY
// ──────────────────────────────────────────────

export const DUMMY_INVENTORY: InventoryItem[] = DUMMY_VARIANTS.map((v) => ({
  variantId: v.id,
  productId: v.productId,
  productName: v.productName,
  sku: v.sku,
  barcode: v.barcode,
  size: v.size,
  color: v.color,
  colorHex: v.colorHex,
  price: v.price,
  locations: [
    {
      locationId: "loc1",
      locationName: "Riyadh - Olaya Branch",
      qty: v.stockQty,
      lowStockThreshold: 5,
    },
    {
      locationId: "loc2",
      locationName: "Riyadh - Mall of Arabia",
      qty: Math.floor(Math.random() * 15),
      lowStockThreshold: 5,
    },
    {
      locationId: "loc3",
      locationName: "Jeddah - Red Sea Mall",
      qty: Math.floor(Math.random() * 20),
      lowStockThreshold: 5,
    },
  ],
}));

// ──────────────────────────────────────────────
// END OF DAY SUMMARY
// ──────────────────────────────────────────────

export const DUMMY_DAILY_SUMMARY: DailySummary = {
  date: "2026-05-18",
  totalSales: 1914.05,
  transactionCount: 34,
  itemsSold: 52,
  cashSales: 762.05,
  cardSales: 1152,
  refundsTotal: 333.9,
  openingCash: 500,
  closingCash: 1228,
  variance: -34.05,
};

// ──────────────────────────────────────────────
// MERCHANT CONFIG
// ──────────────────────────────────────────────

export const MERCHANT_CONFIG = {
  name: "Naseej",
  location: "Riyadh - Olaya Branch",
  currency: "JOD",
  taxRate: 0.16,
  taxLabel: "GST (16%)",
  receiptHeader: "Thank you for shopping at Naseej",
  receiptFooter: "Returns accepted within 14 days with receipt",
};
