import type Database from "better-sqlite3";
import bcrypt from "bcryptjs";

interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}

const SALT_ROUNDS = 10;

const migrations: Migration[] = [
  {
    version: 1,
    name: "hash_existing_pins",
    up: (db) => {
      // Rename pin column to pin_hash
      const cols = db.prepare("PRAGMA table_info(staff)").all() as { name: string }[];
      const hasPinHash = cols.some((c) => c.name === "pin_hash");
      const hasPin = cols.some((c) => c.name === "pin");

      if (hasPin && !hasPinHash) {
        // SQLite doesn't support RENAME COLUMN in older versions, so add new column and migrate
        db.exec("ALTER TABLE staff ADD COLUMN pin_hash TEXT");

        // Hash all existing plaintext PINs
        const rows = db.prepare("SELECT id, pin FROM staff WHERE pin IS NOT NULL").all() as { id: string; pin: string }[];
        const update = db.prepare("UPDATE staff SET pin_hash = ? WHERE id = ?");
        for (const row of rows) {
          const hash = bcrypt.hashSync(row.pin, SALT_ROUNDS);
          update.run(hash, row.id);
        }
      } else if (!hasPin && !hasPinHash) {
        // Fresh install — just add pin_hash column
        db.exec("ALTER TABLE staff ADD COLUMN pin_hash TEXT");
      }
    },
  },
];

/**
 * Runs all pending database migrations in order.
 * Creates schema_version table if it doesn't exist.
 */
export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version   INTEGER PRIMARY KEY,
      name      TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const currentVersion = (
    db.prepare("SELECT COALESCE(MAX(version), 0) as v FROM schema_version").get() as { v: number }
  ).v;

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      db.transaction(() => {
        migration.up(db);
        db.prepare("INSERT INTO schema_version (version, name) VALUES (?, ?)").run(
          migration.version,
          migration.name,
        );
      })();
    }
  }
}
