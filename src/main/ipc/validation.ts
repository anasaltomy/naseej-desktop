import { z } from "zod";

// ── Staff Schemas ───────────────────────────────────────────────────────────────

export const staffAuthenticateSchema = z.object({
  staffId: z.string().optional(),
  pin: z.string().min(4).max(8),
});

export const staffCreateSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.string().min(1),
  pin: z.string().min(4).max(8),
});

export const staffUpdateSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.string().min(1).optional(),
  pin: z.string().min(4).max(8).optional(),
});

// ── Order Schemas ───────────────────────────────────────────────────────────────

export const orderItemSchema = z.object({
  variantId: z.string().optional(),
  productName: z.string().min(1),
  size: z.string(),
  color: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  lineTotal: z.number().nonnegative(),
});

export const orderCreateSchema = z.object({
  receiptNumber: z.string().optional(),
  staffName: z.string().min(1),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  paymentMethod: z.enum(["CASH", "CARD", "SPLIT", "LOYALTY"]),
  subtotal: z.number().nonnegative(),
  taxAmount: z.number().nonnegative(),
  discountAmount: z.number().nonnegative(),
  total: z.number().nonnegative(),
  locationId: z.string().optional(),
  status: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
});

export const orderUpdateStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["completed", "refunded", "partial_refund", "cancelled"]),
});

// ── Inventory Schemas ───────────────────────────────────────────────────────────

export const inventoryAdjustSchema = z.object({
  variantId: z.string().min(1),
  locationId: z.string().min(1),
  delta: z.number().int(),
});

export const inventorySetQtySchema = z.object({
  variantId: z.string().min(1),
  locationId: z.string().min(1),
  qty: z.number().int().nonnegative(),
});

// ── Customer Schemas ────────────────────────────────────────────────────────────

export const customerCreateSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

// ── Category Schemas ────────────────────────────────────────────────────────────

export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  parentId: z.string().nullable().optional(),
  hasStandardSizes: z.boolean(),
  sizeIds: z.array(z.string()).optional(),
});

// ── Discount Schemas ────────────────────────────────────────────────────────────

export const discountValidateSchema = z.object({
  code: z.string().min(1),
  orderTotal: z.number().nonnegative(),
});
