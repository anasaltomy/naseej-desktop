import { useState, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/custom/modal/Modal";
import { CategoryInfoFields } from "../components/CategoryInfoFields";
import { StandardSizesToggle } from "../components/StandardSizesToggle";
import type { Category, Size } from "../types/Variants.types";

interface EditCategoryModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  category?: {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    hasStandardSizes: boolean;
    selectedSizes: string[];
  } | null;
}

export default function EditCategoryModal({
  open,
  onClose,
  onSuccess,
  category,
}: EditCategoryModalProps) {
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [parentId, setParentId] = useState(category?.parentId ?? null);
  const [hasStandardSizes, setHasStandardSizes] = useState(
    category?.hasStandardSizes ?? false,
  );
  const [selectedSizes, setSelectedSizes] = useState<string[]>(
    category?.selectedSizes ?? [],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [dbSizes, setDbSizes] = useState<Size[]>([]);

  // Reinitialize fields and load reference data when the modal opens
  useEffect(() => {
    if (open) {
      setName(category?.name ?? "");
      setSlug(category?.slug ?? "");
      setParentId(category?.parentId ?? null);
      setHasStandardSizes(category?.hasStandardSizes ?? false);
      setSelectedSizes(category?.selectedSizes ?? []);
      setErrors({});

      window.api?.categories.getAll().then((data) => {
        setDbCategories(
          (data ?? [])
            .filter((c) => c.id !== category?.id)
            .map((c) => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              parentId: c.parentId,
              hasStandardSizes: c.hasStandardSizes,
              standardSizes: c.standardSizes,
              createdAt: c.createdAt,
            })),
        );
      });
      window.api?.sizes.getAll().then((data) => {
        setDbSizes((data ?? []).map((s) => ({ id: s.id, name: s.name })));
      });
    }
  }, [open, category]);

  const handleClose = useCallback(() => {
    setErrors({});
    onClose();
  }, [onClose]);

  const handleSave = useCallback(async () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Category name is required";
    if (!slug.trim()) newErrors.slug = "Slug is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!category?.id) return;
    setIsSaving(true);
    try {
      await window.api?.categories.update({
        id: category.id,
        name: name.trim(),
        slug: slug.trim(),
        parentId,
        hasStandardSizes,
        sizeIds: selectedSizes,
      });
      onSuccess?.();
      handleClose();
    } catch {
      setErrors({ form: "Failed to update category. Please try again." });
    } finally {
      setIsSaving(false);
    }
  }, [
    name,
    slug,
    parentId,
    hasStandardSizes,
    selectedSizes,
    category,
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
        {isSaving ? "Saving..." : "Update Category"}
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Edit Category"
      description="Modify category details and size configuration"
      size="lg"
      footer={footer}
    >
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {errors.form && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {errors.form}
          </div>
        )}
        <section className="space-y-4">
          <CategoryInfoFields
            name={name}
            onNameChange={setName}
            slug={slug}
            onSlugChange={setSlug}
            parentId={parentId}
            onParentIdChange={setParentId}
            categories={dbCategories}
            isParentLocked={false}
            nameError={errors.name}
            slugError={errors.slug}
          />
        </section>

        <section className="space-y-4">
          <StandardSizesToggle
            hasStandardSizes={hasStandardSizes}
            onToggle={() => setHasStandardSizes((v) => !v)}
            sizes={dbSizes}
            selectedSizes={new Set(selectedSizes)}
            onToggleSize={(sizeId) =>
              setSelectedSizes((prev) =>
                prev.includes(sizeId)
                  ? prev.filter((s) => s !== sizeId)
                  : [...prev, sizeId],
              )
            }
            onSelectAll={() => setSelectedSizes(dbSizes.map((s) => s.id))}
            onClearAll={() => setSelectedSizes([])}
            error={errors.selectedSizes}
          />
        </section>
      </form>
    </Modal>
  );
}
