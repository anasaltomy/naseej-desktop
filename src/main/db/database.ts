import BetterSqlite3 from "better-sqlite3";
import { join } from "path";
import { app } from "electron";
import { runSchema } from "./schema";
import { runMigrations } from "./migrations";
import { seedDatabase } from "./seed";

let _db: BetterSqlite3.Database | null = null;

/** Returns the singleton database connection, creating it on first call. */
export function getDb(): BetterSqlite3.Database {
  if (_db) return _db;

  const dbPath = join(app.getPath("userData"), "naseej-pos.db");
  _db = new BetterSqlite3(dbPath);

  // Enable WAL mode and foreign keys for every connection
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  _db.pragma("synchronous = NORMAL");

  runSchema(_db);
  runMigrations(_db);
  seedDatabase(_db);

  return _db;
}

/** Closes the database connection cleanly on app quit. */
export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
