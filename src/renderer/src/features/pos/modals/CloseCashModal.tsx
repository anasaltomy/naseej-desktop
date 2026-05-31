import { useState, useCallback } from "react";
import { Banknote, Loader2, Calculator } from "lucide-react";
import { Modal } from "@/components/ui/custom/modal/Modal";
import { formatJOD } from "@/lib/utils";

interface CloseCashModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm?: (countedCash: number, safeDropAmount: number) => void;
  expectedCash?: number;
}

export default function CloseCashModal({
  open,
  onClose,
  onConfirm,
  expectedCash = 2450.0,
}: CloseCashModalProps) {
  const [countedCash, setCountedCash] = useState("");
  const [safeDropAmount, setSafeDropAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const counted = parseFloat(countedCash) || 0;
  const variance = counted - expectedCash;
  const hasVariance = Math.abs(variance) > 0.01;

  const handleClose = useCallback(() => {
    setCountedCash("");
    setSafeDropAmount("");
    setError("");
    onClose();
  }, [onClose]);

  const handleConfirm = useCallback(async () => {
    if (!countedCash.trim()) {
      setError("Please enter the counted cash amount");
      return;
    }

    setError("");
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setIsProcessing(false);
    onConfirm?.(counted, parseFloat(safeDropAmount) || 0);
    handleClose();
  }, [countedCash, counted, safeDropAmount, onConfirm, handleClose]);

  const footer = (
    <div className="flex justify-end gap-3">
      <button
        type="button"
        onClick={handleClose}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition-colors"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleConfirm}
        disabled={isProcessing}
        className="btn-primary flex items-center gap-2 px-6 py-2"
      >
        {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
        {isProcessing ? "Processing..." : "Confirm Cash Close"}
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Close Cash"
      description="Reconcile the cash register"
      size="md"
      footer={footer}
      persistent
    >
      <div className="space-y-4">
        {/* Expected vs Counted */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Expected</p>
            <p className="text-lg font-semibold text-foreground tabular-nums mt-1">
              {formatJOD(expectedCash)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Variance</p>
            <p className={`text-lg font-semibold tabular-nums mt-1 ${
              !countedCash ? "text-muted-foreground" : hasVariance ? "text-destructive" : "text-success"
            }`}>
              {countedCash ? (variance >= 0 ? "+" : "") + formatJOD(variance) : "—"}
            </p>
          </div>
        </div>

        {/* Counted Cash */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Counted Cash <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={countedCash}
              onChange={(e) => setCountedCash(e.target.value)}
              placeholder="Enter counted amount"
              className={`pos-input pl-10 tabular-nums ${error ? "border-destructive ring-1 ring-destructive/30" : ""}`}
              autoFocus
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        {/* Safe Drop */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Safe Drop Amount</label>
          <div className="relative">
            <Calculator className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={safeDropAmount}
              onChange={(e) => setSafeDropAmount(e.target.value)}
              placeholder="Amount removed for bank deposit"
              className="pos-input pl-10 tabular-nums"
            />
          </div>
          <p className="text-xs text-muted-foreground">Cash amount removed from drawer for deposit</p>
        </div>

        {/* Variance Warning */}
        {hasVariance && countedCash && (
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
            <p className="text-sm text-warning font-medium">
              Cash variance detected: {variance > 0 ? "+" : ""}{formatJOD(variance)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              This will be recorded in the shift report.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
