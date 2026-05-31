import { ipcMain } from "electron";
import { getDb } from "../db/database";

type Row = Record<string, unknown>;

/** IPC handlers for variant types (e.g. Size, Color, Material). */
export function registerVariantTypeHandlers(): void {
  const db = () => getDb();

  ipcMain.handle("variantTypes:getAll", () => {
    const types = db()
      .prepare("SELECT * FROM variant_types ORDER BY name")
      .all() as Row[];
    const values = db()
      .prepare("SELECT * FROM variant_type_values ORDER BY variant_type_id")
      .all() as Row[];
    return types.map((t) => ({
      id: t.id,
      name: t.name,
      values: values
        .filter((v) => v.variant_type_id === t.id)
        .map((v) => v.value as string),
    }));
  });

  ipcMain.handle(
    "variantTypes:create",
    (_event, data: { name: string; values: string[] }) => {
      const id = `vt-${Date.now()}`;
      const insertType = db().prepare(
        "INSERT INTO variant_types (id, name) VALUES (?, ?)",
      );
      const insertVal = db().prepare(
        "INSERT INTO variant_type_values (id, variant_type_id, value) VALUES (?, ?, ?)",
      );
      db().transaction(() => {
        insertType.run(id, data.name);
        data.values.forEach((val, idx) =>
          insertVal.run(`vtv-${id}-${idx}`, id, val),
        );
      })();
      return { id };
    },
  );

  ipcMain.handle(
    "variantTypes:update",
    (
      _event,
      { id, ...data }: { id: string; name?: string; values?: string[] },
    ) => {
      db().transaction(() => {
        if (data.name !== undefined) {
          db()
            .prepare("UPDATE variant_types SET name = ? WHERE id = ?")
            .run(data.name, id);
        }
        if (data.values !== undefined) {
          db()
            .prepare(
              "DELETE FROM variant_type_values WHERE variant_type_id = ?",
            )
            .run(id);
          const insertVal = db().prepare(
            "INSERT INTO variant_type_values (id, variant_type_id, value) VALUES (?, ?, ?)",
          );
          data.values.forEach((val, idx) =>
            insertVal.run(`vtv-${id}-${idx}-${Date.now()}`, id, val),
          );
        }
      })();
    },
  );

  ipcMain.handle("variantTypes:delete", (_event, id: string) => {
    db().prepare("DELETE FROM variant_types WHERE id = ?").run(id);
  });
}
