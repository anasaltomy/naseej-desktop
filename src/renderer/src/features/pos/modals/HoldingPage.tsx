import { useState } from "react";
import { Clock, ShoppingCart, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/custom/modal/Modal";
import { cn, formatJOD } from "@/lib/utils";

interface HeldReceipt {
  id: string;
  items: number;
  total: number;
  customerName?: string;
  heldAt: string;
}

interface HoldReceiptModalProps {
  open: boolean;
  onClose: () => void;
  onResume?: (receiptId: string) => void;
  onDelete?: (receiptId: string) => void;
}

// Mock held receipts
const MOCK_HELD_RECEIPTS: HeldReceipt[] = [
  { id: "HR-001", items: 3, total: 459.0, customerName: "Ahmed Al-Saud", heldAt: "10:35 AM" },
  { id: "HR-002", items: 1, total: 129.0, heldAt: "11:12 AM" },
  { id: "HR-003", items: 5, total: 875.5, customerName: "Fatima Hassan", heldAt: "12:45 PM" },
];

export default function HoldReceiptModal({
  open,
  onClose,
  onResume,
  onDelete,
}: HoldReceiptModalProps) {
  const [receipts] = useState<HeldReceipt[]>(MOCK_HELD_RECEIPTS);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Held Receipts"
      description="Resume or delete held transactions"
      size="md"
    >
      <div className="space-y-2">
        {receipts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <ShoppingCart className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No held receipts</p>
          </div>
        ) : (
          receipts.map((receipt) => (
            <div
              key={receipt.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{receipt.id}</p>
                  {receipt.customerName && (
                    <span className="text-xs text-muted-foreground">· {receipt.customerName}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {receipt.items} items · Held at {receipt.heldAt}
                </p>
              </div>
              <p className="text-sm font-medium text-foreground tabular-nums shrink-0">
                {formatJOD(receipt.total)}
              </p>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    onResume?.(receipt.id);
                    onClose();
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
                >
                  Resume
                </button>
                <button
                  onClick={() => onDelete?.(receipt.id)}
                  className="p-1.5 rounded-md text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Delete held receipt"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
