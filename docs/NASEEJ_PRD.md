# Product Requirements Document (PRD)

## Naseej POS — Desktop Point-of-Sale Application

**Version:** 2.0  
**Last Updated:** 2026-05-30  
**Status:** Active Development (Local SQLite Storage)

---

## 1. Executive Summary

Naseej POS is a production-grade, standalone desktop point-of-sale application built with Electron + React. The system uses a local SQLite database for all storage, enabling complete offline operation without dependency on cloud servers or networks.

The application is designed for cashiers and store managers to process transactions, manage inventory, and track sales—all locally on the POS terminal.

---

## 2. Target Users & Personas

| Persona | Role | Primary Need |
|---------|------|--------------|
| **Cashier** | In-store POS operator | Fast, keyboard/barcode-driven checkout with hardware integration |
| **Store Manager** | Store supervisor | Real-time inventory overview, staff management, daily reports |
| **Owner/Admin** | Business stakeholder | Transaction history, sales analytics, data backups |

---

## 3. System Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│         Naseej POS — Desktop Application            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  Electron Main Process                       │  │
│  │  ├── SQLite Database (local)                │  │
│  │  ├── IPC Bridge (hardware communication)    │  │
│  │  ├── Barcode Scanner Handler                │  │
│  │  ├── Receipt Printer Driver (ESC/POS)       │  │
│  │  └── Cash Drawer Control                    │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  React Renderer (UI)                         │  │
│  │  ├── Login Page                              │  │
│  │  ├── Register/Checkout View                  │  │
│  │  ├── Inventory Management                    │  │
│  │  ├── Transaction History                     │  │
│  │  └── End-of-Day Reports                      │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
         │
         ├─── ESC/POS Thermal Printer
         ├─── Barcode Scanner
         └─── Cash Drawer
```

**Technology Stack:**

| Layer | Technology |
|-------|-----------|
| Desktop Framework | Electron (Node.js + Chromium) |
| UI Framework | React 18+ with TypeScript |
| Database | SQLite 3 (local file-based) |
| Styling | Tailwind CSS |
| State Management | React Context + Hooks |
| Hardware IPC | Electron IPC bridge |
| Styling | Tailwind CSS + shadcn/ui components |

---

## 4. Functional Requirements

### 4.1 Authentication & User Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | Staff login via PIN (4-6 digits) for POS quick access | P0 |
| FR-002 | Optional email/password fallback for admin setup | P0 |
| FR-003 | PIN is hashed and stored in SQLite, never transmitted | P0 |
| FR-004 | Session persists until manual logout or 8-hour timeout | P0 |
| FR-005 | Multiple staff accounts with different permission levels | P1 |

### 4.2 Product Catalog & Inventory

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-010 | Products stored locally in SQLite with SKU and barcode | P0 |
| FR-011 | Inventory tracked per product per location (in-store) | P0 |
| FR-012 | Stock never goes negative (enforced at DB constraint level) | P0 |
| FR-013 | Barcode scanner input adds items to cart via fuzzy matching | P0 |
| FR-014 | Manual product search by name, SKU, or barcode | P0 |
| FR-015 | Variant attributes (size, color) displayed on cart | P0 |
| FR-016 | Import products from CSV (admin function) | P1 |

### 4.3 Point-of-Sale Transactions

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-020 | Cart display shows product name, quantity, variant, line total | P0 |
| FR-021 | Manual quantity entry via numpad or keyboard | P0 |
| FR-022 | Line item removal with optional manager override | P0 |
| FR-023 | Subtotal, tax (percentage-based), and grand total auto-calculated | P0 |
| FR-024 | Discount entry (percentage or fixed amount) | P0 |
| FR-025 | Transaction saved to SQLite with timestamp and staff ID | P0 |
| FR-026 | Receipt printed immediately after payment via ESC/POS | P0 |

### 4.4 Payment Processing

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-030 | Cash payment with change calculation and drawer open signal | P0 |
| FR-031 | Card payment support (basic integration, card data not stored) | P0 |
| FR-032 | Split payment across multiple payment methods | P1 |
| FR-033 | Payment method recorded with transaction | P0 |
| FR-034 | Cash register reconciliation (expected vs. actual count) | P1 |

### 4.5 Inventory Management & Adjustments

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-040 | View current stock levels for all products | P0 |
| FR-041 | Adjust stock with reason codes (damaged, loss, restock, count) | P0 |
| FR-042 | Stock adjustments logged with timestamp and staff ID | P0 |
| FR-043 | Low-stock alerts (configurable threshold) | P1 |
| FR-044 | Export inventory snapshot to CSV | P1 |

### 4.6 Transaction History & Reporting

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-050 | View all transactions with receipt number, time, amount, staff | P0 |
| FR-051 | Search transactions by date range, receipt number, or staff | P0 |
| FR-052 | Reprint receipt for any historical transaction | P0 |
| FR-053 | Return/refund processing via original receipt lookup | P1 |
| FR-054 | Daily Z-report: total sales, transaction count, payment method breakdown | P0 |
| FR-055 | Export reports to CSV/PDF | P1 |

### 4.7 Data Persistence & Backup

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-060 | All data stored in local SQLite database | P0 |
| FR-061 | Atomic transactions prevent data corruption | P0 |
| FR-062 | Backup function exports database to external drive/USB | P1 |
| FR-063 | Auto-backup on daily close (configurable) | P1 |

### 4.8 Hardware Integration

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-070 | Barcode scanner works via global keyboard listener | P0 |
| FR-071 | ESC/POS thermal receipt printer via IPC | P0 |
| FR-072 | Cash drawer electronic open signal | P1 |
| FR-073 | Graceful degradation if hardware not available | P1 |

---

## 5. Non-Functional Requirements

| Category | Requirement | Target |
|----------|-------------|--------|
| **Performance** | Transaction completion (scan → receipt) | < 30 seconds |
| **Performance** | Database queries (product lookup, inventory) | < 500ms |
| **Reliability** | Zero transaction data loss during power loss | 100% |
| **Compatibility** | Windows 10+ and macOS 10.15+ | All major OS |
| **Compatibility** | Thermal printer models (ESC/POS) | Top 5 brands |
| **Usability** | Staff training time | < 30 minutes |
| **Accessibility** | RTL text support | Arabic/Hebrew |
| **Security** | PIN hashing algorithm | bcrypt or Argon2 |
| **Offline** | Full operation without internet | 100% of time |

---

## 6. User Interface Layout

```
┌─────────────────────────────────────────────────────┐
│  Status Bar (Location, Staff, Time, Connection)     │
├────────┬──────────────────────┬────────────────────┤
│ Sidebar│    Cart Display      │  Transaction Panel │
│        │                      │                    │
│ [Nav]  │  [Product List]      │  Subtotal: ___     │
│        │  [Qty] [Variant] [$] │  Tax: ___          │
│        │  [Item 2]            │  Total: ___        │
│        │  ...                 │                    │
│        │                      │  [PAY Button]      │
├────────┴──────────────────────┴────────────────────┤
│  Keyboard: F1=Search F2=Customer F7=Orders F10=EOD │
└─────────────────────────────────────────────────────┘
```

---

## 7. Data Model (SQLite)

### Core Tables

**Products**
```
- id (PRIMARY KEY)
- sku (UNIQUE)
- barcode (INDEXED)
- name
- price
- cost_price
- category
```

**Inventory**
```
- id (PRIMARY KEY)
- product_id (FOREIGN KEY)
- quantity
- location
- last_updated
```

**Transactions**
```
- id (PRIMARY KEY)
- receipt_number (UNIQUE)
- staff_id
- timestamp
- subtotal
- tax_amount
- discount_amount
- total
- payment_method
- status
```

**Transaction Items**
```
- id (PRIMARY KEY)
- transaction_id (FOREIGN KEY)
- product_id (FOREIGN KEY)
- quantity
- unit_price (snapshotted)
- line_total
```

**Staff**
```
- id (PRIMARY KEY)
- name
- pin_hash
- role
- active
```

---

## 8. Implementation Phases

### Phase 1: Core POS (MVP)
- Login screen
- Barcode scanning & cart
- Payment processing
- Receipt printing
- Basic transaction history

### Phase 2: Inventory & Reporting
- Inventory adjustments
- Transaction search
- Daily Z-report
- Stock lookup

### Phase 3: Advanced Features
- Multi-location support
- Returns/refunds
- Manager overrides
- Advanced reporting

---

## 9. Success Criteria

1. ✅ Complete transaction in < 15 seconds
2. ✅ No data loss during power interruption
3. ✅ Receipt prints on standard thermal printers
4. ✅ Works fully offline (no internet required)
5. ✅ 5+ staff logins without issues
6. ✅ Transaction history persists across sessions
7. ✅ UI is intuitive for untrained staff
