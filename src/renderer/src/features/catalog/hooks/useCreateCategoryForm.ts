/**
 * Hook managing all Create Category form logic
 * Owns field values, change handlers, validation, submission, and navigation
 * All form state and business logic is isolated here - components only call handlers and render
 *
 * Top 3 rules from vercel-react-best-practices:
 * 1. Zero waterfalls: all validations run in parallel, no sequential awaits
 * 2. Derived state: slug is derived during render, not via effect
 * 3. Memoized callbacks: all handlers use useCallback to prevent re-renders in child components
 */

import { useState, useCallback, useMemo, useRef } from "react";
import { createCategorySchema, deriveSlug } from "../types/createCategory.schema";
import type { CreateCategoryFormState } from "../types/category.types";

interface UseCreateCategoryFormOptions {
  /** Parent category ID for "Add Subcategory" entry point */
  initialParentId?: string | null;
  /** Whether the parent selector should be locked/disabled */
  isParentLocked?: boolean;
}

export function useCreateCategoryForm(
  options: UseCreateCategoryFormOptions = {},
) {
  const { initialParentId = null, isParentLocked = false } = options;

  // Track initial state for dirty check
  const initialState = useRef<CreateCategoryFormState>({
    name: "",
    slug: "",
    parentId: initialParentId,
    hasStandardSizes: false,
    selectedSizes: new Set(),
  });

  // Current form values
  const [name, setName] = useState("");
  const [manualSlug, setManualSlug] = useState("");
  const [parentId, setParentId] = useState<string | null>(initialParentId);
  const [hasStandardSizes, setHasStandardSizes] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(new Set());

  // Validation and submission state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived slug - if user manually set slug, use that; otherwise derive from name
  const slug = useMemo(
    () => manualSlug || deriveSlug(name),
    [name, manualSlug],
  );

  // Check if form has been modified from initial state
  const isDirty = useMemo(
    () =>
      name !== initialState.current.name ||
      manualSlug !== initialState.current.slug ||
      parentId !== initialState.current.parentId ||
      hasStandardSizes !== initialState.current.hasStandardSizes ||
      selectedSizes.size !== initialState.current.selectedSizes.size,
    [name, manualSlug, parentId, hasStandardSizes, selectedSizes],
  );

  // Field change handlers - memoized to prevent child re-renders
  const handleNameChange = useCallback((newName: string) => {
    setName(newName);
    // Clear slug error when user types name
    setErrors((prev) => {
      const next = { ...prev };
      delete next.slug;
      return next;
    });
  }, []);

  const handleSlugChange = useCallback((newSlug: string) => {
    setManualSlug(newSlug);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.slug;
      return next;
    });
  }, []);

  const handleParentIdChange = useCallback(
    (newParentId: string | null) => {
      if (!isParentLocked) {
        setParentId(newParentId);
        setErrors((prev) => {
          const next = { ...prev };
          delete next.parentId;
          return next;
        });
      }
    },
    [isParentLocked],
  );

  const handleToggleStandardSizes = useCallback(() => {
    setHasStandardSizes((prev) => !prev);
    // Clear sizes error when toggling
    setErrors((prev) => {
      const next = { ...prev };
      delete next.selectedSizes;
      return next;
    });
  }, []);

  const handleToggleSize = useCallback((sizeId: string) => {
    setSelectedSizes((prev) => {
      const next = new Set(prev);
      if (next.has(sizeId)) {
        next.delete(sizeId);
      } else {
        next.add(sizeId);
      }
      return next;
    });
  }, []);

  const handleSelectAllSizes = useCallback((allSizeIds: string[]) => {
    setSelectedSizes(new Set(allSizeIds));
  }, []);

  const handleClearAllSizes = useCallback(() => {
    setSelectedSizes(new Set());
  }, []);

  // Form validation
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!name.trim()) {
      newErrors.name = "Category name is required";
    } else if (name.trim().length > 60) {
      newErrors.name = "Category name must be 60 characters or less";
    }

    // Slug validation
    if (!slug.trim()) {
      newErrors.slug = "Slug is required";
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      newErrors.slug =
        "Slug must contain only lowercase letters, numbers, and hyphens";
    } else if (slug.length > 60) {
      newErrors.slug = "Slug must be 60 characters or less";
    }

    // Standard sizes validation - require at least one size if toggle is on
    if (hasStandardSizes && selectedSizes.size === 0) {
      newErrors.selectedSizes = "Select at least one size";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, slug, hasStandardSizes, selectedSizes]);

  // Form submission handler
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await window.api?.categories.create({
        name: name.trim(),
        slug,
        parentId,
        hasStandardSizes,
        sizeIds: Array.from(selectedSizes),
      });
    } catch {
      setErrors({
        submit: "Failed to save category. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, name, slug, parentId, hasStandardSizes, selectedSizes]);

  return {
    // Field values
    name,
    slug,
    parentId,
    hasStandardSizes,
    selectedSizes,

    // Field handlers
    handleNameChange,
    handleSlugChange,
    handleParentIdChange,
    handleToggleStandardSizes,
    handleToggleSize,
    handleSelectAllSizes,
    handleClearAllSizes,

    // Form state
    isDirty,
    isParentLocked,
    isSubmitting,
    errors,

    // Form submission
    handleSubmit,
  };
}
