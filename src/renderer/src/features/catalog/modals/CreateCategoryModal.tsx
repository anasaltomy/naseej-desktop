import React, { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/custom/modal/Modal";
import { useCreateCategoryForm } from "../hooks/useCreateCategoryForm";
import { CategoryInfoFields } from "../components/CategoryInfoFields";
import { StandardSizesToggle } from "../components/StandardSizesToggle";
import type { Category, Size } from "../types/category.types";

interface CreateCategoryModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void; 
  parentId?: string | null;
}

export default function CreateCategoryModal({
  open,
  onClose,
  onSuccess,
  parentId: initialParentId = null,
}: CreateCategoryModalProps) {
  const { t } = useTranslation();
  const isParentLocked = !!initialParentId;

  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [dbSizes, setDbSizes] = useState<Size[]>([]);

  useEffect(() => {
    if (open) {
      window.api?.categories.getAll().then((data) => {
        setDbCategories(
          (data ?? []).map((c) => ({
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
  }, [open]);

  const lockedParent = initialParentId
    ? dbCategories.find((cat) => cat.id === initialParentId)
    : null;

  const form = useCreateCategoryForm({
    initialParentId: initialParentId || null,
    isParentLocked,
  });

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSave = useCallback(async () => {
    await form.handleSubmit();
    if (Object.keys(form.errors).length === 0) {
      onSuccess?.();
      handleClose();
    }
  }, [form, onSuccess, handleClose]);

  const title = isParentLocked && lockedParent
    ? `New Subcategory under ${lockedParent.name}`
    : "Create Category";

  const footer = (
    <div className="flex justify-end gap-3">
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
        disabled={form.isSubmitting}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
      >
        {form.isSubmitting && (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        Save Category
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      description="Define category details and size configuration"
      size="lg"
      footer={footer}
    >
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {/* Category Information */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Category Details
          </h3>
          <CategoryInfoFields
            name={form.name}
            onNameChange={form.handleNameChange}
            slug={form.slug}
            onSlugChange={form.handleSlugChange}
            parentId={form.parentId}
            onParentIdChange={form.handleParentIdChange}
            categories={dbCategories}
            isParentLocked={form.isParentLocked}
            nameError={form.errors.name}
            slugError={form.errors.slug}
            lockedParentName={lockedParent?.name}
          />
        </section>

        {/* Standard Sizes */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Size Configuration
          </h3>
          <StandardSizesToggle
            hasStandardSizes={form.hasStandardSizes}
            onToggle={form.handleToggleStandardSizes}
            sizes={dbSizes}
            selectedSizes={form.selectedSizes}
            onToggleSize={form.handleToggleSize}
            onSelectAll={form.handleSelectAllSizes}
            onClearAll={form.handleClearAllSizes}
            error={form.errors.selectedSizes}
          />
        </section>

        {form.errors.submit && (
          <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
            {form.errors.submit}
          </div>
        )}
      </form>
    </Modal>
  );
}
