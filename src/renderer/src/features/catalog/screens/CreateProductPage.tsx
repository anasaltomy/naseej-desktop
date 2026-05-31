import { useState, useCallback, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { createProductSchema } from "../types/product";
import type {
  CreateProductFormData,
  SelectedColor,
  SelectedSize,
  VariantQuantity,
  SavedProductResult,
  Origin,
} from "../types/product";
import { generateSku, generateId } from "../utils";
import SearchableCombobox from "../components/SearchableCombobox";
import TagInput from "../components/TagInput";
import VariantMatrix from "../components/VariantMatrix";
import PostSaveModal from "../components/PostSaveModal";

interface CreateProductPageProps {
  onNavigateToBarcodes: (product?: SavedProductResult) => void;
  onPrintNow: (product: SavedProductResult) => void;
  onExit: () => void;
}

export default function CreateProductPage({
  onNavigateToBarcodes,
  onPrintNow,
  onExit,
}: CreateProductPageProps) {
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
  const [selectedColors, setSelectedColors] = useState<SelectedColor[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<SelectedSize[]>([]);
  const [quantities, setQuantities] = useState<VariantQuantity[]>([]);

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedProduct, setSavedProduct] = useState<SavedProductResult | null>(
    null,
  );
  const [showModal, setShowModal] = useState(false);

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
    window.api?.colors
      .getAll()
      .then((data) =>
        setDbColors(
          (data ?? []).map((c) => ({ id: c.id, name: c.name, hexCode: c.hex })),
        ),
      );
    window.api?.sizes.getAll().then((data) => setDbSizes(data ?? []));
    window.api?.brands.getAll().then((data) => setDbBrands(data ?? []));
    window.api?.categories
      .getAll()
      .then((data) =>
        setDbCategories((data ?? []).map((c) => ({ id: c.id, name: c.name }))),
      );
  }, []);

  const formRef = useRef<HTMLFormElement>(null);

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

  const scrollToFirstError = useCallback(() => {
    const firstErrorField = formRef.current?.querySelector("[data-error]");
    if (firstErrorField) {
      firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const handleSave = useCallback(async () => {
    setErrors({});

    const parsedPrice = parseFloat(basePrice);
    const formData: CreateProductFormData = {
      name: name.trim(),
      modelNumber: modelNumber.trim(),
      basePrice: isNaN(parsedPrice) ? 0 : parsedPrice,
      brandId,
      categoryId,
      description: description.trim() || undefined,
      origin,
    };

    const result = createProductSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      setTimeout(scrollToFirstError, 100);
      return;
    }

    // Check at least one variant has a quantity
    const stockedVariants = quantities.filter(
      (q) => q.quantity !== null && q.quantity > 0,
    );
    if (stockedVariants.length === 0) {
      setErrors({ matrix: "At least one variant must have a quantity" });
      return;
    }

    setIsSaving(true);

    // Build variant previews for the post-save modal (from current form state)
    const variantPreviews = stockedVariants.map((qv) => {
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

    // Persist to SQLite via IPC
    const dbResult = await window.api?.products.create({
      name: name.trim(),
      sku: modelNumber.trim(),
      brandId: brandId || undefined,
      categoryId: categoryId || undefined,
      description: description.trim() || undefined,
      basePrice: parsedPrice,
      variants: stockedVariants.map((qv) => ({
        colorId: qv.colorId,
        sizeId: qv.sizeId,
        quantity: qv.quantity!,
      })),
    });

    const saved: SavedProductResult = {
      id: dbResult?.id ?? generateId(),
      name: name.trim(),
      modelNumber: modelNumber.trim(),
      variants: variantPreviews,
    };

    setIsSaving(false);
    setSavedProduct(saved);
    setShowModal(true);
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
    scrollToFirstError,
  ]);

  const handleModalPrintNow = useCallback(() => {
    setShowModal(false);
    if (savedProduct) {
      onPrintNow(savedProduct);
    }
  }, [savedProduct, onPrintNow]);

  const handleModalGoToBarcodes = useCallback(() => {
    setShowModal(false);
    if (savedProduct) {
      onNavigateToBarcodes(savedProduct);
    }
  }, [savedProduct, onNavigateToBarcodes]);

  const handleModalExit = useCallback(() => {
    setShowModal(false);
    onExit();
  }, [onExit]);

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form
            ref={formRef}
            onSubmit={(e) => e.preventDefault()}
            className="max-w-4xl mx-auto space-y-8"
          >
            {/* Page header */}
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">
                {t("features.catalog.screens.createProduct.title")}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t("features.catalog.screens.createProduct.subtitle")}
              </p>
            </div>

            {/* Section 1: Product Info */}
            <section className="space-y-5 pos-card p-5">
              <h2 className="text-base font-semibold text-foreground">
                {t("features.catalog.screens.createProduct.productInfo")}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Name */}
                <div
                  className="space-y-1.5"
                  data-error={errors.name ? "" : undefined}
                >
                  <label className="text-sm font-medium text-foreground">
                    {t("features.catalog.screens.createProduct.productName")}{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t(
                      "features.catalog.screens.createProduct.productNamePlaceholder",
                    )}
                    className={`pos-input ${errors.name ? "border-destructive ring-1 ring-destructive/30" : ""}`}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name}</p>
                  )}
                </div>

                {/* Model Number */}
                <div
                  className="space-y-1.5"
                  data-error={errors.modelNumber ? "" : undefined}
                >
                  <label className="text-sm font-medium text-foreground">
                    {t("features.catalog.screens.createProduct.modelNumber")}{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={modelNumber}
                    onChange={(e) => setModelNumber(e.target.value)}
                    placeholder={t(
                      "features.catalog.screens.createProduct.modelNumberPlaceholder",
                    )}
                    className={`pos-input ${errors.modelNumber ? "border-destructive ring-1 ring-destructive/30" : ""}`}
                  />
                  {errors.modelNumber && (
                    <p className="text-xs text-destructive">
                      {errors.modelNumber}
                    </p>
                  )}
                </div>

                {/* Base Price */}
                <div
                  className="space-y-1.5"
                  data-error={errors.basePrice ? "" : undefined}
                >
                  <label className="text-sm font-medium text-foreground">
                    {t("features.catalog.screens.createProduct.priceSAR")}{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder={t(
                      "features.catalog.screens.createProduct.pricePlaceholder",
                    )}
                    className={`pos-input tabular-nums ${errors.basePrice ? "border-destructive ring-1 ring-destructive/30" : ""}`}
                  />
                  {errors.basePrice && (
                    <p className="text-xs text-destructive">
                      {errors.basePrice}
                    </p>
                  )}
                </div>

                {/* Brand */}
                <SearchableCombobox
                  label={t("features.catalog.screens.createProduct.brand")}
                  placeholder={t(
                    "features.catalog.screens.createProduct.selectBrand",
                  )}
                  options={dbBrands}
                  value={brandId}
                  onChange={setBrandId}
                  error={errors.brandId}
                />

                {/* Category */}
                <SearchableCombobox
                  label={t("features.catalog.screens.createProduct.category")}
                  placeholder={t(
                    "features.catalog.screens.createProduct.selectCategory",
                  )}
                  options={dbCategories}
                  value={categoryId}
                  onChange={setCategoryId}
                  error={errors.categoryId}
                  showHierarchy
                />

                {/* Origin */}
                <div
                  className="space-y-1.5"
                  data-error={errors.origin ? "" : undefined}
                >
                  <label className="text-sm font-medium text-foreground">
                    {t("features.catalog.screens.createProduct.origin")}{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={origin.includes("website")}
                        onChange={() => handleOriginToggle("website")}
                        className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                      />
                      <span className="text-sm text-foreground">
                        {t("features.catalog.screens.createProduct.website")}
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={origin.includes("branch")}
                        onChange={() => handleOriginToggle("branch")}
                        className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                      />
                      <span className="text-sm text-foreground">
                        {t("features.catalog.screens.createProduct.branch")}
                      </span>
                    </label>
                  </div>
                  {errors.origin && (
                    <p className="text-xs text-destructive">{errors.origin}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  {t("features.catalog.screens.createProduct.description")}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    // Auto-resize
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                  }}
                  placeholder={t(
                    "features.catalog.screens.createProduct.descriptionPlaceholder",
                  )}
                  rows={2}
                  className="pos-input resize-none overflow-hidden min-h-[60px]"
                />
              </div>
            </section>

            {/* Section 2: Variant Matrix */}
            <section className="space-y-5 pos-card p-5">
              <h2 className="text-base font-semibold text-foreground">
                {t("features.catalog.screens.createProduct.variantMatrix")}
              </h2>
              <p className="text-sm text-muted-foreground -mt-3">
                {t("features.catalog.screens.createProduct.variantMatrixDesc")}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TagInput
                  label={t("features.catalog.screens.createProduct.colors")}
                  placeholder={t(
                    "features.catalog.screens.createProduct.colorsPlaceholder",
                  )}
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
                  label={t("features.catalog.screens.createProduct.sizes")}
                  placeholder={t(
                    "features.catalog.screens.createProduct.sizesPlaceholder",
                  )}
                  tags={selectedSizes.map((s) => ({
                    id: s.id,
                    name: s.name,
                  }))}
                  suggestions={dbSizes.map((s) => ({
                    id: s.id,
                    name: s.name,
                  }))}
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
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 border-t border-border bg-card px-6 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {
                quantities.filter((q) => q.quantity !== null && q.quantity > 0)
                  .length
              }{" "}
              {t("features.catalog.screens.createProduct.variant")}
              {quantities.filter((q) => q.quantity !== null && q.quantity > 0)
                .length !== 1
                ? t("features.catalog.screens.createProduct.variants").slice(
                    t("features.catalog.screens.createProduct.variant").length,
                  )
                : ""}{" "}
              {t("features.catalog.screens.createProduct.willBeCreated")}
            </p>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary flex items-center gap-2 px-6 py-2.5"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSaving
                ? t("features.catalog.screens.createProduct.saving")
                : t("features.catalog.screens.createProduct.saveProduct")}
            </button>
          </div>
        </div>
      </div>

      {/* Post-Save Modal */}
      <PostSaveModal
        isOpen={showModal}
        product={savedProduct}
        onPrintNow={handleModalPrintNow}
        onGoToBarcodeScreen={handleModalGoToBarcodes}
        onExit={handleModalExit}
      />
    </>
  );
}
