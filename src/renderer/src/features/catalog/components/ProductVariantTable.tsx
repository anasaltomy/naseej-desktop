import { useState, useEffect, useCallback } from "react";
import {
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import type { ProductVariantRecord } from "@/types/electron";
import { Dialog } from "@/components/ui/custom/dialog/Dialog";
import { useToast } from "@/components/ui/custom/toast";
import VariantStockRow from "./VariantStockRow";
import AddProductVariantModal from "../modals/AddProductVariantModal";

interface ProductVariantTableProps {
  productId: string;
}

export default function ProductVariantTable({ productId }: ProductVariantTableProps) {
  const { toast } = useToast();
  const [variants, setVariants] = useState<ProductVariantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ sku: "", barcode: "", price: "" });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedVariantId, setExpandedVariantId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allVariants, inventory] = await Promise.all([
        window.api?.variants.getAll() ?? Promise.resolve([]),
        window.api?.inventory.getAll() ?? Promise.resolve([]),
      ]);
      const productVariants = (allVariants ?? []).filter((v) => v.productId === productId);
      setVariants(productVariants);

      // Build total stock map per variantId
      const map: Record<string, number> = {};
      for (const item of inventory ?? []) {
        if (item.productId === productId) {
          map[item.variantId] = item.locations.reduce((sum, l) => sum + l.qty, 0);
        }
      }
      setStockMap(map);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (v: ProductVariantRecord) => {
    setEditingId(v.id);
    setEditValues({ sku: v.sku, barcode: v.barcode, price: String(v.price) });
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: string) => {
    if (!editValues.price || parseFloat(editValues.price) <= 0) return;
    setSavingId(id);
    try {
      await window.api?.variants.update({
        id,
        sku: editValues.sku,
        barcode: editValues.barcode,
        price: parseFloat(editValues.price),
      });
      toast({ variant: "success", title: "Variant updated" });
      setEditingId(null);
      await load();
    } catch {
      toast({ variant: "error", title: "Failed to update variant" });
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await window.api?.variants.delete(deleteTarget.id);
      toast({ variant: "success", title: "Variant deleted" });
      setDeleteTarget(null);
      await load();
    } catch {
      toast({ variant: "error", title: "Failed to delete variant" });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[0.8fr_1.2fr_1.4fr_1.4fr_1fr_0.7fr_80px] bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <span>Size</span>
          <span>Color</span>
          <span>SKU</span>
          <span>Barcode</span>
          <span>Price (JD)</span>
          <span>Stock</span>
          <span />
        </div>

        {variants.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No variants yet. Add the first one below.
          </div>
        ) : (
          variants.map((v) => {
            const isEditing = editingId === v.id;
            const isExpanded = expandedVariantId === v.id;
            const totalStock = stockMap[v.id] ?? 0;

            return (
              <div key={v.id} className="border-t border-border/50">
                <div className="grid grid-cols-[0.8fr_1.2fr_1.4fr_1.4fr_1fr_0.7fr_80px] px-3 py-2.5 items-center hover:bg-muted/30 transition-colors">
                  {/* Size */}
                  <span className="text-sm text-foreground font-medium">{v.size}</span>

                  {/* Color */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-border/50 shrink-0"
                      style={{ backgroundColor: v.colorHex }}
                    />
                    <span className="text-sm text-foreground truncate">{v.color}</span>
                  </div>

                  {/* SKU */}
                  {isEditing ? (
                    <input
                      value={editValues.sku}
                      onChange={(e) =>
                        setEditValues((p) => ({ ...p, sku: e.target.value }))
                      }
                      className="pos-input text-xs h-7 font-mono"
                      aria-label="Edit SKU"
                    />
                  ) : (
                    <span className="text-xs font-mono text-muted-foreground truncate">
                      {v.sku}
                    </span>
                  )}

                  {/* Barcode */}
                  {isEditing ? (
                    <input
                      value={editValues.barcode}
                      onChange={(e) =>
                        setEditValues((p) => ({ ...p, barcode: e.target.value }))
                      }
                      className="pos-input text-xs h-7 font-mono"
                      aria-label="Edit barcode"
                    />
                  ) : (
                    <span className="text-xs font-mono text-muted-foreground truncate">
                      {v.barcode}
                    </span>
                  )}

                  {/* Price */}
                  {isEditing ? (
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={editValues.price}
                      onChange={(e) =>
                        setEditValues((p) => ({ ...p, price: e.target.value }))
                      }
                      className="pos-input text-xs h-7 tabular-nums"
                      aria-label="Edit price"
                    />
                  ) : (
                    <span className="text-sm tabular-nums text-foreground">
                      {v.price.toFixed(2)}
                    </span>
                  )}

                  {/* Stock — clickable to expand locations */}
                  <button
                    onClick={() =>
                      setExpandedVariantId(isExpanded ? null : v.id)
                    }
                    className="flex items-center gap-1 text-sm font-semibold tabular-nums text-foreground hover:text-accent transition-colors focus:outline-none focus:ring-1 focus:ring-ring rounded"
                    aria-label={isExpanded ? "Hide locations" : "Show locations"}
                    aria-expanded={isExpanded}
                  >
                    {totalStock}
                    {isExpanded ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 justify-end">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => saveEdit(v.id)}
                          disabled={savingId === v.id}
                          className="w-7 h-7 flex items-center justify-center text-success hover:bg-success/10 rounded transition-colors focus:ring-1 focus:ring-ring"
                          aria-label="Save changes"
                        >
                          {savingId === v.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground rounded transition-colors focus:ring-1 focus:ring-ring"
                          aria-label="Cancel edit"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(v)}
                          className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground rounded transition-colors focus:ring-1 focus:ring-ring"
                          aria-label="Edit variant"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteTarget({
                              id: v.id,
                              label: `${v.size} / ${v.color}`,
                            })
                          }
                          className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-destructive rounded transition-colors focus:ring-1 focus:ring-ring"
                          aria-label="Delete variant"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded per-location stock */}
                {isExpanded && <VariantStockRow variantId={v.id} />}
              </div>
            );
          })
        )}
      </div>

      {/* Add variant button */}
      <button
        onClick={() => setAddOpen(true)}
        className="flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-ring rounded"
        aria-label="Add new variant"
      >
        <Plus className="w-4 h-4" />
        Add Variant
      </button>

      {/* Delete confirmation */}
      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        variant="danger"
        title="Delete Variant"
        description={`Delete variant "${deleteTarget?.label}"? This cannot be undone. Past order records referencing this variant will not be affected.`}
        confirmLabel="Delete"
        loading={isDeleting}
      />

      {/* Add variant modal */}
      <AddProductVariantModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => {
          setAddOpen(false);
          load();
        }}
        productId={productId}
      />
    </div>
  );
}
