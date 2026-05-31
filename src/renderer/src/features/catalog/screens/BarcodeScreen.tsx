import { useState, useCallback, useEffect, useRef } from "react";
import { Search, Printer, Loader2, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { mockSavedProducts } from "../__mocks__/productMocks";
import type {
  MockSavedProduct,
  MockSavedVariant,
} from "../__mocks__/productMocks";
import type { SavedProductResult } from "../types/product";
import { simulateAsync, generateBarcode } from "../utils";
import { usePrintBarcodes } from "../hooks/usePrintBarcodes";
import { cn } from "@/lib/utils";

interface BarcodeScreenProps {
  preloadedProduct?: SavedProductResult | null;
  autoOpenPrintPreview?: boolean;
}

interface VariantRow extends MockSavedVariant {
  checked: boolean;
  printQty: number;
}

export default function BarcodeScreen({
  preloadedProduct,
  autoOpenPrintPreview = false,
}: BarcodeScreenProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState(
    preloadedProduct?.modelNumber ?? "",
  );
  const [isSearching, setIsSearching] = useState(false);
  const [matchedProduct, setMatchedProduct] = useState<MockSavedProduct | null>(
    null,
  );
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const { printBarcodes } = usePrintBarcodes();

  // Auto-focus search input on mount
  useEffect(() => {
    if (!preloadedProduct) {
      searchInputRef.current?.focus();
    }
  }, [preloadedProduct]);

  // Load preloaded product on mount
  useEffect(() => {
    if (preloadedProduct) {
      const found = mockSavedProducts.find((p) => p.id === preloadedProduct.id);
      if (found) {
        setMatchedProduct(found);
        setVariants(
          found.variants.map((v, idx) => ({
            ...v,
            checked: true,
            printQty: v.quantity,
            barcode: generateBarcode(found.modelNumber, idx + 1),
          })),
        );
      }
    }
  }, [preloadedProduct]);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setMatchedProduct(null);
      setVariants([]);
      return;
    }

    setIsSearching(true);

    await simulateAsync(null);

    const found = mockSavedProducts.find(
      (p) =>
        p.modelNumber.toLowerCase().includes(query.toLowerCase()) ||
        p.name.toLowerCase().includes(query.toLowerCase()),
    );

    if (found) {
      setMatchedProduct(found);
      setVariants(
        found.variants.map((v, idx) => ({
          ...v,
          checked: true,
          printQty: v.quantity,
          barcode: generateBarcode(found.modelNumber, idx + 1),
        })),
      );
    } else {
      setMatchedProduct(null);
      setVariants([]);
    }

    setIsSearching(false);
  }, []);

  const handleSearchInput = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => handleSearch(value), 300);
    },
    [handleSearch],
  );

  const handleToggleVariant = useCallback((variantId: string) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === variantId ? { ...v, checked: !v.checked } : v)),
    );
  }, []);

  const handlePrintQtyChange = useCallback((variantId: string, qty: number) => {
    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId ? { ...v, printQty: Math.max(0, qty) } : v,
      ),
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setVariants((prev) => prev.map((v) => ({ ...v, checked: true })));
  }, []);

  const handleDeselectAll = useCallback(() => {
    setVariants((prev) => prev.map((v) => ({ ...v, checked: false })));
  }, []);

  const handlePrint = useCallback(async () => {
    if (!matchedProduct) return;

    const selected = variants.filter(
      (v) => v.checked && v.barcode && v.printQty > 0,
    );
    if (selected.length === 0) return;

    setIsPrinting(true);

    // Expand labels by printQty (one entry per physical label)
    const labels = selected.flatMap((v) =>
      Array.from({ length: v.printQty }, () => ({
        variantId: v.id,
        sku: v.sku,
        barcode: v.barcode,
        colorName: v.colorName,
        sizeName: v.sizeName,
        productName: matchedProduct.name,
        modelNumber: matchedProduct.modelNumber,
      })),
    );

    await printBarcodes(labels);

    setIsPrinting(false);
    setToastMessage(
      `${labels.length} barcode label${labels.length !== 1 ? "s" : ""} sent to printer`,
    );
    setTimeout(() => setToastMessage(null), 3000);
  }, [matchedProduct, variants, printBarcodes]);

  const checkedCount = variants.filter((v) => v.checked).length;
  const totalCount = variants.length;
  const allChecked = checkedCount === totalCount && totalCount > 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              {t('features.catalog.screens.barcodes.title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('features.catalog.screens.barcodes.subtitle')}
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder={t('features.catalog.screens.barcodes.searchPlaceholder')}
              className="pos-input pl-11 pr-4 py-3 text-base"
            />
          </div>

          {/* Loading skeleton */}
          {isSearching && (
            <div className="space-y-3 animate-pulse">
              <div className="h-5 w-48 bg-muted rounded" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-muted rounded-lg" />
              ))}
            </div>
          )}

          {/* No results */}
          {!isSearching && searchQuery && !matchedProduct && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No product found matching "{searchQuery}"
            </div>
          )}

          {/* Results */}
          {!isSearching && matchedProduct && (
            <div className="space-y-4">
              {/* Product header */}
              <div className="flex items-baseline gap-3">
                <h2 className="text-lg font-semibold text-foreground">
                  {matchedProduct.name}
                </h2>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {matchedProduct.modelNumber}
                </span>
              </div>

              {/* Bulk actions */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={allChecked ? handleDeselectAll : handleSelectAll}
                  className="btn-ghost text-sm h-8 px-3"
                >
                  {allChecked ? "Deselect All" : "Select All"}
                </button>
              </div>

              {/* Variant list */}
              <div className="space-y-2">
                {variants.map((variant) => (
                  <div
                    key={variant.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                      variant.checked
                        ? "border-border bg-card"
                        : "border-border/50 bg-muted/30 opacity-60",
                    )}
                  >
                    {/* Checkbox */}
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={variant.checked}
                        onChange={() => handleToggleVariant(variant.id)}
                        className="sr-only"
                      />
                      <div
                        className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                          variant.checked
                            ? "bg-accent border-accent"
                            : "border-border",
                        )}
                      >
                        {variant.checked && (
                          <Check className="w-3 h-3 text-accent-foreground" />
                        )}
                      </div>
                    </label>

                    {/* Color & Size */}
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <span
                        className="w-4 h-4 rounded-full border border-border/50 shrink-0"
                        style={{ backgroundColor: variant.colorHex || "#888" }}
                      />
                      <span className="text-sm text-foreground font-medium">
                        {variant.colorName}
                      </span>
                      <span className="text-sm text-muted-foreground">|</span>
                      <span className="text-sm text-foreground">
                        {variant.sizeName}
                      </span>
                    </div>

                    {/* Print quantity */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <label className="text-xs text-muted-foreground whitespace-nowrap">
                        Labels:
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        step="1"
                        value={variant.printQty}
                        onChange={(e) =>
                          handlePrintQtyChange(
                            variant.id,
                            parseInt(e.target.value, 10) || 0,
                          )
                        }
                        className="w-14 h-8 px-2 text-sm text-center bg-input border border-border rounded-md text-foreground outline-none focus:ring-1 focus:ring-ring tabular-nums"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Selection info */}
              <p className="text-sm text-muted-foreground">
                {checkedCount} of {totalCount} variants selected for printing
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer - print button */}
      {matchedProduct && checkedCount > 0 && (
        <div className="shrink-0 border-t border-border bg-card px-6 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {variants
                .filter((v) => v.checked && v.printQty > 0)
                .reduce((sum, v) => sum + v.printQty, 0)}{" "}
              label
              {variants
                .filter((v) => v.checked && v.printQty > 0)
                .reduce((sum, v) => sum + v.printQty, 0) !== 1
                ? "s"
                : ""}{" "}
              from {checkedCount} variant{checkedCount !== 1 ? "s" : ""}
            </p>
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="btn-primary flex items-center gap-2 px-6 py-2.5"
            >
              {isPrinting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              {isPrinting ? "Printing..." : "Print Selected Barcodes"}
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-success text-success-foreground text-sm font-medium rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
