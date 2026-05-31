import { useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/custom/modal/Modal";

interface EditRoleModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  role?: {
    id: string;
    name: string;
    description: string;
    permissions: string[];
  } | null;
}

const AVAILABLE_PERMISSIONS = [
  { id: "pos:sell", name: "POS: Create Sales", group: "POS" },
  { id: "pos:refund", name: "POS: Process Refunds", group: "POS" },
  { id: "pos:end_of_day", name: "POS: End of Day", group: "POS" },
  { id: "pos:discount", name: "POS: Apply Discounts", group: "POS" },
  { id: "catalog:view", name: "Catalog: View Products", group: "Catalog" },
  { id: "catalog:create", name: "Catalog: Create Products", group: "Catalog" },
  { id: "catalog:edit", name: "Catalog: Edit Products", group: "Catalog" },
  { id: "catalog:delete", name: "Catalog: Delete Products", group: "Catalog" },
  { id: "inventory:view", name: "Inventory: View Stock", group: "Inventory" },
  { id: "inventory:edit", name: "Inventory: Adjust Stock", group: "Inventory" },
  { id: "users:view", name: "Users: View Users", group: "Users" },
  { id: "users:manage", name: "Users: Manage Users", group: "Users" },
  { id: "reports:view", name: "Reports: View Reports", group: "Reports" },
];

export default function EditRoleModal({
  open,
  onClose,
  onSuccess,
  role,
}: EditRoleModalProps) {
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(role?.permissions ?? []);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleClose = useCallback(() => {
    setErrors({});
    onClose();
  }, [onClose]);

  const togglePermission = useCallback((permId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId],
    );
  }, []);

  const handleSave = useCallback(async () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Role name is required";
    if (selectedPermissions.length === 0) newErrors.permissions = "Select at least one permission";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSaving(false);
    onSuccess?.();
    handleClose();
  }, [name, selectedPermissions, onSuccess, handleClose]);

  // Group permissions
  const groups = AVAILABLE_PERMISSIONS.reduce(
    (acc, perm) => {
      if (!acc[perm.group]) acc[perm.group] = [];
      acc[perm.group].push(perm);
      return acc;
    },
    {} as Record<string, typeof AVAILABLE_PERMISSIONS>,
  );

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
        {isSaving ? "Saving..." : "Update Role"}
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Edit Role"
      description="Modify role permissions and details"
      size="lg"
      footer={footer}
    >
      <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Role Name <span className="text-destructive">*</span>
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
          <label className="text-sm font-medium text-foreground">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="pos-input resize-none"
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            Permissions <span className="text-destructive">*</span>
          </label>
          {errors.permissions && <p className="text-xs text-destructive">{errors.permissions}</p>}

          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {Object.entries(groups).map(([groupName, perms]) => (
              <div key={groupName} className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {groupName}
                </p>
                <div className="grid grid-cols-1 gap-1">
                  {perms.map((perm) => (
                    <label
                      key={perm.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(perm.id)}
                        onChange={() => togglePermission(perm.id)}
                        className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                      />
                      <span className="text-sm text-foreground">{perm.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
