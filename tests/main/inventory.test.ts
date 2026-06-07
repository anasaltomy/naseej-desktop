import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { createTestDb, seedTestData } from "../helpers";

describe("inventory stock management", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    seedTestData(db);
  });

  it("should have correct initial stock levels", () => {
    const v1 = db.prepare(
      "SELECT qty FROM inventory_levels WHERE variant_id = ? AND location_id = ?"
    ).get("v1", "loc1") as { qty: number };
    expect(v1.qty).toBe(10);

    const v2 = db.prepare(
      "SELECT qty FROM inventory_levels WHERE variant_id = ? AND location_id = ?"
    ).get("v2", "loc1") as { qty: number };
    expect(v2.qty).toBe(5);
  });

  it("should deduct stock correctly", () => {
    db.prepare(
      "UPDATE inventory_levels SET qty = qty - ? WHERE variant_id = ? AND location_id = ? AND qty >= ?"
    ).run(3, "v1", "loc1", 3);

    const stock = db.prepare(
      "SELECT qty FROM inventory_levels WHERE variant_id = ? AND location_id = ?"
    ).get("v1", "loc1") as { qty: number };
    expect(stock.qty).toBe(7);
  });

  it("should not deduct when stock is insufficient (qty >= check)", () => {
    const result = db.prepare(
      "UPDATE inventory_levels SET qty = qty - ? WHERE variant_id = ? AND location_id = ? AND qty >= ?"
    ).run(20, "v2", "loc1", 20);

    // No rows updated since qty (5) < 20
    expect(result.changes).toBe(0);

    // Stock unchanged
    const stock = db.prepare(
      "SELECT qty FROM inventory_levels WHERE variant_id = ? AND location_id = ?"
    ).get("v2", "loc1") as { qty: number };
    expect(stock.qty).toBe(5);
  });

  it("should allow deducting exact remaining stock", () => {
    const result = db.prepare(
      "UPDATE inventory_levels SET qty = qty - ? WHERE variant_id = ? AND location_id = ? AND qty >= ?"
    ).run(5, "v2", "loc1", 5);

    expect(result.changes).toBe(1);

    const stock = db.prepare(
      "SELECT qty FROM inventory_levels WHERE variant_id = ? AND location_id = ?"
    ).get("v2", "loc1") as { qty: number };
    expect(stock.qty).toBe(0);
  });

  it("should adjust stock by positive delta", () => {
    db.prepare(
      "UPDATE inventory_levels SET qty = MAX(0, qty + ?) WHERE variant_id = ? AND location_id = ?"
    ).run(5, "v1", "loc1");

    const stock = db.prepare(
      "SELECT qty FROM inventory_levels WHERE variant_id = ? AND location_id = ?"
    ).get("v1", "loc1") as { qty: number };
    expect(stock.qty).toBe(15);
  });

  it("should set absolute quantity for physical count", () => {
    db.prepare(
      "UPDATE inventory_levels SET qty = MAX(0, ?) WHERE variant_id = ? AND location_id = ?"
    ).run(25, "v1", "loc1");

    const stock = db.prepare(
      "SELECT qty FROM inventory_levels WHERE variant_id = ? AND location_id = ?"
    ).get("v1", "loc1") as { qty: number };
    expect(stock.qty).toBe(25);
  });

  it("should enforce CHECK constraint preventing negative qty on direct insert", () => {
    expect(() => {
      db.prepare(
        "INSERT INTO inventory_levels (id, variant_id, location_id, qty) VALUES (?, ?, ?, ?)"
      ).run("il-neg", "v1", "loc1", -5);
    }).toThrow();
  });

  it("should aggregate stock across locations", () => {
    // Add a second location
    db.prepare("INSERT INTO locations (id, name) VALUES (?, ?)").run("loc2", "Branch B");
    db.prepare(
      "INSERT INTO inventory_levels (id, variant_id, location_id, qty) VALUES (?, ?, ?, ?)"
    ).run("il-v1-loc2", "v1", "loc2", 7);

    const { total } = db.prepare(
      "SELECT COALESCE(SUM(qty), 0) AS total FROM inventory_levels WHERE variant_id = ?"
    ).get("v1") as { total: number };

    expect(total).toBe(17); // 10 + 7
  });
});
