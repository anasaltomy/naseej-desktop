import { useState } from "react";
import {
  X,
  CreditCard,
  Banknote,
  Split,
  Star,
  Check,
  Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CartItem, Customer, PaymentMethod } from "../types";
import { MERCHANT_CONFIG } from "../../../data/dummy-data";
import { cn, formatJOD } from "../../../lib/utils";

interface PaymentModalProps {
  total: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  cartItems: CartItem[];
  attachedCustomer: Customer | null;
  staffName: string;
  onSuccess: (receiptNum: string, paymentMethod: string, cashPaid?: number) => void;
  onClose: () => void;
}

type PaymentTab = "CASH" | "CARD" | "SPLIT" | "LOYALTY";

const QUICK_TENDER = [50, 100, 200, 500];

export default function PaymentModal({
  total,
  subtotal,
  taxAmount,
  discountAmount,
  cartItems,
  attachedCustomer,
  staffName,
  onSuccess,
  onClose,
}: PaymentModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<PaymentTab>("CASH");
  const [cashAmount, setCashAmount] = useState(total.toFixed(2));
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loyaltyPts, setLoyaltyPts] = useState(0);

  const LOYALTY_RATE = 10; // pts per 1 JD
  const loyaltyDiscount = loyaltyPts / LOYALTY_RATE;
  const maxRedeemable = attachedCustomer
    ? Math.floor(attachedCustomer.loyaltyPoints / LOYALTY_RATE) * LOYALTY_RATE
    : 0;

  const cashValue = parseFloat(cashAmount) || 0;
  const changeDue = Math.max(0, cashValue - total);

  const handlePay = async () => {
    if (activeTab === "CASH" && cashValue < total) return;
    setProcessing(true);
    setError(null);
    try {
      const result = await window.api?.orders.create({
        staffName,
        customerId: attachedCustomer?.id,
        customerName: attachedCustomer
          ? `${attachedCustomer.firstName} ${attachedCustomer.lastName}`
          : undefined,
        paymentMethod: activeTab,
        subtotal,
        taxAmount,
        discountAmount,
        total,
        items: cartItems.map((item) => ({
          variantId: item.variant.id,
          productName: item.variant.productName,
          size: item.variant.size,
          color: item.variant.color,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
      });
      if (!result) throw new Error("No response from server");

      // Update loyalty points
      if (attachedCustomer) {
        const redeemed = activeTab === "LOYALTY" ? loyaltyPts : 0;
        const earned = Math.floor(total);
        await window.api?.customers.update({
          id: attachedCustomer.id,
          loyaltyPoints: Math.max(0, attachedCustomer.loyaltyPoints - redeemed) + earned,
        });
      }

      setProcessed(true);
      // Fire-and-forget hardware
      window.api?.printReceipt({ receiptNumber: result.receiptNumber, total, items: cartItems });
      if (activeTab === "CASH") window.api?.openCashDrawer();
      await new Promise((resolve) => setTimeout(resolve, 600));
      const paidCash = activeTab === "CASH" ? parseFloat(cashAmount) || total : undefined;
      onSuccess(result.receiptNumber, activeTab, paidCash);
    } catch {
      setError(t("features.pos.modals.payment.error") || "Payment failed. Please try again.");
      setProcessing(false);
      setProcessed(false);
    }
  };

  const TABS: { id: PaymentTab; label: string; icon: React.ElementType; disabled?: boolean }[] = [
    { id: "CASH", label: t('features.pos.modals.payment.cash'), icon: Banknote },
    { id: "CARD", label: t('features.pos.modals.payment.card'), icon: CreditCard },
    { id: "SPLIT", label: t('features.pos.modals.payment.split'), icon: Split },
    { id: "LOYALTY", label: t('features.pos.modals.payment.loyalty'), icon: Star, disabled: !attachedCustomer },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground font-heading">
              {t('features.pos.modals.payment.title')}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {MERCHANT_CONFIG.location}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {formatJOD(total)}
            </p>
            <p className="text-xs text-muted-foreground">{t('features.pos.modals.payment.totalDue')}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Payment method tabs */}
        <div className="flex border-b border-border">
        {TABS.map(({ id, label, icon: Icon, disabled }) => (
            <button
              key={id}
              onClick={() => !disabled && setActiveTab(id)}
              disabled={disabled}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-all duration-150",
                disabled
                  ? "text-muted-foreground/40 cursor-not-allowed"
                  : "cursor-pointer",
                !disabled && activeTab === id
                  ? "text-accent border-b-2 border-accent bg-accent/5"
                  : !disabled
                    ? "text-muted-foreground hover:text-foreground hover:bg-muted"
                    : "",
              )}
              aria-pressed={activeTab === id}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5">
          {activeTab === "CASH" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('features.pos.modals.payment.cashReceived')}
                </label>
                <input
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="pos-input text-lg font-semibold tabular-nums"
                  min={0}
                  step={0.01}
                  aria-label="Cash amount received"
                />
              </div>

              {/* Quick tender */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  {t('features.pos.modals.payment.quickTender')}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_TENDER.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setCashAmount(amount.toFixed(2))}
                      className={cn(
                        "h-10 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer",
                        "border border-border hover:border-accent/50 hover:bg-accent/10 hover:text-accent",
                        "focus:outline-none focus:ring-1 focus:ring-accent/50",
                        cashValue === amount
                          ? "border-accent bg-accent/10 text-accent"
                          : "bg-muted text-foreground",
                      )}
                    >
                      {amount}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCashAmount(total.toFixed(2))}
                  className="w-full mt-2 h-10 rounded-lg text-sm font-medium bg-muted border border-border hover:border-accent/50 hover:bg-accent/10 hover:text-accent transition-all duration-150 cursor-pointer"
                >
                  {t('features.pos.modals.payment.exact')} {formatJOD(total)}
                </button>
              </div>

              {/* Change due */}
              {cashValue > 0 && (
                <div
                  className={cn(
                    "rounded-lg p-3 flex justify-between items-center",
                    changeDue > 0
                      ? "bg-success/10 border border-success/20"
                      : cashValue >= total
                        ? "bg-accent/10 border border-accent/20"
                        : "bg-destructive/10 border border-destructive/20",
                  )}
                >
                  <span className="text-sm font-medium text-foreground">
                    {cashValue < total ? t('features.pos.modals.payment.remaining') : t('features.pos.modals.payment.changeDue')}
                  </span>
                  <span
                    className={cn(
                      "text-lg font-bold tabular-nums",
                      cashValue < total ? "text-destructive" : "text-success",
                    )}
                  >
                    {cashValue < total
                      ? `-${formatJOD(total - cashValue)}`
                      : formatJOD(changeDue)}
                  </span>
                </div>
              )}
            </div>
          )}

          {activeTab === "CARD" && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center mx-auto">
                <CreditCard className="w-8 h-8 text-accent" />
              </div>
              <div>
                <p className="text-base font-medium text-foreground">
                  {t('features.pos.modals.payment.cardTerminal')}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('features.pos.modals.payment.presentCard')}
                </p>
                <p className="text-2xl font-bold text-foreground mt-3 tabular-nums">
                  {formatJOD(total)}
                </p>
              </div>
              <div className="pos-card p-3">
                <p className="text-xs text-muted-foreground">
                  Terminal:{" "}
                  <span className="text-foreground">POS-Terminal-01</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Status: <span className="text-success">Ready</span>
                </p>
              </div>
            </div>
          )}

          {activeTab === "SPLIT" && (
            <div className="text-center py-8 space-y-3">
              <div className="w-16 h-16 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center mx-auto">
                <Split className="w-8 h-8 text-accent" />
              </div>
              <p className="text-base font-medium text-foreground">
                Split Payment
              </p>
              <p className="text-sm text-muted-foreground">
                Split {formatJOD(total)} across multiple payment methods
              </p>
              <div className="pos-card p-3 text-xs text-muted-foreground">
                Split payment coming in next update
              </div>
            </div>
          )}

          {activeTab === "LOYALTY" && (
            <div className="space-y-4">
              <div className="pos-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-warning/10 border border-warning/20 flex items-center justify-center">
                  <Star className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {attachedCustomer
                      ? `${attachedCustomer.firstName} ${attachedCustomer.lastName}`
                      : "No customer attached"}
                  </p>
                  <p className="text-xl font-bold text-warning tabular-nums">
                    {(attachedCustomer?.loyaltyPoints ?? 0).toLocaleString()} pts
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ≈ {formatJOD((attachedCustomer?.loyaltyPoints ?? 0) / LOYALTY_RATE)} value
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Points to Redeem
                </label>
                <input
                  type="number"
                  value={loyaltyPts}
                  onChange={(e) =>
                    setLoyaltyPts(
                      Math.min(maxRedeemable, Math.max(0, parseInt(e.target.value) || 0))
                    )
                  }
                  max={maxRedeemable}
                  min={0}
                  step={10}
                  className="pos-input"
                  aria-label="Points to redeem"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Min: 100 pts · Rate: {LOYALTY_RATE} pts = 1 JD · Max redeemable: {maxRedeemable} pts
                </p>
                {loyaltyPts >= 100 && (
                  <p className="text-xs text-success mt-1">
                    Discount applied: {formatJOD(loyaltyDiscount)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 pt-0">
          {error && (
            <p className="text-sm text-destructive mb-3 text-center">{error}</p>
          )}
          <button
            onClick={handlePay}
            disabled={
              processing ||
              processed ||
              (activeTab === "CASH" && cashValue < total)
            }
            className={cn(
              "w-full h-14 rounded-xl text-base font-bold transition-all duration-200 cursor-pointer",
              "focus:outline-none focus:ring-2 focus:ring-accent/50",
              processed
                ? "bg-success text-success-foreground"
                : "bg-accent text-accent-foreground hover:bg-accent/90 active:scale-[0.98]",
              (processing || (activeTab === "CASH" && cashValue < total)) &&
                !processed &&
                "opacity-50 cursor-not-allowed",
            )}
            aria-label={`Confirm payment of ${formatJOD(total)}`}
          >
            {processed ? (
              <span className="flex items-center justify-center gap-2">
                <Check className="w-5 h-5" />
                Payment Complete!
              </span>
            ) : processing ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing…
              </span>
            ) : (
              `Confirm Payment — ${formatJOD(total)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
