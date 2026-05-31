/**
 * Create Category Page
 * Main page for creating new categories or subcategories
 * Includes sticky header and footer with form content in between
 *
 * Three most important rules from skills:
 *
 * From ui-ux-pro-max:
 * 1. Sticky header/footer: main CTAs always visible without scrolling
 * 2. Progressive disclosure: form reveals complexity gradually (sizes only when needed)
 * 3. Empty states: friendly messaging when no data available
 *
 * From vercel-react-best-practices:
 * 1. Component composition: split form into focused sub-components
 * 2. Hook isolation: useCreateCategoryForm owns all logic, not component
 * 3. Memoization: prevent unnecessary child re-renders via useCallback
 *
 * From electron:
 * This component will be used in Electron POS app, so ensure responsive
 * design works on 1024x768+ displays and touch-friendly interactions
 */

import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { AppView } from "@/features/pos/types";
import { useCreateCategoryForm } from "@renderer/features/catalog/hooks/useCreateCategoryForm";
import {
  mockCategories,
  mockSizes,
} from "@renderer/features/catalog/__mocks__/categoryMocks";
import { CategoryInfoFields } from "@renderer/features/catalog/components/CategoryInfoFields";
import { StandardSizesToggle } from "@renderer/features/catalog/components/StandardSizesToggle";
import { UnsavedChangesBar } from "@renderer/features/catalog/components/UnsavedChangesBar";
import { SuccessToast } from "@renderer/features/catalog/components/SuccessToast";

interface CreateCategoryPageProps {
  /** Callback to navigate back to register view */
  onNavigate?: (view: AppView) => void;
  /** Optional parent category ID for subcategory creation */
  parentId?: string | null;
}

/**
 * Create Category Page
 * Can be used standalone with Router or integrated into view-state system
 * If parentId is provided, the form opens with that parent pre-selected and locked
 */
export const CreateCategoryPage: React.FC<CreateCategoryPageProps> = ({
  onNavigate,
  parentId: initialParentId = null,
}) => {
  const { t } = useTranslation();
  const isParentLocked = !!initialParentId;

  // Find the locked parent category if provided
  const lockedParent = initialParentId
    ? mockCategories.find((cat) => cat.id === initialParentId)
    : null;

  // Initialize form hook
  const form = useCreateCategoryForm({
    initialParentId: initialParentId || null,
    isParentLocked,
  });

  // Toast and unsaved changes state
  const [showUnsavedBar, setShowUnsavedBar] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null,
  );

  const handleCancel = useCallback(() => {
    if (form.isDirty) {
      setShowUnsavedBar(true);
    } else {
      onNavigate?.("register" as AppView); // Cast if "register" is a valid AppView
      // OR if using an enum/const:
      onNavigate?.("register"); // Use the actual enum value
    }
  }, [form.isDirty, onNavigate]);

  const handleLeaveUnsaved = useCallback(() => {
    setShowUnsavedBar(false);
    onNavigate?.((pendingNavigation as AppView) || ("register" as AppView));
  }, [onNavigate, pendingNavigation]);

  const handleSave = useCallback(async () => {
    await form.handleSubmit();
    if (Object.keys(form.errors).length === 0) {
      setShowSuccessToast(true);
      setTimeout(() => {
        onNavigate?.("register" as AppView); // Cast string to AppView
      }, 1500);
    }
  }, [form, onNavigate]);

  // Determine page title based on whether we're creating a subcategory
  const pageTitle =
    isParentLocked && lockedParent
      ? `${t("features.catalog.screens.createCategory.newSubcategoryUnder")} ${lockedParent.name}`
      : t("features.catalog.screens.createCategory.newCategory");

  return (
    <div className="min-h-screen bg-background overflow-scroll min-w-full">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-card shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-foreground">{pageTitle}</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-4xl px-4 py-8 pb-32 sm:px-6 lg:px-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-8"
        >
          {/* Category Information Section */}
          <section className="space-y-6 rounded-lg bg-card p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {t("features.catalog.screens.createCategory.categoryDetails")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(
                  "features.catalog.screens.createCategory.categoryDetailsDesc",
                )}
              </p>
            </div>

            <CategoryInfoFields
              name={form.name}
              onNameChange={form.handleNameChange}
              slug={form.slug}
              onSlugChange={form.handleSlugChange}
              parentId={form.parentId}
              onParentIdChange={form.handleParentIdChange}
              categories={mockCategories}
              isParentLocked={form.isParentLocked}
              nameError={form.errors.name}
              slugError={form.errors.slug}
              lockedParentName={lockedParent?.name}
            />
          </section>

          {/* Standard Sizes Section */}
          <section className="space-y-4 rounded-lg bg-card p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {t("features.catalog.screens.createCategory.sizeConfiguration")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(
                  "features.catalog.screens.createCategory.sizeConfigurationDesc",
                )}
              </p>
            </div>

            <StandardSizesToggle
              hasStandardSizes={form.hasStandardSizes}
              onToggle={form.handleToggleStandardSizes}
              sizes={mockSizes}
              selectedSizes={form.selectedSizes}
              onToggleSize={form.handleToggleSize}
              onSelectAll={form.handleSelectAllSizes}
              onClearAll={form.handleClearAllSizes}
              error={form.errors.selectedSizes}
            />
          </section>

          {/* Submit errors */}
          {form.errors.submit && (
            <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
              {form.errors.submit}
            </div>
          )}
        </form>
      </div>

      {/* Sticky Footer with Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card shadow-lg">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium
                transition-colors duration-150
                focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-card
                bg-muted text-muted-foreground border border-border
                hover:bg-muted/80
              `}
            >
              {t("features.catalog.screens.createCategory.cancel")}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={form.isSubmitting}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium
                transition-colors duration-150
                focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-card
                bg-accent text-accent-foreground
                hover:bg-accent/80
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-2
              `}
            >
              {form.isSubmitting && (
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              {t("features.catalog.screens.createCategory.saveCategory")}
            </button>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Bar */}
      <UnsavedChangesBar
        isVisible={showUnsavedBar}
        onLeave={handleLeaveUnsaved}
        onKeepEditing={() => setShowUnsavedBar(false)}
      />

      {/* Success Toast */}
      <SuccessToast
        message="Category saved successfully"
        isVisible={showSuccessToast}
        onDismiss={() => setShowSuccessToast(false)}
      />
    </div>
  );
};
