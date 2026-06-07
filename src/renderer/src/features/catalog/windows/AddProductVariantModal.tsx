import { useState, useCallback, useEffect } from "react";
import { Loader2, Info } from "lucide-react";

import { Modal } from "@/components/ui/custom/modal/Modal";

import type { Color, Size, VariantQuantity } from "../types/Variants.types";
import VariantMatrix from "../components/VariantMatrix";
import TagInput from "../components/TagInput";
import { generateSku } from "../utils";

interface AddProductVariantModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  productId: string;
  productSku?: string;
}

const DEFAULT_LOCATION = "loc1";

export default function AddProductVariantModal({
  open,
  onClose,
  onSuccess,
  productId,
  productSku = "PROD",
}: AddProductVariantModalProps) {
  const [selectedColors, setSelectedColors] = useState<Color[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<Size[]>([]);
  const [quantities, setQuantities] = useState<VariantQuantity[]>([]);
  const [newVariantPrice, setNewVariantPrice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [dbColors, setDbColors] = useState<
    { id: string; name: string; hexCode: string }[]
  >([]);
  const [dbSizes, setDbSizes] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (open) {
      setSelectedColors([]);
      setSelectedSizes([]);
      setQuantities([]);
      setNewVariantPrice("");
      setErrors({});
      window.api?.colors.getAll().then((data) =>
        setDbColors(
          (data ?? []).map((c) => ({
            id: c.id,
            name: c.name,
            hexCode: c.hexCode,
          })),
        ),
      );
      window.api?.sizes.getAll().then((data) => setDbSizes(data ?? []));
    }
  }, [open]);

  const handleAddColor = useCallback(
    (tag: { id: string; name: string; hexCode?: string }) => {
      setSelectedColors((prev) => [
        ...prev,
        { id: tag.id, name: tag.name, hexCode: tag.hexCode ?? "" },
      ]);
    },
    [],
  );
  const handleRemoveColor = useCallback((colorId: string) => {
    setSelectedColors((prev) => prev.filter((c) => c.id !== colorId));
    setQuantities((prev) => prev.filter((q) => q.colorId !== colorId));
  }, []);

  const handleAddSize = useCallback((tag: { id: string; name: string }) => {
    setSelectedSizes((prev) => [...prev, { id: tag.id, name: tag.name }]);
  }, []);
  const handleRemoveSize = useCallback((sizeId: string) => {
    setSelectedSizes((prev) => prev.filter((s) => s.id !== sizeId));
    setQuantities((prev) => prev.filter((q) => q.sizeId !== sizeId));
  }, []);

  const handleClose = useCallback(() => {
    setErrors({});
    onClose();
  }, [onClose]);

  const handleSave = useCallback(async () => {
    const newErrors: Record<string, string> = {};
    const stockedVariants = quantities.filter(
      (q) => q.quantity !== null && q.quantity > 0,
    );
    if (stockedVariants.length === 0) {
      newErrors.matrix = "Enter a quantity for at least one variant";
    }
    const parsedPrice = parseFloat(newVariantPrice);
    if (!newVariantPrice || isNaN(parsedPrice) || parsedPrice <= 0) {
      newErrors.price = "Valid price is required for new variants";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    try {
      // Load existing variants for this product to detect existing vs new
      const allVariants = await window.api?.variants.getAll();
      const existingVariants = (allVariants ?? []).filter(
        (v) => v.productId === productId,
      );

      await Promise.all(
        stockedVariants.map(async (qv) => {
          const color = selectedColors.find((c) => c.id === qv.colorId);
          const size = selectedSizes.find((s) => s.id === qv.sizeId);
          if (!color || !size) return;

          const qty = qv.quantity!;
          // Check if a variant with the same color+size already exists
          const existing = existingVariants.find(
            (v) =>
              v.color.toLowerCase() === color.name.toLowerCase() &&
              v.size.toLowerCase() === size.name.toLowerCase(),
          );

          if (existing) {
            // Add to existing stock — ensure inventory row exists first, then adjust
            await window.api?.inventory.addLocation({
              variantId: existing.id,
              locationId: DEFAULT_LOCATION,
              qty: 0,
            });
            await window.api?.inventory.adjust({
              variantId: existing.id,
              locationId: DEFAULT_LOCATION,
              delta: qty,
            });
          } else {
            // Create brand-new variant + initial stock
            const result = await window.api?.variants.create({
              productId,
              sku: generateSku(productSku, color.name, size.name),
              size: size.name,
              color: color.name,
              colorHex: color.hexCode,
              price: parsedPrice,
            });
            if (result?.id) {
              await window.api?.inventory.addLocation({
                variantId: result.id,
                locationId: DEFAULT_LOCATION,
                qty,
              });
            }
          }
        }),
      );

      onSuccess?.();
      handleClose();
    } catch {
      setErrors({ form: "Failed to save variants. Please try again." });
    } finally {
      setIsSaving(false);
    }
  }, [
    quantities,
    newVariantPrice,
    selectedColors,
    selectedSizes,
    productId,
    productSku,
    onSuccess,
    handleClose,
  ]);

  const footer = (
    <div className="flex justify-end gap-3">
      <button
        type="button"
        onClick={handleClose}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition-colors"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="btn-primary flex items-center gap-2 px-6 py-2"
      >
        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
        {isSaving ? "Saving..." : "Add Variants"}
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add Variants"
      description="Select colors and sizes, then set quantities"
      size="xl"
      footer={footer}
    >
      <div className="space-y-5">
        {errors.form && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {errors.form}
          </div>
        )}

        {/* Info banner */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-accent/5 border border-accent/20 text-sm text-muted-foreground">
          <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <span>
            Entering a quantity for an existing color+size will{" "}
            <strong className="text-foreground">
              add to its current stock
            </strong>
            . New combinations will create new variants.
          </span>
        </div>

        {/* Colors + Sizes row */}
        <div className="grid grid-cols-2 gap-4">
          <TagInput
            label="Colors"
            placeholder="Add color…"
            tags={selectedColors}
            suggestions={dbColors}
            onAdd={handleAddColor}
            onRemove={handleRemoveColor}
            showColorSwatch
          />
          <TagInput
            label="Sizes"
            placeholder="Add size…"
            tags={selectedSizes}
            suggestions={dbSizes}
            onAdd={handleAddSize}
            onRemove={handleRemoveSize}
          />
        </div>

        {/* Quantity matrix */}
        {errors.matrix && (
          <p className="text-xs text-destructive -mt-2">{errors.matrix}</p>
        )}
        <VariantMatrix
          colors={selectedColors}
          sizes={selectedSizes}
          quantities={quantities}
          onQuantitiesChange={setQuantities}
        />

        {/* Price for new variants */}
        <div className="space-y-1.5 border-t border-border pt-4">
          <label className="text-sm font-medium text-foreground">
            Price for new variants (JD){" "}
            <span className="text-destructive">*</span>
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={newVariantPrice}
            onChange={(e) => setNewVariantPrice(e.target.value)}
            placeholder="0.00"
            className={`pos-input tabular-nums max-w-xs ${errors.price ? "border-destructive ring-1 ring-destructive/30" : ""}`}
            aria-label="Price for new variants"
          />
          {errors.price && (
            <p className="text-xs text-destructive">{errors.price}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Applies to new color/size combinations only. Existing variants keep
            their current price.
          </p>
        </div>
      </div>
    </Modal>
  );
}
