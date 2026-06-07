import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Search, RotateCcw, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/custom/modal/Modal";
import { cn, formatJOD } from "@/lib/utils";

interface RefundItem {
  id: string;
  variantId?: string;
  productName: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  selected: boolean;
  refundQty: number;
}

interface RefundModalProps {
  open: boolean;
  onClose: () => void;
  onRefund?: (items: RefundItem[], method: string) => void;
}

export default function RefundModal({
  open,
  onClose,
  onRefund,
}: RefundModalProps) {
  const { t } = useTranslation();
  const [receiptNumber, setReceiptNumber] = useState("");
  const [orderLoaded, setOrderLoaded] = useState(false);
  const [orderNotFound, setOrderNotFound] = useState(false);
  const [loadedOrder, setLoadedOrder] = useState<{ id: string } | null>(null);
  const [items, setItems] = useState<RefundItem[]>([]);
  const [refundMethod, setRefundMethod] = useState<"cash" | "card" | "credit">("cash");
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!receiptNumber.trim()) return;
    setIsSearching(true);
    setOrderNotFound(false);
    try {
      const order = await window.api?.orders.getByReceiptNumber(receiptNumber.trim());
      if (!order) {
        setOrderLoaded(false);
        setItems([]);
        setLoadedOrder(null);
        setOrderNotFound(true);
        return;
      }
      setLoadedOrder({ id: order.id });
      setItems(
        order.items.map((item) => ({
          id: item.id,
          variantId: (item as { variantId?: string }).variantId,
          productName: item.productName,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          selected: false,
          refundQty: 0,
        })),
      );
      setOrderLoaded(true);
    } finally {
      setIsSearching(false);
    }
  }, [receiptNumber]);

  const toggleItem = useCallback((itemId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, selected: !item.selected, refundQty: item.selected ? 0 : item.quantity }
          : item,
      ),
    );
  }, []);

  const selectedItems = items.filter((i) => i.selected);
  const refundTotal = selectedItems.reduce((sum, i) => sum + i.refundQty * i.unitPrice, 0);

  const handleRefund = useCallback(async () => {
    if (!selectedItems.length || !loadedOrder) return;
    setIsProcessing(true);
    try {
      // Restore inventory for each refunded item that has a variant reference
      for (const item of selectedItems) {
        if (item.variantId) {
          await window.api?.inventory.adjust({
            variantId: item.variantId,
            locationId: "loc1",
            delta: item.refundQty,
          });
        }
      }
      await window.api?.orders.updateStatus({ id: loadedOrder.id, status: "refunded" });
      onRefund?.(selectedItems, refundMethod);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  }, [selectedItems, loadedOrder, refundMethod, onRefund, onClose]);

  const handleClose = useCallback(() => {
    setReceiptNumber("");
    setOrderLoaded(false);
    setOrderNotFound(false);
    setLoadedOrder(null);
    setItems([]);
    setRefundMethod("cash");
    onClose();
  }, [onClose]);

  const footer = orderLoaded ? (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground">
          {selectedItems.length} item(s) selected
        </p>
        <p className="text-base font-semibold text-foreground tabular-nums">
          Refund: {formatJOD(refundTotal)}
        </p>
      </div>
      <button
        type="button"
        onClick={handleRefund}
        disabled={isProcessing || selectedItems.length === 0}
        className="btn-primary flex items-center gap-2 px-6 py-2 bg-destructive hover:bg-destructive/90 disabled:opacity-50"
      >
        {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
        {isProcessing ? "Processing..." : "Process Refund"}
      </button>
    </div>
  ) : undefined;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Process Refund"
      description="Search receipt to initiate a refund"
      size="lg"
      footer={footer}
    >
      <div className="space-y-4">
        {/* Receipt Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Enter receipt number or scan barcode..."
              className="pos-input pl-10"
              autoFocus
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSearching && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Search
          </button>
        </div>

        {orderNotFound && (
          <p className="text-sm text-destructive text-center">
            {t('empty.noProductMatching')} receipt "{receiptNumber}"
          </p>
        )}

        {/* Order Items */}
        {orderLoaded && (
          <>
            <div className="space-y-2">
              {items.map((item) => (
                <label
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    item.selected
                      ? "border-destructive/50 bg-destructive/5"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => toggleItem(item.id)}
                    className="w-4 h-4 rounded border-border text-destructive focus:ring-destructive"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.size} · {item.color} · Qty: {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-foreground tabular-nums">
                    {formatJOD(item.unitPrice * item.quantity)}
                  </p>
                </label>
              ))}
            </div>

            {/* Refund Method */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Refund Method</label>
              <div className="flex gap-2">
                {(["cash", "card", "credit"] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setRefundMethod(method)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium border transition-colors capitalize",
                      refundMethod === method
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {method === "credit" ? "Store Credit" : method}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {!orderLoaded && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <RotateCcw className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Enter a receipt number to load the order</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
