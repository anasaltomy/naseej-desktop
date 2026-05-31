# POS Application Map

## Naseej POS — Screen Architecture & Workflow Definitions

**Platform:** Electron (Vite + React)  
**Display:** Optimized for 1024x768+ touchscreen with optional customer-facing display  
**Input:** Barcode scanner (global keyboard listener), touch, mouse, keyboard shortcuts  
**Hardware:** ESC/POS printer, cash drawer, customer display — all via IPC bridge

---

## Application Layout

The POS uses a three-panel fixed layout within the Electron renderer window:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Status Bar (Connection status, Location, Staff name, Clock)        │
├────────┬──────────────────────────────────────┬─────────────────────┤
│        │                                      │                     │
│  Left  │         Center Workspace             │   Right Sidebar     │
│  Nav   │         (Active Cart)                │   (Transaction)     │
│        │                                      │                     │
│  [ ]   │  ┌──────────────────────────────┐   │  Customer: ____     │
│  Reg.  │  │  Barcode Listener (hidden)   │   │                     │
│        │  └──────────────────────────────┘   │  Discounts: ____    │
│  [ ]   │                                      │                     │
│  Ord.  │  ┌──────────────────────────────┐   │  ─────────────────  │
│        │  │  Item  │ Size │ Color │ Qty  │   │  Subtotal:  XX.XX   │
│  [ ]   │  │  Item  │ Size │ Color │ Qty  │   │  Tax:        X.XX   │
│  Inv.  │  │  Item  │ Size │ Color │ Qty  │   │  Discount:  -X.XX   │
│        │  │  ...                         │   │  ─────────────────  │
│  [ ]   │  └──────────────────────────────┘   │  TOTAL:     XX.XX   │
│  EOD   │                                      │                     │
│        │  [ Manual Variant Selector ]         │  ┌───────────────┐  │
│        │                                      │  │     PAY       │  │
│        │                                      │  └───────────────┘  │
├────────┴──────────────────────────────────────┴─────────────────────┤
│  Keyboard Shortcuts: F1=Search  F2=Customer  F5=Discount  F12=Pay   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Screen Map

```
Electron Main Process (Hardware Drivers: Printer, Scanner, Cash Drawer, Display)
│
└── React Renderer Window
    │
    ├── /login                          Staff Session Activation
    │
    ├── /register                       Main POS Checkout Interface (3-panel layout)
    │   ├── Left Sidebar                Navigation rail
    │   ├── Center Workspace            Active cart / barcode listener
    │   └── Right Sidebar               Transaction panel + Pay button
    │
    ├── /payment-modal                  Payment Processing (overlay)
    │   ├── Cash                        Quick tender buttons
    │   ├── Card                        Terminal integration
    │   └── Split                       Multi-method payment
    │
    ├── /inventory                      Stock Management
    │   ├── Lookup                      Cross-location search
    │   └── Adjust                      Stock corrections
    │
    ├── /orders                         Transaction History
    │   ├── Daily Log                   Today's transactions
    │   └── Returns Wizard              Line-item refund processor
    │
    └── /end-of-day                     Shift Close
        └── Z-Report                    Reconciliation & safe drop
```

---

## Screen Specifications

### Login (`/login`)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Authenticate staff member to begin a register session |
| **Input Methods** | PIN entry (numpad), barcode badge scan, email/password fallback |
| **Security** | PIN is hashed server-side; failed attempts are rate-limited |
| **Flow** | Successful auth → load staff permissions → redirect to /register |
| **Components** | Numpad, PIN input field, staff name display on badge scan |

### Register — Main Checkout (`/register`)

The primary screen where 95% of cashier time is spent.

**Left Sidebar (Navigation)**

| Item | Action | Keyboard |
|------|--------|----------|
| Register | Return to checkout view | `F9` |
| Orders | Open transaction history | `F7` |
| Inventory | Open stock lookup | `F8` |
| End of Day | Open shift close | `F10` |

**Center Workspace (Active Cart)**

| Feature | Behavior |
|---------|----------|
| Barcode Listener | Invisible interceptor captures rapid keystrokes (< 50ms gap) as scanner input |
| Item Grid | Displays scanned items with product name, variant (size/color badge), quantity, line total |
| Manual Variant Selector | Opens when item has no barcode — presents Style → Size → Color selection |
| Quantity Edit | Tap/click quantity to adjust; supports +/- and direct entry |
| Line Delete | Swipe or delete key removes line item (may require manager override) |

**Right Sidebar (Transaction Panel)**

| Section | Detail |
|---------|--------|
| Customer Attachment | Search by phone/email/loyalty card; create new inline |
| Discounts | Line-item percentage/fixed; cart-wide coupon code entry |
| Totals | Subtotal, tax (auto-calculated from merchant config), discount, total |
| Pay Button | Triggers payment modal; disabled until cart has items |

### Payment Modal (`/payment-modal`)

Appears as a full-screen overlay when "Pay" is triggered.

| Payment Type | Behavior |
|-------------|----------|
| **Cash** | Quick tender buttons ($10, $20, $50, $100, exact); calculates change due; numpad for custom amount |
| **Card** | Sends amount to integrated payment terminal via IPC; shows "Waiting for card..." state; receives success/failure callback |
| **Split Payment** | Add multiple payment methods; remaining balance updates live; minimum two methods |
| **Loyalty Points** | Show available balance; input points to redeem; converted at merchant's redemption rate |

**On Success:**
1. Create order via GraphQL mutation
2. Decrement inventory (triggers WebSocket broadcast)
3. Fire IPC `hardware:print-receipt` event to main process
4. Fire IPC `hardware:open-drawer` (for cash payments)
5. Clear cart → return to register

### Inventory Lookup (`/inventory`)

| Feature | Detail |
|---------|--------|
| **Search** | By barcode, SKU, product name, or variant attributes |
| **Cross-Location** | Shows stock levels at all locations for the searched variant |
| **Stock Adjustment** | Adjust quantity with reason code (damaged, lost, manual count, restock) |
| **Permissions** | Adjustments require `inventory:edit` permission; may trigger manager override |

### Order History (`/orders`)

| Feature | Detail |
|---------|--------|
| **Daily Log** | List of today's transactions (receipt number, time, total, staff, payment method) |
| **Search** | By receipt number, date range, or customer |
| **Receipt Reprint** | Reprint any historical receipt via IPC |
| **Returns Wizard** | Scan original receipt barcode → display order items → select items to return → process refund |

**Returns Flow:**
```
Scan Receipt → Load Order → Select Return Items → Choose Refund Method
                                                        │
                                    ┌───────────────────┼───────────────┐
                                    │                   │               │
                               Cash Refund      Card Reversal    Store Credit
                                    │                   │               │
                                    └───────────────────┴───────────────┘
                                                        │
                                              Print Return Receipt
                                              Restock Inventory
```

### End of Day (`/end-of-day`)

| Feature | Detail |
|---------|--------|
| **Z-Report Generation** | Summary of: total sales, transaction count, items sold, by payment method breakdown |
| **Cash Reconciliation** | Expected cash (opening + cash sales - cash refunds) vs. counted cash |
| **Variance Recording** | If counted ≠ expected, staff must note the discrepancy |
| **Safe Drop** | Declare cash removed from drawer for bank deposit |
| **Shift Close** | Locks register; requires manager PIN to reopen |
| **Permissions** | Requires `pos:end_of_day` permission |

---

## Keyboard Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| `F1` | Product search | Global |
| `F2` | Attach/search customer | Register |
| `F3` | Hold transaction | Register |
| `F4` | Recall held transaction | Register |
| `F5` | Apply discount | Register |
| `F7` | Order history | Global |
| `F8` | Inventory lookup | Global |
| `F9` | Return to register | Global |
| `F10` | End of day | Global |
| `F12` | Pay / complete transaction | Register |
| `Esc` | Cancel / close modal | Global |
| `Delete` | Remove selected line item | Register |
| `+` / `-` | Increase / decrease quantity | Register (item selected) |

---

## Manager Override Flow

Certain actions require elevated permissions. When a cashier attempts a restricted action:

```
Cashier triggers restricted action (e.g., void line item > $50, open drawer without sale)
    │
    ├── System checks cashier permissions
    │   └── Permission denied
    │
    ├── Manager Override modal appears
    │   └── Manager enters their PIN
    │
    ├── Server validates PIN + manager has required permission
    │   ├── Success → Action proceeds + ManagerOverride audit record created
    │   └── Failure → "Invalid PIN" message, action blocked
    │
    └── Override logged: manager_id, cashier_id, action, timestamp, location
```

**Actions requiring override (configurable per merchant):**
- `orders:refund` — Processing returns/refunds
- `pos:open_drawer` — Opening cash drawer without a sale
- `pos:void_transaction` — Voiding an in-progress transaction
- `pos:price_override` — Manually changing an item's price
- `inventory:edit` — Stock adjustments (if cashier lacks permission)
