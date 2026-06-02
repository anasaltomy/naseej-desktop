import { ipcMain } from "electron";
import { getDb } from "../db/database";
import bcrypt from "bcryptjs";
import { staffAuthenticateSchema, staffCreateSchema, staffUpdateSchema } from "./validation";

const SALT_ROUNDS = 10;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

// In-memory rate limiting store
const authAttempts = new Map<string, { count: number; lockedUntil: number }>();

function checkRateLimit(key: string): { allowed: boolean; remainingMs?: number } {
  const entry = authAttempts.get(key);
  if (!entry) return { allowed: true };
  if (Date.now() < entry.lockedUntil) {
    return { allowed: false, remainingMs: entry.lockedUntil - Date.now() };
  }
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
    entry.count = 0;
    return { allowed: false, remainingMs: LOCKOUT_MS };
  }
  return { allowed: true };
}

function recordFailedAttempt(key: string): void {
  const entry = authAttempts.get(key);
  if (entry) {
    entry.count += 1;
  } else {
    authAttempts.set(key, { count: 1, lockedUntil: 0 });
  }
}

function resetAttempts(key: string): void {
  authAttempts.delete(key);
}

/** IPC handlers for staff (PIN-authenticated POS users). */
export function registerStaffHandlers(): void {
  const db = () => getDb();

  ipcMain.handle("staff:getAll", () => {
    return db().prepare("SELECT id, first_name, last_name, email, role, avatar_url FROM staff ORDER BY first_name").all();
  });

  ipcMain.handle("staff:authenticate", (_event, rawData: unknown) => {
    const parsed = staffAuthenticateSchema.safeParse(rawData);
    if (!parsed.success) {
      return { error: "invalid_input", message: parsed.error.message };
    }
    const { staffId, pin } = parsed.data;
    const rateLimitKey = staffId ?? "global";

    // Check rate limit
    const rateCheck = checkRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      return { error: "too_many_attempts", remainingMs: rateCheck.remainingMs };
    }

    type StaffRow = { id: string; first_name: string; last_name: string; email: string; role: string; avatar_url: string | null; pin_hash: string | null; pin: string | null };

    let staff: StaffRow | undefined;

    if (staffId) {
      staff = db().prepare(
        "SELECT id, first_name, last_name, email, role, avatar_url, pin_hash, pin FROM staff WHERE id = ?"
      ).get(staffId) as StaffRow | undefined;
    } else {
      // When no staffId, we need to check all staff members for matching PIN
      const allStaff = db().prepare(
        "SELECT id, first_name, last_name, email, role, avatar_url, pin_hash, pin FROM staff"
      ).all() as StaffRow[];

      staff = allStaff.find((s) => {
        if (s.pin_hash) {
          return bcrypt.compareSync(pin, s.pin_hash);
        }
        // Fallback for un-migrated plaintext pins (should not exist after migration)
        return s.pin === pin;
      });
    }

    if (!staff) {
      recordFailedAttempt(rateLimitKey);
      return null;
    }

    // Verify PIN
    let pinValid = false;
    if (staff.pin_hash) {
      pinValid = bcrypt.compareSync(pin, staff.pin_hash);
    } else if (staff.pin) {
      // Legacy plaintext fallback (before migration ran)
      pinValid = staff.pin === pin;
    }

    if (!pinValid) {
      recordFailedAttempt(rateLimitKey);
      return null;
    }

    // Success — reset attempts
    resetAttempts(rateLimitKey);

    return {
      id: staff.id,
      first_name: staff.first_name,
      last_name: staff.last_name,
      email: staff.email,
      role: staff.role,
      avatar_url: staff.avatar_url,
    };
  });

  ipcMain.handle("staff:create", (_event, rawData: unknown) => {
    const parsed = staffCreateSchema.safeParse(rawData);
    if (!parsed.success) {
      return { error: "invalid_input", message: parsed.error.message };
    }
    const data = parsed.data;
    const id = `u-${Date.now()}`;
    const pinHash = bcrypt.hashSync(data.pin, SALT_ROUNDS);
    db().prepare(
      "INSERT INTO staff (id, first_name, last_name, email, role, pin_hash) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, data.firstName, data.lastName, data.email, data.role, pinHash);
    return { id };
  });

  ipcMain.handle("staff:update", (_event, rawData: unknown) => {
    const parsed = staffUpdateSchema.safeParse(rawData);
    if (!parsed.success) {
      return { error: "invalid_input", message: parsed.error.message };
    }
    const { id, ...data } = parsed.data;
    const fields: string[] = [];
    const values: unknown[] = [];
    if (data.firstName !== undefined) { fields.push("first_name = ?"); values.push(data.firstName); }
    if (data.lastName !== undefined)  { fields.push("last_name = ?");  values.push(data.lastName);  }
    if (data.email !== undefined)     { fields.push("email = ?");       values.push(data.email);     }
    if (data.role !== undefined)      { fields.push("role = ?");        values.push(data.role);      }
    if (data.pin !== undefined)       { fields.push("pin_hash = ?");    values.push(bcrypt.hashSync(data.pin, SALT_ROUNDS)); }
    if (fields.length === 0) return;
    values.push(id);
    db().prepare(`UPDATE staff SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  });

  ipcMain.handle("staff:delete", (_event, id: string) => {
    db().prepare("DELETE FROM staff WHERE id = ?").run(id);
  });
}
