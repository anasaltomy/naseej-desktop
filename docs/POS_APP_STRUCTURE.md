# POS Desktop Application Structure

## Naseej POS — Electron Desktop Native Point-of-Sale Terminal

**Stack:** Electron · Vite · React · TypeScript · Tailwind CSS  
**Target:** In-store cash registers and touchscreen terminals  
**Resolution:** Optimized for 1024x768 minimum (dual-display POS layouts)  
**Hardware:** ESC/POS thermal printers, barcode scanners, cash drawers via IPC bridge

---

## Directory Layout

```
desktop/
├── src/
│   ├── main/                                 # Electron Main Process (Node.js)
│   │   ├── main.ts                           # Window creation, app lifecycle, IPC listeners
│   │   ├── preload.ts                        # Context bridge (exposes safe APIs to renderer)
│   │   │
│   │   ├── hardware/                         # Physical device drivers
│   │   │   ├── printer.ts                    # ESC/POS thermal receipt printer driver
│   │   │   ├── scanner.ts                    # Barcode scanner input handler
│   │   │   ├── cash-drawer.ts               # Electronic cash drawer signal
│   │   │   └── customer-display.ts           # Customer-facing pole display
│   │   │
│   │   ├── ipc/                              # IPC channel handlers
│   │   │   ├── hardware-handlers.ts          # Print receipt, open drawer, etc.
│   │   │   ├── system-handlers.ts            # App updates, network status
│   │   │   └── channels.ts                   # Channel name constants (shared)
│   │   │
│   │   └── updater.ts                        # Auto-update mechanism
│   │
│   ├── renderer/                             # React Application (Chromium)
│   │   ├── src/
│   │   │   ├── App.tsx                       # Root component + router
│   │   │   ├── main.tsx                      # React entry point
│   │   │   ├── index.css                     # Tailwind directives + POS-specific variables
│   │   │   │
│   │   │   ├── pages/                        # Route-level page components
│   │   │   │   ├── login.tsx                 # Staff PIN/badge authentication
│   │   │   │   ├── register.tsx              # Main POS checkout interface
│   │   │   │   ├── payment-modal.tsx         # Payment processing overlay
│   │   │   │   ├── inventory.tsx             # In-store stock lookup & adjustments
│   │   │   │   ├── orders.tsx                # Transaction history & returns
│   │   │   │   └── end-of-day.tsx            # Shift close & Z-report
│   │   │   │
│   │   │   ├── components/                   # Reusable UI components
│   │   │   │   ├── ui/                       # Base primitives
│   │   │   │   │   ├── button.tsx
│   │   │   │   │   ├── input.tsx
│   │   │   │   │   ├── badge.tsx
│   │   │   │   │   ├── dialog.tsx
│   │   │   │   │   └── numpad.tsx            # Touch-friendly numeric keypad
│   │   │   │   │
│   │   │   │   ├── pos/                      # POS-specific components
│   │   │   │   │   ├── cart-list.tsx          # Active basket items
│   │   │   │   │   ├── cart-item.tsx          # Individual line item (qty, size, color badge)
│   │   │   │   │   ├── product-search.tsx     # Quick product/variant lookup
│   │   │   │   │   ├── variant-selector.tsx   # Manual Size → Color picker modal
│   │   │   │   │   ├── customer-attach.tsx    # Customer search/create for transaction
│   │   │   │   │   ├── discount-panel.tsx     # Line-item and cart-wide discounts
│   │   │   │   │   ├── totals-summary.tsx     # Subtotal, tax, discounts, total
│   │   │   │   │   └── barcode-listener.tsx   # Invisible global key interceptor
│   │   │   │   │
│   │   │   │   ├── payment/                  # Payment flow components
│   │   │   │   │   ├── cash-payment.tsx       # Quick tender ($20/$50/$100 buttons)
│   │   │   │   │   ├── card-payment.tsx       # Terminal handshake integration
│   │   │   │   │   ├── split-payment.tsx      # Multi-method payment splitter
│   │   │   │   │   └── change-display.tsx     # Change due calculation
│   │   │   │   │
│   │   │   │   ├── inventory/                # Inventory management components
│   │   │   │   │   ├── stock-lookup.tsx       # Cross-location variant search
│   │   │   │   │   └── adjustment-form.tsx    # Stock adjustment with reason codes
│   │   │   │   │
│   │   │   │   └── layout/                   # Structural layout
│   │   │   │       ├── sidebar.tsx            # Left navigation rail
│   │   │   │       ├── status-bar.tsx         # Connection status, clock, user info
│   │   │   │       └── manager-override.tsx   # PIN entry modal for restricted actions
│   │   │   │
│   │   │   ├── hooks/                        # Custom React hooks
│   │   │   │   ├── use-hardware.ts            # IPC bridge interface
│   │   │   │   ├── use-barcode.ts             # Barcode scanner event handler
│   │   │   │   ├── use-cart.ts                # POS cart state management
│   │   │   │   ├── use-auth.ts                # Staff authentication & PIN
│   │   │   │   ├── use-real-time.ts           # WebSocket inventory updates
│   │   │   │   └── use-offline.ts             # Offline detection & queue
│   │   │   │
│   │   │   ├── providers/                    # React context providers
│   │   │   │   ├── merchant-provider.tsx      # Merchant config + bootstrap data
│   │   │   │   ├── cart-provider.tsx          # Transaction state
│   │   │   │   ├── auth-provider.tsx          # Staff session
│   │   │   │   └── hardware-provider.tsx      # Hardware status & methods
│   │   │   │
│   │   │   ├── lib/                          # Utilities
│   │   │   │   ├── api-client.ts              # GraphQL client (shared with web)
│   │   │   │   ├── receipt-builder.ts         # ESC/POS command builder
│   │   │   │   ├── barcode-parser.ts          # Barcode format detection
│   │   │   │   └── utils.ts                   # Formatting, calculations
│   │   │   │
│   │   │   ├── config/
│   │   │   │   └── merchant.ts               # Per-deployment merchant configuration
│   │   │   │
│   │   │   └── types/                        # TypeScript definitions
│   │   │       ├── hardware.ts                # IPC channel types
│   │   │       ├── pos.ts                     # POS-specific types
│   │   │       └── electron.d.ts              # Window.electronAPI type augmentation
│   │   │
│   │   └── index.html                        # Vite HTML entry
│   │
│   └── shared/                               # Shared between main & renderer
│       ├── constants.ts                       # IPC channel names, event types
│       └── types.ts                           # Shared type definitions
│
├── resources/                                # Build resources
│   ├── icon.icns                             # macOS app icon
│   ├── icon.ico                              # Windows app icon
│   └── icon.png                              # Linux app icon
│
├── electron-builder.yml                      # Electron Builder packaging config
├── vite.config.ts                            # Vite config (renderer build)
├── vite.main.config.ts                       # Vite config (main process build)
├── vite.preload.config.ts                    # Vite config (preload script)
├── tsconfig.json                             # Root TypeScript config
├── tsconfig.main.json                        # Main process TS config
├── tsconfig.renderer.json                    # Renderer TS config
├── tailwind.config.ts                        # Tailwind config (POS-optimized)
├── package.json
└── .env                                      # Local environment variables
```

---

## Architectural Patterns

### IPC Bridge (Main ↔ Renderer Communication)

The Electron app uses a secure IPC bridge for hardware communication. The renderer never accesses Node.js APIs directly.

```typescript
// src/main/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Hardware
  printReceipt: (data: ReceiptData) => ipcRenderer.invoke('hardware:print-receipt', data),
  openCashDrawer: () => ipcRenderer.invoke('hardware:open-drawer'),
  
  // Scanner events (main → renderer)
  onBarcodeScanned: (callback: (barcode: string) => void) => {
    ipcRenderer.on('scanner:barcode', (_event, barcode) => callback(barcode));
  },
  
  // System
  getNetworkStatus: () => ipcRenderer.invoke('system:network-status'),
});
```

### Barcode Scanner Integration

The scanner works as a global keyboard listener in the main process, detecting rapid sequential keystrokes characteristic of barcode input:

```typescript
// src/main/hardware/scanner.ts
class BarcodeScanner {
  private buffer: string = '';
  private timeout: NodeJS.Timeout | null = null;
  private readonly SCAN_THRESHOLD_MS = 50; // characters arrive < 50ms apart

  handleKeyPress(char: string) {
    clearTimeout(this.timeout!);
    this.buffer += char;
    
    this.timeout = setTimeout(() => {
      if (this.buffer.length >= 8) {  // minimum barcode length
        this.emit('barcode', this.buffer);
      }
      this.buffer = '';
    }, this.SCAN_THRESHOLD_MS);
  }
}
```

### Receipt Printing (ESC/POS)

```typescript
// src/renderer/src/lib/receipt-builder.ts
class ReceiptBuilder {
  build(order: Order, merchant: MerchantConfig): Uint8Array {
    return new ESCPOSEncoder()
      .initialize()
      .align('center')
      .bold(true)
      .line(merchant.name)
      .bold(false)
      .line(merchant.settings.receiptHeader ?? '')
      .newline()
      .align('left')
      .table(order.items.map(item => ({
        left: `${item.quantity}x ${item.productName}`,
        right: formatPrice(item.total),
      })))
      .separator()
      .table([
        { left: 'Subtotal', right: formatPrice(order.subtotal) },
        { left: `Tax (${merchant.taxRate * 100}%)`, right: formatPrice(order.taxAmount) },
        { left: 'TOTAL', right: formatPrice(order.total), bold: true },
      ])
      .newline()
      .align('center')
      .line(merchant.settings.receiptFooter ?? 'Thank you!')
      .cut()
      .encode();
  }
}
```

### Merchant Configuration (Shared with Web)

```typescript
// src/renderer/src/config/merchant.ts
export const merchant = {
  id: 'uuid-from-database',
  slug: 'brand-name',
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
    receiptWidth: 80,
    enableCustomerDisplay: false,
    offlineMode: true,
  },
} as const;
```

---

## Design Constraints

| Constraint | Rationale |
|-----------|-----------|
| Fixed layout (no responsive breakpoints) | POS terminals have known screen dimensions |
| Minimum resolution: 1024x768 | Standard retail POS display size |
| No external network dependencies for core POS | Must function with intermittent connectivity |
| Large touch targets (min 44x44px) | Used with fingers on touchscreens |
| High-contrast UI | Retail environments have variable lighting |
| Keyboard shortcuts for all actions | Power users (cashiers) prefer keyboard over mouse |
