# Naseej POS — Screens & Features

## Overview

This document details all screens and features in the Naseej POS application. The POS is organized into logical modules that correspond to different aspects of store operations.

---

## Application Navigation

```
├── Login Screen
├── POS Register (Main)
│   ├── Product Search
│   ├── Cart Management
│   ├── Discount Panel
│   └── Payment Processing
├── Inventory Management
├── Transaction History & Returns
└── End-of-Day Reports
```

---

## Screen 1: Login

**Purpose:** Authenticate staff member and begin POS session.

**Input Methods:**
- PIN entry (4-6 digits) via numpad
- Email/password fallback for admin setup

**Features:**
- PIN is hashed and validated against staff database
- Failed attempts are rate-limited
- Session persists for 8-hour shift or until manual logout

---

## Screen 2: POS Register (Main Checkout)

The primary screen where 95% of cashier time is spent.

### Layout

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

### Features

**Barcode Scanning:**
- Global keyboard listener captures rapid keystrokes
- Barcode automatically adds matching product to cart
- Detects multiple scans quickly (< 100ms gaps)

**Manual Product Entry:**
- Product search by name, SKU, or barcode
- Manual variant selection (size, color, etc.)
- Quick-add buttons for frequently purchased items

**Cart Management:**
- Display item quantity, variant details, line totals
- Adjust quantities via +/- buttons or direct input
- Remove line items (may require manager override)
- Clear entire cart

**Totals Calculation:**
- Auto-calculate subtotal
- Apply tax percentage from settings
- Apply discounts (percentage or fixed)
- Display grand total

---

## Screen 3: Payment Modal

**Purpose:** Process payment and complete transaction.

**Payment Methods:**

1. **Cash**
   - Quick tender buttons ($5, $10, $20, $50, $100, etc.)
   - Custom amount via numpad
   - Auto-calculate change due
   - Confirm and open cash drawer

2. **Card**
   - Amount displays
   - Interface for card terminal (mock or real)
   - Shows "Waiting for card..." state
   - Handles success/failure callbacks

3. **Split Payment**
   - Combine multiple payment methods
   - Remaining balance updates live
   - Minimum two methods required

**On Successful Payment:**
1. Save transaction to SQLite
2. Decrement inventory
3. Print receipt via thermal printer
4. Open cash drawer (if applicable)
5. Clear cart and return to register

---

## Screen 4: Inventory Management

### Stock Lookup

**Purpose:** View and verify inventory levels.

**Features:**
- Search by product name, SKU, or barcode
- Display current quantity on hand
- Show location/warehouse breakdown
- Filter by category or low-stock threshold

### Stock Adjustment

**Purpose:** Correct inventory discrepancies.

**Features:**
- Select product and current quantity
- Enter new quantity or adjustment amount
- Select reason code:
  - `restock` — New inventory received
  - `damaged` — Items damaged/broken
  - `lost` — Unaccounted loss
  - `count` — Physical inventory count
  - `adjustment` — Manual correction
- Add optional notes
- Confirm and log to database

**Permissions:**
- Basic adjustments: Cashier
- Large adjustments: Manager override required

---

## Screen 5: Transaction History

### Daily Transaction Log

**Purpose:** View today's transactions.

**Features:**
- List all transactions with:
  - Receipt number
  - Time
  - Total amount
  - Payment method
  - Staff member
- Filter by time range, staff, or amount
- Sort by date, amount, or receipt #

### Search & Lookup

**Purpose:** Find historical transactions.

**Features:**
- Search by receipt number
- Search by date range
- Search by customer phone/name
- View full transaction details including:
  - Line items with variants
  - Payment breakdown
  - Staff member
  - Timestamp

### Receipt Reprint

**Purpose:** Reprint receipt for customer.

**Features:**
- Select transaction from history
- Print original receipt via thermal printer
- Add notation (duplicate, reprint, etc.)

---

## Screen 6: Returns & Refunds

### Return Processing

**Purpose:** Handle customer returns and refunds.

**Workflow:**

```
Scan Original Receipt
       ↓
Display Transaction Items
       ↓
Select Items to Return
       ↓
Choose Refund Method (Cash / Card / Store Credit)
       ↓
Confirm Refund Amount
       ↓
Process Payment Reversal
       ↓
Print Return Receipt
       ↓
Restock Inventory
```

**Features:**
- Lookup original transaction by receipt number or date
- Select specific items to return (full or partial quantities)
- Choose refund method:
  - `cash` — Refund to cash
  - `card` — Reverse card charge
  - `store_credit` — Store credit for future purchase
- Automatic inventory restocking
- Return logged with original transaction reference

---

## Screen 7: End-of-Day Reports

### Z-Report Generation

**Purpose:** Close shift and generate daily summary.

**Report Includes:**
- Date and time range
- Total sales amount
- Number of transactions
- Items sold (quantity)
- Payment method breakdown:
  - Cash amount
  - Card amount
  - Other payment types
- Total discounts given
- Refunds processed
- Tax collected

### Cash Reconciliation

**Purpose:** Verify actual vs. expected cash.

**Features:**
- Calculate expected cash:
  - Opening cash + cash sales - cash refunds
- Input counted cash amount
- Show variance (difference)
- If variance exists:
  - Require staff to note discrepancy
  - Manager can override
  - Log variance to database

### Shift Close

**Purpose:** Lock the register and complete operations.

**Features:**
- Confirm all transactions reconciled
- Lock register to prevent further sales
- Generate and print Z-report
- Require manager PIN to reopen register

---

## Keyboard Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| `F1` | Product search | Global |
| `F2` | Attach/search customer | Register |
| `F3` | Hold transaction | Register |
| `F4` | Recall held transaction | Register |
| `F5` | Apply discount | Register |
| `F7` | Order/transaction history | Global |
| `F8` | Inventory lookup | Global |
| `F9` | Return to register | Global |
| `F10` | End of day | Global |
| `F12` | Pay / complete transaction | Register |
| `Esc` | Cancel / close modal | Global |
| `Delete` | Remove selected line item | Register |
| `+` | Increase quantity | Register |
| `-` | Decrease quantity | Register |

---

## State Management

### Session State
- Current staff member
- Staff permissions
- Location
- Session start time

### Transaction State
- Current cart items
- Applied discounts
- Selected customer
- Payment method

### Data Cache
- Product catalog (from SQLite)
- Inventory levels
- Staff list
- Settings/configuration 