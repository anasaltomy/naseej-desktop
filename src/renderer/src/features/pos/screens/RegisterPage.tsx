import { useState, useCallback, useEffect } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  Tag,
  ChevronDown,
  X,
  Barcode,
  ShoppingBag,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CartItem, ProductVariant, Customer, User as PosUser } from "../types";
import { cn, formatJOD, generateId } from "@/lib/utils";
import PaymentModal from "../modals/PaymentModal";
import ReceiptModal, { type ReceiptData } from "../modals/ReceiptModal";
import { MERCHANT_CONFIG } from "@renderer/data/dummy-data";

interface RegisterPageProps {
  currentUser: PosUser | null;
}

export default function RegisterPage({ currentUser }: RegisterPageProps) {
  const { t } = useTranslation();
  const [allVariants, setAllVariants] = useState<ProductVariant[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [taxRate, setTaxRate] = useState(0.15);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [attachedCustomer, setAttachedCustomer] = useState<Customer | null>(
    null,
  );
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [discountError, setDiscountError] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [lastSale, setLastSale] = useState<{
    total: number;
    receiptNum: string;
  } | null>(null);
  const [pendingReceipt, setPendingReceipt] = useState<ReceiptData | null>(null);

  // Load variants, customers, and merchant config from SQLite on mount
  useEffect(() => {
    window.api?.variants.getAll().then((data) => setAllVariants(data as ProductVariant[]));
    window.api?.customers.getAll().then((data) => setAllCustomers(data as Customer[]));
    window.api?.merchant.getConfig().then((cfg) => {
      if (cfg?.taxRate !== undefined) setTaxRate(cfg.taxRate);
    });
  }, []);

  // Cart calculations
  const subtotal = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const discountAmount = appliedDiscount;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * taxRate;
  const total = taxableAmount + taxAmount;

  const addVariantToCart = useCallback((variant: ProductVariant) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.variant.id === variant.id);
      if (existing) {
        return prev.map((item) =>
          item.variant.id === variant.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                lineTotal:
                  (item.quantity + 1) * item.unitPrice - item.discountAmount,
              }
            : item,
        );
      }
      const newItem: CartItem = {
        id: generateId(),
        variant,
        quantity: 1,
        unitPrice: variant.price,
        discountAmount: 0,
        lineTotal: variant.price,
      };
      return [...prev, newItem];
    });
    setShowSearch(false);
    setSearchQuery("");
  }, []);

  // IPC barcode events (from main process hardware scanner in Phase 4)
  useEffect(() => {
    const unsub = window.api?.onBarcodeScanned((barcode: string) => {
      const variant = allVariants.find((v) => v.barcode === barcode || v.sku === barcode);
      if (variant) addVariantToCart(variant);
    });
    return () => unsub?.();
  }, [allVariants, addVariantToCart]);

  // Keyboard-based barcode capture (USB scanner emulates keyboard — completes in <50ms)
  useEffect(() => {
    let buffer = "";
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if focus is in a text input / textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Enter") {
        if (buffer.length > 3) {
          const scanned = buffer;
          buffer = "";
          const variant = allVariants.find((v) => v.barcode === scanned || v.sku === scanned);
          if (variant) addVariantToCart(variant);
        }
        return;
      }
      if (e.key.length === 1) {
        buffer += e.key;
        if (timeout) clearTimeout(timeout);
        // Reset buffer if no more characters arrive within 150ms (human typing is slower)
        timeout = setTimeout(() => { buffer = ""; }, 150);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeout) clearTimeout(timeout);
    };
  }, [allVariants, addVariantToCart]);

  const updateQty = (itemId: string, delta: number) => {
    setCartItems(
      (prev) =>
        prev
          .map((item) => {
            if (item.id !== itemId) return item;
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              lineTotal: newQty * item.unitPrice - item.discountAmount,
            };
          })
          .filter(Boolean) as CartItem[],
    );
  };

  const removeItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const applyDiscount = async () => {
    setDiscountError("");
    const result = await window.api?.discounts.validate({
      code: discountCode,
      orderTotal: subtotal,
    });
    if (!result?.valid) {
      setDiscountError(result?.reason ?? "Invalid code");
      return;
    }
    setAppliedDiscount(result.amount as number);
    setDiscountCode("");
  };

  const clearCart = () => {
    setCartItems([]);
    setAttachedCustomer(null);
    setDiscountCode("");
    setAppliedDiscount(0);
    setDiscountError("");
  };

  const filteredVariants = allVariants.filter(
    (v) =>
      v.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.barcode ?? "").includes(searchQuery),
  );

  const filteredCustomers = allCustomers.filter(
    (c) =>
      `${c.firstName} ${c.lastName}`
        .toLowerCase()
        .includes(customerQuery.toLowerCase()) ||
      c.phone.includes(customerQuery) ||
      c.email.toLowerCase().includes(customerQuery.toLowerCase()),
  );

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Center: Cart */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-border">
        {/* Toolbar */}
        <div className="h-12 bg-card border-b border-border flex items-center gap-2 px-3 shrink-0">
          <button
            onClick={() => {
              setShowSearch(true);
              setSearchQuery("");
            }}
            className="btn-secondary flex items-center gap-2 text-sm h-8 px-3"
            aria-label="Search products (F1)"
            title={t('features.pos.screens.register.searchProductsF1')}
          >
            <Search className="w-4 h-4" />
            <span>{t('features.pos.screens.register.searchF1')}</span>
          </button>
          <button
            onClick={() => {
              setShowSearch(true);
              setSearchQuery("");
            }}
            className="btn-ghost flex items-center gap-2 text-sm h-8 px-3"
            title={t('features.pos.screens.register.scanBarcode')}
          >
            <Barcode className="w-4 h-4" />
            <span>{t('features.pos.screens.register.scan')}</span>
          </button>
          {cartItems.length > 0 && (
            <button
              onClick={clearCart}
              className="ml-auto btn-ghost flex items-center gap-1.5 text-sm h-8 px-3 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('features.pos.screens.register.clear')}</span>
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-3">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
                <ShoppingBag className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-base font-medium text-foreground">
                {t('features.pos.screens.register.cartEmpty')}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('features.pos.screens.register.scanOrSearch')}
              </p>
              <div className="mt-4 flex gap-2">
                <kbd className="px-2 py-1 bg-muted border border-border rounded text-xs text-muted-foreground">
                  F1
                </kbd>
                <span className="text-xs text-muted-foreground">{t('features.pos.screens.register.toSearch')}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Cart header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-2 pb-1 border-b border-border">
                <span className="text-xs text-muted-foreground font-medium">
                  {t('features.pos.screens.register.item')}
                </span>
                <span className="text-xs text-muted-foreground font-medium text-center w-20">
                  {t('features.pos.screens.register.qty')}
                </span>
                <span className="text-xs text-muted-foreground font-medium text-right w-16">
                  {t('features.pos.screens.register.price')}
                </span>
                <span className="text-xs text-muted-foreground font-medium text-right w-16">
                  {t('features.pos.screens.register.total')}
                </span>
              </div>

              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="pos-card p-3 grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center animate-fade-in"
                >
                  {/* Item info */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.variant.productName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="badge-muted">{item.variant.size}</span>
                      <div className="flex items-center gap-1">
                        <div
                          className="w-3 h-3 rounded-full border border-border/50"
                          style={{ backgroundColor: item.variant.colorHex }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {item.variant.color}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {item.variant.sku}
                      </span>
                    </div>
                  </div>

                  {/* Qty controls */}
                  <div className="flex items-center gap-1 w-20 justify-center">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="w-7 h-7 flex items-center justify-center rounded bg-muted hover:bg-destructive/20 hover:text-destructive text-muted-foreground transition-colors cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center text-sm font-semibold text-foreground tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      disabled={item.quantity >= item.variant.stockQty}
                      className="w-7 h-7 flex items-center justify-center rounded bg-muted hover:bg-accent/20 hover:text-accent text-muted-foreground transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Unit price */}
                  <div className="w-16 text-right">
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {item.unitPrice.toFixed(2)}
                    </span>
                  </div>

                  {/* Line total + delete */}
                  <div className="w-16 flex items-center justify-end gap-1">
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      {item.lineTotal.toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer ml-1"
                      aria-label="Remove item"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right sidebar: Transaction panel */}
      <div className="w-72 flex flex-col bg-card overflow-hidden">
        {/* Customer */}
        <div className="p-3 border-b border-border">
          {attachedCustomer ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-accent/10 border border-accent/20 rounded-full flex items-center justify-center">
                  <span className="text-xs font-semibold text-accent">
                    {attachedCustomer.firstName[0]}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">
                    {attachedCustomer.firstName} {attachedCustomer.lastName}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {attachedCustomer.loyaltyPoints} pts
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAttachedCustomer(null)}
                className="text-muted-foreground/50 hover:text-destructive transition-colors cursor-pointer"
                aria-label="Remove customer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCustomerSearch(true)}
              className="w-full flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Attach Customer (F2)"
            >
              <User className="w-4 h-4" />
              <span className="text-sm">Attach Customer (F2)</span>
            </button>
          )}
        </div>

        {/* Discount */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyDiscount()}
              placeholder="Coupon code (F5)"
              className="pos-input text-sm h-8 text-xs flex-1"
              title="Apply Discount (F5)"
            />
            <button
              onClick={applyDiscount}
              disabled={!discountCode.trim()}
              className="btn-secondary h-8 px-3 text-xs whitespace-nowrap"
            >
              <Tag className="w-3.5 h-3.5" />
            </button>
          </div>
          {discountError && (
            <p className="text-xs text-destructive mt-1.5">{discountError}</p>
          )}
          {appliedDiscount > 0 && (
            <p className="text-xs text-success mt-1.5 flex items-center gap-1">
              <span>✓ Discount applied: -{formatJOD(appliedDiscount)}</span>
              <button
                onClick={() => {
                  setAppliedDiscount(0);
                  setDiscountCode("");
                  setDiscountError("");
                }}
                className="ml-auto text-muted-foreground/50 hover:text-destructive cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </p>
          )}
        </div>

        {/* Totals */}
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground tabular-nums">
              {formatJOD(subtotal)}
            </span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-success">Discount</span>
              <span className="text-success tabular-nums">
                -{formatJOD(discountAmount)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {MERCHANT_CONFIG.taxLabel}
            </span>
            <span className="text-foreground tabular-nums">
              {formatJOD(taxAmount)}
            </span>
          </div>
          <div className="h-px bg-border" />
          <div className="flex justify-between">
            <span className="text-base font-semibold text-foreground">
              Total
            </span>
            <span className="text-xl font-bold text-foreground tabular-nums">
              {formatJOD(total)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">
              {cartItems.length} item{cartItems.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Pay button */}
        <div className="p-3 mt-auto">
          {lastSale && (
            <div className="pos-card p-2 mb-3 border-success/20 bg-success/5">
              <p className="text-xs text-success text-center">
                ✓ Sale complete — {lastSale.receiptNum}
              </p>
            </div>
          )}
          <button
            onClick={() => setShowPayment(true)}
            disabled={cartItems.length === 0}
            className={cn(
              "w-full h-14 rounded-xl text-base font-bold transition-all duration-200 cursor-pointer",
              "focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-background",
              cartItems.length > 0
                ? "bg-accent text-accent-foreground hover:bg-accent/90 active:scale-[0.98] shadow-lg shadow-accent/20"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
            title="Pay (F12)"
            aria-label={`Pay ${formatJOD(total)} (F12)`}
          >
            PAY {cartItems.length > 0 ? formatJOD(total) : ""}
          </button>
          <p className="text-center text-[10px] text-muted-foreground mt-1.5">
            F12 to pay
          </p>
        </div>
      </div>

      {/* Product Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center pt-20">
          <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <Search className="w-5 h-5 text-muted-foreground shrink-0" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by product name, SKU, or barcode…"
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
                aria-label="Search products"
              />
              <button
                onClick={() => setShowSearch(false)}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Close search"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {searchQuery.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Type to search products…
                </p>
              ) : filteredVariants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t('empty.noProductsFound')}
                </p>
              ) : (
                filteredVariants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => addVariantToCart(v)}
                    disabled={v.stockQty === 0}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer",
                      "hover:bg-muted border-b border-border/50 last:border-0",
                      "focus:outline-none focus:bg-muted",
                      v.stockQty === 0 && "opacity-40 cursor-not-allowed",
                    )}
                  >
                    <div
                      className="w-8 h-8 rounded-lg border border-border flex items-center justify-center shrink-0"
                      style={{ backgroundColor: v.colorHex + "30" }}
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: v.colorHex }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {v.productName}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="badge-muted">{v.size}</span>
                        <span className="text-xs text-muted-foreground">
                          {v.color}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {v.sku}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-foreground tabular-nums">
                        {formatJOD(v.price)}
                      </p>
                      <p
                        className={cn(
                          "text-xs tabular-nums",
                          v.stockQty <= 3
                            ? "text-warning"
                            : v.stockQty === 0
                              ? "text-destructive"
                              : "text-muted-foreground",
                        )}
                      >
                        {v.stockQty === 0
                          ? "Out of stock"
                          : `${v.stockQty} in stock`}
                      </p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground/40 -rotate-90 shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customer Search Modal */}
      {showCustomerSearch && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center pt-20">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <User className="w-5 h-5 text-muted-foreground shrink-0" />
              <input
                autoFocus
                type="text"
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
                placeholder="Search by name, phone, or email…"
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
                aria-label="Search customers"
              />
              <button
                onClick={() => setShowCustomerSearch(false)}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filteredCustomers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setAttachedCustomer(c);
                    setShowCustomerSearch(false);
                    setCustomerQuery("");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors cursor-pointer border-b border-border/50 last:border-0 text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-accent">
                      {c.firstName[0]}
                      {c.lastName[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {c.firstName} {c.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-accent font-medium">
                      {c.loyaltyPoints} pts
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.totalOrders} orders
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {pendingReceipt && (
        <ReceiptModal
          open={true}
          data={pendingReceipt}
          onClose={() => setPendingReceipt(null)}
        />
      )}

      {/* Payment Modal */}
      {showPayment && (
        <PaymentModal
          total={total}
          subtotal={subtotal}
          taxAmount={taxAmount}
          discountAmount={discountAmount}
          cartItems={cartItems}
          attachedCustomer={attachedCustomer}
          staffName={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "Unknown"}
          onSuccess={(receiptNum, paymentMethod, cashPaid) => {
            const snapItems = [...cartItems];
            const snapCustomer = attachedCustomer;
            setPendingReceipt({
              receiptNumber: receiptNum,
              dateTime: new Date().toISOString(),
              staffName: currentUser
                ? `${currentUser.firstName} ${currentUser.lastName}`
                : "Unknown",
              customer: snapCustomer,
              items: snapItems,
              subtotal,
              discountAmount,
              taxAmount,
              total,
              paymentMethod: paymentMethod as ReceiptData["paymentMethod"],
              cashPaid,
              changeDue: cashPaid !== undefined ? Math.max(0, cashPaid - total) : undefined,
            });
            setLastSale({ total, receiptNum });
            clearCart();
            setShowPayment(false);
          }}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  );
}
