import React, { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { ChipMultiSelect } from "@/components/ui/ChipMultiSelect";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import type { Size } from "../types/Variants.types";

interface StandardSizesToggleProps {
  hasStandardSizes: boolean;
  onToggle: () => void;
  sizes: Size[];
  selectedSizes: Set<string>;
  onToggleSize: (sizeId: string) => void;
  onSelectAll: (sizeIds: string[]) => void;
  onClearAll: () => void;
  error?: string;
}

export const StandardSizesToggle: React.FC<StandardSizesToggleProps> = ({
  hasStandardSizes,
  onToggle,
  sizes,
  selectedSizes,
  onToggleSize,
  onSelectAll,
  onClearAll,
  error,
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Move focus to first chip when toggle turns on
  useEffect(() => {
    if (hasStandardSizes && contentRef.current) {
      // Find first button in the chip grid and focus it
      const firstButton = contentRef.current.querySelector("button");
      if (firstButton) {
        setTimeout(() => firstButton.focus(), 100);
      }
    }
  }, [hasStandardSizes]);

  return (
    <div className="space-y-3">
      {/* Toggle Switch */}
      <div className="flex items-start gap-2">
        <ToggleSwitch
          id="standard-sizes"
          checked={hasStandardSizes}
          onChange={onToggle}
          label={t(
            "features.catalog.components.standardSizesToggle.standardSizes",
          )}
        />
        <button
          type="button"
          title="When enabled, these sizes will be pre-selected every time a product is added to this category. You can still change them per product."
          className={`
            mt-1 inline-flex items-center justify-center
            h-5 w-5 rounded-full
            text-muted-foreground hover:text-foreground
            focus:outline-none focus:ring-2 focus:ring-ring
            transition-colors duration-150
          `}
        >
          <span className="text-lg leading-none">ⓘ</span>
        </button>
      </div>

      {/* Hint or Content */}
      {!hasStandardSizes ? (
        <p className="text-sm italic text-muted-foreground">
          {t("features.catalog.components.standardSizesToggle.noStandardSizes")}
        </p>
      ) : (
        <div
          ref={containerRef}
          className={`
            overflow-hidden transition-all duration-250 ease-out
            ${hasStandardSizes ? "opacity-100" : "opacity-0"}
          `}
        >
          <div
            ref={contentRef}
            className={`
              space-y-4 rounded-lg bg-card p-4
              border border-border
            `}
          >
            <ChipMultiSelect
              items={sizes}
              selectedIds={selectedSizes}
              onToggleItem={onToggleSize}
              onSelectAll={() => onSelectAll(sizes.map((s) => s.id))}
              onClearAll={onClearAll}
              selectAllLabel={t(
                "features.catalog.components.standardSizesToggle.selectAllSizes",
              )}
              clearAllLabel={t(
                "features.catalog.components.standardSizesToggle.clearAll",
              )}
            />

            {/* Error message */}
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
