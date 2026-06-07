import { useState, useEffect, useCallback } from "react";
import type { Category } from "../types/Variants.types";
import CategoriesController from "../controllers/categoryCtrls";

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const reloadCategories = useCallback(async () => {
    const data = await CategoriesController.getAll();
    setCategories(data);
  }, []);

  useEffect(() => {
    reloadCategories();
  }, [reloadCategories]);

  const rootCategories = categories.filter((c) => c.parentId === null);
  const getSubcategories = (parentId: string) =>
    categories.filter((c) => c.parentId === parentId);

  const openCreateModal = (parentId?: string) => {
    setCreateParentId(parentId ?? null);
    setShowCreateModal(true);
  };

  const openEditModal = (category: Category) => {
    setEditCategory(category);
    setShowEditModal(true);
  };

  const closeDeleteModal = () => {
    if (!isDeleting) {
      setDeleteTarget(null);
      setDeleteError(null);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await CategoriesController.delete(deleteTarget.id);
      setDeleteTarget(null);
      reloadCategories();
    } catch {
      setDeleteError("deleteFailed");
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    categories,
    rootCategories,
    getSubcategories,
    showCreateModal,
    createParentId,
    openCreateModal,
    closeCreateModal: () => setShowCreateModal(false),
    showEditModal,
    editCategory,
    openEditModal,
    closeEditModal: () => {
      setShowEditModal(false);
      setEditCategory(null);
    },
    deleteTarget,
    isDeleting,
    deleteError,
    setDeleteTarget,
    closeDeleteModal,
    handleDeleteCategory,
    reloadCategories,
  };
};
