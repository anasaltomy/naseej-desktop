import { Plus, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import React from "react";

import { Modal } from "@/components/ui/custom/modal/Modal";

import CreateCategoryModal from "../windows/CreateCategoryModal";
import EditCategoryModal from "../windows/EditCategoryModal";

import type { Category } from "../types/Variants.types";
import { useCategories } from "../hooks/useCategories";

const CategoriesListScreen: React.FC = () => {
  const { t } = useTranslation();
  const {
    rootCategories,
    getSubcategories,
    showCreateModal,
    createParentId,
    openCreateModal,
    closeCreateModal,
    showEditModal,
    editCategory,
    openEditModal,
    closeEditModal,
    deleteTarget,
    isDeleting,
    deleteError,
    setDeleteTarget,
    closeDeleteModal,
    handleDeleteCategory,
    reloadCategories,
  } = useCategories();

  const renderCategoryRow = (category: Category, isSubcategory = false) => {
    const subcategories = getSubcategories(category.id);
    const hasChildren = subcategories.length > 0;

    return (
      <div key={category.id}>
        <div
          className={`
            flex items-center justify-between gap-4 py-3 px-4
            border-b border-border hover:bg-muted
            transition-colors duration-150
            ${isSubcategory ? "ml-8 bg-card" : "bg-input"}
          `}
        >
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">
                {category.name}
              </span>
              {category.hasStandardSizes && (
                <span className="inline-block rounded-full bg-accent/20 px-2 py-1 text-xs font-medium text-accent">
                  {t("features.catalog.screens.categoriesList.sizes")}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground font-mono">
              /{category.slug}
            </p>
          </div>

          <div className="flex gap-2">
            {!isSubcategory && (
              <button
                type="button"
                onClick={() => openCreateModal(category.id)}
                className="px-2 py-1 text-xs rounded transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background bg-muted text-foreground hover:bg-muted/80"
              >
                {t("features.catalog.screens.categoriesList.addSubcategory")}
              </button>
            )}
            <button
              type="button"
              onClick={() => openEditModal(category)}
              className="px-2 py-1 text-xs rounded transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background bg-accent text-accent-foreground hover:bg-accent/90 flex items-center gap-1"
            >
              <Pencil className="w-3 h-3" />
              {t("features.catalog.screens.categoriesList.edit")}
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(category)}
              className="px-2 py-1 text-xs rounded transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={hasChildren}
              title={
                hasChildren
                  ? t(
                      "features.catalog.screens.categoriesList.deleteDisabledTooltip",
                    )
                  : t("features.catalog.screens.categoriesList.delete")
              }
            >
              <Trash2 className="w-3 h-3" />
              {t("features.catalog.screens.categoriesList.delete")}
            </button>
          </div>
        </div>

        {subcategories.length > 0 && (
          <div>
            {subcategories.map((subcat) => renderCategoryRow(subcat, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col flex-1 overflow-hidden bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card shadow-sm shrink-0">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-foreground">
                {t("features.catalog.screens.categoriesList.title")}
              </h1>
              <button
                type="button"
                onClick={() => openCreateModal()}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background bg-accent text-accent-foreground hover:bg-accent/90 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t("features.catalog.screens.categoriesList.addCategory")}
              </button>
            </div>
          </div>
        </div>

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 w-full">
          {rootCategories.length === 0 ? (
            <div className="rounded-lg bg-card p-8 text-center">
              <p className="text-muted-foreground">
                {t("features.catalog.screens.categoriesList.noCategories")}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card">
              {rootCategories.map((category) => renderCategoryRow(category))}
            </div>
          )}
        </div>
      </div>

      <CreateCategoryModal
        open={showCreateModal}
        onClose={closeCreateModal}
        onSuccess={() => {
          closeCreateModal();
          reloadCategories();
        }}
        parentId={createParentId}
      />

      <EditCategoryModal
        open={showEditModal}
        onClose={closeEditModal}
        onSuccess={() => {
          closeEditModal();
          reloadCategories();
        }}
        category={
          editCategory
            ? {
                id: editCategory.id,
                name: editCategory.name,
                slug: editCategory.slug,
                parentId: editCategory.parentId,
                hasStandardSizes: editCategory.hasStandardSizes,
                selectedSizes: [],
              }
            : null
        }
      />

      <Modal
        open={!!deleteTarget}
        onClose={closeDeleteModal}
        title={t("features.catalog.screens.categoriesList.delete")}
        description={
          deleteTarget
            ? t("features.catalog.screens.categoriesList.deleteConfirm", {
                name: deleteTarget.name,
              })
            : ""
        }
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeDeleteModal}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition-colors"
              disabled={isDeleting}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={handleDeleteCategory}
              disabled={isDeleting}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {isDeleting && (
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
              {t("features.catalog.screens.categoriesList.delete")}
            </button>
          </div>
        }
      >
        {deleteError && (
          <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive mb-2">
            {t(`features.catalog.screens.categoriesList.${deleteError}`)}
          </div>
        )}
        <div className="text-sm text-muted-foreground">
          {t("features.catalog.screens.categoriesList.deleteWarning")}
        </div>
      </Modal>
    </>
  );
};

export default CategoriesListScreen;
