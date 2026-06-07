import type Database from "better-sqlite3";

/** Creates all tables for the Naseej POS database. Idempotent — safe to call on every launch. */
export function runSchema(db: Database.Database): void {
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;

    -- Staff: POS users authenticated by PIN
    CREATE TABLE IF NOT EXISTS staff (
      id          TEXT PRIMARY KEY,
      first_name  TEXT NOT NULL,
      last_name   TEXT NOT NULL,
      email       TEXT NOT NULL UNIQUE,
      role        TEXT NOT NULL DEFAULT 'cashier',
      pin         TEXT,
      avatar_url  TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Brands
    CREATE TABLE IF NOT EXISTS brands (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Colors
    CREATE TABLE IF NOT EXISTS colors (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      hex_code   TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Sizes
    CREATE TABLE IF NOT EXISTS sizes (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Categories (hierarchical)
    CREATE TABLE IF NOT EXISTS categories (
      id                 TEXT PRIMARY KEY,
      name               TEXT NOT NULL,
      slug               TEXT NOT NULL UNIQUE,
      parent_id          TEXT REFERENCES categories(id) ON DELETE SET NULL,
      has_standard_sizes INTEGER NOT NULL DEFAULT 0,
      created_at         TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Category ↔ Size junction
    CREATE TABLE IF NOT EXISTS category_sizes (
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      size_id     TEXT NOT NULL REFERENCES sizes(id) ON DELETE CASCADE,
      PRIMARY KEY (category_id, size_id)
    );

    -- Products (base items)
    CREATE TABLE IF NOT EXISTS products (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      sku         TEXT NOT NULL UNIQUE,
      barcode     TEXT,
      brand_id    TEXT REFERENCES brands(id) ON DELETE SET NULL,
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      description TEXT,
      image_url   TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Product Variants (atomic sellable units: size × color)
    CREATE TABLE IF NOT EXISTS product_variants (
      id               TEXT PRIMARY KEY,
      product_id       TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      sku              TEXT NOT NULL UNIQUE,
      barcode          TEXT,
      size             TEXT NOT NULL,
      color            TEXT NOT NULL,
      color_hex        TEXT NOT NULL DEFAULT '#000000',
      price            REAL NOT NULL,
      compare_at_price REAL,
      image_url        TEXT,
      created_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Locations / Warehouses / Branches
    CREATE TABLE IF NOT EXISTS locations (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      city       TEXT,
      address    TEXT,
      phone      TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Inventory Levels: stock per variant per location
    CREATE TABLE IF NOT EXISTS inventory_levels (
      id                  TEXT PRIMARY KEY,
      variant_id          TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
      location_id         TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
      qty                 INTEGER NOT NULL DEFAULT 0 CHECK(qty >= 0),
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      UNIQUE(variant_id, location_id)
    );

    -- Customers
    CREATE TABLE IF NOT EXISTS customers (
      id             TEXT PRIMARY KEY,
      first_name     TEXT NOT NULL,
      last_name      TEXT NOT NULL,
      email          TEXT,
      phone          TEXT,
      loyalty_points INTEGER NOT NULL DEFAULT 0,
      total_orders   INTEGER NOT NULL DEFAULT 0,
      total_spent    REAL NOT NULL DEFAULT 0,
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Orders
    CREATE TABLE IF NOT EXISTS orders (
      id              TEXT PRIMARY KEY,
      receipt_number  TEXT NOT NULL UNIQUE,
      staff_name      TEXT NOT NULL,
      customer_id     TEXT REFERENCES customers(id) ON DELETE SET NULL,
      customer_name   TEXT,
      payment_method  TEXT NOT NULL,
      subtotal        REAL NOT NULL,
      tax_amount      REAL NOT NULL,
      discount_amount REAL NOT NULL DEFAULT 0,
      total           REAL NOT NULL,
      status          TEXT NOT NULL DEFAULT 'completed',
      channel         TEXT NOT NULL DEFAULT 'POS',
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Order Items
    CREATE TABLE IF NOT EXISTS order_items (
      id           TEXT PRIMARY KEY,
      order_id     TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_name TEXT NOT NULL,
      size         TEXT NOT NULL,
      color        TEXT NOT NULL,
      quantity     INTEGER NOT NULL,
      unit_price   REAL NOT NULL,
      line_total   REAL NOT NULL
    );

    -- Daily Summaries (end-of-day report data)
    CREATE TABLE IF NOT EXISTS daily_summaries (
      date              TEXT PRIMARY KEY,
      total_sales       REAL NOT NULL DEFAULT 0,
      transaction_count INTEGER NOT NULL DEFAULT 0,
      items_sold        INTEGER NOT NULL DEFAULT 0,
      cash_sales        REAL NOT NULL DEFAULT 0,
      card_sales        REAL NOT NULL DEFAULT 0,
      split_sales       REAL NOT NULL DEFAULT 0,
      refunds_total     REAL NOT NULL DEFAULT 0,
      opening_cash      REAL NOT NULL DEFAULT 0,
      closing_cash      REAL NOT NULL DEFAULT 0,
      variance          REAL NOT NULL DEFAULT 0,
      created_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Discount codes
    CREATE TABLE IF NOT EXISTS discount_codes (
      id          TEXT PRIMARY KEY,
      code        TEXT NOT NULL UNIQUE,
      type        TEXT NOT NULL DEFAULT 'percentage',
      value       REAL NOT NULL,
      min_order   REAL NOT NULL DEFAULT 0,
      max_uses    INTEGER,
      used_count  INTEGER NOT NULL DEFAULT 0,
      is_active   INTEGER NOT NULL DEFAULT 1,
      expires_at  TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Roles (RBAC)
    CREATE TABLE IF NOT EXISTS roles (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT,
      permissions TEXT NOT NULL DEFAULT '[]',
      user_count  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Users (staff management)
    CREATE TABLE IF NOT EXISTS users (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL UNIQUE,
      phone      TEXT,
      role       TEXT,
      status     TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Variant Types (e.g. Size, Color, Material)
    CREATE TABLE IF NOT EXISTS variant_types (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Variant Type Values
    CREATE TABLE IF NOT EXISTS variant_type_values (
      id              TEXT PRIMARY KEY,
      variant_type_id TEXT NOT NULL REFERENCES variant_types(id) ON DELETE CASCADE,
      value           TEXT NOT NULL
    );

    -- Merchant configuration key-value store
    CREATE TABLE IF NOT EXISTS merchant_config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Idempotent migration: add variant_id to order_items if the column is missing
  const cols = db.prepare("PRAGMA table_info(order_items)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "variant_id")) {
    db.exec("ALTER TABLE order_items ADD COLUMN variant_id TEXT REFERENCES product_variants(id)");
  }

  // Idempotent migration: add split_sales to daily_summaries if missing
  const summaryCols = db.prepare("PRAGMA table_info(daily_summaries)").all() as { name: string }[];
  if (!summaryCols.some((c) => c.name === "split_sales")) {
    db.exec("ALTER TABLE daily_summaries ADD COLUMN split_sales REAL NOT NULL DEFAULT 0");
  }

  // ── Performance Indexes ───────────────────────────────────────────────────────
  db.exec(`
    -- Orders: frequent lookups by date, receipt, status
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

    -- Order Items: join performance
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON order_items(variant_id);

    -- Products: category/brand filtering
    CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

    -- Product Variants: lookups by product and barcode
    CREATE INDEX IF NOT EXISTS idx_variants_product_id ON product_variants(product_id);
    CREATE INDEX IF NOT EXISTS idx_variants_barcode ON product_variants(barcode);

    -- Inventory Levels: stock queries
    CREATE INDEX IF NOT EXISTS idx_inventory_variant_id ON inventory_levels(variant_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_location_id ON inventory_levels(location_id);

    -- Customers: search optimization
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

    -- Categories: hierarchy traversal
    CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

    -- Daily Summaries: date range queries
    CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(date);
  `);
}
