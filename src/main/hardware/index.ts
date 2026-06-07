import { BrowserWindow } from "electron";
import { BarcodeScanner } from "./barcode-scanner";
import { PrinterDriver } from "./printer";
import { CashDrawer } from "./cash-drawer";

export interface HardwareStatus {
  printer: { connected: boolean; name?: string };
  scanner: { active: boolean };
  cashDrawer: { connected: boolean };
}

/**
 * HardwareManager — orchestrates all hardware peripherals for the POS system.
 * Initializes and provides access to barcode scanner, receipt printer, and cash drawer.
 */
export class HardwareManager {
  private printer: PrinterDriver;
  private scanner: BarcodeScanner;
  private cashDrawer: CashDrawer;
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    this.printer = new PrinterDriver();
    this.scanner = new BarcodeScanner();
    this.cashDrawer = new CashDrawer();
  }

  /**
   * Initialize all hardware peripherals.
   * Attaches the barcode scanner listener and attempts printer detection.
   */
  async initialize(mainWindow: BrowserWindow): Promise<void> {
    this.mainWindow = mainWindow;

    // Setup barcode scanner — forwards barcodes to renderer
    this.scanner.on("barcode", (code: string) => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send("scanner:barcode", code);
      }
    });
    this.scanner.start();

    // Attempt to detect printer
    await this.printer.detect();
  }

  /**
   * Print a receipt using the connected ESC/POS printer.
   */
  async printReceipt(data: ReceiptData): Promise<{ success: boolean; error?: string }> {
    return this.printer.printReceipt(data);
  }

  /**
   * Open the cash drawer.
   */
  async openDrawer(): Promise<{ success: boolean; error?: string }> {
    return this.cashDrawer.open(this.printer);
  }

  /**
   * Get current hardware status.
   */
  getStatus(): HardwareStatus {
    return {
      printer: this.printer.getStatus(),
      scanner: { active: this.scanner.isActive() },
      cashDrawer: { connected: this.printer.isConnected() }, // Drawer connected via printer
    };
  }

  /**
   * Cleanup all hardware connections on app close.
   */
  dispose(): void {
    this.scanner.stop();
    this.printer.disconnect();
  }
}

/**
 * Receipt data structure for printing.
 */
export interface ReceiptData {
  merchantName: string;
  location: string;
  receiptNumber: string;
  date: string;
  staffName: string;
  items: ReceiptItem[];
  subtotal: number;
  taxLabel: string;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  amountPaid?: number;
  change?: number;
  header?: string;
  footer?: string;
  currency: string;
}

export interface ReceiptItem {
  name: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}
