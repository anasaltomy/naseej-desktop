# Electron Main Process Architecture

## Naseej POS — Local Data Layer & Hardware Integration

**Stack:** Node.js (Electron) · SQLite · IPC Bridge  
**Database:** SQLite (local file: `pos.db`)  
**Architecture:** Renderer ↔ IPC ↔ Main Process ↔ SQLite + Hardware  
**Offline:** 100% local — no external dependencies

---

## Directory Layout

```
src/main/
├── index.ts                            # Entry point: window creation, app lifecycle
│
├── db/
│   ├── database.ts                     # SQLite connection & initialization
│   ├── schema.ts                       # Schema initialization (SQL)
│   ├── queries.ts                      # Common database queries
│   └── migrations.ts                   # Schema version tracking & upgrades
│
├── ipc/
│   ├── handlers.ts                     # IPC request/response handlers
│   ├── channels.ts                     # Channel name constants
│   └── errors.ts                       # Custom error types
│
├── hardware/
│   ├── printer.ts                      # ESC/POS thermal printer driver
│   ├── scanner.ts                      # Barcode scanner input handler
│   ├── drawer.ts                       # Cash drawer open signal
│   └── display.ts                      # Customer-facing display (future)
│
└── preload.ts                          # Context bridge (secure IPC interface)
```

---

## Core Responsibilities

### 1. SQLite Database Layer

**Purpose:** Persistent local storage of all data.

**Initialization:**
```typescript
// src/main/db/database.ts
import Database from 'better-sqlite3';

export function initializeDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');    // Enable referential integrity
  db.pragma('journal_mode = WAL');   // Write-ahead logging for safety
  
  // Load schema and create tables
  const schema = fs.readFileSync('./src/main/db/schema.sql', 'utf-8');
  db.exec(schema);
  
  return db;
}
```

**Features:**
- Single database file (`pos.db`) in app data directory
- Atomic transactions prevent data corruption
- Foreign key constraints enforce referential integrity
- Automatic backups on daily close
- Export/import via CSV for external analysis

### 2. IPC Bridge

**Purpose:** Safe communication between Renderer (React) and Main Process (Node.js).

**Architecture:**
```
┌──────────────────────────────────────────────────┐
│  Renderer (React Component)                       │
│  └─ window.electronAPI.printReceipt(data)        │
└──────────────────────────────────────────────────┘
                    ↓
            IPC Channel (secure)
                    ↓
┌──────────────────────────────────────────────────┐
│  Main Process (Node.js)                          │
│  ├─ ipcMain.handle('hardware:print-receipt')    │
│  ├─ PrinterDriver.print(data)                    │
│  └─ Hardware Device (ESC/POS Printer)            │
└──────────────────────────────────────────────────┘
```

**Implementation:**
```typescript
// src/main/ipc/handlers.ts
ipcMain.handle('hardware:print-receipt', async (_event, receiptData) => {
  try {
    await printReceipt(receiptData);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// src/main/preload.ts
contextBridge.exposeInMainWorld('electronAPI', {
  printReceipt: (data) => ipcRenderer.invoke('hardware:print-receipt', data),
  openDrawer: () => ipcRenderer.invoke('hardware:open-drawer'),
});

// src/renderer/src/hooks/use-hardware.ts
export const usePrinter = () => {
  return {
    printReceipt: (data) => window.electronAPI.printReceipt(data),
  };
};
```

### 3. Database Query Layer

**Purpose:** Encapsulate all database access with type-safe interfaces.

**Pattern:**
```typescript
// src/main/db/queries.ts
export function getProductByBarcode(db: Database, barcode: string): Product | undefined {
  const stmt = db.prepare(`
    SELECT * FROM products 
    WHERE barcode = ? OR id IN (
      SELECT product_id FROM product_variants WHERE barcode = ?
    )
  `);
  return stmt.get(barcode, barcode) as Product | undefined;
}

// Atomic transaction for consistency
export function createTransaction(db: Database, data: TransactionData): string {
  return db.transaction(() => {
    // 1. Insert transaction
    const transId = uuid();
    db.prepare(`INSERT INTO transactions (...) VALUES (...)`).run(...);
    
    // 2. Insert line items
    data.items.forEach(item => {
      db.prepare(`INSERT INTO transaction_items (...) VALUES (...)`).run(...);
    });
    
    // 3. Decrement inventory
    data.items.forEach(item => {
      db.prepare(`UPDATE inventory SET quantity = quantity - ? WHERE ...`).run(...);
    });
    
    // 4. Log movements
    data.items.forEach(item => {
      db.prepare(`INSERT INTO inventory_movements (...) VALUES (...)`).run(...);
    });
    
    return transId;
  })();
}
```

### 4. Hardware Integration

**Purpose:** Interface with external devices (printer, scanner, cash drawer).

#### Barcode Scanner
```typescript
// src/main/hardware/scanner.ts
class BarcodeScanner {
  private buffer = '';
  private timeout: NodeJS.Timeout | null = null;
  
  handleKeyPress(char: string) {
    clearTimeout(this.timeout!);
    this.buffer += char;
    
    // Barcode detection: rapid keystrokes < 50ms apart
    this.timeout = setTimeout(() => {
      if (this.buffer.length >= 8) {  // Min barcode length
        this.emit('barcode', this.buffer);
        this.buffer = '';
      }
    }, 50);
  }
}

// Hook for scanner events to Renderer
globalShortcut.registerAll(['any'], (event) => {
  scanner.handleKeyPress(event.key);
});
```

#### ESC/POS Printer
```typescript
// src/main/hardware/printer.ts
export async function printReceipt(data: ReceiptData): Promise<void> {
  const port = new SerialPort(printerPort, { baudRate: 9600 });
  
  const encoder = new ESCPOSEncoder();
  const commands = encoder
    .initialize()
    .align('center')
    .bold(true)
    .line(data.merchantName)
    .bold(false)
    .newline()
    .align('left')
    .table(data.items.map(item => ({
      left: `${item.qty}x ${item.name}`,
      right: `${item.total.toFixed(2)}`
    })))
    .newline()
    .text(`Total: ${data.total.toFixed(2)}`)
    .cut()
    .getBuffer();
  
  await port.write(commands);
  port.close();
}
```

#### Cash Drawer
```typescript
// src/main/hardware/drawer.ts
export async function openDrawer(): Promise<void> {
  // Send ESC/POS drawer open command via serial
  const drawer = new SerialPort(drawerPort);
  drawer.write(Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa])); // RJ-11 trigger
  drawer.close();
}
```

---

## Data Flow Example: Creating a Transaction

```
1. Renderer: User clicks "Pay" button
   └─ CartContext has items, totals, payment method
   
2. Renderer: Call IPC
   └─ window.electronAPI.createTransaction(transactionData)
   
3. Main Process: Handle IPC request
   └─ ipcMain.handle('db:create-transaction', (event, data) => {
        // Validate data
        // Create atomic transaction
        // Update inventory
        // Log movements
        // Return transaction ID
      })
   
4. Main Process: Update SQLite
   ├─ INSERT INTO transactions (...)
   ├─ INSERT INTO transaction_items (...)
   ├─ UPDATE inventory SET quantity = ...
   └─ INSERT INTO inventory_movements (...)
   
5. Renderer: Receive result
   └─ Display receipt preview
   
6. Renderer: Call print IPC
   └─ window.electronAPI.printReceipt(receiptData)
   
7. Main Process: Send to hardware
   └─ SerialPort.write(escposCommands)
   
8. Hardware: Print receipt
   └─ Thermal printer outputs receipt
```

---

## Database Safety

### Atomic Transactions

All multi-step operations are wrapped in transactions:

```typescript
const transaction = db.transaction((data) => {
  // If any step fails, all steps are rolled back
  try {
    db.prepare('INSERT INTO transactions ...').run(...);
    db.prepare('INSERT INTO transaction_items ...').run(...);
    db.prepare('UPDATE inventory ...').run(...);
  } catch (error) {
    // Transaction automatically rolled back by SQLite
    throw error;
  }
});

transaction(transactionData);
```

### Power Loss Safety

Critical data is written to disk before UI proceeds:
- Transaction ID confirmed in DB before printing receipt
- Inventory deduction persisted before cash drawer opens
- Receipt data backed up after each transaction

### Backup Strategy

```typescript
// Daily backup on shift close
export function backupDatabase(db: Database, outputDir: string) {
  const timestamp = new Date().toISOString().split('T')[0];
  const backupPath = `${outputDir}/pos_backup_${timestamp}.db`;
  
  const backup = new Database(backupPath);
  db.backup(backup).step();
  backup.close();
}

// Export transactions for external analysis
export function exportTransactions(db: Database, days: number = 30): string {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  const rows = db.prepare(`
    SELECT * FROM transactions WHERE timestamp > ?
  `).all(cutoff);
  
  return convertToCSV(rows);
}
```

---

## Performance Considerations

### Indexes

All high-frequency queries have indexes:
```sql
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_transactions_date ON transactions(timestamp);
CREATE INDEX idx_inventory_product ON inventory(product_id);
```

### Query Optimization

```typescript
// ✅ GOOD: Single indexed query
const product = db.prepare('SELECT * FROM products WHERE barcode = ?').get(barcode);

// ❌ BAD: Full table scan
const products = db.prepare('SELECT * FROM products').all();
const product = products.find(p => p.barcode === barcode);
```

### Caching

Cache product catalog in memory to avoid repeated disk reads:
```typescript
class ProductCache {
  private cache: Map<string, Product> = new Map();
  
  getByBarcode(db: Database, barcode: string): Product {
    if (!this.cache.has(barcode)) {
      const product = db.prepare('SELECT * FROM products WHERE barcode = ?').get(barcode);
      this.cache.set(barcode, product);
    }
    return this.cache.get(barcode)!;
  }
}
```

---

## Error Handling

All operations include error recovery:

```typescript
try {
  // Attempt operation
  const result = await operation();
  return { success: true, data: result };
} catch (error) {
  // Log error
  console.error('Operation failed:', error);
  
  // Return safe error message
  return {
    success: false,
    error: 'Unable to complete operation. Please try again.',
    code: error.code || 'UNKNOWN_ERROR'
  };
}
```

---

## Testing

### Unit Tests (Database Queries)
```typescript
describe('Database Queries', () => {
  it('should create transaction atomically', () => {
    const data = { ... };
    const id = createTransaction(db, data);
    
    const trans = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    expect(trans).toBeDefined();
    
    const items = db.prepare('SELECT * FROM transaction_items WHERE transaction_id = ?').all(id);
    expect(items.length).toBe(data.items.length);
  });
});
```

### Integration Tests (IPC + Database)
```typescript
describe('IPC + Database', () => {
  it('should handle transaction creation request', async () => {
    const result = await ipcMain.invoke('db:create-transaction', testData);
    expect(result.success).toBe(true);
  });
});
```

---

## Directory Layout

```
server/
├── cmd/
│   ├── server/
│   │   └── main.go                     # Entry point: init DB, AutoMigrate, middleware, routes, start server
│   └── seed/
│       └── main.go                     # Seed initial merchant config + admin user
│
├── config/
│   ├── config.go                       # Environment variable parsing & validation
│   └── config.yaml                     # Default configuration (overridden by env vars)
│
├── internal/
│   ├── models/                         # GORM model definitions (source of truth for DB schema)
│   │   ├── base.go                     # TenantModel embed (ID, MerchantID, timestamps)
│   │   ├── merchant.go                 # Merchant entity (tenant config, API keys)
│   │   ├── user.go                     # Staff & customer users
│   │   ├── product.go                  # Product + ProductVariant
│   │   ├── category.go                 # Hierarchical categories + SizeGroup link
│   │   ├── size_group.go               # SizeGroup + associated sizes
│   │   ├── inventory.go                # InventoryLevel + InventoryMovement
│   │   ├── order.go                    # Order + OrderItem
│   │   ├── payment.go                  # Payment + Refund
│   │   ├── customer.go                 # Customer + Address + LoyaltyTransaction
│   │   ├── promotion.go               # Coupon + PromotionRule
│   │   └── staff.go                    # Role + Permission + ManagerOverride
│   │
│   ├── repository/                     # Data access layer (GORM queries)
│   │   ├── base.go                     # BaseRepository with Scoped(ctx) method
│   │   ├── merchant_repo.go
│   │   ├── product_repo.go
│   │   ├── inventory_repo.go
│   │   ├── order_repo.go
│   │   ├── customer_repo.go
│   │   ├── payment_repo.go
│   │   └── staff_repo.go
│   │
│   ├── service/                        # Business logic layer
│   │   ├── product_service.go
│   │   ├── inventory_service.go        # Stock updates, movement logging, broadcast
│   │   ├── order_service.go            # Order creation, state transitions
│   │   ├── payment_service.go          # Payment processing, split payments, refunds
│   │   ├── customer_service.go         # Profile management, loyalty points
│   │   ├── promotion_service.go        # Coupon validation, discount application
│   │   ├── auth_service.go             # Login, JWT issuance, PIN verification
│   │   └── staff_service.go            # RBAC enforcement, role management
│   │
│   ├── graph/                          # GraphQL layer (gqlgen)
│   │   ├── schema/                     # Schema definition files (.graphqls)
│   │   │   ├── schema.graphqls         # Root Query, Mutation, Subscription types
│   │   │   ├── merchant.graphqls       # Merchant types & bootstrap query
│   │   │   ├── product.graphqls        # Product catalog types & operations
│   │   │   ├── inventory.graphqls      # Stock level types & mutations
│   │   │   ├── order.graphqls          # Order types & operations
│   │   │   ├── customer.graphqls       # Customer types & operations
│   │   │   ├── payment.graphqls        # Payment types
│   │   │   ├── promotion.graphqls      # Coupon & discount types
│   │   │   └── staff.graphqls          # RBAC types & operations
│   │   ├── generated/
│   │   │   └── generated.go            # Auto-generated gqlgen runtime (DO NOT EDIT)
│   │   ├── model/
│   │   │   └── models_gen.go           # Auto-generated GraphQL model structs
│   │   ├── resolver.go                 # Root resolver (dependency injection container)
│   │   ├── merchant.resolvers.go
│   │   ├── product.resolvers.go
│   │   ├── inventory.resolvers.go
│   │   ├── order.resolvers.go
│   │   ├── customer.resolvers.go
│   │   ├── payment.resolvers.go
│   │   ├── promotion.resolvers.go
│   │   └── staff.resolvers.go
│   │
│   ├── middleware/                     # Gin middleware stack
│   │   ├── tenant.go                   # X-Merchant-ID header → context injection
│   │   ├── auth.go                     # JWT validation → user context
│   │   ├── rbac.go                     # Permission enforcement per resolver
│   │   ├── cors.go                     # CORS configuration
│   │   └── logger.go                   # Structured request logging
│   │
│   └── websocket/                      # Real-time inventory broadcast
│       ├── hub.go                      # Connection manager (per-merchant rooms)
│       ├── client.go                   # Individual WebSocket connection handler
│       └── events.go                   # Event type definitions (stock_update, order_placed)
│
├── pkg/                                # Shared utilities (importable by other packages)
│   ├── database/
│   │   └── postgres.go                 # Connection pool setup, GORM initialization
│   ├── errors/
│   │   └── errors.go                   # Standardized error types & codes
│   └── utils/
│       ├── pagination.go               # Cursor-based pagination helpers
│       └── validation.go               # Input validation utilities
│
├── gqlgen.yml                          # gqlgen configuration (schema paths, resolver mapping)
├── Dockerfile                          # Multi-stage production build
├── docker-compose.yml                  # Local development (API + PostgreSQL)
├── Makefile                            # Common commands (generate, run, test)
├── go.mod
└── go.sum
```

---

## Architectural Patterns

### Three-Layer Architecture

Every data operation flows through three clean layers:

```
GraphQL Resolver (input validation, response mapping)
        │
        ▼
   Service Layer (business rules, orchestration, event emission)
        │
        ▼
  Repository Layer (GORM queries, scoped to tenant)
        │
        ▼
    PostgreSQL (data persistence)
```

**Rules:**
- Resolvers never call repositories directly
- Services never import `graph/` packages
- Repositories never contain business logic
- All layers receive `context.Context` carrying tenant & user info

### GORM AutoMigrate (Schema Management)

The server uses GORM's `AutoMigrate` to manage the database schema. On startup, `main.go` calls `AutoMigrate` with all model structs. GORM creates tables, adds missing columns, and creates indexes automatically. No manual SQL migration files are needed.

```go
// cmd/server/main.go (during initialization)
func autoMigrate(db *gorm.DB) error {
    return db.AutoMigrate(
        &models.Merchant{},
        &models.User{},
        &models.Role{},
        &models.Permission{},
        &models.Location{},
        &models.SizeGroup{},
        &models.Size{},
        &models.Color{},
        &models.Category{},
        &models.Brand{},
        &models.Product{},
        &models.ProductImage{},
        &models.ProductVariant{},
        &models.InventoryLevel{},
        &models.InventoryMovement{},
        &models.Customer{},
        &models.CustomerAddress{},
        &models.Order{},
        &models.OrderItem{},
        &models.Payment{},
        &models.Refund{},
        &models.Coupon{},
        &models.LoyaltyTransaction{},
        &models.ManagerOverride{},
    )
}
```

**Why AutoMigrate for now:**
- The app is in early development — schema changes are frequent
- No production data to protect yet
- When the app matures and has production merchants, switch to versioned migrations (golang-migrate)

### Merchant Table (Configuration & Tenant Identity)

The `merchants` table is the core tenant identity. Each merchant row holds runtime configuration that the frontends load on boot via `merchantBootstrap` query:

```go
// internal/models/merchant.go
type Merchant struct {
    ID              uuid.UUID       `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
    BusinessName    string          `gorm:"size:150;not null"`
    Slug            string          `gorm:"size:50;uniqueIndex;not null"`
    Domain          string          `gorm:"size:255"`
    LogoURL         string
    TaxRate         float64         `gorm:"type:decimal(5,4);default:0.15"`
    Currency        string          `gorm:"size:3;default:'SAR'"`
    Timezone        string          `gorm:"size:50;default:'Asia/Riyadh'"`
    IsActive        bool            `gorm:"default:true"`
    Settings        datatypes.JSON  `gorm:"type:jsonb;default:'{}'"`  // payment gateways, loyalty, receipt text
    CreatedAt       time.Time
    UpdatedAt       time.Time
}
```

### Multi-Tenancy: The Scoped Context Pattern

All tenant-owned tables embed `TenantModel` which includes `MerchantID`. The `BaseRepository.Scoped(ctx)` method automatically filters every query by the current merchant.

```go
// internal/models/base.go
type TenantModel struct {
    ID         uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
    MerchantID uuid.UUID `gorm:"type:uuid;not null;index"`
    CreatedAt  time.Time
    UpdatedAt  time.Time
}

// internal/repository/base.go
type BaseRepository struct {
    db *gorm.DB
}

// Scoped returns a GORM session pre-filtered to the current tenant.
// This method MUST be used for every query to prevent cross-tenant data leaks.
func (r *BaseRepository) Scoped(ctx context.Context) *gorm.DB {
    merchantID := middleware.GetMerchantID(ctx)
    return r.db.Where("merchant_id = ?", merchantID)
}
```

**Tenant resolution flow:**
1. Each frontend (web/POS) sends `X-Merchant-ID` header with every request (configured in `merchant.ts`)
2. `middleware/tenant.go` validates the merchant exists and is active
3. Merchant ID injected into `context.Context`
4. Every repository call uses `Scoped(ctx)` — tenant filter is automatic and unforgettable

**Note:** Since each merchant’s website/POS is a separate deployment with a hardcoded `merchant_id` in `merchant.ts`, there is no dynamic tenant discovery. The frontend always knows which merchant it belongs to.

### RBAC Enforcement

```go
// Permissions follow resource:action naming
const (
    PermOrdersCreate  = "orders:create"
    PermOrdersRefund  = "orders:refund"
    PermInventoryEdit = "inventory:edit"
    PermPOSOpenDrawer = "pos:open_drawer"
    PermStaffManage   = "staff:manage"
)

// Built-in role hierarchy (each inherits permissions of roles below it):
// super_admin → admin → store_manager → senior_cashier → cashier
//                     → ecommerce_manager
//                     → inventory_manager
//                     → viewer
```

### WebSocket Real-Time Broadcast

```go
// When inventory changes, the service emits to the hub:
func (s *InventoryService) UpdateStock(ctx context.Context, variantID uuid.UUID, delta int) error {
    // ... update DB ...
    
    merchantID := middleware.GetMerchantID(ctx)
    // Broadcast to all connected clients for this merchant
    s.wsHub.Broadcast(merchantID, events.StockUpdate{
        VariantID: variantID,
        NewQty:    newLevel.Quantity,
        Location:  locationID,
    })
    return nil
}
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| GORM over raw SQL | Rapid development, AutoMigrate for early-stage schema management, struct-based models |
| gqlgen over graphql-go | Code-first generation, type safety, schema-driven development |
| Single DB multi-tenant | Simpler operations, one server to maintain, row-level isolation sufficient |
| GORM AutoMigrate | Early stage — schema evolving rapidly; will switch to versioned migrations at maturity |
| Gin over net/http | Middleware ecosystem, performance, request context helpers |
| Domain-split schemas | Independent domain evolution, smaller resolver files |
| WebSocket over SSE | Bidirectional communication needed for POS acknowledgments |
