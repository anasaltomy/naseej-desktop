import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Zap } from "lucide-react";

import type { Color, Size, VariantQuantity } from "../types/Variants.types";
import MatrixCell from "./MatrixCell";

interface VariantMatrixProps {
  colors: Color[];
  sizes: Size[];
  quantities: VariantQuantity[];
  onQuantitiesChange: (quantities: VariantQuantity[]) => void;
}

export default function VariantMatrix({
  colors,
  sizes,
  quantities,
  onQuantitiesChange,
}: VariantMatrixProps) {
  const { t } = useTranslation();
  const [bulkQty, setBulkQty] = useState("");
  const [focusedCell, setFocusedCell] = useState<{
    colorId: string;
    sizeId: string;
  } | null>(null);

  const qtyMap = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const q of quantities) {
      map.set(`${q.colorId}-${q.sizeId}`, q.quantity);
    }
    return map;
  }, [quantities]);

  const getCellQty = useCallback(
    (colorId: string, sizeId: string): number | null => {
      return qtyMap.get(`${colorId}-${sizeId}`) ?? null;
    },
    [qtyMap],
  );

  const handleCellChange = useCallback(
    (colorId: string, sizeId: string, quantity: number | null) => {
      const key = `${colorId}-${sizeId}`;
      const existing = quantities.find(
        (q) => `${q.colorId}-${q.sizeId}` === key,
      );
      if (existing) {
        onQuantitiesChange(
          quantities.map((q) =>
            `${q.colorId}-${q.sizeId}` === key ? { ...q, quantity } : q,
          ),
        );
      } else {
        onQuantitiesChange([...quantities, { colorId, sizeId, quantity }]);
      }
    },
    [quantities, onQuantitiesChange],
  );

  const handleNavigate = useCallback(
    (
      colorId: string,
      sizeId: string,
      direction: "right" | "left" | "down" | "up",
    ) => {
      const colIdx = colors.findIndex((c) => c.id === colorId);
      const rowIdx = sizes.findIndex((s) => s.id === sizeId);

      let newCol = colIdx;
      let newRow = rowIdx;

      switch (direction) {
        case "right":
          if (colIdx < colors.length - 1) {
            newCol = colIdx + 1;
          } else if (rowIdx < sizes.length - 1) {
            newCol = 0;
            newRow = rowIdx + 1;
          }
          break;
        case "left":
          if (colIdx > 0) {
            newCol = colIdx - 1;
          } else if (rowIdx > 0) {
            newCol = colors.length - 1;
            newRow = rowIdx - 1;
          }
          break;
        case "down":
          if (rowIdx < sizes.length - 1) {
            newRow = rowIdx + 1;
          }
          break;
        case "up":
          if (rowIdx > 0) {
            newRow = rowIdx - 1;
          }
          break;
      }

      if (colors[newCol] && sizes[newRow]) {
        setFocusedCell({
          colorId: colors[newCol].id,
          sizeId: sizes[newRow].id,
        });
      }
    },
    [colors, sizes],
  );

  const handleFocusCell = useCallback((colorId: string, sizeId: string) => {
    setFocusedCell({ colorId, sizeId });
  }, []);

  const handleApplyBulkQty = useCallback(() => {
    const qty = parseInt(bulkQty, 10);
    if (isNaN(qty) || qty < 0) return;

    const updated = [...quantities];
    for (const color of colors) {
      for (const size of sizes) {
        const key = `${color.id}-${size.id}`;
        const existing = updated.find(
          (q) => `${q.colorId}-${q.sizeId}` === key,
        );
        if (!existing) {
          updated.push({ colorId: color.id, sizeId: size.id, quantity: qty });
        } else if (existing.quantity === null) {
          existing.quantity = qty;
        }
      }
    }
    onQuantitiesChange(updated);
    setBulkQty("");
  }, [bulkQty, colors, sizes, quantities, onQuantitiesChange]);

  if (colors.length === 0 || sizes.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
        {t("features.catalog.components.variantMatrix.emptyState")}
      </div>
    );
  }

  const filledCount = quantities.filter(
    (q) => q.quantity !== null && q.quantity > 0,
  ).length;
  const totalCells = colors.length * sizes.length;

  return (
    <div className="space-y-4">
      {/* Bulk quantity action */}
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
        <Zap className="w-4 h-4 text-accent shrink-0" />
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {t("features.catalog.components.variantMatrix.setQuantityForAll")}
        </span>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          value={bulkQty}
          onChange={(e) => setBulkQty(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleApplyBulkQty();
            }
          }}
          placeholder={t(
            "features.catalog.components.variantMatrix.placeholder",
          )}
          className="w-24 h-8 px-2.5 text-sm bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring tabular-nums"
        />
        <button
          type="button"
          onClick={handleApplyBulkQty}
          disabled={!bulkQty}
          className="btn-primary h-8 px-3 text-sm disabled:opacity-40"
        >
          {t("features.catalog.components.variantMatrix.apply")}
        </button>
        <span className="ml-auto text-xs text-muted-foreground">
          {filledCount}/{totalCells}{" "}
          {t("features.catalog.components.variantMatrix.variantsStocked")}
        </span>
      </div>

      {/* Matrix table */}
      <div className="overflow-auto max-h-[400px] rounded-lg border border-border">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-card">
            <tr>
              <th className="p-2 text-xs font-medium text-muted-foreground text-left border-b border-border w-20 sticky left-0 bg-card z-20">
                {t("features.catalog.components.variantMatrix.sizeColorHeader")}
              </th>
              {colors.map((color) => (
                <th
                  key={color.id}
                  className="p-2 text-xs font-medium text-foreground text-center border-b border-border min-w-[100px]"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    {color.hexCode && (
                      <span
                        className="w-3 h-3 rounded-full border border-border/50 shrink-0"
                        style={{ backgroundColor: color.hexCode }}
                      />
                    )}
                    <span className="truncate">{color.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sizes.map((size) => (
              <tr
                key={size.id}
                className="border-b border-border/50 last:border-b-0"
              >
                <td className="p-2 text-sm font-medium text-foreground sticky left-0 bg-card z-10 border-r border-border/50">
                  {size.name}
                </td>
                {colors.map((color) => (
                  <MatrixCell
                    key={`${color.id}-${size.id}`}
                    colorId={color.id}
                    sizeId={size.id}
                    value={getCellQty(color.id, size.id)}
                    onChange={handleCellChange}
                    onNavigate={handleNavigate}
                    isFocused={
                      focusedCell?.colorId === color.id &&
                      focusedCell?.sizeId === size.id
                    }
                    onFocus={handleFocusCell}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
