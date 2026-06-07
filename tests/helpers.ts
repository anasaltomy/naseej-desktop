import Database from "better-sqlite3";
import { runSchema } from "../src/main/db/schema";
import bcrypt from "bcryptjs";

/**
 * Creates a fresh in-memory SQLite database with the full schema applied.
 * Used by all main process tests for isolation and speed.
 */
export function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  runSchema(db);

  // Add pin_hash column (normally done by migration)
  const cols = db.prepare("PRAGMA table_info(staff)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "pin_hash")) {
    db.exec("ALTER TABLE staff ADD COLUMN pin_hash TEXT");
  }

  return db;
}

/**
 * Seeds basic test data into the database for common test scenarios.
 */
export function seedTestData(db: Database.Database): void {
  // Staff
  db.prepare(
    "INSERT INTO staff (id, first_name, last_name, email, role, pin_hash) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("staff-1", "Test", "Admin", "admin@test.com", "admin", bcrypt.hashSync("1234", 10));
  db.prepare(
    "INSERT INTO staff (id, first_name, last_name, email, role, pin_hash) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("staff-2", "Test", "Cashier", "cashier@test.com", "cashier", bcrypt.hashSync("5678", 10));

  // Location
  db.prepare(
    "INSERT INTO locations (id, name, city) VALUES (?, ?, ?)"
  ).run("loc1", "Main Store", "Riyadh");

  // Brand & Category
  db.prepare("INSERT INTO brands (id, name) VALUES (?, ?)").run("b1", "Nike");
  db.prepare(
    "INSERT INTO categories (id, name, slug) VALUES (?, ?, ?)"
  ).run("cat1", "Shoes", "shoes");

  // Product
  db.prepare(
    "INSERT INTO products (id, name, sku, barcode, brand_id, category_id) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("p1", "Air Max 90", "AM90-001", "1234567890123", "b1", "cat1");

  // Variants
  db.prepare(
    "INSERT INTO product_variants (id, product_id, sku, barcode, size, color, color_hex, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run("v1", "p1", "AM90-001-42-BLK", "V1BARCODE", "42", "Black", "#000000", 599.0);
  db.prepare(
    "INSERT INTO product_variants (id, product_id, sku, barcode, size, color, color_hex, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run("v2", "p1", "AM90-001-43-WHT", "V2BARCODE", "43", "White", "#FFFFFF", 599.0);

  // Inventory
  db.prepare(
    "INSERT INTO inventory_levels (id, variant_id, location_id, qty) VALUES (?, ?, ?, ?)"
  ).run("il-v1", "v1", "loc1", 10);
  db.prepare(
    "INSERT INTO inventory_levels (id, variant_id, location_id, qty) VALUES (?, ?, ?, ?)"
  ).run("il-v2", "v2", "loc1", 5);

  // Customer
  db.prepare(
    "INSERT INTO customers (id, first_name, last_name, email, phone) VALUES (?, ?, ?, ?, ?)"
  ).run("c1", "Ahmad", "Ali", "ahmad@test.com", "+966500000001");
}
