import { EventEmitter } from "events";

/**
 * BarcodeScanner — detects barcode scanner input from the main process.
 *
 * Most USB barcode scanners act as HID keyboard devices. They type the barcode
 * quickly followed by Enter. We detect this pattern by measuring input speed:
 * if characters arrive faster than a human can type (< 50ms between chars),
 * and terminate with Enter, it's treated as a barcode scan.
 */
export class BarcodeScanner extends EventEmitter {
  private buffer = "";
  private lastKeyTime = 0;
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private active = false;

  /** Maximum time between keystrokes to consider them part of a barcode scan (ms). */
  private static readonly MAX_INTER_KEY_DELAY = 50;
  /** Minimum length to consider input as a valid barcode. */
  private static readonly MIN_BARCODE_LENGTH = 4;
  /** Maximum time to wait for barcode completion before discarding buffer (ms). */
  private static readonly SCAN_TIMEOUT = 200;

  /**
   * Start listening for barcode input.
   * In a real implementation, this would listen to raw keyboard events
   * via a global keyboard hook or the focused BrowserWindow's input events.
   */
  start(): void {
    this.active = true;
    this.buffer = "";
    this.lastKeyTime = 0;
  }

  /**
   * Stop listening for barcode input.
   */
  stop(): void {
    this.active = false;
    this.clearBuffer();
  }

  /**
   * Check if scanner is actively listening.
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Process a keyboard input event. Called from the renderer's keydown hook
   * forwarded via IPC, or from a global keyboard listener.
   *
   * @param key - The key string (e.g., "1", "a", "Enter")
   * @param timestamp - When the key was pressed (ms)
   */
  processKeyInput(key: string, timestamp: number = Date.now()): void {
    if (!this.active) return;

    const elapsed = timestamp - this.lastKeyTime;
    this.lastKeyTime = timestamp;

    // Reset timeout
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    // If too much time passed between keys, this is likely manual typing
    if (elapsed > BarcodeScanner.MAX_INTER_KEY_DELAY && this.buffer.length > 0) {
      this.clearBuffer();
    }

    if (key === "Enter") {
      // Barcode complete — emit if long enough
      if (this.buffer.length >= BarcodeScanner.MIN_BARCODE_LENGTH) {
        this.emit("barcode", this.buffer);
      }
      this.clearBuffer();
      return;
    }

    // Only accept printable characters (single char keys)
    if (key.length === 1) {
      this.buffer += key;
    }

    // Set a timeout to discard buffer if no Enter arrives
    this.timeout = setTimeout(() => {
      this.clearBuffer();
    }, BarcodeScanner.SCAN_TIMEOUT);
  }

  private clearBuffer(): void {
    this.buffer = "";
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}
