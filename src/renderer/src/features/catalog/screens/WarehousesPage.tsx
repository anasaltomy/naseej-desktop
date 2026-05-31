import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Warehouse, MapPin, Phone } from "lucide-react";
import CreateWarehouseModal from "../modals/CreateWarehouseModal";
import EditWarehouseModal from "../modals/EditWarehouseModal";

interface WarehouseItem {
  id: string;
  name: string;
  location: string;
  address: string;
  phone: string;
  productCount: number;
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseItem | null>(null);

  const reloadWarehouses = () => {
    window.api?.locations.getAll().then((data) => setWarehouses(data ?? []));
  };

  useEffect(() => {
    reloadWarehouses();
  }, []);

  const handleEdit = (warehouse: WarehouseItem) => {
    setEditingWarehouse(warehouse);
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
                <h1 className="text-2xl font-bold text-foreground">Warehouses</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage storage locations and branches
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-accent text-accent-foreground hover:bg-accent/90 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Warehouse
              </button>
            </div>
          </div>
        </div>

        {/* Warehouses List */}
        <div className="flex-1 overflow-y-auto mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 w-full">
          {warehouses.length === 0 ? (
            <div className="rounded-lg bg-card p-8 text-center">
              <Warehouse className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No warehouses yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {warehouses.map((wh) => (
                <div
                  key={wh.id}
                  className="rounded-lg border border-border bg-card p-5 hover:border-accent/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Warehouse className="w-4 h-4 text-accent" />
                        <h3 className="text-sm font-semibold text-foreground">{wh.name}</h3>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {wh.productCount} products
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {wh.address}, {wh.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {wh.phone}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-4">
                      <button
                        onClick={() => handleEdit(wh)}
                        className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label={`Edit ${wh.name}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 rounded-md text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        aria-label={`Delete ${wh.name}`}
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

      {/* Create Warehouse Modal */}
      <CreateWarehouseModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => { setShowCreateModal(false); reloadWarehouses(); }}
      />

      {/* Edit Warehouse Modal */}
      <EditWarehouseModal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingWarehouse(null);
        }}
        onSuccess={() => {
          setShowEditModal(false);
          setEditingWarehouse(null);
          reloadWarehouses();
        }}
        warehouse={editingWarehouse}
      />
    </>
  );
}
