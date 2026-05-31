import { useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/custom/modal/Modal";

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const AVAILABLE_ROLES = [
  { id: "cashier", name: "Cashier" },
  { id: "senior_cashier", name: "Senior Cashier" },
  { id: "store_manager", name: "Store Manager" },
  { id: "admin", name: "Admin" },
];

export default function CreateUserModal({
  open,
  onClose,
  onSuccess,
}: CreateUserModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roleId, setRoleId] = useState("");
  const [pin, setPin] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = useCallback(() => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setRoleId("");
    setPin("");
    setErrors({});
    setIsSaving(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSave = useCallback(async () => {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = "First name is required";
    if (!lastName.trim()) newErrors.lastName = "Last name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    if (!roleId) newErrors.roleId = "Role is required";
    if (!pin || pin.length < 4) newErrors.pin = "PIN must be at least 4 digits";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSaving(false);
    onSuccess?.();
    handleClose();
  }, [firstName, lastName, email, roleId, pin, onSuccess, handleClose]);

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
        {isSaving ? "Creating..." : "Create User"}
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create User"
      description="Add a new user to the system"
      size="md"
      footer={footer}
    >
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              First Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className={`pos-input ${errors.firstName ? "border-destructive ring-1 ring-destructive/30" : ""}`}
            />
            {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Last Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className={`pos-input ${errors.lastName ? "border-destructive ring-1 ring-destructive/30" : ""}`}
            />
            {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Email <span className="text-destructive">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className={`pos-input ${errors.email ? "border-destructive ring-1 ring-destructive/30" : ""}`}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+966 5X XXX XXXX"
            className="pos-input"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Role <span className="text-destructive">*</span>
          </label>
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className={`pos-input ${errors.roleId ? "border-destructive ring-1 ring-destructive/30" : ""}`}
          >
            <option value="">Select a role...</option>
            {AVAILABLE_ROLES.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          {errors.roleId && <p className="text-xs text-destructive">{errors.roleId}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            PIN Code <span className="text-destructive">*</span>
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="4-6 digit PIN"
            className={`pos-input tracking-widest ${errors.pin ? "border-destructive ring-1 ring-destructive/30" : ""}`}
          />
          {errors.pin && <p className="text-xs text-destructive">{errors.pin}</p>}
          <p className="text-xs text-muted-foreground">Used for quick login at the POS terminal</p>
        </div>
      </form>
    </Modal>
  );
}
