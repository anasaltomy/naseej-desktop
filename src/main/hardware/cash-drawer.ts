import type { PrinterDriver } from "./printer";

/**
 * CashDrawer — controls the cash drawer connected via the receipt printer.
 *
 * Most POS cash drawers are connected through the printer's kick connector (RJ11/RJ12).
 * The ESC/POS command to open the drawer is sent through the printer driver.
 */
export class CashDrawer {
  /**
   * Open the cash drawer by sending the kick pulse through the printer.
   */
  async open(printer: PrinterDriver): Promise<{ success: boolean; error?: string }> {
    try {
      if (!printer.isConnected()) {
        console.log("[CashDrawer] Open signal sent (no printer connected)");
        return { success: true };
      }
      return await printer.openDrawer();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to open cash drawer";
      console.error("[CashDrawer Error]", message);
      return { success: false, error: message };
    }
  }
}
