# Data Models & Schemas

## Naseej POS — SQLite Database Schema

**Database:** SQLite 3  
**ORM:** None — direct SQL with parameterized queries  
**Location:** `pos.db` (stored in app data directory)  
**Backup:** Automatic backups on daily close

---

## 1. Database Initialization

```typescript
// src/main/db/database.ts
import Database from 'better-sqlite3';
import fs from 'fs';

export function initializeDatabase(dbPath: string) {
  const db = new Database(dbPath);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Load schema
  const schema = fs.readFileSync('./src/main/db/schema.sql', 'utf-8');
  db.exec(schema);
  
  return db;
}
```

---

## 2. Table Definitions

### 2.1 Staff

Store POS operator accounts with hashed PINs.

```sql
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  pin_hash TEXT NOT NULL,  -- bcrypt hashed
  role TEXT DEFAULT 'cashier',  -- admin, manager, cashier
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_staff_email ON staff(email);
```

### 2.2 Products

Core product catalog with SKU and barcode.

```sql
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  barcode TEXT UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  price REAL NOT NULL,
  cost_price REAL,
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_name ON products(name);
```

### 2.3 Product Variants

Variants represent specific options like size/color combinations.

```sql
CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  size TEXT,
  color TEXT,
  sku_variant TEXT UNIQUE,
  barcode_variant TEXT UNIQUE,
  price REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_barcode ON product_variants(barcode_variant);
```

### 2.4 Inventory

Current stock levels per product/variant per location.

```sql
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  variant_id TEXT,
  location TEXT DEFAULT 'store',  -- e.g., 'store', 'warehouse'
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (variant_id) REFERENCES product_variants(id),
  CHECK (quantity >= 0)  -- Prevent negative stock
);

CREATE UNIQUE INDEX idx_inventory_product_location 
  ON inventory(product_id, variant_id, location);
CREATE INDEX idx_inventory_quantity ON inventory(quantity);
```

### 2.5 Inventory Movements

Audit trail of all stock changes.

```sql
CREATE TABLE IF NOT EXISTS inventory_movements (
  id TEXT PRIMARY KEY,
  inventory_id TEXT NOT NULL,
  quantity_change INTEGER NOT NULL,
  reason TEXT NOT NULL,  -- 'sale', 'adjustment', 'restock', 'damaged', 'loss', 'count'
  staff_id TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inventory_id) REFERENCES inventory(id),
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

CREATE INDEX idx_movements_inventory ON inventory_movements(inventory_id);
CREATE INDEX idx_movements_date ON inventory_movements(created_at);
```

### 2.6 Transactions

Completed sales transactions.

```sql
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  receipt_number TEXT UNIQUE NOT NULL,
  staff_id TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  subtotal REAL NOT NULL,
  tax_amount REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  total REAL NOT NULL,
  payment_method TEXT NOT NULL,  -- 'cash', 'card', 'mobile'
  status TEXT DEFAULT 'completed',  -- 'pending', 'completed', 'cancelled', 'refunded'
  notes TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

CREATE INDEX idx_transactions_date ON transactions(timestamp);
CREATE INDEX idx_transactions_staff ON transactions(staff_id);
CREATE INDEX idx_transactions_receipt ON transactions(receipt_number);
```

### 2.7 Transaction Items

Line items within a transaction.

```sql
CREATE TABLE IF NOT EXISTS transaction_items (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  variant_id TEXT,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,  -- Price at time of sale (snapshot)
  line_total REAL NOT NULL,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (variant_id) REFERENCES product_variants(id)
);

CREATE INDEX idx_trans_items_transaction ON transaction_items(transaction_id);
```

### 2.8 Returns

Track returned/refunded items.

```sql
CREATE TABLE IF NOT EXISTS returns (
  id TEXT PRIMARY KEY,
  original_transaction_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  refund_method TEXT NOT NULL,  -- 'cash', 'card', 'store_credit'
  refund_amount REAL NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'completed',
  FOREIGN KEY (original_transaction_id) REFERENCES transactions(id),
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

CREATE INDEX idx_returns_original_trans ON returns(original_transaction_id);
CREATE INDEX idx_returns_date ON returns(timestamp);
```

### 2.9 Return Items

Line items returned.

```sql
CREATE TABLE IF NOT EXISTS return_items (
  id TEXT PRIMARY KEY,
  return_id TEXT NOT NULL,
  transaction_item_id TEXT NOT NULL,
  quantity_returned INTEGER NOT NULL,
  FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
  FOREIGN KEY (transaction_item_id) REFERENCES transaction_items(id)
);

CREATE INDEX idx_return_items_return ON return_items(return_id);
```

### 2.10 Daily Summaries

Pre-calculated daily reports for performance.

```sql
CREATE TABLE IF NOT EXISTS daily_summaries (
  id TEXT PRIMARY KEY,
  date TEXT UNIQUE NOT NULL,  -- YYYY-MM-DD
  total_sales REAL DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  cash_amount REAL DEFAULT 0,
  card_amount REAL DEFAULT 0,
  items_sold INTEGER DEFAULT 0,
  discounts_given REAL DEFAULT 0,
  refund_amount REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_summaries_date ON daily_summaries(date);
```

### 2.11 Settings

Store application configuration.

```sql
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Example rows:
-- ('tax_rate', '0.15')
-- ('currency', 'SAR')
-- ('store_name', 'My Store')
-- ('receipt_header', 'Welcome to our store')
-- ('receipt_footer', 'Thank you for shopping')
```

---

## 3. Data Access Patterns

### 3.1 Query Examples

```typescript
// src/main/db/queries.ts

// Get product by barcode
export function getProductByBarcode(db: Database, barcode: string) {
  const stmt = db.prepare(`
    SELECT p.*, pv.*, i.quantity
    FROM products p
    LEFT JOIN product_variants pv ON p.id = pv.product_id
    LEFT JOIN inventory i ON p.id = i.product_id
    WHERE p.barcode = ? OR pv.barcode_variant = ?
  `);
  return stmt.get(barcode, barcode);
}

// Create transaction
export function createTransaction(db: Database, data: TransactionData) {
  const createTrans = db.transaction((transData) => {
    // Insert transaction
    const transStmt = db.prepare(`
      INSERT INTO transactions 
      (id, receipt_number, staff_id, subtotal, tax_amount, discount_amount, total, payment_method)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    transStmt.run(
      data.id, data.receipt_number, data.staff_id,
      data.subtotal, data.tax, data.discount, data.total, data.payment_method
    );
    
    // Insert items
    const itemStmt = db.prepare(`
      INSERT INTO transaction_items 
      (id, transaction_id, product_id, quantity, unit_price, line_total)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    data.items.forEach(item => {
      itemStmt.run(
        item.id, data.id, item.product_id, item.quantity, item.price, item.line_total
      );
      
      // Update inventory
      const updateInv = db.prepare(`
        UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?
      `);
      updateInv.run(item.quantity, item.product_id);
      
      // Log movement
      const moveStmt = db.prepare(`
        INSERT INTO inventory_movements (id, inventory_id, quantity_change, reason, staff_id)
        SELECT ?, id, ?, 'sale', ? FROM inventory WHERE product_id = ?
      `);
      moveStmt.run(data.id, -item.quantity, data.staff_id, item.product_id);
    });
    
    return data.id;
  });
  
  return createTrans(data);
}
```

### 3.2 Parameterized Queries (Safe from SQL Injection)

```typescript
// SAFE: Parameterized query
const stmt = db.prepare('SELECT * FROM products WHERE sku = ?');
const product = stmt.get(userInput);  // userInput is safely parameterized

// UNSAFE: String concatenation (NEVER DO THIS)
const query = `SELECT * FROM products WHERE sku = '${userInput}'`;  // ❌ SQL Injection risk!
```

---

## 4. Backup & Recovery

### 4.1 Automatic Backup

```typescript
export function backupDatabase(db: Database, outputPath: string) {
  // Create backup copy of database
  const backup = new Database(outputPath);
  db.backup(backup).step();
  backup.close();
}
```

### 4.2 Export for Analysis

```typescript
export function exportTransactions(db: Database): string {
  const stmt = db.prepare(`
    SELECT * FROM transactions 
    WHERE timestamp >= datetime('now', '-30 days')
    ORDER BY timestamp DESC
  `);
  
  const rows = stmt.all();
  const csv = convertToCSV(rows);
  return csv;
}
```

---

## 5. Migration Strategy

Since this is a single-merchant app, migrations are simpler than multi-tenant systems.

### 5.1 Version Tracking

```sql
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 5.2 Migration Scripts

```typescript
// src/main/db/migrations.ts
export function migrate(db: Database) {
  const currentVersion = db.prepare(
    'SELECT MAX(version) as version FROM schema_version'
  ).get()?.version ?? 0;
  
  if (currentVersion < 1) {
    // Apply migration 1
    db.exec(migration_001);
    db.prepare('INSERT INTO schema_version (version) VALUES (1)').run();
  }
  
  // Apply subsequent migrations...
}
```

---

## 6. Performance Optimization

### 6.1 Indexes

All critical queries have indexes on:
- `products(barcode)` — barcode lookups
- `transactions(date)` — historical reports
- `inventory(product_id, location)` — stock checks
- `staff(email)` — login validation

### 6.2 Vacuum & Optimize

```typescript
// Run periodically (e.g., weekly)
db.prepare('VACUUM').run();
db.prepare('ANALYZE').run();
```

---

## 7. Data Integrity Constraints

- **Foreign Keys:** Enabled via `PRAGMA foreign_keys = ON`
- **Unique Constraints:** SKU, barcode, receipt number
- **Check Constraints:** Inventory quantity >= 0, prices >= 0
- **Atomicity:** All critical operations wrapped in transactions

---

## 1. GORM Model Definitions

All models are defined as Go structs. GORM AutoMigrate creates and updates tables automatically on server startup. No manual SQL migration files.

### 1.1 Base Models

```go
// internal/models/base.go
package models

import (
    "time"
    "github.com/google/uuid"
)

// BaseModel is embedded in non-tenant entities (like Merchant itself)
type BaseModel struct {
    ID        uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
    CreatedAt time.Time
    UpdatedAt time.Time
}

// TenantModel is embedded in all merchant-scoped entities
type TenantModel struct {
    ID         uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
    MerchantID uuid.UUID `gorm:"type:uuid;not null;index"`
    CreatedAt  time.Time
    UpdatedAt  time.Time
}
```

### 1.2 Merchant

```go
// internal/models/merchant.go
type Merchant struct {
    BaseModel
    BusinessName    string         `gorm:"size:150;not null"`
    Slug            string         `gorm:"size:50;uniqueIndex;not null"`
    Domain          string         `gorm:"size:255"`
    LogoURL         string
    PrimaryColor    string         `gorm:"size:7"`
    SecondaryColor  string         `gorm:"size:7"`
    TaxRate         float64        `gorm:"type:decimal(5,4);default:0.15"`
    Currency        string         `gorm:"size:3;default:'SAR'"`
    Timezone        string         `gorm:"size:50;default:'Asia/Riyadh'"`
    IsActive        bool           `gorm:"default:true"`
    Settings        datatypes.JSON `gorm:"type:jsonb;default:'{}'"`
    // Settings JSON holds: payment gateways, loyalty config, receipt header/footer
}
```

### 1.3 Users & Staff (RBAC)

```go
// internal/models/user.go
type User struct {
    TenantModel
    Email        string     `gorm:"size:255;not null"`
    PasswordHash string     `gorm:"size:255;not null"`
    FirstName    string     `gorm:"size:100;not null"`
    LastName     string     `gorm:"size:100;not null"`
    Phone        string     `gorm:"size:20"`
    PinCode      string     `gorm:"size:255"`          // hashed PIN for POS quick-login
    AvatarURL    string
    IsActive     bool       `gorm:"default:true"`
    LastLoginAt  *time.Time
    Roles        []Role     `gorm:"many2many:user_roles;"`
    Locations    []Location `gorm:"many2many:user_locations;"`
}
// Unique constraint: (merchant_id, email) — added via AutoMigrate hook or composite index

// internal/models/staff.go
type Role struct {
    TenantModel
    Name        string       `gorm:"size:50;not null"`
    Description string
    IsSystem    bool         `gorm:"default:false"`
    Permissions []Permission `gorm:"many2many:role_permissions;"`
}

type Permission struct {
    BaseModel
    Resource    string `gorm:"size:50;not null"`
    Action      string `gorm:"size:50;not null"`
    Description string
}
// Unique constraint: (resource, action)

type ManagerOverride struct {
    TenantModel
    ManagerID  uuid.UUID `gorm:"type:uuid;not null"`
    Manager    User      `gorm:"foreignKey:ManagerID"`
    CashierID  uuid.UUID `gorm:"type:uuid;not null"`
    Cashier    User      `gorm:"foreignKey:CashierID"`
    Action     string    `gorm:"size:100;not null"`
    Reason     string
    LocationID *uuid.UUID `gorm:"type:uuid"`
    Location   *Location  `gorm:"foreignKey:LocationID"`
}
```

### 1.4 Locations

```go
// internal/models/location.go (defined within user.go or standalone)
type Location struct {
    TenantModel
    Name        string `gorm:"size:150;not null"`
    Address     string
    City        string `gorm:"size:100"`
    Country     string `gorm:"size:2"` // ISO 3166-1 alpha-2
    Phone       string `gorm:"size:20"`
    IsWarehouse bool   `gorm:"default:false"`
    IsActive    bool   `gorm:"default:true"`
}
```

### 1.5 Product Catalog (with SizeGroup)

```go
// internal/models/size_group.go

// SizeGroup represents a named collection of sizes applicable to a product category.
// Examples: "Shoes Women (36-41)", "Shoes Men (40-45)", "Shirts (S-XXL)", "Kids (2Y-12Y)"
// When a user creates a product under a category, the form auto-populates with
// the sizes from that category's assigned SizeGroup.
type SizeGroup struct {
    TenantModel
    Name  string `gorm:"size:100;not null"` // e.g. "Women's Shoes", "Men's Shirts"
    Sizes []Size `gorm:"foreignKey:SizeGroupID"`
}

type Size struct {
    TenantModel
    SizeGroupID uuid.UUID `gorm:"type:uuid;not null;index"`
    SizeGroup   SizeGroup `gorm:"foreignKey:SizeGroupID"`
    Name        string    `gorm:"size:20;not null"` // e.g. 'S', 'M', 'L', '38', '42'
    SortOrder   int       `gorm:"default:0"`
}

// internal/models/category.go
type Category struct {
    TenantModel
    ParentID    *uuid.UUID `gorm:"type:uuid;index"`
    Parent      *Category  `gorm:"foreignKey:ParentID"`
    Children    []Category `gorm:"foreignKey:ParentID"`
    SizeGroupID *uuid.UUID `gorm:"type:uuid"`          // links category to its size system
    SizeGroup   *SizeGroup `gorm:"foreignKey:SizeGroupID"`
    Name        string     `gorm:"size:100;not null"`
    Slug        string     `gorm:"size:100;not null"`
    Description string
    ImageURL    string
    SortOrder   int        `gorm:"default:0"`
}

type Color struct {
    TenantModel
    Name    string `gorm:"size:50;not null"`
    HexCode string `gorm:"size:7"`
}

type Brand struct {
    TenantModel
    Name    string `gorm:"size:100;not null"`
    Slug    string `gorm:"size:100;not null"`
    LogoURL string
}

// internal/models/product.go
type Product struct {
    TenantModel
    BrandID      *uuid.UUID     `gorm:"type:uuid"`
    Brand        *Brand         `gorm:"foreignKey:BrandID"`
    CategoryID   *uuid.UUID     `gorm:"type:uuid"`
    Category     *Category      `gorm:"foreignKey:CategoryID"`
    Name         string         `gorm:"size:255;not null"`
    Slug         string         `gorm:"size:255;not null"`
    Description  string
    BasePrice    float64        `gorm:"type:decimal(10,2);not null"`
    ComparePrice *float64       `gorm:"type:decimal(10,2)"`
    CostPrice    *float64       `gorm:"type:decimal(10,2)"`
    IsPublished  bool           `gorm:"default:false"`
    IsActive     bool           `gorm:"default:true"`
    Tags         pq.StringArray `gorm:"type:text[]"`
    Images       []ProductImage `gorm:"foreignKey:ProductID"`
    Variants     []ProductVariant `gorm:"foreignKey:ProductID"`
}

type ProductImage struct {
    BaseModel
    ProductID uuid.UUID `gorm:"type:uuid;not null;index"`
    URL       string    `gorm:"not null"`
    AltText   string    `gorm:"size:255"`
    SortOrder int       `gorm:"default:0"`
    IsPrimary bool      `gorm:"default:false"`
}

type ProductVariant struct {
    BaseModel
    ProductID     uuid.UUID `gorm:"type:uuid;not null;index"`
    Product       Product   `gorm:"foreignKey:ProductID"`
    SizeID        uuid.UUID `gorm:"type:uuid;not null"`
    Size          Size      `gorm:"foreignKey:SizeID"`
    ColorID       uuid.UUID `gorm:"type:uuid;not null"`
    Color         Color     `gorm:"foreignKey:ColorID"`
    SKU           string    `gorm:"size:50;uniqueIndex;not null"`
    Barcode       string    `gorm:"size:50;uniqueIndex"`
    PriceOverride *float64  `gorm:"type:decimal(10,2)"`
    CostOverride  *float64  `gorm:"type:decimal(10,2)"`
    WeightGrams   *int
    IsActive      bool      `gorm:"default:true"`
}
// Unique constraint: (product_id, size_id, color_id)
```

**SizeGroup Flow — How It Works:**

```
1. Admin creates SizeGroups:
   - "Women's Shoes" → sizes: 36, 37, 38, 39, 40, 41
   - "Men's Shoes"   → sizes: 40, 41, 42, 43, 44, 45
   - "Shirts"        → sizes: S, M, L, XL, XXL
   - "Kids Clothes"  → sizes: 2Y, 4Y, 6Y, 8Y, 10Y, 12Y

2. Admin assigns SizeGroup to Category:
   - Category "Women's Footwear" → SizeGroup "Women's Shoes"
   - Category "Men's Shirts"     → SizeGroup "Shirts"

3. When creating a product under "Women's Footwear":
   - The variant creation form auto-populates size options: 36, 37, 38...41
   - User only needs to pick colors and confirm which sizes to stock
   - SKU/barcode auto-generated or entered per variant
```

### 1.6 Inventory

```go
// internal/models/inventory.go
type InventoryLevel struct {
    BaseModel
    VariantID    uuid.UUID      `gorm:"type:uuid;not null;index"`
    Variant      ProductVariant `gorm:"foreignKey:VariantID"`
    LocationID   uuid.UUID      `gorm:"type:uuid;not null;index"`
    Location     Location       `gorm:"foreignKey:LocationID"`
    Quantity     int            `gorm:"not null;default:0;check:quantity >= 0"`
    Reserved     int            `gorm:"not null;default:0;check:reserved >= 0"`
    ReorderPoint int            `gorm:"default:0"`
}
// Unique constraint: (variant_id, location_id)

type MovementReason string
const (
    MovementSale        MovementReason = "sale"
    MovementReturn      MovementReason = "return"
    MovementAdjustment  MovementReason = "adjustment"
    MovementTransferIn  MovementReason = "transfer_in"
    MovementTransferOut MovementReason = "transfer_out"
    MovementRestock     MovementReason = "restock"
    MovementDamaged     MovementReason = "damaged"
    MovementLost        MovementReason = "lost"
    MovementManualCount MovementReason = "manual_count"
)

type InventoryMovement struct {
    TenantModel
    VariantID      uuid.UUID      `gorm:"type:uuid;not null;index"`
    Variant        ProductVariant `gorm:"foreignKey:VariantID"`
    LocationID     uuid.UUID      `gorm:"type:uuid;not null"`
    Location       Location       `gorm:"foreignKey:LocationID"`
    QuantityChange int            `gorm:"not null"` // positive = in, negative = out
    Reason         MovementReason `gorm:"size:20;not null"`
    ReferenceID    *uuid.UUID     `gorm:"type:uuid"`
    ReferenceType  string         `gorm:"size:50"` // 'order', 'transfer', 'adjustment'
    Notes          string
    PerformedBy    *uuid.UUID     `gorm:"type:uuid"`
    Performer      *User          `gorm:"foreignKey:PerformedBy"`
}
```

### 1.7 Orders

```go
// internal/models/order.go
type OrderChannel string
const (
    ChannelPOS    OrderChannel = "POS"
    ChannelWeb    OrderChannel = "WEB"
    ChannelMobile OrderChannel = "MOBILE"
)

type OrderStatus string
const (
    StatusPending    OrderStatus = "PENDING"
    StatusConfirmed  OrderStatus = "CONFIRMED"
    StatusProcessing OrderStatus = "PROCESSING"
    StatusShipped    OrderStatus = "SHIPPED"
    StatusDelivered  OrderStatus = "DELIVERED"
    StatusCancelled  OrderStatus = "CANCELLED"
    StatusRefunded   OrderStatus = "REFUNDED"
)

type Order struct {
    TenantModel
    OrderNumber    string       `gorm:"size:20;not null"`
    CustomerID     *uuid.UUID   `gorm:"type:uuid"`
    Customer       *Customer    `gorm:"foreignKey:CustomerID"`
    LocationID     *uuid.UUID   `gorm:"type:uuid"`
    Location       *Location    `gorm:"foreignKey:LocationID"`
    StaffID        *uuid.UUID   `gorm:"type:uuid"`
    Staff          *User        `gorm:"foreignKey:StaffID"`
    Channel        OrderChannel `gorm:"size:10;not null"`
    Status         OrderStatus  `gorm:"size:20;not null;default:'PENDING'"`
    Subtotal       float64      `gorm:"type:decimal(10,2);not null"`
    TaxAmount      float64      `gorm:"type:decimal(10,2);not null;default:0"`
    DiscountAmount float64      `gorm:"type:decimal(10,2);not null;default:0"`
    Total          float64      `gorm:"type:decimal(10,2);not null"`
    Notes          string
    CouponID       *uuid.UUID   `gorm:"type:uuid"`
    Coupon         *Coupon      `gorm:"foreignKey:CouponID"`
    Items          []OrderItem  `gorm:"foreignKey:OrderID"`
    Payments       []Payment    `gorm:"foreignKey:OrderID"`
}
// Unique constraint: (merchant_id, order_number)

type OrderItem struct {
    BaseModel
    OrderID        uuid.UUID `gorm:"type:uuid;not null;index"`
    VariantID      uuid.UUID `gorm:"type:uuid;not null"`
    Variant        ProductVariant `gorm:"foreignKey:VariantID"`
    ProductName    string    `gorm:"size:255;not null"`    // snapshotted
    VariantLabel   string    `gorm:"size:100;not null"`    // e.g. "M / Navy Blue"
    SKU            string    `gorm:"size:50;not null"`     // snapshotted
    Quantity       int       `gorm:"not null;check:quantity > 0"`
    UnitPrice      float64   `gorm:"type:decimal(10,2);not null"`
    DiscountAmount float64   `gorm:"type:decimal(10,2);default:0"`
    Total          float64   `gorm:"type:decimal(10,2);not null"`
}
```

### 1.8 Payments

```go
// internal/models/payment.go
type PaymentMethod string
const (
    PayCash         PaymentMethod = "CASH"
    PayCard         PaymentMethod = "CARD"
    PayBankTransfer PaymentMethod = "BANK_TRANSFER"
    PayLoyalty      PaymentMethod = "LOYALTY_POINTS"
)

type PaymentStatus string
const (
    PayStatusPending   PaymentStatus = "PENDING"
    PayStatusCompleted PaymentStatus = "COMPLETED"
    PayStatusFailed    PaymentStatus = "FAILED"
    PayStatusRefunded  PaymentStatus = "REFUNDED"
)

type Payment struct {
    TenantModel
    OrderID     uuid.UUID     `gorm:"type:uuid;not null;index"`
    Order       Order         `gorm:"foreignKey:OrderID"`
    Method      PaymentMethod `gorm:"size:20;not null"`
    Status      PaymentStatus `gorm:"size:20;not null;default:'PENDING'"`
    Amount      float64       `gorm:"type:decimal(10,2);not null"`
    Reference   string        `gorm:"size:255"`
    Metadata    datatypes.JSON `gorm:"type:jsonb;default:'{}'"`
    ProcessedAt *time.Time
}

type Refund struct {
    TenantModel
    PaymentID   uuid.UUID `gorm:"type:uuid;not null"`
    Payment     Payment   `gorm:"foreignKey:PaymentID"`
    OrderID     uuid.UUID `gorm:"type:uuid;not null"`
    Order       Order     `gorm:"foreignKey:OrderID"`
    Amount      float64   `gorm:"type:decimal(10,2);not null"`
    Reason      string
    ProcessedBy *uuid.UUID `gorm:"type:uuid"`
    Processor   *User      `gorm:"foreignKey:ProcessedBy"`
}
```

### 1.9 Customers

```go
// internal/models/customer.go
type Customer struct {
    TenantModel
    FirstName          string         `gorm:"size:100;not null"`
    LastName           string         `gorm:"size:100;not null"`
    Email              string         `gorm:"size:255"`
    Phone              string         `gorm:"size:20"`
    LoyaltyPoints      int            `gorm:"default:0;check:loyalty_points >= 0"`
    LoyaltyCardBarcode string         `gorm:"size:50"`
    Tags               pq.StringArray `gorm:"type:text[]"`
    Notes              string
    TotalSpent         float64        `gorm:"type:decimal(12,2);default:0"`
    OrderCount         int            `gorm:"default:0"`
    Addresses          []CustomerAddress `gorm:"foreignKey:CustomerID"`
}
// Unique constraint: (merchant_id, email) where email is not null

type CustomerAddress struct {
    BaseModel
    CustomerID   uuid.UUID `gorm:"type:uuid;not null;index"`
    Label        string    `gorm:"size:50"`
    AddressLine1 string    `gorm:"size:255;not null"`
    AddressLine2 string    `gorm:"size:255"`
    City         string    `gorm:"size:100;not null"`
    State        string    `gorm:"size:100"`
    PostalCode   string    `gorm:"size:20"`
    Country      string    `gorm:"size:2;not null"`
    IsDefault    bool      `gorm:"default:false"`
}

type LoyaltyTransaction struct {
    TenantModel
    CustomerID   uuid.UUID  `gorm:"type:uuid;not null;index"`
    Customer     Customer   `gorm:"foreignKey:CustomerID"`
    OrderID      *uuid.UUID `gorm:"type:uuid"`
    Order        *Order     `gorm:"foreignKey:OrderID"`
    PointsChange int        `gorm:"not null"`
    Reason       string     `gorm:"size:100;not null"`
    BalanceAfter int        `gorm:"not null"`
}
```

### 1.10 Promotions & Coupons

```go
// internal/models/promotion.go
type DiscountType string
const (
    DiscountPercentage DiscountType = "PERCENTAGE"
    DiscountFixed      DiscountType = "FIXED_AMOUNT"
    DiscountBuyXGetY   DiscountType = "BUY_X_GET_Y"
)

type Coupon struct {
    TenantModel
    Code               string         `gorm:"size:50;not null"`
    Description        string
    DiscountType       DiscountType   `gorm:"size:20;not null"`
    DiscountValue      float64        `gorm:"type:decimal(10,2);not null"`
    MinOrderValue      *float64       `gorm:"type:decimal(10,2)"`
    MaxDiscount        *float64       `gorm:"type:decimal(10,2)"`
    UsageLimit         *int
    UsedCount          int            `gorm:"default:0"`
    PerCustomerLimit   int            `gorm:"default:1"`
    ValidFrom          time.Time      `gorm:"not null"`
    ValidUntil         time.Time      `gorm:"not null"`
    IsActive           bool           `gorm:"default:true"`
    ApplicableCategories pq.StringArray `gorm:"type:uuid[]"`
    ApplicableProducts   pq.StringArray `gorm:"type:uuid[]"`
}
// Unique constraint: (merchant_id, code)
```

---

## 2. GraphQL Schema Definitions

### 2.1 Root Schema (`schema.graphqls`)

```graphql
scalar Time
scalar UUID
scalar Decimal
scalar JSON

directive @auth(permissions: [String!]!) on FIELD_DEFINITION

type Query {
    # Merchant Bootstrap (called on app startup by frontends)
    merchantBootstrap: MerchantConfig!

    # Products
    products(filter: ProductFilter, pagination: PaginationInput): ProductConnection!
    product(slug: String!): Product
    productByBarcode(barcode: String!): ProductVariant

    # Size Groups (for product creation forms)
    sizeGroups: [SizeGroup!]!
    sizeGroup(id: UUID!): SizeGroup

    # Inventory
    inventoryLevels(locationId: UUID, variantId: UUID): [InventoryLevel!]!

    # Orders
    orders(filter: OrderFilter, pagination: PaginationInput): OrderConnection!
    order(id: UUID!): Order

    # Customers
    customers(search: String, pagination: PaginationInput): CustomerConnection!
    customer(id: UUID!): Customer

    # Staff
    staff(pagination: PaginationInput): [User!]!
    roles: [Role!]!

    # Analytics
    dailySalesSummary(date: Time!, locationId: UUID): SalesSummary!
}

type Mutation {
    # Auth
    login(input: LoginInput!): AuthPayload!
    loginWithPin(pin: String!): AuthPayload!
    refreshToken(token: String!): AuthPayload!

    # Products
    createProduct(input: CreateProductInput!): Product! @auth(permissions: ["products:create"])
    updateProduct(id: UUID!, input: UpdateProductInput!): Product! @auth(permissions: ["products:edit"])
    createVariant(input: CreateVariantInput!): ProductVariant! @auth(permissions: ["products:create"])

    # Size Groups
    createSizeGroup(input: CreateSizeGroupInput!): SizeGroup! @auth(permissions: ["products:create"])
    assignSizeGroupToCategory(categoryId: UUID!, sizeGroupId: UUID!): Category! @auth(permissions: ["products:edit"])

    # Inventory
    adjustStock(input: AdjustStockInput!): InventoryLevel! @auth(permissions: ["inventory:edit"])
    transferStock(input: TransferStockInput!): Boolean! @auth(permissions: ["inventory:transfer"])

    # Orders
    createOrder(input: CreateOrderInput!): Order! @auth(permissions: ["orders:create"])
    updateOrderStatus(id: UUID!, status: OrderStatus!): Order! @auth(permissions: ["orders:edit"])
    refundOrder(input: RefundInput!): Refund! @auth(permissions: ["orders:refund"])

    # Customers
    createCustomer(input: CreateCustomerInput!): Customer! @auth(permissions: ["customers:create"])
    updateCustomer(id: UUID!, input: UpdateCustomerInput!): Customer! @auth(permissions: ["customers:edit"])

    # Promotions
    createCoupon(input: CreateCouponInput!): Coupon! @auth(permissions: ["promotions:create"])
    applyCoupon(orderId: UUID!, code: String!): Order!

    # Staff & RBAC
    createStaff(input: CreateStaffInput!): User! @auth(permissions: ["staff:manage"])
    assignRole(userId: UUID!, roleId: UUID!): User! @auth(permissions: ["staff:manage"])
    managerOverride(input: ManagerOverrideInput!): ManagerOverride! @auth(permissions: ["pos:override"])

    # POS
    openCashDrawer(locationId: UUID!): Boolean! @auth(permissions: ["pos:open_drawer"])
    endOfDayReport(locationId: UUID!): EODReport! @auth(permissions: ["pos:end_of_day"])
}

type Subscription {
    inventoryUpdated(locationId: UUID): InventoryEvent!
    orderPlaced: Order!
}
```

### 2.2 Product & SizeGroup Types (`product.graphqls`)

```graphql
type Product {
    id: UUID!
    name: String!
    slug: String!
    description: String
    basePrice: Decimal!
    comparePrice: Decimal
    brand: Brand
    category: Category
    images: [ProductImage!]!
    variants: [ProductVariant!]!
    tags: [String!]
    isPublished: Boolean!
    createdAt: Time!
}

type ProductVariant {
    id: UUID!
    product: Product!
    sku: String!
    barcode: String
    size: Size!
    color: Color!
    priceOverride: Decimal
    effectivePrice: Decimal!
    inventoryLevels: [InventoryLevel!]!
    totalStock: Int!
    isActive: Boolean!
}

type SizeGroup {
    id: UUID!
    name: String!
    sizes: [Size!]!
}

type Size {
    id: UUID!
    name: String!
    sortOrder: Int!
    sizeGroup: SizeGroup!
}

type Color {
    id: UUID!
    name: String!
    hexCode: String
}

type Category {
    id: UUID!
    name: String!
    slug: String!
    parent: Category
    children: [Category!]!
    sizeGroup: SizeGroup          # the sizes available when creating products in this category
}

type Brand {
    id: UUID!
    name: String!
    slug: String!
    logoUrl: String
}

input CreateSizeGroupInput {
    name: String!
    sizes: [String!]!             # e.g. ["S", "M", "L", "XL", "XXL"]
}

input CreateProductInput {
    categoryId: UUID
    brandId: UUID
    name: String!
    description: String
    basePrice: Decimal!
    comparePrice: Decimal
    costPrice: Decimal
    tags: [String!]
    variants: [CreateVariantInput!]!
}

input CreateVariantInput {
    productId: UUID               # optional if nested in CreateProductInput
    sizeId: UUID!
    colorId: UUID!
    sku: String!
    barcode: String
    priceOverride: Decimal
}
```

### 2.3 Merchant Types (`merchant.graphqls`)

```graphql
type MerchantConfig {
    id: UUID!
    businessName: String!
    slug: String!
    logoUrl: String
    primaryColor: String
    secondaryColor: String
    currency: String!
    timezone: String!
    taxRate: Decimal!
    settings: MerchantSettings!
    locations: [Location!]!
    sizeGroups: [SizeGroup!]!
}

type MerchantSettings {
    loyaltyEnabled: Boolean!
    loyaltyPointsPerUnit: Int!
    loyaltyRedemptionRate: Decimal!
    paymentGateways: [String!]!
    receiptHeader: String
    receiptFooter: String
}

type Location {
    id: UUID!
    name: String!
    address: String
    city: String
    isWarehouse: Boolean!
    isActive: Boolean!
}
```

### 2.4 Order, Payment, Inventory, Customer Types

*(These remain the same as defined in the previous version — Order, OrderItem, Payment, Refund, InventoryLevel, InventoryMovement, Customer, etc. See the full GraphQL schema files for details.)*

---

## 3. Entity Relationship Summary

```
merchants (1 row per tenant — runtime config store)
    │
    ├── users (staff)
    │   ├── user_roles → roles → role_permissions → permissions
    │   └── user_locations → locations
    │
    ├── locations
    │
    ├── size_groups
    │   └── sizes
    │
    ├── categories (self-referencing hierarchy)
    │   └── → size_group (FK: which sizes this category uses)
    │
    ├── brands
    │
    ├── colors
    │
    ├── products
    │   ├── product_images
    │   └── product_variants
    │       ├── → sizes (from the category's size_group)
    │       ├── → colors
    │       └── inventory_levels → locations
    │
    ├── customers
    │   ├── customer_addresses
    │   └── loyalty_transactions
    │
    ├── orders
    │   ├── order_items → product_variants
    │   └── payments → refunds
    │
    ├── coupons
    ├── inventory_movements
    └── manager_overrides
```

---

## 4. Key Constraints & Invariants

| Rule | Enforcement |
|------|-------------|
| Stock cannot go negative | GORM check constraint: `check:quantity >= 0` |
| SKU globally unique | `uniqueIndex` on `product_variants.sku` |
| One variant per size×color per product | Composite unique index `(product_id, size_id, color_id)` |
| Email unique per merchant | Composite unique index `(merchant_id, email)` on users and customers |
| Order prices are immutable after creation | Snapshotted into `order_items` columns |
| Loyalty points cannot go negative | GORM check constraint: `check:loyalty_points >= 0` |
| All tenant queries are scoped | `BaseRepository.Scoped(ctx)` applies `merchant_id` filter |
| Categories inherit sizing from SizeGroup | `category.size_group_id` FK determines available sizes |
