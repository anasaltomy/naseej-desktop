import { useState, useCallback } from "react";
import { CheckCircle, Receipt, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/custom/modal/Modal";
import { cn, formatJOD } from "@/lib/utils";

interface CompleteOrderModalProps {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
  orderTotal?: number;
  receiptNumber?: string;
}

export default function CompleteOrderModal({
  open,
  onClose,
  onComplete,
  orderTotal = 0,
  receiptNumber = "RCP-0001",
}: CompleteOrderModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleComplete = useCallback(async () => {
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsProcessing(false);
    setCompleted(true);
    setTimeout(() => {
      onComplete?.();
      onClose();
      setCompleted(false);
    }, 1500);
  }, [onComplete, onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={completed ? "Order Complete" : "Complete Order"}
      size="sm"
    >
      <div className="flex flex-col items-center text-center py-4">
        {completed ? (
          <>
            <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Sale Complete!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Receipt {receiptNumber} · {formatJOD(orderTotal)}
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center mb-4">
              <Receipt className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              {formatJOD(orderTotal)}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Receipt #{receiptNumber}
            </p>
            <div className="flex gap-3 mt-6 w-full">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleComplete}
                disabled={isProcessing}
                className="flex-1 btn-primary flex items-center justify-center gap-2 px-4 py-2.5"
              >
                {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                {isProcessing ? "Processing..." : "Complete & Print"}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
