import type { ReceiptData } from "./index";

/**
 * ESC/POS command constants for thermal receipt printers.
 */
const ESC = 0x1b;
const GS = 0x1d;

const COMMANDS = {
  INIT: Buffer.from([ESC, 0x40]), // Initialize printer
  CUT: Buffer.from([GS, 0x56, 0x00]), // Full cut
  PARTIAL_CUT: Buffer.from([GS, 0x56, 0x01]), // Partial cut
  ALIGN_CENTER: Buffer.from([ESC, 0x61, 0x01]),
  ALIGN_LEFT: Buffer.from([ESC, 0x61, 0x00]),
  ALIGN_RIGHT: Buffer.from([ESC, 0x61, 0x02]),
  BOLD_ON: Buffer.from([ESC, 0x45, 0x01]),
  BOLD_OFF: Buffer.from([ESC, 0x45, 0x00]),
  DOUBLE_WIDTH: Buffer.from([GS, 0x21, 0x10]),
  DOUBLE_HEIGHT: Buffer.from([GS, 0x21, 0x01]),
  NORMAL_SIZE: Buffer.from([GS, 0x21, 0x00]),
  LINE_FEED: Buffer.from([0x0a]),
  OPEN_DRAWER: Buffer.from([ESC, 0x70, 0x00, 0x19, 0xfa]), // Pin 2, 25ms on, 250ms off
};

/**
 * PrinterDriver — manages ESC/POS receipt printer communication.
 *
 * Supports USB and network printers. In production, uses a serial/USB library.
 * For now, builds ESC/POS byte commands and outputs them when a printer is connected.
 */
export class PrinterDriver {
  private connected = false;
  private printerName: string | null = null;
  private port: unknown = null; // Will be SerialPort or net.Socket in production

  /**
   * Attempt to detect and connect to a receipt printer.
   */
  async detect(): Promise<boolean> {
    try {
      // In production, scan USB ports or mDNS for ESC/POS printers
      // For now, log and set as not connected
      console.log("[Printer] Scanning for ESC/POS printers...");

      // TODO: Implement actual detection with node-usb or serialport
      // const ports = await SerialPort.list();
      // const printerPort = ports.find(p => p.vendorId === 'XXXX');

      this.connected = false;
      return false;
    } catch (err) {
      console.error("[Printer] Detection failed:", err);
      this.connected = false;
      return false;
    }
  }

  /**
   * Check if printer is currently connected.
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get printer status info.
   */
  getStatus(): { connected: boolean; name?: string } {
    return {
      connected: this.connected,
      name: this.printerName ?? undefined,
    };
  }

  /**
   * Disconnect from the printer.
   */
  disconnect(): void {
    this.connected = false;
    this.port = null;
    this.printerName = null;
  }

  /**
   * Print a receipt using ESC/POS commands.
   * Builds the full receipt as a byte buffer and writes it to the printer.
   */
  async printReceipt(data: ReceiptData): Promise<{ success: boolean; error?: string }> {
    try {
      const buffer = this.buildReceiptBuffer(data);

      if (!this.connected) {
        // Development fallback: log the receipt text
        console.log("[Printer] Receipt generated (no printer connected):");
        console.log(this.receiptToText(data));
        return { success: true };
      }

      await this.writeToPort(buffer);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Print failed";
      console.error("[Printer Error]", message);
      return { success: false, error: message };
    }
  }

  /**
   * Send the open-drawer command pulse.
   */
  async openDrawer(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.connected) {
        console.log("[Printer] Cash drawer open signal sent (no printer connected)");
        return { success: true };
      }
      await this.writeToPort(COMMANDS.OPEN_DRAWER);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Drawer open failed";
      return { success: false, error: message };
    }
  }

  /**
   * Build ESC/POS byte buffer for a receipt.
   */
  private buildReceiptBuffer(data: ReceiptData): Buffer {
    const parts: Buffer[] = [];

    parts.push(COMMANDS.INIT);

    // Header
    parts.push(COMMANDS.ALIGN_CENTER);
    parts.push(COMMANDS.BOLD_ON);
    parts.push(COMMANDS.DOUBLE_WIDTH);
    parts.push(Buffer.from(data.merchantName + "\n"));
    parts.push(COMMANDS.NORMAL_SIZE);
    parts.push(COMMANDS.BOLD_OFF);
    parts.push(Buffer.from(data.location + "\n"));
    if (data.header) {
      parts.push(Buffer.from(data.header + "\n"));
    }
    parts.push(Buffer.from("-".repeat(32) + "\n"));

    // Receipt info
    parts.push(COMMANDS.ALIGN_LEFT);
    parts.push(Buffer.from(`Receipt: ${data.receiptNumber}\n`));
    parts.push(Buffer.from(`Date:    ${data.date}\n`));
    parts.push(Buffer.from(`Staff:   ${data.staffName}\n`));
    parts.push(Buffer.from("-".repeat(32) + "\n"));

    // Items
    for (const item of data.items) {
      const name = `${item.name} (${item.size}/${item.color})`;
      parts.push(Buffer.from(`${name}\n`));
      const line = `  ${item.quantity} x ${data.currency} ${item.unitPrice.toFixed(2)}`;
      const total = `${data.currency} ${item.lineTotal.toFixed(2)}`;
      const padding = Math.max(0, 32 - line.length - total.length);
      parts.push(Buffer.from(line + " ".repeat(padding) + total + "\n"));
    }

    parts.push(Buffer.from("-".repeat(32) + "\n"));

    // Totals
    parts.push(this.buildTotalLine("Subtotal", data.subtotal, data.currency));
    parts.push(this.buildTotalLine(data.taxLabel, data.taxAmount, data.currency));
    if (data.discountAmount > 0) {
      parts.push(this.buildTotalLine("Discount", -data.discountAmount, data.currency));
    }
    parts.push(Buffer.from("=".repeat(32) + "\n"));
    parts.push(COMMANDS.BOLD_ON);
    parts.push(this.buildTotalLine("TOTAL", data.total, data.currency));
    parts.push(COMMANDS.BOLD_OFF);

    // Payment
    parts.push(Buffer.from(`\nPaid by: ${data.paymentMethod}\n`));
    if (data.amountPaid !== undefined) {
      parts.push(this.buildTotalLine("Amount Paid", data.amountPaid, data.currency));
    }
    if (data.change !== undefined && data.change > 0) {
      parts.push(this.buildTotalLine("Change", data.change, data.currency));
    }

    // Footer
    parts.push(Buffer.from("\n"));
    parts.push(COMMANDS.ALIGN_CENTER);
    if (data.footer) {
      parts.push(Buffer.from(data.footer + "\n"));
    }
    parts.push(Buffer.from("\n\n\n"));

    // Cut
    parts.push(COMMANDS.PARTIAL_CUT);

    return Buffer.concat(parts);
  }

  private buildTotalLine(label: string, amount: number, currency: string): Buffer {
    const amountStr = `${currency} ${amount.toFixed(2)}`;
    const padding = Math.max(0, 32 - label.length - amountStr.length);
    return Buffer.from(label + " ".repeat(padding) + amountStr + "\n");
  }

  /**
   * Human-readable receipt text for development/logging.
   */
  private receiptToText(data: ReceiptData): string {
    const lines: string[] = [];
    lines.push("=".repeat(32));
    lines.push(data.merchantName.padStart(16 + data.merchantName.length / 2));
    lines.push(data.location.padStart(16 + data.location.length / 2));
    lines.push("-".repeat(32));
    lines.push(`Receipt: ${data.receiptNumber}`);
    lines.push(`Date:    ${data.date}`);
    lines.push(`Staff:   ${data.staffName}`);
    lines.push("-".repeat(32));
    for (const item of data.items) {
      lines.push(`${item.name} (${item.size}/${item.color})`);
      lines.push(`  ${item.quantity} x ${data.currency} ${item.unitPrice.toFixed(2)}    ${data.currency} ${item.lineTotal.toFixed(2)}`);
    }
    lines.push("-".repeat(32));
    lines.push(`Subtotal:    ${data.currency} ${data.subtotal.toFixed(2)}`);
    lines.push(`${data.taxLabel}: ${data.currency} ${data.taxAmount.toFixed(2)}`);
    lines.push(`TOTAL:       ${data.currency} ${data.total.toFixed(2)}`);
    lines.push("=".repeat(32));
    return lines.join("\n");
  }

  /**
   * Write raw bytes to the connected port.
   */
  private async writeToPort(_buffer: Buffer): Promise<void> {
    // TODO: Implement with serialport or net.Socket
    // await new Promise<void>((resolve, reject) => {
    //   this.port.write(buffer, (err) => err ? reject(err) : resolve());
    // });
  }
}
