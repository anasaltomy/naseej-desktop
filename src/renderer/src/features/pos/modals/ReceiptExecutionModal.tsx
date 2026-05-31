import { useState } from "react";
import { Receipt, Eye, Printer } from "lucide-react";
import { Modal } from "@/components/ui/custom/modal/Modal";
import { cn, formatJOD } from "@/lib/utils";

interface ReceiptData {
  id: string;
  receiptNumber: string;
  time: string;
  total: number;
  paymentMethod: string;
  staffName: string;
  status: "completed" | "refunded" | "voided";
}

interface ReceiptExecutionModalProps {
  open: boolean;
  onClose: () => void;
  onView?: (receiptId: string) => void;
  onReprint?: (receiptId: string) => void;
}

// Mock receipts
const MOCK_RECEIPTS: ReceiptData[] = [
  { id: "1", receiptNumber: "RCP-0045", time: "09:15 AM", total: 325.0, paymentMethod: "CASH", staffName: "Ahmed", status: "completed" },
  { id: "2", receiptNumber: "RCP-0046", time: "09:42 AM", total: 189.5, paymentMethod: "CARD", staffName: "Ahmed", status: "completed" },
  { id: "3", receiptNumber: "RCP-0047", time: "10:05 AM", total: 459.0, paymentMethod: "CASH", staffName: "Sara", status: "refunded" },
  { id: "4", receiptNumber: "RCP-0048", time: "10:33 AM", total: 95.0, paymentMethod: "CARD", staffName: "Ahmed", status: "completed" },
  { id: "5", receiptNumber: "RCP-0049", time: "11:12 AM", total: 612.0, paymentMethod: "SPLIT", staffName: "Sara", status: "completed" },
];

export default function ReceiptExecutionModal({
  open,
  onClose,
  onView,
  onReprint,
}: ReceiptExecutionModalProps) {
  const [receipts] = useState<ReceiptData[]>(MOCK_RECEIPTS);

  const statusColors = {
    completed: "text-success bg-success/10",
    refunded: "text-warning bg-warning/10",
    voided: "text-destructive bg-destructive/10",
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Receipt Execution"
      description="View and manage completed transactions"
      size="lg"
    >
      <div className="space-y-2">
        {/* Summary bar */}
        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 border border-border mb-4">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase">Total Receipts</p>
            <p className="text-lg font-semibold text-foreground">{receipts.length}</p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase">Total Revenue</p>
            <p className="text-lg font-semibold text-accent tabular-nums">
              {formatJOD(receipts.reduce((sum, r) => sum + (r.status === "completed" ? r.total : 0), 0))}
            </p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase">Refunds</p>
            <p className="text-lg font-semibold text-warning tabular-nums">
              {receipts.filter((r) => r.status === "refunded").length}
            </p>
          </div>
        </div>

        {/* Receipt list */}
        {receipts.map((receipt) => (
          <div
            key={receipt.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{receipt.receiptNumber}</p>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize",
                  statusColors[receipt.status],
                )}>
                  {receipt.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {receipt.time} · {receipt.staffName} · {receipt.paymentMethod}
              </p>
            </div>
            <p className="text-sm font-medium text-foreground tabular-nums shrink-0">
              {formatJOD(receipt.total)}
            </p>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onView?.(receipt.id)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="View receipt"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onReprint?.(receipt.id)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Reprint receipt"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
