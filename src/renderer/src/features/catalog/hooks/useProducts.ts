import { useState, useEffect, useMemo } from "react";

import { getTotalQty, isLowStock, isOutOfStock } from "../utils";
import ProductController from "../controllers/productCtrls";
import { useToast } from "@/components/ui/custom/toast";
import type {
  InventoryItem,
  StockFilter,
  SortKey,
  ViewMode,
  EditProductPayload,
  DeleteTarget,
  StockAdjustTarget,
  GroupedProduct,
} from "@/features/catalog/types/Product.types";

export function useProducts() {
  const { toast } = useToast();

  // ── Data ──────────────────────────────────────────
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [dbCategories, setDbCategories] = useState<
    { id: string; name: string }[]
  >([]);
  const [dbBrands, setDbBrands] = useState<{ id: string; name: string }[]>([]);

  // ── UI ────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("product");
  const [showFilters, setShowFilters] = useState(false);

  // ── Filters ───────────────────────────────────────
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name-asc");

  // ── Modals ────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<EditProductPayload | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  const [stockAdjustTarget, setStockAdjustTarget] =
    useState<StockAdjustTarget | null>(null);

  // ── Load ──────────────────────────────────────────
  const reloadInventory = () => {
    ProductController.getInventory().then((data) => setInventory(data));
  };

  useEffect(() => {
    reloadInventory();
    const categoriers = ProductController.getCategories().then((data) =>
      setDbCategories(data),
    );
    const brands = ProductController.getBrands().then((data) =>
      setDbBrands(data),
    );
  }, []);

  // ── Derived ───────────────────────────────────────
  const filtered = useMemo(() => {
    return inventory
      .filter((item) => !categoryFilter || item.categoryId === categoryFilter)
      .filter((item) => !brandFilter || item.brandId === brandFilter)
      .filter((item) => {
        if (stockFilter === "out") return isOutOfStock(item);
        if (stockFilter === "low")
          return isLowStock(item) && !isOutOfStock(item);
        if (stockFilter === "in")
          return !isLowStock(item) && !isOutOfStock(item);
        return true;
      })
      .filter(
        (item) =>
          !searchQuery ||
          item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.barcode.includes(searchQuery) ||
          item.size.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.color.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .sort((a, b) => {
        switch (sortKey) {
          case "name-asc":
            return a.productName.localeCompare(b.productName);
          case "name-desc":
            return b.productName.localeCompare(a.productName);
          case "price-asc":
            return a.price - b.price;
          case "price-desc":
            return b.price - a.price;
          case "stock-asc":
            return getTotalQty(a) - getTotalQty(b);
          case "stock-desc":
            return getTotalQty(b) - getTotalQty(a);
          default:
            return 0;
        }
      });
  }, [
    inventory,
    categoryFilter,
    brandFilter,
    stockFilter,
    sortKey,
    searchQuery,
  ]);

  const groupedProducts = useMemo(() => {
    const map = new Map<string, GroupedProduct>();
    for (const item of filtered) {
      if (!map.has(item.productId)) {
        map.set(item.productId, {
          productId: item.productId,
          productName: item.productName,
          brandId: item.brandId,
          categoryId: item.categoryId,
          variants: [],
        });
      }
      map.get(item.productId)!.variants.push(item);
    }
    return Array.from(map.values());
  }, [filtered]);

  const hasActiveFilters = !!(
    categoryFilter ||
    brandFilter ||
    stockFilter !== "all"
  );

  // ── Handlers ──────────────────────────────────────
  const handleEditClick = async (item: InventoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadingEditId(item.productId);
    try {
      const product = await ProductController.getProductById(item.productId);
      if (!product) return;
      setEditProduct({
        id: product.id,
        name: product.name,
        modelNumber: product.sku,
        basePrice: item.price,
        brandId: product.brandId ?? "",
        categoryId: product.categoryId ?? "",
        description: product.description ?? "",
      });
    } finally {
      setLoadingEditId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await ProductController.deleteProduct(deleteTarget.productId);
      toast({
        variant: "success",
        title: `"${deleteTarget.productName}" deleted`,
      });
      setDeleteTarget(null);
      reloadInventory();
    } catch {
      toast({ variant: "error", title: "Failed to delete product" });
    } finally {
      setIsDeleting(false);
    }
  };

  const openStockAdjust = (item: InventoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setStockAdjustTarget({
      variantId: item.variantId,
      variantLabel: `${item.productName} — ${item.size} / ${item.color}`,
      locations: item.locations.map((l) => ({
        locationId: l.locationId,
        locationName: l.locationName,
        currentQty: l.qty,
      })),
    });
  };

  const openDetailFromEdit = async (productId: string) => {
    setDetailProductId(null);
    const product = await ProductController.getProductById(productId);
    if (!product) return;
    setEditProduct({
      id: product.id,
      name: product.name,
      modelNumber: product.sku,
      basePrice: product.variants[0]?.price ?? 0,
      brandId: product.brandId ?? "",
      categoryId: product.categoryId ?? "",
      description: product.description ?? "",
    });
  };

  const clearFilters = () => {
    setCategoryFilter("");
    setBrandFilter("");
    setStockFilter("all");
  };

  const toggleExpanded = (id: string) =>
    setExpandedItem((prev) => (prev === id ? null : id));

  return {
    // data
    inventory,
    filtered,
    groupedProducts,
    dbCategories,
    dbBrands,
    // ui
    searchQuery,
    setSearchQuery,
    expandedItem,
    toggleExpanded,
    viewMode,
    setViewMode,
    showFilters,
    setShowFilters,
    // filters
    categoryFilter,
    setCategoryFilter,
    brandFilter,
    setBrandFilter,
    stockFilter,
    setStockFilter,
    sortKey,
    setSortKey,
    hasActiveFilters,
    clearFilters,
    // modals
    createOpen,
    setCreateOpen,
    loadingEditId,
    editProduct,
    setEditProduct,
    deleteTarget,
    setDeleteTarget,
    isDeleting,
    detailProductId,
    setDetailProductId,
    stockAdjustTarget,
    setStockAdjustTarget,
    // handlers
    handleEditClick,
    handleDeleteConfirm,
    openStockAdjust,
    openDetailFromEdit,
    reloadInventory,
  };
}
