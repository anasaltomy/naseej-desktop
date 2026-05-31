import { X, Printer, ShoppingBag, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MERCHANT_CONFIG } from "@renderer/data/dummy-data";
import type { CartItem, Customer } from "../types";

export interface ReceiptData {
  receiptNumber: string;
  dateTime: string;
  staffName: string;
  customer: Customer | null;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paymentMethod: "CASH" | "CARD" | "SPLIT" | "LOYALTY";
  cashPaid?: number;
  changeDue?: number;
}

interface ReceiptModalProps {
  open: boolean;
  data: ReceiptData;
  onClose: () => void;
}

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  SPLIT: "Split",
  LOYALTY: "Loyalty Points",
};

export default function ReceiptModal({ open, data, onClose }: ReceiptModalProps) {
  if (!open) return null;

  const dt = new Date(data.dateTime);
  const dateStr = dt.toLocaleDateString("en-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = dt.toLocaleTimeString("en-SA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const itemCount = data.items.reduce((sum, i) => sum + i.quantity, 0);
  const loyaltyEarned = Math.floor(data.total);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-[340px] my-auto animate-slide-up">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-white/90 text-sm font-semibold">Sale Complete</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              title="Printer not connected yet"
              disabled
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white/30 text-xs cursor-not-allowed border border-white/10 select-none"
              aria-label="Print receipt (disabled)"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-semibold cursor-pointer hover:bg-accent/90 transition-colors"
              aria-label="New Sale"
            >
              New Sale
            </button>
          </div>
        </div>

        {/* ── Receipt Paper ── */}
        <div
          className="bg-white text-gray-900 rounded-t-2xl shadow-2xl overflow-hidden"
          style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}
        >
          {/* Store Header */}
          <div className="text-center pt-8 pb-5 px-5">
            <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
              <ShoppingBag className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-widest uppercase">
              {MERCHANT_CONFIG.name}
            </h1>
            <p className="text-[11px] text-gray-500 mt-1 tracking-wide">
              {MERCHANT_CONFIG.location}
            </p>
          </div>

          {/* Perforated divider */}
          <PerforatedDivider />

          {/* Receipt Meta */}
          <div className="px-5 py-4 space-y-1.5">
            <MetaRow label="Receipt #" value={data.receiptNumber} bold />
            <MetaRow label="Date" value={dateStr} />
            <MetaRow label="Time" value={timeStr} />
            <MetaRow label="Cashier" value={data.staffName} />
            {data.customer && (
              <MetaRow
                label="Customer"
                value={`${data.customer.firstName} ${data.customer.lastName}`}
              />
            )}
          </div>

          {/* Perforated divider */}
          <PerforatedDivider />

          {/* Items */}
          <div className="px-5 py-4">
            {/* Column headers */}
            <div className="flex justify-between text-[10px] text-gray-400 uppercase tracking-wider pb-2 mb-3 border-b border-gray-200">
              <span className="flex-1">Item</span>
              <span className="w-16 text-center">Qty</span>
              <span className="w-20 text-right">Amount</span>
            </div>

            {/* Item rows */}
            <div className="space-y-3">
              {data.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-gray-900 leading-tight">
                      {item.variant.productName}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {item.variant.size} · {item.variant.color} · {item.variant.sku}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {item.unitPrice.toFixed(2)} JD × {item.quantity}
                    </p>
                  </div>
                  <div className="w-16 text-center shrink-0">
                    <span className="text-[12px] text-gray-600">{item.quantity}</span>
                  </div>
                  <div className="w-20 text-right shrink-0">
                    <span className="text-[12px] font-semibold text-gray-900 tabular-nums">
                      {item.lineTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Perforated divider */}
          <PerforatedDivider />

          {/* Totals */}
          <div className="px-5 py-4 space-y-1.5">
            <TotalRow label="Subtotal" value={`${data.subtotal.toFixed(2)} JD`} />
            {data.discountAmount > 0 && (
              <TotalRow
                label="Discount"
                value={`-${data.discountAmount.toFixed(2)} JD`}
                accent="green"
              />
            )}
            <TotalRow
              label={MERCHANT_CONFIG.taxLabel}
              value={`${data.taxAmount.toFixed(2)} JD`}
            />
            {/* Grand total */}
            <div className="flex justify-between items-baseline pt-2 mt-1 border-t-2 border-gray-900">
              <span className="text-sm font-black tracking-widest uppercase text-gray-900">
                Total
              </span>
              <span className="text-xl font-black text-gray-900 tabular-nums">
                {data.total.toFixed(2)}{" "}
                <span className="text-sm font-semibold">JD</span>
              </span>
            </div>
          </div>

          {/* Perforated divider */}
          <PerforatedDivider />

          {/* Payment Info */}
          <div className="px-5 py-4 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-gray-500 uppercase tracking-wider">Payment</span>
              <span
                className={cn(
                  "text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                  data.paymentMethod === "CASH"
                    ? "bg-green-100 text-green-700"
                    : data.paymentMethod === "CARD"
                      ? "bg-blue-100 text-blue-700"
                      : data.paymentMethod === "LOYALTY"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-purple-100 text-purple-700",
                )}
              >
                {PAYMENT_LABEL[data.paymentMethod] ?? data.paymentMethod}
              </span>
            </div>
            {data.paymentMethod === "CASH" && data.cashPaid !== undefined && (
              <>
                <TotalRow
                  label="Cash Received"
                  value={`${data.cashPaid.toFixed(2)} JD`}
                />
                <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                  <span className="text-[12px] font-bold text-gray-900">Change Due</span>
                  <span className="text-[15px] font-black text-gray-900 tabular-nums">
                    {(data.changeDue ?? 0).toFixed(2)}{" "}
                    <span className="text-[11px] font-semibold">JD</span>
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Perforated divider */}
          <PerforatedDivider />

          {/* Footer */}
          <div className="text-center px-5 pt-4 pb-8">
            <p className="text-[11px] text-gray-600 leading-relaxed font-sans">
              {MERCHANT_CONFIG.receiptHeader}
            </p>
            <p className="text-[10px] text-gray-400 mt-2 leading-relaxed font-sans">
              {MERCHANT_CONFIG.receiptFooter}
            </p>
            {data.customer && (
              <div className="mt-3 inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                <span className="text-[10px] text-amber-700 font-medium font-sans">
                  +{loyaltyEarned} points earned
                </span>
              </div>
            )}
            <p className="text-[9px] text-gray-300 mt-4 tabular-nums font-sans">
              {itemCount} item{itemCount !== 1 ? "s" : ""} · {data.receiptNumber}
            </p>
          </div>
        </div>

        {/* Torn / Perforated Bottom Edge */}
        <div
          className="h-4 bg-white"
          style={{
            clipPath:
              "polygon(0 0, 2% 100%, 4% 0, 6% 100%, 8% 0, 10% 100%, 12% 0, 14% 100%, 16% 0, 18% 100%, 20% 0, 22% 100%, 24% 0, 26% 100%, 28% 0, 30% 100%, 32% 0, 34% 100%, 36% 0, 38% 100%, 40% 0, 42% 100%, 44% 0, 46% 100%, 48% 0, 50% 100%, 52% 0, 54% 100%, 56% 0, 58% 100%, 60% 0, 62% 100%, 64% 0, 66% 100%, 68% 0, 70% 100%, 72% 0, 74% 100%, 76% 0, 78% 100%, 80% 0, 82% 100%, 84% 0, 86% 100%, 88% 0, 90% 100%, 92% 0, 94% 100%, 96% 0, 98% 100%, 100% 0)",
          }}
        />
        {/* Drop shadow under torn edge */}
        <div className="h-3 bg-gradient-to-b from-black/25 to-transparent" />
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function PerforatedDivider() {
  return (
    <div className="flex items-center px-2">
      {/* Left half-circle */}
      <div className="w-4 h-4 rounded-full bg-gray-100 shrink-0 -ml-2 shadow-inner" />
      {/* Dashed line */}
      <div className="flex-1 border-t-2 border-dashed border-gray-200 mx-1" />
      {/* Right half-circle */}
      <div className="w-4 h-4 rounded-full bg-gray-100 shrink-0 -mr-2 shadow-inner" />
    </div>
  );
}

function MetaRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between items-baseline gap-4">
      <span className="text-[11px] text-gray-400 uppercase tracking-wider shrink-0">
        {label}
      </span>
      <span
        className={cn(
          "text-[12px] text-gray-800 text-right truncate",
          bold && "font-bold",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function TotalRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "green";
}) {
  return (
    <div className="flex justify-between items-baseline">
      <span
        className={cn(
          "text-[11px] uppercase tracking-wider",
          accent === "green" ? "text-green-600" : "text-gray-400",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "text-[12px] font-semibold tabular-nums",
          accent === "green" ? "text-green-600" : "text-gray-700",
        )}
      >
        {value}
      </span>
    </div>
  );
}
