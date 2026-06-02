import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Package,
  MapPin,
  TrendingDown,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  LayoutGrid,
  LayoutList,
  SlidersHorizontal,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { InventoryItem } from "@/features/pos/types";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/custom/dialog/Dialog";
import { useToast } from "@/components/ui/custom/toast";
import CreateProductModal from "../modals/CreateProductModal";
import EditProductModal from "../modals/EditProductModal";
import StockAdjustmentModal from "../modals/StockAdjustmentModal";
import ProductDetailModal from "../modals/ProductDetailModal";

type StockFilter = "all" | "in" | "low" | "out";
type SortKey = "name-asc" | "name-desc" | "price-asc" | "price-desc" | "stock-asc" | "stock-desc";
type ViewMode = "variant" | "product";

export default function InventoryPage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [dbCategories, setDbCategories] = useState<{ id: string; name: string }[]>([]);
  const [dbBrands, setDbBrands] = useState<{ id: string; name: string }[]>([]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("variant");
  const [showFilters, setShowFilters] = useState(false);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name-asc");

  // ── Modals ────────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<{
    id: string; name: string; modelNumber: string; basePrice: number;
    brandId: string; categoryId: string; description: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ productId: string; productName: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  const [stockAdjustTarget, setStockAdjustTarget] = useState<{
    variantId: string;
    variantLabel: string;
    locations: Array<{ locationId: string; locationName: string; currentQty: number }>;
  } | null>(null);

  // ── Load data ─────────────────────────────────────────────────────────────

  // TypeScript fix: declare window.api.inventory if not already declared
  declare global {
    interface Window {
      api?: {
        inventory?: {
          getAll: () => Promise<unknown[]>;
        };
        categories?: {
          getAll: () => Promise<unknown[]>;
        };
        brands?: {
          getAll: () => Promise<unknown[]>;
        };
      };
    }
  }

  const reloadInventory = () => {
    window.api?.inventory?.getAll().then((data) => setInventory(data as InventoryItem[]));
  };

  useEffect(() => {
    reloadInventory();
    window.api?.categories.getAll().then((data) =>
      setDbCategories((data ?? []).map((c) => ({ id: c.id, name: c.name }))),
    );
    window.api?.brands.getAll().then((data) =>
      setDbBrands((data ?? []).map((b) => ({ id: b.id, name: b.name }))),
    );
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getTotalQty = (item: InventoryItem) =>
    item.locations.reduce((sum, loc) => sum + loc.qty, 0);

  const isLowStock = (item: InventoryItem) =>
    item.locations.some((loc) => loc.qty > 0 && loc.qty <= loc.lowStockThreshold);

  const isOutOfStock = (item: InventoryItem) =>
    item.locations.every((loc) => loc.qty === 0);

  // ── Filtered + sorted list ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return inventory
      .filter((item) => !categoryFilter || item.categoryId === categoryFilter)
      .filter((item) => !brandFilter || item.brandId === brandFilter)
      .filter((item) => {
        if (stockFilter === "out") return isOutOfStock(item);
        if (stockFilter === "low") return isLowStock(item) && !isOutOfStock(item);
        if (stockFilter === "in") return !isLowStock(item) && !isOutOfStock(item);
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
          case "name-asc":   return a.productName.localeCompare(b.productName);
          case "name-desc":  return b.productName.localeCompare(a.productName);
          case "price-asc":  return a.price - b.price;
          case "price-desc": return b.price - a.price;
          case "stock-asc":  return getTotalQty(a) - getTotalQty(b);
          case "stock-desc": return getTotalQty(b) - getTotalQty(a);
          default:           return 0;
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventory, categoryFilter, brandFilter, stockFilter, sortKey, searchQuery]);

  // ── Product-grouped view ──────────────────────────────────────────────────
  const groupedProducts = useMemo(() => {
    const map = new Map<string, {
      productId: string; productName: string;
      brandId?: string; categoryId?: string;
      variants: InventoryItem[];
    }>();
    for (const item of filtered) {
      if (!map.has(item.productId)) {
        map.set(item.productId, {
          productId: item.productId, productName: item.productName,
          brandId: item.brandId, categoryId: item.categoryId, variants: [],
        });
      }
      map.get(item.productId)!.variants.push(item);
    }
    return Array.from(map.values());
  }, [filtered]);

  // ── Event handlers ────────────────────────────────────────────────────────
  const handleEditClick = async (item: InventoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadingEditId(item.productId);
    try {
      const product = await window.api?.products.getById(item.productId);
      if (!product) return;
      setEditProduct({
        id: product.id, name: product.name, modelNumber: product.sku,
        basePrice: item.price, brandId: product.brandId ?? "",
        categoryId: product.categoryId ?? "", description: product.description ?? "",
      });
    } finally {
      setLoadingEditId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await window.api?.products.delete(deleteTarget.productId);
      toast({ variant: "success", title: `"${deleteTarget.productName}" deleted` });
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
    const product = await window.api?.products.getById(productId);
    if (!product) return;
    setEditProduct({
      id: product.id, name: product.name, modelNumber: product.sku,
      basePrice: product.variants[0]?.price ?? 0,
      brandId: product.brandId ?? "", categoryId: product.categoryId ?? "",
      description: product.description ?? "",
    });
  };

  const hasActiveFilters = !!(categoryFilter || brandFilter || stockFilter !== "all");

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="h-12 bg-card border-b border-border flex items-center gap-2 px-4 shrink-0">
        <Package className="w-4 h-4 text-muted-foreground shrink-0" />
        <h1 className="text-sm font-semibold text-foreground shrink-0">
          {t("features.catalog.screens.inventory.title")}
        </h1>
        <div className="flex items-center gap-2 flex-1 mx-2 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("features.catalog.screens.inventory.searchPlaceholder")}
              className="pos-input pl-8 text-sm h-8"
              aria-label="Search inventory"
            />
          </div>
        </div>
        {/* Filter toggle */}
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded-lg border transition-colors shrink-0",
            showFilters || hasActiveFilters
              ? "bg-accent/10 border-accent text-accent"
              : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
          aria-label="Toggle filters"
          aria-pressed={showFilters}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>
        {/* View mode toggle */}
        <div className="flex items-center border border-border rounded-lg overflow-hidden shrink-0">
          <button
            onClick={() => setViewMode("variant")}
            className={cn("w-8 h-8 flex items-center justify-center transition-colors", viewMode === "variant" ? "bg-accent text-accent-foreground" : "bg-card text-muted-foreground hover:bg-muted")}
            aria-label="Variant view" aria-pressed={viewMode === "variant"}
          >
            <LayoutList className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode("product")}
            className={cn("w-8 h-8 flex items-center justify-center transition-colors", viewMode === "product" ? "bg-accent text-accent-foreground" : "bg-card text-muted-foreground hover:bg-muted")}
            aria-label="Product view" aria-pressed={viewMode === "product"}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-sm shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Product
        </button>
      </div>

      {/* ── Filter toolbar ───────────────────────────────────────────────── */}
      {showFilters && (
        <div className="bg-card border-b border-border px-4 py-2 flex flex-wrap items-center gap-2 shrink-0">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="pos-input h-7 text-xs w-36"
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {dbCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="pos-input h-7 text-xs w-32"
            aria-label="Filter by brand"
          >
            <option value="">All Brands</option>
            {dbBrands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as StockFilter)}
            className="pos-input h-7 text-xs w-32"
            aria-label="Filter by stock status"
          >
            <option value="all">All Stock</option>
            <option value="in">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="pos-input h-7 text-xs w-36"
            aria-label="Sort order"
          >
            <option value="name-asc">Name A→Z</option>
            <option value="name-desc">Name Z→A</option>
            <option value="price-asc">Price ↑</option>
            <option value="price-desc">Price ↓</option>
            <option value="stock-asc">Stock ↑</option>
            <option value="stock-desc">Stock ↓</option>
          </select>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => { setCategoryFilter(""); setBrandFilter(""); setStockFilter("all"); }}
              className="text-xs text-destructive hover:text-destructive/80 transition-colors"
              aria-label="Clear all filters"
            >
              Clear filters
            </button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <div className="flex gap-px bg-border shrink-0">
        {[
          { label: t("features.catalog.screens.inventory.totalSKUs"),   value: inventory.length,                      color: "text-foreground"  },
          { label: t("features.catalog.screens.inventory.lowStock"),    value: inventory.filter(isLowStock).length,   color: "text-warning"     },
          { label: t("features.catalog.screens.inventory.outOfStock"),  value: inventory.filter(isOutOfStock).length, color: "text-destructive" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex-1 bg-card px-4 py-2">
            <p className={cn("text-lg font-bold tabular-nums", color)}>{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === "variant" ? (
          <>
            {/* Variant-list table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] bg-muted border-b border-border px-4 py-2 sticky top-0 z-10">
              {[
                t("features.catalog.screens.inventory.productSKU"),
                t("features.catalog.screens.inventory.size"),
                t("features.catalog.screens.inventory.color"),
                t("features.catalog.screens.inventory.totalStock"),
                t("features.catalog.screens.inventory.details"),
              ].map((col) => (
                <div key={col} className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{col}</div>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Package className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-foreground">{t("features.catalog.screens.inventory.noVariantsFound")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("features.catalog.screens.inventory.tryDifferentSearch")}</p>
              </div>
            ) : (
              filtered.map((item) => {
                const totalQty = getTotalQty(item);
                const lowStock = isLowStock(item);
                const outOfStock = isOutOfStock(item);
                const isExpanded = expandedItem === item.variantId;

                return (
                  <div key={item.variantId} className="border-b border-border/50">
                    <div
                      className={cn("grid grid-cols-[2fr_1fr_1fr_1fr_auto] px-4 py-3 items-center hover:bg-muted/50 transition-colors cursor-pointer", outOfStock && "opacity-60")}
                      onClick={() => setExpandedItem(isExpanded ? null : item.variantId)}
                      role="button" tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && setExpandedItem(isExpanded ? null : item.variantId)}
                      aria-expanded={isExpanded}
                    >
                      {/* Product name → opens detail modal */}
                      <div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDetailProductId(item.productId); }}
                          className="text-sm font-medium text-foreground hover:text-accent transition-colors text-left focus:outline-none focus:ring-1 focus:ring-ring rounded"
                          aria-label={`View details for ${item.productName}`}
                        >
                          {item.productName}
                        </button>
                        <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                      </div>
                      <span className="badge-muted w-fit">{item.size}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border border-border/50" style={{ backgroundColor: item.colorHex }} />
                        <span className="text-sm text-foreground">{item.color}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-semibold tabular-nums", outOfStock ? "text-destructive" : lowStock ? "text-warning" : "text-success")}>{totalQty}</span>
                        {outOfStock && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
                        {lowStock && !outOfStock && <TrendingDown className="w-3.5 h-3.5 text-warning" />}
                        {outOfStock ? <span className="badge-destructive">Out</span> : lowStock ? <span className="badge-warning">Low</span> : null}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Edit product"
                          onClick={(e) => handleEditClick(item, e)}
                          disabled={loadingEditId === item.productId}
                        >
                          {loadingEditId === item.productId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="Delete product"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget({ productId: item.productId, productName: item.productName }); }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button className="w-6 h-6 flex items-center justify-center text-muted-foreground" aria-label={isExpanded ? "Collapse" : "Expand"}>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded: per-location stock + adjust buttons */}
                    {isExpanded && (
                      <div className="bg-muted/30 border-t border-border/30 px-8 py-3 space-y-2 animate-fade-in">
                        {item.locations.map((loc) => (
                          <div key={loc.locationId} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-sm text-foreground">{loc.locationName}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={cn("text-sm font-semibold tabular-nums", loc.qty === 0 ? "text-destructive" : loc.qty <= loc.lowStockThreshold ? "text-warning" : "text-success")}>
                                {loc.qty} units
                              </span>
                              {loc.qty === 0 && <span className="badge-destructive">Out</span>}
                              {loc.qty > 0 && loc.qty <= loc.lowStockThreshold && <span className="badge-warning">Low ≤{loc.lowStockThreshold}</span>}
                              <button
                                type="button"
                                onClick={(e) => openStockAdjust(item, e)}
                                className="text-xs px-2 py-0.5 rounded border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                                aria-label={`Adjust stock at ${loc.locationName}`}
                              >
                                Adjust
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        ) : (
          /* ── Product-grouped view ─────────────────────────────────────── */
          <div className="p-4 space-y-3">
            {groupedProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Package className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-foreground">No products found</p>
              </div>
            ) : (
              groupedProducts.map((group) => {
                const totalStock = group.variants.reduce((sum, v) => sum + getTotalQty(v), 0);
                const hasLow = group.variants.some(isLowStock);
                const hasOut = group.variants.some(isOutOfStock);
                const isExpanded = expandedItem === group.productId;
                const brandName = dbBrands.find((b) => b.id === group.brandId)?.name;
                const categoryName = dbCategories.find((c) => c.id === group.categoryId)?.name;

                return (
                  <div key={group.productId} className="bg-card border border-border rounded-lg overflow-hidden">
                    <div
                      className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setExpandedItem(isExpanded ? null : group.productId)}
                      role="button" tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && setExpandedItem(isExpanded ? null : group.productId)}
                      aria-expanded={isExpanded}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setDetailProductId(group.productId); }}
                            className="text-sm font-semibold text-foreground hover:text-accent transition-colors focus:outline-none focus:ring-1 focus:ring-ring rounded"
                          >
                            {group.productName}
                          </button>
                          {brandName && <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{brandName}</span>}
                          {categoryName && <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{categoryName}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{group.variants.length} variant{group.variants.length !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className={cn("text-sm font-bold tabular-nums", hasOut ? "text-destructive" : hasLow ? "text-warning" : "text-success")}>{totalStock}</p>
                          <p className="text-xs text-muted-foreground">total units</p>
                        </div>
                        {hasOut && <span className="badge-destructive">Has Out</span>}
                        {!hasOut && hasLow && <span className="badge-warning">Has Low</span>}
                        <div className="flex items-center gap-1">
                          <button
                            className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded"
                            aria-label="Edit product"
                            onClick={(e) => handleEditClick(group.variants[0], e)}
                            disabled={loadingEditId === group.productId}
                          >
                            {loadingEditId === group.productId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors rounded"
                            aria-label="Delete product"
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget({ productId: group.productId, productName: group.productName }); }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded: variant rows */}
                    {isExpanded && (
                      <div className="border-t border-border/50">
                        {group.variants.map((v) => {
                          const qty = getTotalQty(v);
                          return (
                            <div key={v.variantId} className="grid grid-cols-[1fr_1.2fr_auto_auto_auto] px-4 py-2.5 border-b border-border/30 last:border-0 items-center gap-3 bg-muted/10">
                              <div className="flex items-center gap-1.5">
                                <span className="badge-muted">{v.size}</span>
                                <div className="w-3 h-3 rounded-full border border-border/50 shrink-0" style={{ backgroundColor: v.colorHex }} />
                                <span className="text-xs text-foreground">{v.color}</span>
                              </div>
                              <span className="text-xs font-mono text-muted-foreground truncate">{v.sku}</span>
                              <span className="text-xs tabular-nums text-foreground">{v.price.toFixed(2)} SAR</span>
                              <span className={cn("text-xs font-semibold tabular-nums", isOutOfStock(v) ? "text-destructive" : isLowStock(v) ? "text-warning" : "text-success")}>{qty} units</span>
                              <button
                                type="button"
                                onClick={(e) => openStockAdjust(v, e)}
                                className="text-xs px-2 py-0.5 rounded border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                                aria-label="Adjust stock"
                              >
                                Adjust
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <CreateProductModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => { setCreateOpen(false); reloadInventory(); }}
      />
      <EditProductModal
        open={editProduct !== null}
        onClose={() => setEditProduct(null)}
        onSuccess={() => { setEditProduct(null); reloadInventory(); }}
        product={editProduct}
      />
      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        variant="danger"
        title="Delete Product"
        description={`Are you sure you want to delete "${deleteTarget?.productName}"? All variants will be permanently removed. Past order records are not affected.`}
        confirmLabel="Delete"
        loading={isDeleting}
      />
      {stockAdjustTarget && (
        <StockAdjustmentModal
          open
          onClose={() => setStockAdjustTarget(null)}
          variantId={stockAdjustTarget.variantId}
          variantLabel={stockAdjustTarget.variantLabel}
          locations={stockAdjustTarget.locations}
          onSuccess={reloadInventory}
        />
      )}
      {detailProductId && (
        <ProductDetailModal
          open
          onClose={() => setDetailProductId(null)}
          productId={detailProductId}
          onEdit={openDetailFromEdit}
        />
      )}
    </div>
  );
}

