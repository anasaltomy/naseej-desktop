import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { runSchema } from "../../src/main/db/schema";
import { runMigrations } from "../../src/main/db/migrations";

describe("migration system", () => {
  it("should create schema_version table", () => {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    runSchema(db);
    runMigrations(db);

    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_version'"
    ).all();
    expect(tables).toHaveLength(1);
  });

  it("should track applied migration versions", () => {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    runSchema(db);
    runMigrations(db);

    const versions = db.prepare("SELECT version, name FROM schema_version ORDER BY version").all() as { version: number; name: string }[];
    expect(versions.length).toBeGreaterThanOrEqual(1);
    expect(versions[0].version).toBe(1);
    expect(versions[0].name).toBe("hash_existing_pins");
  });

  it("should not re-run already applied migrations", () => {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    runSchema(db);

    // Run migrations twice
    runMigrations(db);
    runMigrations(db);

    const versions = db.prepare("SELECT COUNT(*) as n FROM schema_version").get() as { n: number };
    expect(versions.n).toBe(1); // Only applied once
  });

  it("should add pin_hash column to staff table", () => {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    runSchema(db);
    runMigrations(db);

    const cols = db.prepare("PRAGMA table_info(staff)").all() as { name: string }[];
    const hasPinHash = cols.some((c) => c.name === "pin_hash");
    expect(hasPinHash).toBe(true);
  });

  it("should hash existing plaintext PINs during migration", () => {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    runSchema(db);

    // Insert staff with plaintext PIN (before migration)
    db.prepare(
      "INSERT INTO staff (id, first_name, last_name, email, role, pin) VALUES (?, ?, ?, ?, ?, ?)"
    ).run("test-staff", "Test", "User", "test@test.com", "cashier", "1234");

    runMigrations(db);

    const row = db.prepare("SELECT pin, pin_hash FROM staff WHERE id = ?").get("test-staff") as { pin: string; pin_hash: string };
    expect(row.pin_hash).toBeDefined();
    expect(row.pin_hash).not.toBe("1234");
    // Verify the hash validates against original PIN
    const bcrypt = require("bcryptjs");
    expect(bcrypt.compareSync("1234", row.pin_hash)).toBe(true);
  });
});
