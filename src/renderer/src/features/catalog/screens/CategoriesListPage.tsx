/**
 * Categories List Page
 * Displays all categories in a structured list with modal-based CRUD
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil } from "lucide-react";
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
    </>
  );
};
