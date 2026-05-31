import { useState, useCallback } from "react";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/custom/modal/Modal";

interface CloseShiftModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
}

export default function CloseShiftModal({
  open,
  onClose,
  onConfirm,
}: CloseShiftModalProps) {
  const [managerPin, setManagerPin] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleClose = useCallback(() => {
    setManagerPin("");
    setError("");
    onClose();
  }, [onClose]);

  const handleConfirm = useCallback(async () => {
    if (!managerPin.trim()) {
      setError("Manager PIN is required to close shift");
      return;
    }
    if (managerPin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }

    setError("");
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsProcessing(false);
    onConfirm?.();
    handleClose();
  }, [managerPin, onConfirm, handleClose]);

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
        className="px-4 py-2 rounded-lg text-sm font-medium bg-destructive text-white hover:bg-destructive/90 disabled:opacity-50 flex items-center gap-2 transition-colors"
      >
        {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
        {isProcessing ? "Closing..." : "Close Shift"}
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Close Shift"
      description="Finalize all transactions and lock the register"
      size="sm"
      footer={footer}
      persistent
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">This action cannot be undone</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Closing the shift will lock the register. Manager PIN is required to reopen.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Manager PIN <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={managerPin}
              onChange={(e) => setManagerPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter PIN"
              className={`pos-input pl-10 tracking-widest ${error ? "border-destructive ring-1 ring-destructive/30" : ""}`}
              autoFocus
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>
    </Modal>
  );
}
