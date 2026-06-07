import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Tag, Layers, ExternalLink, MapPin } from "lucide-react";
import { Modal } from "@/components/ui/custom/modal/Modal";
import { cn } from "@/lib/utils";
import type { ProductRecord, ProductVariantRecord } from "@/types/electron";

interface StockEntry {
  locationId: string;
  locationName: string;
  qty: number;
  lowStockThreshold: number;
}

interface ProductDetailModalProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  onEdit: (productId: string) => void;
}

export default function ProductDetailModal({
  open,
  onClose,
  productId,
  onEdit,
}: ProductDetailModalProps) {
  const { t } = useTranslation();
  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [stockMap, setStockMap] = useState<Record<string, StockEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedVariant, setExpandedVariant] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !productId) return;
    setLoading(true);
    setExpandedVariant(null);

    Promise.all([
      window.api?.products.getById(productId),
      window.api?.inventory.getAll(),
    ]).then(([p, inv]) => {
      setProduct(p ?? null);

      // Build stock map: variantId → locations[]
      const map: Record<string, StockEntry[]> = {};
      for (const item of inv ?? []) {
        if (item.productId === productId) {
          map[item.variantId] = item.locations.map((l) => ({
            locationId: l.locationId,
            locationName: l.locationName,
            qty: l.qty,
            lowStockThreshold: l.lowStockThreshold,
          }));
        }
      }
      setStockMap(map);
      setLoading(false);
    });
  }, [open, productId]);

  const getTotalStock = (variantId: string) =>
    (stockMap[variantId] ?? []).reduce((sum, l) => sum + l.qty, 0);

  const footer = (
    <div className="flex justify-between items-center">
      <button
        type="button"
        onClick={() => onEdit(productId)}
        className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
      >
        <ExternalLink className="w-4 h-4" />
        Edit Product
      </button>
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition-colors"
      >
        Close
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={loading ? "Loading…" : (product?.name ?? "Product Detail")}
      size="xl"
      footer={footer}
    >
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !product ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Product not found.</div>
      ) : (
        <div className="space-y-5">
          {/* ── Header info ──────────────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {product.brand && (
                <span className="flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                  <Tag className="w-3 h-3" />
                  {product.brand}
                </span>
              )}
              {product.category && (
                <span className="flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                  <Layers className="w-3 h-3" />
                  {product.category}
                </span>
              )}
              <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded-full">
                SKU: {product.sku}
              </span>
            </div>
            {product.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
            )}
          </div>

          {/* ── Variants table ────────────────────────────────────────────── */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Variants ({product.variants.length})
            </h3>
            <div className="border border-border rounded-lg overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[0.8fr_1fr_1.4fr_1.4fr_1fr_0.7fr] bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <span>Size</span>
                <span>Color</span>
                <span>SKU</span>
                <span>Barcode</span>
                <span>Price (JD)</span>
                <span>Stock</span>
              </div>

              {product.variants.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">{t('status.noVariants')}</div>
              ) : (
                product.variants.map((v: ProductVariantRecord) => {
                  const total = getTotalStock(v.id);
                  const locations = stockMap[v.id] ?? [];
                  const isExpanded = expandedVariant === v.id;
                  const isOut = total === 0;
                  const isLow = locations.some((l) => l.qty > 0 && l.qty <= l.lowStockThreshold);

                  return (
                    <div key={v.id} className="border-t border-border/50">
                      <div
                        className="grid grid-cols-[0.8fr_1fr_1.4fr_1.4fr_1fr_0.7fr] px-3 py-2.5 items-center hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => setExpandedVariant(isExpanded ? null : v.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && setExpandedVariant(isExpanded ? null : v.id)}
                        aria-expanded={isExpanded}
                        aria-label={`${v.size} / ${v.color} — click to ${isExpanded ? "collapse" : "expand"} locations`}
                      >
                        <span className="text-sm text-foreground font-medium">{v.size}</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 rounded-full border border-border/50 shrink-0" style={{ backgroundColor: v.colorHex }} />
                          <span className="text-sm text-foreground truncate">{v.color}</span>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground truncate">{v.sku}</span>
                        <span className="text-xs font-mono text-muted-foreground truncate">{v.barcode}</span>
                        <span className="text-sm tabular-nums text-foreground">{v.price.toFixed(2)}</span>
                        <div className="flex items-center gap-1">
                          <span className={cn("text-sm font-semibold tabular-nums", isOut ? "text-destructive" : isLow ? "text-warning" : "text-success")}>
                            {total}
                          </span>
                          {isOut && <span className="badge-destructive text-[10px]">Out</span>}
                          {!isOut && isLow && <span className="badge-warning text-[10px]">Low</span>}
                        </div>
                      </div>

                      {/* Per-location stock */}
                      {isExpanded && locations.length > 0 && (
                        <div className="bg-muted/20 border-t border-border/30 px-10 py-2.5 space-y-1.5">
                          {locations.map((loc) => (
                            <div key={loc.locationId} className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-foreground">{loc.locationName}</span>
                              </div>
                              <span className={cn("text-xs font-semibold tabular-nums", loc.qty === 0 ? "text-destructive" : loc.qty <= loc.lowStockThreshold ? "text-warning" : "text-success")}>
                                {loc.qty} units
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
