import { useState, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/custom/modal/Modal";
import SearchableCombobox from "../components/SearchableCombobox";
import ProductVariantTable from "../components/ProductVariantTable";

interface EditProductModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  product?: {
    id: string;
    name: string;
    modelNumber: string;
    basePrice: number;
    brandId: string;
    categoryId: string;
    description: string;
  } | null;
}

export default function EditProductModal({
  open,
  onClose,
  onSuccess,
  product,
}: EditProductModalProps) {
  const [name, setName] = useState(product?.name ?? "");
  const [modelNumber, setModelNumber] = useState(product?.modelNumber ?? "");
  const [basePrice, setBasePrice] = useState(String(product?.basePrice ?? ""));
  const [brandId, setBrandId] = useState(product?.brandId ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"info" | "variants">("info");
  const [updateAllVariantPrices, setUpdateAllVariantPrices] = useState(true);
  const [dbBrands, setDbBrands] = useState<{ id: string; name: string }[]>([]);
  const [dbCategories, setDbCategories] = useState<{ id: string; name: string }[]>([]);

  // Reinitialize and load reference data when modal opens
  useEffect(() => {
    if (open) {
      setName(product?.name ?? "");
      setModelNumber(product?.modelNumber ?? "");
      setBasePrice(String(product?.basePrice ?? ""));
      setBrandId(product?.brandId ?? "");
      setCategoryId(product?.categoryId ?? "");
      setDescription(product?.description ?? "");
      setErrors({});
      setActiveTab("info");
      setUpdateAllVariantPrices(true);

      window.api?.brands.getAll().then((data) => {
        setDbBrands((data ?? []).map((b) => ({ id: b.id, name: b.name })));
      });
      window.api?.categories.getAll().then((data) => {
        setDbCategories((data ?? []).map((c) => ({ id: c.id, name: c.name })));
      });
    }
  }, [open, product]);

  const handleClose = useCallback(() => {
    setErrors({});
    onClose();
  }, [onClose]);

  const handleSave = useCallback(async () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Product name is required";
    if (!modelNumber.trim()) newErrors.modelNumber = "Model number is required";
    if (!basePrice || parseFloat(basePrice) <= 0) newErrors.basePrice = "Valid price is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!product?.id) return;
    setIsSaving(true);
    try {
      await window.api?.products.update({
        id: product.id,
        name: name.trim(),
        sku: modelNumber.trim(),
        brandId: brandId || undefined,
        categoryId: categoryId || undefined,
        description: description.trim() || undefined,
      });
      if (updateAllVariantPrices) {
        const allVariants = await window.api?.variants.getAll();
        const productVariants = (allVariants ?? []).filter((v) => v.productId === product.id);
        await Promise.all(
          productVariants.map((v) =>
            window.api?.variants.update({ id: v.id, price: parseFloat(basePrice) }),
          ),
        );
      }
      onSuccess?.();
      handleClose();
    } catch {
      setErrors({ form: "Failed to update product. Please try again." });
    } finally {
      setIsSaving(false);
    }
  }, [name, modelNumber, basePrice, brandId, categoryId, description, product, onSuccess, handleClose]);

  const footer = (
    <div className="flex justify-end gap-3">
      <button
        type="button"
        onClick={handleClose}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition-colors"
      >
        {activeTab === "variants" ? "Close" : "Cancel"}
      </button>
      {activeTab === "info" && (
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary flex items-center gap-2 px-6 py-2"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSaving ? "Saving..." : "Update Product"}
        </button>
      )}
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Edit Product"
      description="Modify product details or manage variants"
      size="xl"
      footer={footer}
    >
      {/* Tab bar */}
      <div className="flex gap-0 border-b border-border mb-5 -mt-1">
        {(["info", "variants"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors focus:outline-none ${
              activeTab === tab
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            aria-selected={activeTab === tab}
            role="tab"
          >
            {tab === "info" ? "Product Info" : "Variants"}
          </button>
        ))}
      </div>

      {/* Tab: Product Info */}
      {activeTab === "info" && (
        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          {errors.form && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {errors.form}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Product Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`pos-input ${errors.name ? "border-destructive ring-1 ring-destructive/30" : ""}`}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Model Number <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={modelNumber}
                onChange={(e) => setModelNumber(e.target.value)}
                className={`pos-input ${errors.modelNumber ? "border-destructive ring-1 ring-destructive/30" : ""}`}
              />
              {errors.modelNumber && (
                <p className="text-xs text-destructive">{errors.modelNumber}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Price (JD) <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className={`pos-input tabular-nums ${errors.basePrice ? "border-destructive ring-1 ring-destructive/30" : ""}`}
              />
              {errors.basePrice && (
                <p className="text-xs text-destructive">{errors.basePrice}</p>
              )}
            </div>

            <SearchableCombobox
              label="Brand"
              placeholder="Select brand"
              options={dbBrands}
              value={brandId}
              onChange={setBrandId}
            />

            <SearchableCombobox
              label="Category"
              placeholder="Select category"
              options={dbCategories}
              value={categoryId}
              onChange={setCategoryId}
              showHierarchy
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="pos-input resize-none min-h-[60px]"
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={updateAllVariantPrices}
              onChange={(e) => setUpdateAllVariantPrices(e.target.checked)}
              className="w-4 h-4 rounded accent-accent"
              aria-label="Also update price for all existing variants"
            />
            <span className="text-sm text-foreground">
              Also update price for all existing variants
            </span>
          </label>
        </form>
      )}

      {/* Tab: Variants */}
      {activeTab === "variants" && product?.id && (
        <ProductVariantTable productId={product.id} />
      )}
    </Modal>
  );
}
