import { useState, useCallback, useEffect, useRef } from "react";
import type { MockSavedProduct } from "../__mocks__/productMocks";
import type { BarcodeScreenProps, VariantRow } from "../types/Barcode.types";
import { usePrintBarcodes } from "./usePrintBarcodes";
import BarcodeController from "../controllers/barcodeCtrls";

export const useBarcodeScreen = ({
  preloadedProduct,
}: Pick<BarcodeScreenProps, "preloadedProduct">) => {
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

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const { printBarcodes } = usePrintBarcodes();

  // Load preloaded product on mount
  useEffect(() => {
    if (!preloadedProduct) return;
    BarcodeController.getProductById(preloadedProduct.id).then((found) => {
      if (!found) return;
      setMatchedProduct(found);
      setVariants(BarcodeController.buildVariantRows(found));
    });
  }, [preloadedProduct]);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setMatchedProduct(null);
      setVariants([]);
      return;
    }
    setIsSearching(true);
    const found = await BarcodeController.searchProduct(query);
    setMatchedProduct(found);
    setVariants(found ? BarcodeController.buildVariantRows(found) : []);
    setIsSearching(false);
  }, []);

  const handleSearchInput = useCallback(
    (value: string) => {
      setSearchQuery(value);
      clearTimeout(debounceRef.current);
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
  const totalLabels = variants
    .filter((v) => v.checked && v.printQty > 0)
    .reduce((sum, v) => sum + v.printQty, 0);

  return {
    searchQuery,
    isSearching,
    matchedProduct,
    variants,
    isPrinting,
    toastMessage,
    checkedCount,
    totalCount,
    totalLabels,
    allChecked: checkedCount === totalCount && totalCount > 0,
    handleSearchInput,
    handleToggleVariant,
    handlePrintQtyChange,
    handleSelectAll,
    handleDeselectAll,
    handlePrint,
  };
};
