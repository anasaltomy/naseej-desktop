import { useCallback } from "react";

import type { BarcodeLabel } from "../types/Barcode.types";
import { simulateAsync } from "../utils";

export function usePrintBarcodes() {
  const printBarcodes = useCallback(
    async (labels: BarcodeLabel[]): Promise<void> => {
      // Mock print — in production this would call window.electron.printBarcodes
      console.log(
        `[Mock Print] Sending ${labels.length} barcode labels to printer:`,
        labels,
      );
      await simulateAsync(undefined);
    },
    [],
  );

  return { printBarcodes };
}
