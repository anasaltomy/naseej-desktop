import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, ShieldCheck } from "lucide-react";
import CreateRoleModal from "../modals/CreateRoleModal";
import EditRoleModal from "../modals/EditRoleModal";

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const reloadRoles = () => {
    window.api?.roles.getAll().then((data) => setRoles(data ?? []));
  };

  useEffect(() => {
    reloadRoles();
  }, []);

  const handleDelete = (id: string) => {
    window.api?.roles.delete(id).then(() => reloadRoles());
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
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
                <h1 className="text-2xl font-bold text-foreground">Roles</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Define roles and their permission sets
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-accent text-accent-foreground hover:bg-accent/90 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Role
              </button>
            </div>
          </div>
        </div>

        {/* Roles List */}
        <div className="flex-1 overflow-y-auto mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 w-full">
          {roles.length === 0 ? (
            <div className="rounded-lg bg-card p-8 text-center">
              <ShieldCheck className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No roles defined yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="rounded-lg border border-border bg-card p-5 hover:border-accent/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-semibold text-foreground">{role.name}</h3>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {role.userCount} user{role.userCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{role.description}</p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {role.permissions.slice(0, 5).map((perm) => (
                          <span
                            key={perm}
                            className="px-2 py-0.5 text-xs rounded-full bg-accent/10 text-accent border border-accent/20"
                          >
                            {perm}
                          </span>
                        ))}
                        {role.permissions.length > 5 && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                            +{role.permissions.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-4">
                      <button
                        onClick={() => handleEdit(role)}
                        className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label={`Edit ${role.name}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 rounded-md text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        aria-label={`Delete ${role.name}`}
                        onClick={() => handleDelete(role.id)}
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

      {/* Create Role Modal */}
      <CreateRoleModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => { setShowCreateModal(false); reloadRoles(); }}
      />

      {/* Edit Role Modal */}
      <EditRoleModal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingRole(null);
        }}
        onSuccess={() => {
          setShowEditModal(false);
          setEditingRole(null);
          reloadRoles();
        }}
        role={editingRole}
      />
    </>
  );
}
