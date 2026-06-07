# Naseej POS — Integration Fixes Plan & Strategy

**Date:** 2026-06-02  
**Approach:** Phased, risk-ordered, non-breaking incremental improvements  
**Principle:** Fix security first → stability → performance → features

---

## Strategy Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTEGRATION FIX STRATEGY                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Sprint 0 (Immediate)     ── Security & Critical Bugs            │
│       │                                                           │
│       ▼                                                           │
│  Sprint 1 (Week 1)        ── Architecture Foundation             │
│       │                                                           │
│       ▼                                                           │
│  Sprint 2 (Week 2)        ── Data Integrity & Performance        │
│       │                                                           │
│       ▼                                                           │
│  Sprint 3 (Week 3)        ── Testing & Quality Assurance         │
│       │                                                           │
│       ▼                                                           │
│  Sprint 4 (Week 4)        ── Hardware & Production Readiness     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sprint 0: Security Emergency (Day 1-2)

**Goal:** Eliminate all critical security vulnerabilities before any other work.

### Tasks

| # | Task | Files Affected | Risk if Skipped |
|---|------|----------------|-----------------|
| 0.1 | Install `bcryptjs` | `package.json` | — |
| 0.2 | Add `pin_hash` column, migrate existing PINs | `schema.ts`, new `migrations.ts` | Plaintext PIN exposure |
| 0.3 | Update `staff:authenticate` to use `bcrypt.compareSync` | `ipc/staff.ts` | — |
| 0.4 | Update `staff:create` and `staff:update` to hash PINs | `ipc/staff.ts` | New PINs stored plain |
| 0.5 | Add rate limiting to authentication | `ipc/staff.ts` | Brute-force attack |
| 0.6 | Update seed data to use hashed PINs | `seed.ts` | Dev/test exposure |

### Implementation Order

```
1. npm install bcryptjs @types/bcryptjs
2. Create src/main/db/migrations.ts (version tracking + PIN migration)
3. Update schema.ts to call runMigrations() after runSchema()
4. Modify staff.ts authenticate/create/update handlers
5. Update seed.ts to hash demo PINs
6. Test: login still works with "1234", "5678", "9012"
```

### Rollback Plan
- Keep old `pin` column temporarily (rename to `pin_hash`)
- If migration fails, app still starts (schema uses IF NOT EXISTS)

---

## Sprint 1: Architecture Foundation (Week 1)

**Goal:** Establish missing infrastructure that all future work depends on.

### Tasks

| # | Task | Priority | Estimated LOC |
|---|------|----------|---------------|
| 1.1 | Create `src/shared/channels.ts` with all IPC channel constants | P1 | ~80 |
| 1.2 | Create IPC error handling wrapper (`createHandler`) | P1 | ~40 |
| 1.3 | Wrap all 15 IPC handler files with error wrapper | P1 | ~150 |
| 1.4 | Add Zod validation schemas for critical handlers (orders, staff) | P1 | ~100 |
| 1.5 | Add React ErrorBoundary at App.tsx level | P1 | ~60 |
| 1.6 | Bundle Google Fonts locally (Nunito Sans + Rubik) | P1 | ~20 |
| 1.7 | Remove unused `react-router-dom` or decide to migrate | P2 | ~5 |
| 1.8 | Fix all `any` types in `electron.d.ts` | P1 | ~10 |

### Dependency Graph

```
1.1 (channels) ─┐
                 ├──→ 1.2 (error wrapper) ──→ 1.3 (apply wrapper)
1.4 (Zod schemas)                                    │
                                                      ▼
1.5 (ErrorBoundary) ─── independent
1.6 (fonts) ─── independent
1.7 (router cleanup) ─── independent
1.8 (any fixes) ─── independent
```

### Key Decision: IPC Channel Refactoring Strategy

**Option A (Conservative):** Create `src/shared/channels.ts`, update preload to import from it. Main process handlers still use string literals for now.

**Option B (Full):** Update both main and preload to use shared constants. Requires build config change to share code.

**Recommendation:** Option A first, then Option B in Sprint 3 after tests exist.

---

## Sprint 2: Data Integrity & Performance (Week 2)

**Goal:** Fix data correctness issues and prevent degradation at scale.

### Tasks

| # | Task | Priority | Impact |
|---|------|----------|--------|
| 2.1 | Add database indexes to `schema.ts` | P1 | Query speed |
| 2.2 | Fix overselling — check stock before deduct | P1 | Inventory accuracy |
| 2.3 | Update customer stats on order creation | P1 | CRM accuracy |
| 2.4 | Fix `orders:getAll` N+1 query (use JOIN) | P1 | Performance |
| 2.5 | Fix `products:getAll` to use subqueries | P2 | Performance |
| 2.6 | Add pagination to `products:getAll`, `customers:getAll` | P2 | Memory |
| 2.7 | Add daily auto-backup mechanism | P1 | Data safety |
| 2.8 | Implement `dailySummary:computeForDate` properly | P2 | Reporting |

### Implementation Sequence

```
2.1 (indexes) ── no dependencies, safe to add first
       │
       ▼
2.2 (stock check) ── must test that existing cart flow still works
       │
       ▼
2.3 (customer stats) ── add inside orders:create transaction
       │
       ▼
2.4 + 2.5 (query optimization) ── can be done in parallel
       │
       ▼
2.6 (pagination) ── requires renderer changes to support page params
       │
       ▼
2.7 (backup) ── independent, add to app lifecycle
```

### Migration Safety

All changes in Sprint 2 are additive:
- Indexes: `CREATE INDEX IF NOT EXISTS` — safe
- Stock check: behavioral change — needs test
- Customer stats: additive UPDATE inside transaction — safe
- Query changes: same output, different query — safe

---

## Sprint 3: Testing & Quality Assurance (Week 3)

**Goal:** Add test infrastructure and cover critical paths to enable safe future development.

### Tasks

| # | Task | Priority | Coverage Target |
|---|------|----------|-----------------|
| 3.1 | Install Vitest, configure for main process | P0 | — |
| 3.2 | Write tests for `staff:authenticate` (with bcrypt) | P0 | Auth flow |
| 3.3 | Write tests for `orders:create` (full transaction) | P0 | Core POS loop |
| 3.4 | Write tests for stock deduction logic | P0 | Inventory |
| 3.5 | Write tests for migration system | P1 | Schema upgrades |
| 3.6 | Write tests for rate limiting | P1 | Security |
| 3.7 | Add Vitest config for renderer (jsdom env) | P2 | UI components |
| 3.8 | Write tests for cart calculation logic | P2 | POS accuracy |

### Test Strategy

```typescript
// All main process tests use in-memory SQLite
import Database from 'better-sqlite3';

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runSchema(db);
  return db;
}

describe('orders:create', () => {
  it('should create order and deduct inventory atomically', () => {
    const db = createTestDb();
    // seed test data
    // call createOrder
    // assert inventory decreased
    // assert order exists
  });

  it('should reject order when stock insufficient', () => {
    // ...
  });
});
```

### Coverage Goals

| Module | Target Coverage |
|--------|-----------------|
| `src/main/ipc/orders.ts` | 90% |
| `src/main/ipc/staff.ts` | 90% |
| `src/main/ipc/inventory.ts` | 80% |
| `src/main/db/migrations.ts` | 100% |
| Cart calculation (renderer) | 80% |

---

## Sprint 4: Hardware & Production (Week 4)

**Goal:** Real hardware integration and packaging for distribution.

### Tasks

| # | Task | Priority | Dependencies |
|---|------|----------|--------------|
| 4.1 | Create `src/main/hardware/` module structure | P1 | None |
| 4.2 | Implement barcode scanner (main process keyboard listener) | P1 | 4.1 |
| 4.3 | Implement ESC/POS printer driver | P1 | 4.1, npm serialport |
| 4.4 | Implement cash drawer signal | P2 | 4.3 (same serial port) |
| 4.5 | Create `electron-builder.yml` | P1 | None |
| 4.6 | Build macOS DMG installer | P1 | 4.5 |
| 4.7 | Build Windows NSIS installer | P1 | 4.5 |
| 4.8 | Add auto-updater integration | P2 | 4.5 |
| 4.9 | Enable `sandbox: true` (security) | P2 | Test all features still work |

### Hardware Integration Pattern

```typescript
// src/main/hardware/index.ts
export class HardwareManager {
  private printer: PrinterDriver | null = null;
  private scanner: BarcodeScanner | null = null;

  async initialize() {
    try {
      this.printer = await PrinterDriver.detect();
    } catch { /* graceful degradation */ }
    
    this.scanner = new BarcodeScanner();
    this.scanner.on('barcode', (code) => {
      BrowserWindow.getAllWindows()[0]?.webContents.send('scanner:barcode', code);
    });
  }
}
```

---

## Risks & Mitigations Per Sprint

| Sprint | Risk | Mitigation |
|--------|------|------------|
| 0 | PIN migration breaks existing installations | Keep old column as backup; test on copy of DB |
| 1 | Error wrapper changes IPC return shape | Add `success` field; renderer must handle new format |
| 2 | Stock check rejects legitimate sales | Add "force" flag for manager override |
| 3 | Test setup takes too long | Start with 5 critical tests only |
| 4 | Hardware not available for testing | Use mock/virtual serial ports |

---

## Success Criteria Per Sprint

### Sprint 0 ✓ When:
- [ ] No plaintext PINs in database
- [ ] Login fails after 5 wrong attempts (5-min lockout)
- [ ] Existing demo PINs still work after migration

### Sprint 1 ✓ When:
- [ ] All IPC errors return structured `{ success, data, error }` format
- [ ] App doesn't white-screen on component error
- [ ] App works offline (fonts bundled)
- [ ] Zero `any` types in type definition files

### Sprint 2 ✓ When:
- [ ] Cannot create order for out-of-stock item (error returned)
- [ ] Customer `total_orders` increments on purchase
- [ ] `orders:getAll` with 1000 orders < 100ms
- [ ] Database backup created on daily close

### Sprint 3 ✓ When:
- [ ] `npm test` runs and passes 20+ tests
- [ ] Authentication flow fully tested (happy + sad paths)
- [ ] Order creation fully tested (including stock edge cases)

### Sprint 4 ✓ When:
- [ ] Receipt prints on physical ESC/POS printer
- [ ] Barcode scanner input detected in main process
- [ ] macOS DMG installs and runs successfully
- [ ] Windows NSIS installer works

---

## Estimated Timeline

```
Day 1-2    ──── Sprint 0: Security (must ship ASAP)
Day 3-7    ──── Sprint 1: Architecture Foundation
Day 8-14   ──── Sprint 2: Data & Performance
Day 15-21  ──── Sprint 3: Testing
Day 22-28  ──── Sprint 4: Hardware & Production
```

**Total: 4 weeks to production-ready state**

---

## Long-Term Roadmap (Post-Fix)

After completing all 4 sprints, the application will be at a stable foundation for:

1. **Multi-terminal sync** — Shared SQLite over local network or file sync
2. **Cloud backup** — Optional encrypted backup to cloud storage
3. **Plugin system** — Custom receipt formats, loyalty integrations
4. **Analytics dashboard** — Historical trend charts, product performance
5. **Multi-language expansion** — French, Urdu, Turkish for broader MENA market
