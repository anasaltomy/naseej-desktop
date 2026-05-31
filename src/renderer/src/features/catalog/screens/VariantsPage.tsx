import { useState, useEffect } from "react";
import { Plus, Pencil, Tags, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import CreateVariantModal from "../modals/CreateVariantModal";
import EditVariantModal from "../modals/EditVariantModal";

interface VariantType {
  id: string;
  name: string;
  values: string[];
}

export default function VariantsPage() {
  const [variants, setVariants] = useState<VariantType[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVariant, setEditingVariant] = useState<VariantType | null>(null);

  const reloadVariants = () => {
    window.api?.variantTypes.getAll().then((data) => setVariants(data ?? []));
  };

  useEffect(() => {
    reloadVariants();
  }, []);

  const handleEdit = (variant: VariantType) => {
    setEditingVariant(variant);
    setShowEditModal(true);
  };

  return (
    <>
      <div className="flex flex-col flex-1 overflow-hidden bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card shadow-sm shrink-0">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Variants</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage product variant types and their values
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-accent text-accent-foreground hover:bg-accent/90 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Variant
              </button>
            </div>
          </div>
        </div>

        {/* Variants List */}
        <div className="flex-1 overflow-y-auto mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 w-full">
          {variants.length === 0 ? (
            <div className="rounded-lg bg-card p-8 text-center">
              <Tags className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No variants defined yet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Create First Variant
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {variants.map((variant) => (
                <div
                  key={variant.id}
                  className="rounded-lg border border-border bg-card p-4 hover:border-accent/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-foreground">{variant.name}</h3>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {variant.values.map((val) => (
                          <span
                            key={val}
                            className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground border border-border"
                          >
                            {val}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-4">
                      <button
                        onClick={() => handleEdit(variant)}
                        className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label={`Edit ${variant.name}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 rounded-md text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        aria-label={`Delete ${variant.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Variant Modal */}
      <CreateVariantModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => { setShowCreateModal(false); reloadVariants(); }}
      />

      {/* Edit Variant Modal */}
      <EditVariantModal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingVariant(null);
        }}
        onSuccess={() => {
          setShowEditModal(false);
          setEditingVariant(null);
          reloadVariants();
        }}
        variant={editingVariant}
      />
    </>
  );
}
