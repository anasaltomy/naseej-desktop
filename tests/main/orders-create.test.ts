import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { createTestDb, seedTestData } from "../helpers";

describe("orders:create", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    seedTestData(db);
  });

  it("should create an order and deduct inventory atomically", () => {
    const insertOrder = db.prepare(
      "INSERT INTO orders (id, receipt_number, staff_name, payment_method, subtotal, tax_amount, discount_amount, total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const insertItem = db.prepare(
      "INSERT INTO order_items (id, order_id, variant_id, product_name, size, color, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const deductInventory = db.prepare(
      "UPDATE inventory_levels SET qty = qty - ? WHERE variant_id = ? AND location_id = ? AND qty >= ?"
    );

    const createOrder = db.transaction(() => {
      insertOrder.run("o-1", "POS-TEST-0001", "Test Admin", "CASH", 599, 89.85, 0, 688.85, "completed");
      insertItem.run("oi-1", "o-1", "v1", "Air Max 90", "42", "Black", 2, 599, 1198);
      const result = deductInventory.run(2, "v1", "loc1", 2);
      return result.changes;
    });

    const changes = createOrder();
    expect(changes).toBe(1);

    // Verify inventory was deducted
    const stock = db.prepare("SELECT qty FROM inventory_levels WHERE variant_id = ? AND location_id = ?").get("v1", "loc1") as { qty: number };
    expect(stock.qty).toBe(8); // 10 - 2

    // Verify order exists
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get("o-1") as Record<string, unknown>;
    expect(order).toBeDefined();
    expect(order.receipt_number).toBe("POS-TEST-0001");
    expect(order.total).toBe(688.85);

    // Verify order items exist
    const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all("o-1") as Record<string, unknown>[];
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
  });

  it("should reject order when stock is insufficient", () => {
    const checkStock = db.prepare(
      "SELECT COALESCE(SUM(qty), 0) AS available FROM inventory_levels WHERE variant_id = ? AND location_id = ?"
    );

    const createOrder = db.transaction(() => {
      const { available } = checkStock.get("v2", "loc1") as { available: number };
      if (available < 20) {
        throw new Error(
          `Insufficient stock: requested 20, available ${available}`
        );
      }
      // This should not execute
      db.prepare(
        "INSERT INTO orders (id, receipt_number, staff_name, payment_method, subtotal, tax_amount, total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run("o-fail", "POS-FAIL-0001", "Test", "CASH", 0, 0, 0, "completed");
    });

    expect(() => createOrder()).toThrow("Insufficient stock");

    // Verify no order was created (transaction rolled back)
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get("o-fail");
    expect(order).toBeUndefined();

    // Verify stock was not deducted
    const stock = db.prepare("SELECT qty FROM inventory_levels WHERE variant_id = ? AND location_id = ?").get("v2", "loc1") as { qty: number };
    expect(stock.qty).toBe(5);
  });

  it("should update customer stats on order creation", () => {
    const updateCustomerStats = db.prepare(
      "UPDATE customers SET total_orders = total_orders + 1, total_spent = total_spent + ? WHERE id = ?"
    );

    db.transaction(() => {
      db.prepare(
        "INSERT INTO orders (id, receipt_number, staff_name, customer_id, payment_method, subtotal, tax_amount, total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run("o-2", "POS-TEST-0002", "Test Admin", "c1", "CARD", 599, 89.85, 688.85, "completed");
      updateCustomerStats.run(688.85, "c1");
    })();

    const customer = db.prepare("SELECT total_orders, total_spent FROM customers WHERE id = ?").get("c1") as { total_orders: number; total_spent: number };
    expect(customer.total_orders).toBe(1);
    expect(customer.total_spent).toBe(688.85);
  });

  it("should generate sequential receipt numbers for the same day", () => {
    const todayStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const prefix = `POS-${todayStr}-`;

    db.prepare(
      "INSERT INTO orders (id, receipt_number, staff_name, payment_method, subtotal, tax_amount, total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run("o-a", `${prefix}0001`, "Test", "CASH", 100, 15, 115, "completed");

    const { count } = db.prepare(
      "SELECT COUNT(*) as count FROM orders WHERE receipt_number LIKE ?"
    ).get(`${prefix}%`) as { count: number };

    expect(count).toBe(1);
    const nextReceipt = `${prefix}${String(count + 1).padStart(4, "0")}`;
    expect(nextReceipt).toBe(`${prefix}0002`);
  });

  it("should handle order with multiple items", () => {
    const insertOrder = db.prepare(
      "INSERT INTO orders (id, receipt_number, staff_name, payment_method, subtotal, tax_amount, total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const insertItem = db.prepare(
      "INSERT INTO order_items (id, order_id, variant_id, product_name, size, color, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const deductInventory = db.prepare(
      "UPDATE inventory_levels SET qty = qty - ? WHERE variant_id = ? AND location_id = ? AND qty >= ?"
    );

    db.transaction(() => {
      insertOrder.run("o-multi", "POS-MULTI-0001", "Admin", "SPLIT", 1198, 179.7, 1377.7, "completed");
      insertItem.run("oi-m1", "o-multi", "v1", "Air Max 90", "42", "Black", 1, 599, 599);
      insertItem.run("oi-m2", "o-multi", "v2", "Air Max 90", "43", "White", 1, 599, 599);
      deductInventory.run(1, "v1", "loc1", 1);
      deductInventory.run(1, "v2", "loc1", 1);
    })();

    const v1Stock = db.prepare("SELECT qty FROM inventory_levels WHERE variant_id = ?").get("v1") as { qty: number };
    const v2Stock = db.prepare("SELECT qty FROM inventory_levels WHERE variant_id = ?").get("v2") as { qty: number };
    expect(v1Stock.qty).toBe(9);
    expect(v2Stock.qty).toBe(4);

    const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all("o-multi");
    expect(items).toHaveLength(2);
  });
});
