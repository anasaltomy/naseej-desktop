import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { createTestDb, seedTestData } from "../helpers";

describe("staff:authenticate", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    seedTestData(db);
  });

  it("should authenticate staff with correct PIN", () => {
    const staff = db.prepare(
      "SELECT id, first_name, last_name, email, role, pin_hash FROM staff WHERE id = ?"
    ).get("staff-1") as { id: string; pin_hash: string };

    expect(staff).toBeDefined();
    expect(bcrypt.compareSync("1234", staff.pin_hash)).toBe(true);
  });

  it("should reject authentication with wrong PIN", () => {
    const staff = db.prepare(
      "SELECT id, pin_hash FROM staff WHERE id = ?"
    ).get("staff-1") as { id: string; pin_hash: string };

    expect(bcrypt.compareSync("0000", staff.pin_hash)).toBe(false);
    expect(bcrypt.compareSync("9999", staff.pin_hash)).toBe(false);
  });

  it("should find staff by PIN when staffId is not provided", () => {
    const allStaff = db.prepare(
      "SELECT id, pin_hash FROM staff"
    ).all() as { id: string; pin_hash: string }[];

    const found = allStaff.find((s) => bcrypt.compareSync("5678", s.pin_hash));
    expect(found).toBeDefined();
    expect(found!.id).toBe("staff-2");
  });

  it("should return undefined when no staff matches the PIN", () => {
    const allStaff = db.prepare(
      "SELECT id, pin_hash FROM staff"
    ).all() as { id: string; pin_hash: string }[];

    const found = allStaff.find((s) => bcrypt.compareSync("0000", s.pin_hash));
    expect(found).toBeUndefined();
  });

  it("should hash PIN on staff creation", () => {
    const pin = "4321";
    const pinHash = bcrypt.hashSync(pin, 10);
    db.prepare(
      "INSERT INTO staff (id, first_name, last_name, email, role, pin_hash) VALUES (?, ?, ?, ?, ?, ?)"
    ).run("staff-new", "New", "User", "new@test.com", "cashier", pinHash);

    const row = db.prepare("SELECT pin_hash FROM staff WHERE id = ?").get("staff-new") as { pin_hash: string };
    expect(row.pin_hash).not.toBe(pin);
    expect(bcrypt.compareSync(pin, row.pin_hash)).toBe(true);
  });

  it("should update PIN hash when PIN is changed", () => {
    const newPin = "9999";
    const newHash = bcrypt.hashSync(newPin, 10);
    db.prepare("UPDATE staff SET pin_hash = ? WHERE id = ?").run(newHash, "staff-1");

    const row = db.prepare("SELECT pin_hash FROM staff WHERE id = ?").get("staff-1") as { pin_hash: string };
    expect(bcrypt.compareSync("1234", row.pin_hash)).toBe(false);
    expect(bcrypt.compareSync(newPin, row.pin_hash)).toBe(true);
  });
});
