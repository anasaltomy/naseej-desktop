import { useState, useEffect } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InventoryLevelRecord } from "@/types/electron";

interface VariantStockRowProps {
  variantId: string;
}

export function VariantStockRow({ variantId }: VariantStockRowProps) {
  const [levels, setLevels] = useState<InventoryLevelRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    window.api?.inventory
      .getByVariant(variantId)
      .then((data) => {
        // IPC returns raw snake_case rows; map to camelCase
        const mapped = (data as unknown as Record<string, unknown>[]).map((row) => ({
          locationId: String(row.location_id ?? row.locationId ?? ""),
          locationName: String(row.location_name ?? row.locationName ?? ""),
          qty: Number(row.qty ?? 0),
          lowStockThreshold: Number(row.low_stock_threshold ?? row.lowStockThreshold ?? 5),
        }));
        setLevels(mapped);
      })
      .finally(() => setLoading(false));
  }, [variantId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-3 bg-muted/20 border-t border-border/30">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (levels.length === 0) {
    return (
      <div className="px-10 py-2 bg-muted/20 border-t border-border/30 text-xs text-muted-foreground">
        No stock locations found
      </div>
    );
  }

  return (
    <div className="bg-muted/20 border-t border-border/30 px-10 py-2.5 space-y-1.5">
      {levels.map((loc) => (
        <div key={loc.locationId} className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-foreground">{loc.locationName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-xs font-semibold tabular-nums",
                loc.qty === 0
                  ? "text-destructive"
                  : loc.qty <= loc.lowStockThreshold
                    ? "text-warning"
                    : "text-success",
              )}
            >
              {loc.qty} units
            </span>
            {loc.qty === 0 && (
              <span className="badge-destructive text-[10px]">Out</span>
            )}
            {loc.qty > 0 && loc.qty <= loc.lowStockThreshold && (
              <span className="badge-warning text-[10px]">Low</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default VariantStockRow;
