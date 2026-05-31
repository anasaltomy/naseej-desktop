import { useState, useCallback, useEffect } from "react";
import { Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { Modal } from "@/components/ui/custom/modal/Modal";
import { useToast } from "@/components/ui/custom/toast";

type AdjustmentType = "restock" | "damage" | "loss" | "count" | "adjustment";
type InputMode = "delta" | "set";

interface LocationEntry {
  locationId: string;
  locationName: string;
  currentQty: number;
}

interface StockAdjustmentModalProps {
  open: boolean;
  onClose: () => void;
  variantId: string;
  variantLabel: string;
  locations: LocationEntry[];
  onSuccess: () => void;
}

const ADJUSTMENT_TYPES: { value: AdjustmentType; label: string; defaultMode: InputMode }[] = [
  { value: "restock",    label: "Restock",           defaultMode: "delta" },
  { value: "damage",     label: "Damage Writeoff",   defaultMode: "delta" },
  { value: "loss",       label: "Loss / Shrinkage",  defaultMode: "delta" },
  { value: "count",      label: "Physical Count",    defaultMode: "set"   },
  { value: "adjustment", label: "Manual Adjustment", defaultMode: "delta" },
];

export default function StockAdjustmentModal({
  open,
  onClose,
  variantId,
  variantLabel,
  locations,
  onSuccess,
}: StockAdjustmentModalProps) {
  const { toast } = useToast();
  const [locationId, setLocationId] = useState("");
  const [adjustType, setAdjustType] = useState<AdjustmentType>("restock");
  const [inputMode, setInputMode] = useState<InputMode>("delta");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setLocationId(locations[0]?.locationId ?? "");
      setAdjustType("restock");
      setInputMode("delta");
      setValue("");
      setNotes("");
      setError("");
    }
  }, [open, locations]);

  const handleTypeChange = (type: AdjustmentType) => {
    setAdjustType(type);
    const def = ADJUSTMENT_TYPES.find((t) => t.value === type);
    setInputMode(def?.defaultMode ?? "delta");
    setValue("");
  };

  const selectedLocation = locations.find((l) => l.locationId === locationId);
  const currentQty = selectedLocation?.currentQty ?? 0;

  const previewQty = (() => {
    const num = parseFloat(value);
    if (isNaN(num)) return currentQty;
    if (inputMode === "set") return Math.max(0, Math.round(num));
    const sign = adjustType === "damage" || adjustType === "loss" ? -1 : 1;
    return Math.max(0, currentQty + sign * Math.round(Math.abs(num)));
  })();

  const handleConfirm = useCallback(async () => {
    const num = parseFloat(value);
    if (!locationId) { setError("Select a location"); return; }
    if (isNaN(num) || num < 0) { setError("Enter a valid non-negative number"); return; }
    if (inputMode === "set" && num === currentQty) { onClose(); return; }

    setError("");
    setIsSaving(true);
    try {
      if (inputMode === "set") {
        await window.api?.inventory.setQty({ variantId, locationId, qty: Math.round(num) });
      } else {
        const sign = adjustType === "damage" || adjustType === "loss" ? -1 : 1;
        const delta = sign * Math.round(Math.abs(num));
        await window.api?.inventory.adjust({ variantId, locationId, delta });
      }
      toast({
        variant: "success",
        title: "Stock updated",
        description: `${selectedLocation?.locationName} now has ${previewQty} units`,
      });
      onSuccess();
      onClose();
    } catch {
      toast({ variant: "error", title: "Failed to update stock" });
    } finally {
      setIsSaving(false);
    }
  }, [value, locationId, inputMode, adjustType, currentQty, variantId, selectedLocation, previewQty, onSuccess, onClose, toast]);

  const footer = (
    <div className="flex justify-end gap-3">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition-colors"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleConfirm}
        disabled={isSaving}
        className="btn-primary flex items-center gap-2 px-6 py-2"
      >
        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
        {isSaving ? "Saving..." : "Confirm Adjustment"}
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Adjust Stock"
      description={variantLabel}
      size="md"
      footer={footer}
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {/* Location selector */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Location</label>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="pos-input"
            aria-label="Select location"
          >
            {locations.map((loc) => (
              <option key={loc.locationId} value={loc.locationId}>
                {loc.locationName} — current: {loc.currentQty} units
              </option>
            ))}
          </select>
        </div>

        {/* Adjustment type */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Adjustment Type</label>
          <div className="grid grid-cols-3 gap-2">
            {ADJUSTMENT_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => handleTypeChange(type.value)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
                  adjustType === type.value
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-card text-muted-foreground border-border hover:bg-muted"
                }`}
                aria-pressed={adjustType === type.value}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input mode toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">Input Mode</label>
          <button
            type="button"
            onClick={() => setInputMode((m) => (m === "delta" ? "set" : "delta"))}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring rounded"
            aria-label={`Switch to ${inputMode === "delta" ? "set to" : "delta"} mode`}
          >
            {inputMode === "delta" ? (
              <ToggleLeft className="w-5 h-5 text-accent" />
            ) : (
              <ToggleRight className="w-5 h-5 text-accent" />
            )}
            {inputMode === "delta" ? "+/- by amount" : "Set to quantity"}
          </button>
        </div>

        {/* Value input */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            {inputMode === "delta"
              ? adjustType === "damage" || adjustType === "loss"
                ? "Quantity to deduct"
                : "Quantity to add"
              : "New quantity"}
          </label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={inputMode === "delta" ? "e.g. 10" : `Current: ${currentQty}`}
            className="pos-input tabular-nums text-lg"
            aria-label="Quantity value"
          />
          {value !== "" && !isNaN(parseFloat(value)) && (
            <p className="text-xs text-muted-foreground">
              Result: <span className="font-semibold text-foreground">{previewQty} units</span>
              {" "}(was {currentQty})
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Notes <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Received from supplier, damaged in transit..."
            className="pos-input resize-none"
            aria-label="Adjustment notes"
          />
        </div>
      </div>
    </Modal>
  );
}
