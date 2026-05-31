# Phase 4 — Hardware Integration & Production Readiness

**Timeline:** Week 8–10  
**Goal:** Make the app deployable on real POS hardware — thermal printer, cash drawer, USB barcode scanner. Harden security (PIN hashing), add database backup, handle errors gracefully, and produce distributable installers for Windows and macOS.  
**Prerequisite:** Phases 1–3 complete.  
**Exit Criteria:** The app can be installed on a fresh Windows or macOS machine, a cashier can complete a full shift with real hardware, and no transaction data is ever lost.

---

## Status Snapshot (Before Phase 4)

By end of Phase 3, the POS is functionally complete in software. Phase 4 makes it production-ready:

| Area | Current State |
|---|---|
| ESC/POS thermal printer | `hardware:print-receipt` handler logs to console only |
| Cash drawer | `hardware:open-drawer` handler logs to console only |
| Barcode scanner (main process) | No global keyboard listener; renderer-only capture works but is less reliable |
| PIN security | Stored as plaintext in `staff.pin` column |
| Database backup | No backup mechanism |
| Error handling | No global error boundaries; DB errors crash silently |
| App packaging | Not configured for distribution |

---

## Task Breakdown

### Task 4.1 — ESC/POS Thermal Printer

**Problem:** The `hardware:print-receipt` IPC handler is a stub. Real receipts need to be generated and sent to a thermal printer.

**Decision: Use the `escpos` npm package ecosystem.** The `@tillpos/xml-escpos-helper` or `escpos` + `escpos-usb` / `escpos-network` / `escpos-serialport` chain is the established approach for Node.js POS printing. Use `@node-escpos/core` + the appropriate transport adapter.

**Install:**
```bash
npm install @node-escpos/core @node-escpos/usb-adapter
# or for serial (common for older thermal printers):
npm install @node-escpos/core @node-escpos/serialport-adapter
```

**Decision: Store printer connection config in `merchant_config`:**
- `printerType`: `"usb"` | `"serial"` | `"network"` (default: `"usb"`)
- `printerPort`: device path, e.g., `/dev/usb/lp0`, `COM3`, or `192.168.1.100:9100`
- `printerModel`: optional, for vendor-specific commands

**New file `src/main/hardware/printer.ts`:**
```typescript
import { Printer, Image } from '@node-escpos/core';
import USB from '@node-escpos/usb-adapter';

export interface ReceiptData {
  receiptNumber: string;
  storeName: string;
  storeLocation: string;
  taxLabel: string;
  items: Array<{
    productName: string;
    size: string;
    color: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  cashPaid?: number;
  changeDue?: number;
  receiptHeader?: string;
  receiptFooter?: string;
  staffName: string;
  customerName?: string;
  timestamp: string;
}

export async function printReceipt(data: ReceiptData): Promise<void> {
  const device = new USB();   // auto-detects first USB thermal printer
  await device.open();
  const printer = new Printer(device, { encoding: 'utf-8' });

  const line = '─'.repeat(32);
  const dline = '═'.repeat(32);

  printer
    .align('ct')
    .style('B')
    .size(1, 1)
    .text(data.storeName)
    .style('NORMAL')
    .text(data.storeLocation)
    .text(data.timestamp)
    .text(line)
    .align('lt')
    .text(`Receipt: ${data.receiptNumber}`)
    .text(`Staff:   ${data.staffName}`);

  if (data.customerName) printer.text(`Customer: ${data.customerName}`);

  printer.text(dline);

  // Line items
  data.items.forEach(item => {
    const name = `${item.productName} (${item.size}/${item.color})`;
    const price = item.lineTotal.toFixed(2);
    printer.text(`${name}`);
    printer.text(`  ${item.quantity} × ${item.unitPrice.toFixed(2)}`.padEnd(24) + price);
  });

  printer
    .text(line)
    .text(`Subtotal`.padEnd(24) + data.subtotal.toFixed(2))
    .text(`${data.taxLabel}`.padEnd(24) + data.taxAmount.toFixed(2));

  if (data.discountAmount > 0)
    printer.text(`Discount`.padEnd(24) + `-${data.discountAmount.toFixed(2)}`);

  printer
    .text(dline)
    .style('B')
    .text(`TOTAL`.padEnd(24) + data.total.toFixed(2))
    .style('NORMAL')
    .text(`Payment: ${data.paymentMethod}`);

  if (data.cashPaid !== undefined) {
    printer
      .text(`Cash Paid`.padEnd(24) + data.cashPaid.toFixed(2))
      .text(`Change Due`.padEnd(24) + (data.changeDue ?? 0).toFixed(2));
  }

  if (data.receiptFooter) {
    printer
      .text(line)
      .align('ct')
      .text(data.receiptFooter);
  }

  printer
    .text('\n\n\n')  // paper feed before cut
    .cut()
    .close();
}
```

**Graceful degradation:** Wrap the `printReceipt` call in try/catch in the IPC handler. If printing fails (printer offline, no paper, etc.), return `{ success: false, error: 'Printer unavailable' }`. The renderer shows a toast: "Receipt printing failed — sale was saved." The sale is never cancelled due to a printer failure.

**Updated handler in `src/main/index.ts`:**
```typescript
ipcMain.handle("hardware:print-receipt", async (_event, data: ReceiptData) => {
  try {
    await printReceipt(data);
    return { success: true };
  } catch (err) {
    console.error('[Printer]', err);
    return { success: false, error: (err as Error).message };
  }
});
```

---

### Task 4.2 — Cash Drawer Signal

**Problem:** `hardware:open-drawer` logs to console only. Most cash drawers are triggered by an ESC/POS DLE EOT command sent through the same serial/USB connection as the printer.

**Decision: Piggyback the cash drawer signal on the printer connection.** Most thermal printers have a RJ11/RJ12 cash drawer port that is triggered by the ESC/POS `\x1B\x70\x00\x19\xFA` command sequence. This is the universal approach — no separate driver needed.

**New file `src/main/hardware/drawer.ts`:**
```typescript
import USB from '@node-escpos/usb-adapter';
import { Printer } from '@node-escpos/core';

export async function openCashDrawer(): Promise<void> {
  const device = new USB();
  await device.open();
  const printer = new Printer(device);
  // ESC/POS cash drawer open command (pin 2)
  printer.cashdraw(2);
  await new Promise(r => setTimeout(r, 200));
  device.close();
}
```

**Updated handler:**
```typescript
ipcMain.handle("hardware:open-drawer", async () => {
  try {
    await openCashDrawer();
    return { success: true };
  } catch (err) {
    console.error('[Drawer]', err);
    return { success: false, error: (err as Error).message };
  }
});
```

---

### Task 4.3 — Barcode Scanner (Main Process Listener)

**Context:** Phase 1 implemented renderer-side barcode capture via `keydown` listener. This works when the renderer window has focus. The main-process approach sends events via IPC and is the recommended pattern for Electron because:
- It works even when modal dialogs or overlays are shown
- It can be used to trigger actions even when specific inputs are focused
- It enables multi-window setups in Phase 4+

**Decision: Implement the main-process barcode listener as an enhancement, not a replacement.** The Phase 1 renderer listener stays; the main-process listener sends an additional IPC push event `scanner:barcode` as a supplementary path.

**Implementation in `src/main/hardware/scanner.ts`:**
```typescript
import { BrowserWindow, globalShortcut } from 'electron';

class BarcodeScanner {
  private buffer = '';
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly TIMEOUT_MS = 80;   // max gap between chars
  private readonly MIN_LENGTH = 6;    // minimum barcode length

  attach(win: BrowserWindow): void {
    // Listen to ALL key events from the renderer
    win.webContents.on('before-input-event', (_event, input) => {
      if (input.type !== 'keyDown') return;
      if (input.key === 'Enter') {
        this.flush(win);
        return;
      }
      if (input.key.length === 1 && !input.control && !input.alt && !input.meta) {
        this.buffer += input.key;
        this.resetTimer(win);
      }
    });
  }

  private resetTimer(win: BrowserWindow): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(win), this.TIMEOUT_MS);
  }

  private flush(win: BrowserWindow): void {
    if (this.buffer.length >= this.MIN_LENGTH) {
      win.webContents.send('scanner:barcode', this.buffer);
    }
    this.buffer = '';
    this.timer = null;
  }
}

export const barcodeScanner = new BarcodeScanner();
```

**Wire it in `src/main/index.ts`:**
```typescript
mainWindow.on('ready-to-show', () => {
  mainWindow.show();
  barcodeScanner.attach(mainWindow);
});
```

**Note:** The `before-input-event` listener intercepts ALL keystrokes from the renderer. It must check that the key event is not already handled by a focused input field. Pass a signal alongside the barcode event so the renderer can suppress the keyboard event if it matches a detected barcode:
```typescript
win.webContents.send('scanner:barcode-detected', this.buffer);
// Renderer: on receiving this event, clear any partial keyboard state in search inputs
```

---

### Task 4.4 — PIN Security (Hashing)

**Problem:** Staff PINs are stored and compared as plaintext strings. If the SQLite file is accessed by an unauthorized person, all PINs are exposed immediately.

**Decision: Use Node.js built-in `crypto.pbkdf2Sync` with SHA-256.** No external dependencies needed. `bcrypt` is also a good choice but requires a native module (`bcryptjs` is pure JS but slower). For 4-6 digit PINs, PBKDF2 with 100,000 iterations and a per-user salt is more than sufficient.

**Why not bcrypt?** `bcrypt` is excellent for passwords but is computationally expensive for POS use cases where a cashier may need to authenticate multiple times quickly. PBKDF2 with a reasonable iteration count provides good security with lower latency (< 100ms per hash on modern hardware).

**Implementation:**
```typescript
// src/main/lib/crypto.ts
import { pbkdf2Sync, randomBytes } from 'crypto';

const ITERATIONS = 100_000;
const KEYLEN = 64;
const DIGEST = 'sha256';

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(pin, salt, ITERATIONS, KEYLEN, DIGEST).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, storedHash] = stored.split(':');
  if (!salt || !storedHash) return false;
  const hash = pbkdf2Sync(pin, salt, ITERATIONS, KEYLEN, DIGEST).toString('hex');
  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(
    Buffer.from(hash, 'hex'),
    Buffer.from(storedHash, 'hex')
  );
}

function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
```

**Migration of existing plaintext PINs:** On first launch after this update, detect plaintext PINs (they won't contain `:`) and re-hash them:
```typescript
// In database.ts, after runSchema():
function migrateHashPins(db: Database.Database): void {
  const staff = db.prepare("SELECT id, pin FROM staff WHERE pin IS NOT NULL").all() as {id: string; pin: string}[];
  const update = db.prepare("UPDATE staff SET pin = ? WHERE id = ?");
  const migrate = db.transaction(() => {
    for (const s of staff) {
      if (!s.pin.includes(':')) {  // plaintext detected
        update.run(hashPin(s.pin), s.id);
      }
    }
  });
  migrate();
}
```

**Update `staff:authenticate` IPC handler:**
```typescript
ipcMain.handle("staff:authenticate", (_event, { staffId, pin }) => {
  const staff = staffId
    ? db().prepare("SELECT * FROM staff WHERE id = ?").get(staffId)
    : db().prepare("SELECT * FROM staff WHERE 1=1").all()  // not secure, see below
        .find(s => verifyPin(pin, s.pin));  // check all since PIN may be non-unique across staff

  if (!staff) return null;
  if (!verifyPin(pin, staff.pin)) return null;
  const { pin: _, ...safeStaff } = staff;  // never return the hash
  return safeStaff;
});
```

**Security note:** When `staffId` is known (staff selected from list), only one PIN hash is checked. When doing "any-staff" PIN lookup (no selection), all active staff hashes are checked sequentially — this is safe because PBKDF2 is intentionally slow enough to be a rate-limiter.

---

### Task 4.5 — Automatic Database Backup

**Problem:** All data lives in a single SQLite file. If the file is corrupted or the drive fails, all data is lost.

**Decision: Implement two backup strategies:**
1. **Daily auto-backup** — triggered when the shift is closed (End-of-Day). Copies the `.db` file to `userData/backups/pos-YYYY-MM-DD.db`. Keep last 30 days.
2. **Manual export backup** — in the Settings screen, a "Export Full Backup" button uses `dialog.showSaveDialog` to let the user copy the db file anywhere (USB drive, network share, etc.).

**New file `src/main/lib/backup.ts`:**
```typescript
import { app } from 'electron';
import { join } from 'path';
import { copyFileSync, readdirSync, unlinkSync, mkdirSync, existsSync } from 'fs';

const MAX_BACKUPS = 30;

export function createDailyBackup(): string {
  const userData = app.getPath('userData');
  const backupDir = join(userData, 'backups');
  const dbPath = join(userData, 'naseej-pos.db');

  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });

  const date = new Date().toISOString().split('T')[0];
  const backupPath = join(backupDir, `pos-${date}.db`);

  copyFileSync(dbPath, backupPath);
  pruneOldBackups(backupDir);
  return backupPath;
}

function pruneOldBackups(backupDir: string): void {
  const files = readdirSync(backupDir)
    .filter(f => f.startsWith('pos-') && f.endsWith('.db'))
    .sort()
    .reverse();  // newest first

  files.slice(MAX_BACKUPS).forEach(f => {
    unlinkSync(join(backupDir, f));
  });
}
```

**IPC handlers:**
```typescript
ipcMain.handle("backup:createDaily", async () => {
  try {
    const path = createDailyBackup();
    return { success: true, path };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

ipcMain.handle("backup:exportToPath", async () => {
  const { dialog } = require('electron');
  const { filePath } = await dialog.showSaveDialog({
    title: 'Export Database Backup',
    defaultPath: `naseej-pos-backup-${new Date().toISOString().split('T')[0]}.db`,
    filters: [{ name: 'SQLite Database', extensions: ['db'] }],
  });
  if (!filePath) return { cancelled: true };
  const dbPath = join(app.getPath('userData'), 'naseej-pos.db');
  copyFileSync(dbPath, filePath);
  return { success: true, path: filePath };
});
```

**Trigger daily backup automatically when shift is closed** in `EndOfDayPage.tsx`:
```typescript
// After dailySummary:upsert and shifts:close succeed:
const backupResult = await window.api?.backup.createDaily();
if (backupResult?.success) {
  toast.success(`Backup saved to ${backupResult.path}`);
}
```

**StatusBar update:** Show "Last backup: today" or "Last backup: 3 days ago" based on the most recent backup file timestamp.

---

### Task 4.6 — Error Handling & Recovery

**Problem:** There is no global error boundary in the React app, no error logging to disk, and no graceful recovery from SQLite errors or IPC failures.

**Decision: Three layers of error handling:**

**Layer 1 — React Error Boundary:**
```typescript
// src/renderer/src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to main process for file logging
    window.api?.logError({ message: error.message, stack: error.stack, info: info.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
          <h2 className="text-lg font-semibold text-destructive">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mt-2">{this.state.error?.message}</p>
          <button
            className="btn-primary mt-6"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**Layer 2 — IPC error logging to file:**
```typescript
// src/main/lib/logger.ts
import { app } from 'electron';
import { join } from 'path';
import { appendFileSync } from 'fs';

export function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: unknown): void {
  const logPath = join(app.getPath('userData'), 'pos.log');
  const line = `[${new Date().toISOString()}] [${level}] ${message} ${data ? JSON.stringify(data) : ''}\n`;
  appendFileSync(logPath, line, 'utf-8');
  if (level === 'ERROR') console.error(line);
}
```

**Layer 3 — SQLite transaction failure recovery:**  
`better-sqlite3` throws synchronously on constraint violations. Wrap all IPC handlers that write to DB in a standardized try/catch that returns a typed error response rather than crashing the process:
```typescript
// Utility wrapper for all IPC write handlers:
function safeRun<T>(fn: () => T): { success: true; data: T } | { success: false; error: string } {
  try {
    return { success: true, data: fn() };
  } catch (err) {
    log('ERROR', 'DB operation failed', { message: (err as Error).message });
    return { success: false, error: (err as Error).message };
  }
}
```

---

### Task 4.7 — App Packaging & Distribution

**Decision: Use `electron-builder`** (already listed in `package.json` via `electron-vite`). Configure for:
- **Windows:** NSIS installer (`.exe`) — standard for Windows POS deployments
- **macOS:** DMG image (`.dmg`) — standard for macOS distribution

**`electron-builder` configuration in `package.json`:**
```json
{
  "build": {
    "appId": "sa.naseej.pos",
    "productName": "Naseej POS",
    "directories": { "output": "dist-app" },
    "files": ["dist/**", "resources/**"],
    "win": {
      "target": [{ "target": "nsis", "arch": ["x64", "ia32"] }],
      "icon": "resources/icon.ico"
    },
    "mac": {
      "target": [{ "target": "dmg", "arch": ["x64", "arm64"] }],
      "icon": "resources/icon.icns",
      "category": "public.app-category.business"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "runAfterFinish": true
    }
  }
}
```

**Auto-updater (optional for Phase 4):** `electron-updater` can check a GitHub Releases endpoint for new versions. Add a `autoUpdater.checkForUpdatesAndNotify()` call in `app.whenReady()`. Only activate if the app is packaged (`!is.dev`).

**Code signing note:** macOS requires a Developer ID certificate for distribution outside the App Store. Windows SmartScreen warnings are reduced with an EV code signing certificate. Document the signing requirements in a `DEPLOYMENT.md` file — don't block packaging on signing for internal deployments.

---

### Task 4.8 — Final QA Scenarios

Before releasing Phase 4, test these end-to-end scenarios on real hardware:

| Scenario | Pass Criteria |
|---|---|
| Full sale — cash payment | Order in DB, inventory decremented, receipt prints, drawer opens |
| Full sale — card payment | Order in DB, inventory decremented, receipt prints, drawer stays closed |
| Full sale — split payment | Both portions recorded, correct breakdown in `payment_details` |
| Barcode scan from USB scanner | Item added to cart without touching the mouse |
| Refund via receipt number | Order status changes, inventory restored, no receipt printed |
| Discount code applied | Correct amount deducted, invalid code shows error |
| End-of-Day close | Z-report matches order totals, backup file created in `userData/backups/` |
| App restart after sales | All orders, inventory levels, and daily summary survive restart |
| Printer offline | Sale completes, toast shows "Receipt printing failed — sale was saved" |
| Power loss mid-sale | On restart, no incomplete/phantom orders in DB (atomic transaction guarantees) |
| Large catalog (500+ products) | Barcode lookup < 200ms, product search renders < 100ms |
| Arabic text on receipt | Correct RTL characters printed, no garbled output |

---

## Decisions Summary

| Decision | Choice | Reason |
|---|---|---|
| ESC/POS library | `@node-escpos/core` + USB/serial adapter | Most maintained Node.js ESC/POS library; supports USB, serial, network printers |
| Cash drawer trigger | ESC/POS `cashdraw(2)` via printer connection | Eliminates need for a separate driver; works with all standard cash drawers |
| PIN hashing algorithm | PBKDF2-SHA256, 100k iterations, per-user salt | Built into Node.js crypto; no native deps; good balance of security and speed for POS |
| PIN timing attack protection | Constant-time comparison (manual XOR loop) | Prevents attackers from measuring response time to guess correct PIN length |
| Backup strategy | Auto-backup on shift close + manual export | Auto covers daily routine; manual export covers "take it home on USB" scenarios |
| Backup retention | 30 days | Covers a full month of audit needs without excessive disk usage |
| Error logging | Append-only `pos.log` file in `userData` | Persists across restarts; support team can request the log file from the user |
| App installer | NSIS (Windows) + DMG (macOS) | Standard formats for each platform; no App Store needed for internal POS |
| Barcode scanner strategy | Renderer `keydown` + Main `before-input-event` (dual path) | Belt-and-suspenders; renderer path handles 99% of cases; main-process path adds reliability |

---

## Exit Checklist

- [ ] Thermal receipt prints after every completed sale
- [ ] Receipt includes all fields: store name, address, items, totals, payment method, change due, footer
- [ ] Cash drawer opens on cash and split-cash payments only
- [ ] USB barcode scanner adds items to cart without any keyboard focus requirements
- [ ] Staff PINs in the database contain `:` separator (hashed format, not plaintext)
- [ ] Existing plaintext PINs are migrated to hashed format on first launch
- [ ] `staff:authenticate` never returns the `pin` field in its response
- [ ] Daily backup file appears in `userData/backups/` after every shift close
- [ ] Manual backup export works and produces a valid `.db` file
- [ ] React ErrorBoundary shows a recoverable UI on component crash
- [ ] All IPC write handlers return `{ success, error }` instead of throwing
- [ ] `pos.log` file captures all errors with timestamps
- [ ] Windows NSIS installer builds successfully and creates a desktop shortcut
- [ ] macOS DMG builds successfully (unsigned for internal use is acceptable)
- [ ] App passes all 12 QA scenarios in Task 4.8
- [ ] Arabic text on receipt is legible (no garbled characters)
