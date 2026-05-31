# Developer Guide & Code Standards

## Naseej POS — Setup, Conventions, and Development Workflow

**Applies to:** All contributors to the Electron POS application

---

## 1. Engineering Principles

### 1.1 Architecture Rules

| Principle | Description |
|-----------|------------|
| **Offline-First** | Application must work without internet. SQLite is the source of truth. |
| **IPC Boundary** | Renderer never directly accesses Node.js APIs. All hardware communication goes through IPC bridge. |
| **Type Safety** | TypeScript strict mode enabled. No `any` types in committed code. |
| **Local Storage** | All user data stored in SQLite. No external API calls (offline capable). |
| **Atomic Transactions** | Critical operations (sales, refunds) use SQLite atomic transactions to prevent data loss. |

### 1.2 Code Conventions

| Area | Convention |
|------|-----------|
| TypeScript | Strict mode enabled. No `any` types. Interfaces for all data models. |
| File naming | `kebab-case` for component files, `snake_case` for utility files |
| Directories | Organize by feature, not by type (e.g., `features/checkout/` not `components/`+ `hooks/`) |
| React components | Functional components only. Hooks for state and side effects. |
| CSS | Tailwind utility classes. No custom CSS except CSS variable declarations. |
| Commit messages | Conventional Commits format: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:` |
| IPC Channels | Use constants from `src/shared/constants.ts`, not hardcoded strings |
| Database queries | Use parameterized queries to prevent SQL injection |

---

## 2. Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ LTS | JavaScript runtime |
| npm | 9+ | Package manager |
| SQLite | 3.40+ | Database (bundled via better-sqlite3) |
| Electron | 28+ | Desktop framework |
| TypeScript | 5.0+ | Type safety |

---

## 3. Initial Setup

### 3.1 Clone & Install

```bash
git clone <repository>
cd naseej-pos
npm install
```

### 3.2 Start Development

```bash
# Run with hot reload (Vite)
npm run dev

# Build for production
npm run build

# Package for distribution (Windows MSI + macOS DMG)
npm run make
```

### 3.3 Project Structure

```
src/
├── main/                       # Electron main process (Node.js)
│   ├── index.ts               # Entry point, window creation
│   ├── db/                    # SQLite database layer
│   │   ├── database.ts        # Connection & initialization
│   │   └── schema.ts          # Table definitions
│   ├── ipc/                   # IPC channel handlers
│   │   ├── handlers.ts        # Request handlers
│   │   └── channels.ts        # Channel definitions
│   └── hardware/              # Hardware drivers
│       ├── printer.ts         # ESC/POS printer
│       └── scanner.ts         # Barcode scanner
│
├── renderer/                  # React application (Chromium)
│   ├── src/
│   │   ├── App.tsx           # Root component
│   │   ├── main.tsx          # React entry point
│   │   ├── pages/            # Route components
│   │   ├── components/       # Reusable UI components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utilities
│   │   ├── config/           # App configuration
│   │   └── types/            # TypeScript definitions
│   └── index.html            # HTML entry
│
└── shared/                    # Shared between main & renderer
    ├── constants.ts          # IPC channel names, constants
    └── types.ts              # Shared type definitions
```

---

## 4. Database Development (SQLite)

### 4.1 Initialize Database

```typescript
// src/main/db/database.ts
import Database from 'better-sqlite3';

const db = new Database('pos.db');
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync('./src/main/db/schema.sql', 'utf-8'));
```

### 4.2 Define Schema

```sql
-- src/main/db/schema.sql
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  barcode TEXT INDEXED,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  cost_price REAL,
  category TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  receipt_number TEXT UNIQUE NOT NULL,
  staff_id TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  subtotal REAL NOT NULL,
  tax_amount REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  total REAL NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT DEFAULT 'completed'
);

-- More tables...
```

### 4.3 Execute Queries

```typescript
// Always use parameterized queries to prevent SQL injection
const stmt = db.prepare('SELECT * FROM products WHERE sku = ?');
const product = stmt.get(sku);

// Transactions for atomicity
const transaction = db.transaction((data) => {
  db.prepare('INSERT INTO transactions ...').run(data);
  db.prepare('UPDATE inventory ...').run(...);
});
transaction({ ... });
```

---

## 5. IPC Bridge Development

### 5.1 Define Channels

```typescript
// src/shared/constants.ts
export const IPC_CHANNELS = {
  // Hardware
  PRINT_RECEIPT: 'hardware:print-receipt',
  OPEN_DRAWER: 'hardware:open-drawer',
  
  // Database
  QUERY_PRODUCTS: 'db:query-products',
  CREATE_TRANSACTION: 'db:create-transaction',
} as const;
```

### 5.2 Implement Handler (Main Process)

```typescript
// src/main/ipc/handlers.ts
import { ipcMain } from 'electron';

ipcMain.handle(IPC_CHANNELS.PRINT_RECEIPT, async (_event, receiptData) => {
  try {
    await printReceipt(receiptData);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

### 5.3 Call from Renderer

```typescript
// src/renderer/src/hooks/use-hardware.ts
export const usePrinter = () => {
  const printReceipt = async (data: ReceiptData) => {
    return window.electronAPI.printReceipt(data);
  };
  return { printReceipt };
};
```

---

## 6. React Component Development

### 6.1 Functional Components with Hooks

```typescript
// src/renderer/src/components/cart.tsx
import { useState } from 'react';

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export const Cart: React.FC = () => {
  const [items, setItems] = useState<CartItem[]>([]);
  
  const addItem = (item: CartItem) => {
    setItems([...items, item]);
  };
  
  return <div>{items.map(item => ...)}</div>;
};
```

### 6.2 Custom Hooks for Business Logic

```typescript
// src/renderer/src/hooks/use-cart.ts
export const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const addItem = (productId: string) => {
    // Business logic here
  };
  
  const removeItem = (productId: string) => {
    // Business logic here
  };
  
  return { cart, addItem, removeItem };
};
```

### 6.3 Context for Global State

```typescript
// src/renderer/src/providers/cart-provider.tsx
import { createContext, useContext, useState } from 'react';

const CartContext = createContext<CartContextType | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState([]);
  
  return (
    <CartContext.Provider value={{ cart, setCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCartContext = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCartContext must be used within CartProvider');
  return context;
};
```

---

## 7. Testing Strategy

### 7.1 Unit Tests (Vitest)

```typescript
// src/renderer/src/utils/__tests__/calculations.test.ts
import { describe, it, expect } from 'vitest';
import { calculateTotal } from '../calculations';

describe('calculateTotal', () => {
  it('should calculate subtotal + tax', () => {
    const result = calculateTotal(100, 0.15);
    expect(result).toBe(115);
  });
});
```

### 7.2 Integration Tests

```typescript
// tests/integration/transaction.test.ts
describe('Transaction Flow', () => {
  it('should create transaction and decrement inventory', async () => {
    // Setup test database
    // Create transaction
    // Verify inventory decremented
    // Cleanup
  });
});
```

---

## 8. Building & Packaging

### 8.1 Development Build

```bash
npm run dev    # Hot reload with Vite
```

### 8.2 Production Build

```bash
npm run build  # Build binaries and assets
npm run make   # Create installers (MSI + DMG)
```

### 8.3 Distribution

- **Windows:** `dist/Naseej-POS-Setup.msi`
- **macOS:** `dist/Naseej-POS.dmg`
- **Linux:** `dist/Naseej-POS-x86_64.AppImage`

---

## 9. Debugging

### 9.1 DevTools in Electron

```typescript
// src/main/index.ts
if (isDevelopment) {
  mainWindow.webContents.openDevTools();
}
```

### 9.2 Database Debugging

```bash
# Open SQLite in terminal
sqlite3 pos.db

# Example query
sqlite> SELECT * FROM transactions LIMIT 5;
```

### 9.3 IPC Logging

```typescript
// Log all IPC events in development
ipcMain.on('*', (event, channel, args) => {
  if (isDevelopment) {
    console.log(`IPC:`, channel, args);
  }
});
```

---

## 10. Common Tasks

### Add a New Table

1. Update `src/main/db/schema.sql`
2. Create a data access module in `src/main/db/`
3. Export from `src/main/db/database.ts`
4. Create IPC handler if needed

### Add a New IPC Channel

1. Add constant to `src/shared/constants.ts`
2. Implement handler in `src/main/ipc/handlers.ts`
3. Create custom hook in `src/renderer/src/hooks/use-*.ts`
4. Use hook in React component

### Add a New Page

1. Create component in `src/renderer/src/pages/`
2. Add route to router configuration
3. Link from navigation

---

## 11. Code Review Checklist

- [ ] TypeScript strict mode — no `any` types
- [ ] Database queries are parameterized (no SQL injection)
- [ ] IPC channels use constants (no hardcoded strings)
- [ ] React components are functional with hooks
- [ ] State management follows Context or local state pattern
- [ ] Error handling with try-catch and user feedback
- [ ] Tests pass locally
- [ ] No console errors or warnings
- [ ] Code follows conventional commit format

---

## 1. Engineering Principles

### 1.1 Architecture Rules

| Principle | Description |
|-----------|-------------|
| **Contract-First** | GraphQL schemas are the source of truth. Backend and frontend develop against the same `.graphqls` contracts. |
| **Three-Layer Separation** | Backend follows Resolver → Service → Repository. No layer may skip another. |
| **Composition Over Inheritance** | Build isolated, atomic components. Pass styles and behavior via props, not class hierarchies. |
| **Strict Boundary Enforcement** | Frontend applications (Next.js, Electron) never access the database directly. All data flows through the GraphQL API. |
| **Tenant Isolation by Default** | Every repository query uses `Scoped(ctx)`. There is no "unscoped" query path for tenant data. |

### 1.2 Code Conventions

| Area | Convention |
|------|-----------|
| Go naming | `camelCase` for unexported, `PascalCase` for exported, acronyms uppercase (`ID`, `URL`, `HTTP`) |
| Go errors | Return `error` as last return value. Wrap with context: `fmt.Errorf("create order: %w", err)` |
| TypeScript | Strict mode enabled. No `any` types in committed code. |
| React components | Functional components only. Hooks for state and side effects. |
| CSS | Tailwind utility classes. No custom CSS files except for CSS variable declarations. |
| GraphQL | `camelCase` for fields, `PascalCase` for types, `SCREAMING_SNAKE` for enums |
| File naming | `snake_case` for Go, `kebab-case` for TypeScript/React components |
| Commits | Conventional Commits format: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:` |

---

## 2. Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Go | 1.22+ | Backend server |
| PostgreSQL | 15+ | Primary database |
| Node.js | 20 LTS | Frontend tooling |
| Docker & Docker Compose | Latest | Local development environment |
| gqlgen | v0.17+ | GraphQL code generation |

---

## 3. Initial Setup

### 3.1 Clone & Environment

```bash
git clone git@github.com:your-org/naseej.git
cd naseej

# Copy environment template
cp server/.env.example server/.env
```

**Required environment variables (`server/.env`):**

```env
# Database
DATABASE_URL=postgres://naseej:naseej@localhost:5432/naseej?sslmode=disable

# Server
PORT=8080
GIN_MODE=debug

# Auth
JWT_SECRET=your-dev-secret-key-change-in-production
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=168h

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 3.2 Start Infrastructure

```bash
# Launch PostgreSQL via Docker
cd server
docker-compose up -d

# Verify database is accepting connections
docker-compose exec postgres pg_isready
```

### 3.3 Run the Server (AutoMigrate handles schema)

The server uses GORM AutoMigrate — on first startup it creates all tables automatically. No manual migration step needed.

```bash
# Start the server (creates tables on first run)
go run cmd/server/main.go
```

### 3.4 Seed Development Data

```bash
go run cmd/seed/main.go
```

This creates a test merchant, size groups, sample products with variants, and staff accounts for local development.

---

## 4. Backend Development (Go)

### 4.1 Generate GraphQL Code

After modifying any `.graphqls` schema file:

```bash
cd server
go run github.com/99designs/gqlgen generate
```

This regenerates:
- `internal/graph/generated/generated.go` — runtime execution engine
- `internal/graph/model/models_gen.go` — Go structs from GraphQL types
- Resolver stubs for any new queries/mutations

### 4.2 Run the Server

```bash
# Development (with hot reload via air)
air

# Or without hot reload
go run cmd/server/main.go
```

The server starts at `http://localhost:8080`:
- GraphQL Playground: `http://localhost:8080/graphql`
- WebSocket endpoint: `ws://localhost:8080/ws`

### 4.3 Adding a New Domain Feature

Follow this sequence when adding a new feature (e.g., "Gift Cards"):

```
1. Define schema:      internal/graph/schema/gift_card.graphqls
2. Run codegen:        go run github.com/99designs/gqlgen generate
3. Define model:       internal/models/gift_card.go (add to AutoMigrate list in main.go)
4. Add repository:     internal/repository/gift_card_repo.go
5. Add service:        internal/service/gift_card_service.go
6. Implement resolver: internal/graph/gift_card.resolvers.go
7. Write tests:        internal/service/gift_card_service_test.go
8. Restart server:     AutoMigrate creates the new table automatically
```

### 4.4 Testing

```bash
# Run all tests
go test ./...

# Run with coverage
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# Run specific package
go test ./internal/service/...
```

---

## 5. Web Storefront Development (Next.js)

### 5.1 Setup & Run

```bash
cd web
npm install
npm run dev
```

Development server at `http://localhost:3000`.

### 5.2 GraphQL Client

The web app uses a typed GraphQL client. After schema changes:

```bash
npm run codegen
```

This generates TypeScript types from the backend schemas.

### 5.3 Merchant Configuration

Each deployed storefront is a **separate repo** for each merchant, deployed on their **own custom domain** (e.g., `www.brandname.com`). There is no subdomain routing or slug-based multi-tenancy in the URL.

The storefront connects to the shared central API and identifies itself via the `merchant_id` in `merchant.ts`:

```typescript
// web/src/config/merchant.ts
export const merchant = {
  id: 'uuid-from-database',
  name: 'Brand Name',
  theme: {
    primaryColor: '#1B2A4A',
    secondaryColor: '#D4A574',
    fontFamily: 'Inter',
    logoUrl: '/logo.svg',
  },
  api: {
    url: 'https://api.naseej.com/graphql',
    wsUrl: 'wss://api.naseej.com/ws',
  },
} as const;
```

On boot, the app:
1. Applies static theme immediately as CSS variables (no FOUC)
2. Calls `merchantBootstrap` query to load dynamic settings (tax, loyalty, gateways)

---

## 6. POS Desktop Development (Electron)

### 6.1 Setup & Run

```bash
cd desktop
npm install
npm run dev
```

This launches the Electron app in development mode with Vite HMR.

### 6.2 POS Merchant Configuration

Identical structure to web `merchant.ts`:

```typescript
// desktop/src/config/merchant.ts
export const merchant = {
  id: 'uuid-from-database',
  name: 'Brand Name',
  theme: {
    primaryColor: '#1B2A4A',
    secondaryColor: '#D4A574',
    fontFamily: 'Inter',
    logoUrl: '/logo.svg',
  },
  api: {
    url: 'https://api.naseej.com/graphql',
    wsUrl: 'wss://api.naseej.com/ws',
  },
  pos: {
    defaultLocationId: 'uuid-of-store-location',
    printerModel: 'epson-tm-t88v',
    receiptWidth: 80,  // mm
  },
} as const;
```

### 6.3 Hardware Testing

For local development without physical hardware:

```bash
# Mock printer output to console
MOCK_HARDWARE=true npm run dev
```

---

## 7. New Merchant Onboarding

The shared server is always running. Onboarding a new merchant requires **no server changes**:

```bash
# Step 1: Create merchant in the shared database
psql $DATABASE_URL -c "
  INSERT INTO merchants (business_name, slug, domain, tax_rate, currency)
  VALUES ('New Brand', 'new-brand', 'www.newbrand.com', 0.15, 'SAR')
  RETURNING id;
"

# Step 2: Seed initial data for the merchant
go run cmd/seed/main.go --merchant-id=<returned-uuid>
# Creates: admin user, default roles, permissions, locations, size groups

# Step 3: Create a new website repo for this merchant
# (clone from the web template, configure merchant.ts with the merchant ID)

# Step 4: Create a new POS repo for this merchant
# (clone from the desktop template, configure merchant.ts with the merchant ID)

# Step 5: Deploy website on merchant's custom domain
# Step 6: Package and deliver POS installer
```

**Key points:**
- The API server at `api.naseej.com` is already running and serving all merchants
- No subdomain routing — each merchant's website is its own standalone Next.js app on its own domain
- The frontend sends `X-Merchant-ID` header with every API request
- The server uses `Scoped(ctx)` to isolate data per merchant

---

## 8. Project Scripts Reference

### Backend (`server/Makefile`)

| Command | Description |
|---------|-------------|
| `make run` | Start the Go server (AutoMigrate runs on startup) |
| `make generate` | Run gqlgen code generation |
| `make seed` | Seed development data |
| `make test` | Run all tests |
| `make lint` | Run golangci-lint |
| `make build` | Build production binary |

### Web (`web/package.json`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run codegen` | Generate GraphQL types |
| `npm run lint` | Run ESLint |

### POS (`desktop/package.json`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Electron + Vite dev mode |
| `npm run build` | Build for production |
| `npm run package` | Package as distributable (.dmg / .exe / .AppImage) |
| `npm run codegen` | Generate GraphQL types |

---

## 9. Deployment Architecture

```
                    ┌─────────────────────────┐
                    │   api.naseej.com         │
                    │   (Single Go Server)     │
                    │   Serves ALL merchants   │
                    └──────────┬──────────────┘
                               │
               ┌───────────────┼───────────────┐
               │               │               │
    ┌──────────▼──┐  ┌────────▼────┐  ┌──────▼───────┐
    │ brand-a.com │  │ brand-b.com │  │ brand-c.com  │
    │ (Next.js)   │  │ (Next.js)   │  │ (Next.js)    │
    └─────────────┘  └─────────────┘  └──────────────┘
               │               │               │
    ┌──────────▼──┐  ┌────────▼────┐  ┌──────▼───────┐
    │ POS App A   │  │ POS App B   │  │ POS App C    │
    │ (Electron)  │  │ (Electron)  │  │ (Electron)   │
    └─────────────┘  └─────────────┘  └──────────────┘
```

Each frontend is a cloned template with only `merchant.ts` changed. All communicate with the same central API server.
