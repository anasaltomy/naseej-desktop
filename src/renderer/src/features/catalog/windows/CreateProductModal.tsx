import { useState, useCallback, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/custom/modal/Modal";
import {
  createProductSchema,
  CreateProductFormData,
} from "../types/Product.schima";
import type { SavedProductResult, Origin } from "../types/Product.types";

import type {
  Color,
  Size,
  VariantQuantity,
} from "@/features/catalog/types/Variants.types";
import { simulateAsync, generateSku, generateId } from "../utils";
import SearchableCombobox from "../components/SearchableCombobox";
import TagInput from "../components/TagInput";
import VariantMatrix from "../components/VariantMatrix";

interface CreateProductModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (product: SavedProductResult) => void;
}

export default function CreateProductModal({
  open,
  onClose,
  onSuccess,
}: CreateProductModalProps) {
  const { t } = useTranslation();

  // Form state
  const [name, setName] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [origin, setOrigin] = useState<Origin[]>([]);

  // Variant state
  const [selectedColors, setSelectedColors] = useState<Color[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<Size[]>([]);
  const [quantities, setQuantities] = useState<VariantQuantity[]>([]);

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Reference data loaded from DB
  const [dbColors, setDbColors] = useState<
    { id: string; name: string; hexCode: string }[]
  >([]);
  const [dbSizes, setDbSizes] = useState<{ id: string; name: string }[]>([]);
  const [dbBrands, setDbBrands] = useState<{ id: string; name: string }[]>([]);
  const [dbCategories, setDbCategories] = useState<
    { id: string; name: string }[]
  >([]);

  useEffect(() => {
    if (open) {
      window.api?.colors
        .getAll()
        .then((data) => {
          console.log("Colors data:", data);
          setDbColors(
            (data ?? []).map((c: any) => ({
              id: c.id,
              name: c.name,
              hexCode: c.hex_code,
            })),
          );
        })
        .catch((err) => console.error("Error loading colors:", err));

      window.api?.sizes
        .getAll()
        .then((data) => {
          console.log("Sizes data:", data);
          setDbSizes(data ?? []);
        })
        .catch((err) => console.error("Error loading sizes:", err));

      window.api?.brands
        .getAll()
        .then((data) => {
          console.log("Brands data:", data);
          setDbBrands(data ?? []);
        })
        .catch((err) => console.error("Error loading brands:", err));

      window.api?.categories
        .getAll()
        .then((data) => {
          console.log("Categories data:", data);
          setDbCategories(
            (data ?? []).map((c: any) => ({ id: c.id, name: c.name })),
          );
        })
        .catch((err) => console.error("Error loading categories:", err));
    }
  }, [open]);

  const formRef = useRef<HTMLFormElement>(null);

  const resetForm = useCallback(() => {
    setName("");
    setModelNumber("");
    setBasePrice("");
    setBrandId("");
    setCategoryId("");
    setDescription("");
    setOrigin([]);
    setSelectedColors([]);
    setSelectedSizes([]);
    setQuantities([]);
    setErrors({});
    setIsSaving(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

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

  const handleQuantitiesChange = useCallback(
    (newQuantities: VariantQuantity[]) => {
      setQuantities(newQuantities);
    },
    [],
  );

  const handleOriginToggle = useCallback((value: Origin) => {
    setOrigin((prev) =>
      prev.includes(value) ? prev.filter((o) => o !== value) : [...prev, value],
    );
  }, []);

  const handleSave = useCallback(async () => {
    console.log("=== handleSave called ===");
    setErrors({});

    // Validate API is available
    if (!window.api) {
      console.error("window.api is not defined");
      setErrors({
        form: "System error: window.api not available. Please restart the application.",
      });
      return;
    }

    if (!window.api.products) {
      console.error("window.api.products is not defined");
      setErrors({
        form: "System error: products API not available. Please restart the application.",
      });
      return;
    }

    if (!window.api.products.create) {
      console.error("window.api.products.create is not available");
      setErrors({
        form: "System error: API not available. Please restart the application.",
      });
      return;
    }

    const parsedPrice = parseFloat(basePrice);
    console.log("Parsed price:", parsedPrice);

    const formData: CreateProductFormData = {
      name: name.trim(),
      modelNumber: modelNumber.trim(),
      basePrice: isNaN(parsedPrice) ? 0 : parsedPrice,
      brandId: brandId.trim(),
      categoryId: categoryId.trim(),
      description: description.trim() || undefined,
      origin,
    };

    console.log("Form data:", formData);

    const result = createProductSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      console.warn("Validation failed:", fieldErrors);
      setErrors(fieldErrors);
      return;
    }

    console.log("Validation passed");

    const stockedVariants = quantities.filter(
      (q) => q.quantity !== null && q.quantity > 0,
    );
    console.log("Stocked variants:", stockedVariants);

    if (stockedVariants.length === 0) {
      setErrors({ matrix: "At least one variant must have a quantity" });
      return;
    }

    setIsSaving(true);

    const productId = generateId();
    const variants = stockedVariants.map((qv) => {
      const color = selectedColors.find((c) => c.id === qv.colorId);
      const size = selectedSizes.find((s) => s.id === qv.sizeId);
      return {
        id: generateId(),
        colorName: color?.name ?? "",
        colorHex: color?.hexCode ?? "",
        sizeName: size?.name ?? "",
        quantity: qv.quantity!,
        price: parsedPrice,
        sku: generateSku(modelNumber, color?.name ?? "", size?.name ?? ""),
        barcode: "",
      };
    });

    const saved: SavedProductResult = {
      id: productId,
      name: name.trim(),
      modelNumber: modelNumber.trim(),
      variants,
    };

    // Call the real API to create the product + variants + inventory atomically
    try {
      console.log("Creating product with data:", {
        name: name.trim(),
        modelNumber: modelNumber.trim(),
        brandId,
        categoryId,
        basePrice: parsedPrice,
        variantCount: stockedVariants.length,
      });

      const apiResult = await window.api.products.create({
        name: name.trim(),
        sku: generateSku(modelNumber, "", ""),
        brandId: brandId || undefined,
        categoryId: categoryId || undefined,
        description: description.trim() || undefined,
        basePrice: parsedPrice,
        variants: stockedVariants.map((qv) => ({
          colorId: qv.colorId,
          sizeId: qv.sizeId,
          quantity: qv.quantity!,
          barcode: undefined,
        })),
      });

      console.log("Product created successfully:", apiResult);
      setIsSaving(false);
      onSuccess?.(saved);
      handleClose();
    } catch (error) {
      console.error("Failed to create product:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setErrors({ form: `Failed to create product: ${errorMessage}` });
      setIsSaving(false);
    }
  }, [
    name,
    modelNumber,
    basePrice,
    brandId,
    categoryId,
    description,
    origin,
    quantities,
    selectedColors,
    selectedSizes,
    onSuccess,
    handleClose,
  ]);

  const footer = (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        {quantities.filter((q) => q.quantity !== null && q.quantity > 0).length}{" "}
        variant(s) will be created
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleClose}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition-colors"
        >
          {t("common.cancel")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={
            isSaving ||
            !name.trim() ||
            !modelNumber.trim() ||
            !brandId.trim() ||
            !categoryId.trim() ||
            parseFloat(basePrice) < 0.01
          }
          className="btn-primary flex items-center gap-2 px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSaving ? "Saving..." : "Save Product"}
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create Product"
      description="Add a new product with variants to the catalog"
      size="xl"
      footer={footer}
    >
      <form
        ref={formRef}
        onSubmit={(e) => e.preventDefault()}
        className="space-y-6"
      >
        {errors.form && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
            {errors.form}
          </div>
        )}
        {/* Product Info */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Product Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className="space-y-1.5"
              data-error={errors.name ? "" : undefined}
            >
              <label className="text-sm font-medium text-foreground">
                Product Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Classic T-Shirt"
                className={`pos-input ${errors.name ? "border-destructive ring-1 ring-destructive/30" : ""}`}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            <div
              className="space-y-1.5"
              data-error={errors.modelNumber ? "" : undefined}
            >
              <label className="text-sm font-medium text-foreground">
                Model Number <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={modelNumber}
                onChange={(e) => setModelNumber(e.target.value)}
                placeholder="e.g. CT-2024"
                className={`pos-input ${errors.modelNumber ? "border-destructive ring-1 ring-destructive/30" : ""}`}
              />
              {errors.modelNumber && (
                <p className="text-xs text-destructive">{errors.modelNumber}</p>
              )}
            </div>

            <div
              className="space-y-1.5"
              data-error={errors.basePrice ? "" : undefined}
            >
              <label className="text-sm font-medium text-foreground">
                Price (JD) <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="0.00"
                className={`pos-input tabular-nums ${errors.basePrice ? "border-destructive ring-1 ring-destructive/30" : ""}`}
              />
              {errors.basePrice && (
                <p className="text-xs text-destructive">{errors.basePrice}</p>
              )}
              {!errors.basePrice && (
                <p className="text-xs text-muted-foreground">
                  Must be greater than 0
                </p>
              )}
            </div>

            <SearchableCombobox
              label="Brand *"
              placeholder="Select brand"
              options={dbBrands}
              value={brandId}
              onChange={setBrandId}
              error={errors.brandId}
            />

            <SearchableCombobox
              label="Category *"
              placeholder="Select category"
              options={dbCategories}
              value={categoryId}
              onChange={setCategoryId}
              error={errors.categoryId}
              showHierarchy
            />

            <div
              className="space-y-1.5"
              data-error={errors.origin ? "" : undefined}
            >
              <label className="text-sm font-medium text-foreground">
                Origin <span className="text-destructive">*</span>
              </label>
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={origin.includes("website")}
                    onChange={() => handleOriginToggle("website")}
                    className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-foreground">Website</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={origin.includes("branch")}
                    onChange={() => handleOriginToggle("branch")}
                    className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-foreground">Branch</span>
                </label>
              </div>
              {errors.origin && (
                <p className="text-xs text-destructive">{errors.origin}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional product description..."
              rows={2}
              className="pos-input resize-none min-h-[60px]"
            />
          </div>
        </section>

        {/* Variant Matrix */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Variant Matrix
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TagInput
              label="Colors"
              placeholder="Search colors..."
              tags={selectedColors.map((c) => ({
                id: c.id,
                name: c.name,
                hexCode: c.hexCode,
              }))}
              suggestions={dbColors.map((c) => ({
                id: c.id,
                name: c.name,
                hexCode: c.hexCode,
              }))}
              onAdd={handleAddColor}
              onRemove={handleRemoveColor}
              showColorSwatch
            />
            <TagInput
              label="Sizes"
              placeholder="Search sizes..."
              tags={selectedSizes.map((s) => ({ id: s.id, name: s.name }))}
              suggestions={dbSizes.map((s) => ({ id: s.id, name: s.name }))}
              onAdd={handleAddSize}
              onRemove={handleRemoveSize}
            />
          </div>
          <VariantMatrix
            colors={selectedColors}
            sizes={selectedSizes}
            quantities={quantities}
            onQuantitiesChange={handleQuantitiesChange}
          />
          {errors.matrix && (
            <p className="text-sm text-destructive">{errors.matrix}</p>
          )}
        </section>
      </form>
    </Modal>
  );
}
