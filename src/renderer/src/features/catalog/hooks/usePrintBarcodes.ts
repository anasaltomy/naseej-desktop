import { useCallback } from "react";
import { simulateAsync } from "../utils";

interface BarcodeLabel {
  variantId: string;
  sku: string;
  barcode: string;
  colorName: string;
  sizeName: string;
  productName: string;
  modelNumber: string;
}

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
