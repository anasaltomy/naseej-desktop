import { useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/custom/modal/Modal";

interface CreateVariantModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateVariantModal({
  open,
  onClose,
  onSuccess,
}: CreateVariantModalProps) {
  const [name, setName] = useState("");
  const [values, setValues] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = useCallback(() => {
    setName("");
    setValues("");
    setErrors({});
    setIsSaving(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSave = useCallback(async () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Variant name is required";
    if (!values.trim()) newErrors.values = "At least one value is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    try {
      await window.api?.variantTypes.create({
        name: name.trim(),
        values: values.split(",").map((v) => v.trim()).filter(Boolean),
      });
      onSuccess?.();
      handleClose();
    } catch {
      setErrors({ form: "Failed to create variant. Please try again." });
    } finally {
      setIsSaving(false);
    }
  }, [name, values, onSuccess, handleClose]);

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
        onClick={handleSave}
        disabled={isSaving}
        className="btn-primary flex items-center gap-2 px-6 py-2"
      >
        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
        {isSaving ? "Saving..." : "Create Variant"}
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create Variant"
      description="Add a new variant type (e.g. Size, Color)"
      size="md"
      footer={footer}
    >
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Variant Name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Size, Color, Material"
            className={`pos-input ${errors.name ? "border-destructive ring-1 ring-destructive/30" : ""}`}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Values <span className="text-destructive">*</span>
          </label>
          <textarea
            value={values}
            onChange={(e) => setValues(e.target.value)}
            placeholder="Enter values separated by commas (e.g. S, M, L, XL)"
            rows={3}
            className={`pos-input resize-none ${errors.values ? "border-destructive ring-1 ring-destructive/30" : ""}`}
          />
          {errors.values && <p className="text-xs text-destructive">{errors.values}</p>}
          <p className="text-xs text-muted-foreground">Separate multiple values with commas</p>
        </div>
      </form>
    </Modal>
  );
}
