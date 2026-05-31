import { useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/custom/modal/Modal";

interface EditWarehouseModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  warehouse?: {
    id: string;
    name: string;
    location: string;
    address: string;
    phone: string;
  } | null;
}

export default function EditWarehouseModal({
  open,
  onClose,
  onSuccess,
  warehouse,
}: EditWarehouseModalProps) {
  const [name, setName] = useState(warehouse?.name ?? "");
  const [location, setLocation] = useState(warehouse?.location ?? "");
  const [address, setAddress] = useState(warehouse?.address ?? "");
  const [phone, setPhone] = useState(warehouse?.phone ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleClose = useCallback(() => {
    setErrors({});
    onClose();
  }, [onClose]);

  const handleSave = useCallback(async () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Warehouse name is required";
    if (!location.trim()) newErrors.location = "Location is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!warehouse?.id) return;
    setIsSaving(true);
    try {
      await window.api?.locations.update({
        id: warehouse.id,
        name: name.trim(),
        city: location.trim(),
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      onSuccess?.();
      handleClose();
    } catch {
      setErrors({ form: "Failed to update warehouse. Please try again." });
    } finally {
      setIsSaving(false);
    }
  }, [name, location, address, phone, warehouse, onSuccess, handleClose]);

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
        {isSaving ? "Saving..." : "Update Warehouse"}
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Edit Warehouse"
      description="Modify warehouse details"
      size="md"
      footer={footer}
    >
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Warehouse Name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`pos-input ${errors.name ? "border-destructive ring-1 ring-destructive/30" : ""}`}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Location / City <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={`pos-input ${errors.location ? "border-destructive ring-1 ring-destructive/30" : ""}`}
          />
          {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Address</label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            className="pos-input resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="pos-input"
          />
        </div>
      </form>
    </Modal>
  );
}
