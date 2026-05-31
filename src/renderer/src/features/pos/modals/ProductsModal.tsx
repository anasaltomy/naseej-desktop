import { useState, useCallback } from "react";
import { Search, Package } from "lucide-react";
import { Modal } from "@/components/ui/custom/modal/Modal";
import type { ProductVariant } from "../types";
import { DUMMY_VARIANTS } from "@/data/dummy-data";
import { cn, formatJOD } from "@/lib/utils";

interface ProductsModalProps {
  open: boolean;
  onClose: () => void;
  onSelectVariant?: (variant: ProductVariant) => void;
}

export default function ProductsModal({
  open,
  onClose,
  onSelectVariant,
}: ProductsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = DUMMY_VARIANTS.filter(
    (v) =>
      v.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.barcode.includes(searchQuery),
  );

  const handleSelect = useCallback(
    (variant: ProductVariant) => {
      onSelectVariant?.(variant);
      onClose();
    },
    [onSelectVariant, onClose],
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Product Search"
      description="Search products by name, SKU, or barcode"
      size="lg"
    >
      <div className="space-y-4">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, SKU, or barcode..."
            className="pos-input pl-10"
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Package className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            filtered.slice(0, 20).map((variant) => (
              <button
                key={variant.id}
                onClick={() => handleSelect(variant)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg",
                  "hover:bg-muted transition-colors text-left cursor-pointer",
                )}
              >
                <div
                  className="w-3 h-3 rounded-full border border-border shrink-0"
                  style={{ backgroundColor: variant.colorHex }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {variant.productName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {variant.size} · {variant.color} · SKU: {variant.sku}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium text-foreground tabular-nums">
                    {formatJOD(variant.price)}
                  </p>
                  <p className={cn(
                    "text-xs",
                    variant.stockQty > 0 ? "text-success" : "text-destructive",
                  )}>
                    {variant.stockQty > 0 ? `${variant.stockQty} in stock` : "Out of stock"}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
