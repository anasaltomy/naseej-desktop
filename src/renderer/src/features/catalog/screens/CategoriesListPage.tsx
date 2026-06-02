/**
 * Categories List Page
 * Displays all categories in a structured list with modal-based CRUD
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/custom/modal/Modal";
import type { Category } from "../types/category.types";
import CreateCategoryModal from "../modals/CreateCategoryModal";
import EditCategoryModal from "../modals/EditCategoryModal";

interface CategoriesListPageProps {
  onNavigate?: (view: string, parentId?: string) => void;
}

export const CategoriesListPage: React.FC<CategoriesListPageProps> = ({
  onNavigate,
}: CategoriesListPageProps) => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const reloadCategories = () => {
    window.api?.categories.getAll().then((data) => {
      const cats: Category[] = (data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        parentId: c.parentId,
        hasStandardSizes: c.hasStandardSizes,
        standardSizes: c.standardSizes,
        createdAt: c.createdAt,
      }));
      setCategories(cats);
    });
  };

  useEffect(() => {
    reloadCategories();
  }, []);

  const rootCategories = categories.filter((cat) => cat.parentId === null);

  const getSubcategories = (parentId: string) => {
    return categories.filter((cat) => cat.parentId === parentId);
  };

  const handleCreateCategory = (parentId?: string) => {
    setCreateParentId(parentId ?? null);
    setShowCreateModal(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditCategory(category);
    setShowEditModal(true);
  };

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
                onClick={() => handleCreateCategory(category.id)}
                className="px-2 py-1 text-xs rounded transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background bg-muted text-foreground hover:bg-muted/80"
              >
                {t("features.catalog.screens.categoriesList.addSubcategory")}
              </button>
            )}
            <button
              type="button"
              onClick={() => handleEditCategory(category)}
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
              aria-label={hasChildren ? t("features.catalog.screens.categoriesList.deleteDisabled") : t("features.catalog.screens.categoriesList.delete")}
              title={hasChildren ? t("features.catalog.screens.categoriesList.deleteDisabledTooltip") : t("features.catalog.screens.categoriesList.delete")}
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
  // Delete handler
  const handleDeleteCategory = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await window.api?.categories.delete(deleteTarget.id);
      setDeleteTarget(null);
      reloadCategories();
    } catch (err: any) {
      setDeleteError(t("features.catalog.screens.categoriesList.deleteFailed") || "Failed to delete category");
    } finally {
      setIsDeleting(false);
    }
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
                onClick={() => handleCreateCategory()}
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
          {categories.length === 0 ? (
            <div className="rounded-lg bg-card p-8 text-center">
              <p className="text-muted-foreground">
                {t("features.catalog.screens.categoriesList.noCategories")}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card">
              {rootCategories.map((category) =>
                renderCategoryRow(category, false),
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Category Modal */}
      <CreateCategoryModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          reloadCategories();
        }}
        parentId={createParentId}
      />

      {/* Edit Category Modal */}
      <EditCategoryModal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditCategory(null);
        }}
        onSuccess={() => {
          setShowEditModal(false);
          setEditCategory(null);
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

      {/* Delete Category Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => { if (!isDeleting) { setDeleteTarget(null); setDeleteError(null); } }}
        title={t("features.catalog.screens.categoriesList.delete")}
        description={deleteTarget ? t("features.catalog.screens.categoriesList.deleteConfirm", { name: deleteTarget.name }) : ""}
        size="sm"
        footer={(
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
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
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {t("features.catalog.screens.categoriesList.delete")}
            </button>
          </div>
        )}
      >
        {deleteError && (
          <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive mb-2">
            {deleteError}
          </div>
        )}
        <div className="text-sm text-muted-foreground">
          {t("features.catalog.screens.categoriesList.deleteWarning")}
        </div>
      </Modal>
    </>
  );
};
