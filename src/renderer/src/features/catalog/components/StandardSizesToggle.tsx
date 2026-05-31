/**
 * Standard Sizes Toggle Component
 * Manages the toggle switch and animated reveal of the sizes selector
 *
 * Top 3 rules from ui-ux-pro-max:
 * 1. Animation: smooth height and fade transition (250ms ease-out)
 * 2. Focus management: focus moves to first chip when toggle turns on
 * 3. State clarity: disabled state for toggle is visually distinct
 */

import React, { useRef, useEffect } from "react";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { ChipMultiSelect } from "@/components/ui/ChipMultiSelect";
import type { Size } from "../types/category.types";
import { useTranslation } from "react-i18next";

interface StandardSizesToggleProps {
  /** Whether standard sizes are enabled */
  hasStandardSizes: boolean;
  /** Callback when toggle changes */
  onToggle: () => void;
  /** All available sizes */
  sizes: Size[];
  /** Currently selected size IDs */
  selectedSizes: Set<string>;
  /** Callback when a size is toggled */
  onToggleSize: (sizeId: string) => void;
  /** Callback to select all sizes */
  onSelectAll: (sizeIds: string[]) => void;
  /** Callback to clear all sizes */
  onClearAll: () => void;
  /** Error message if validation failed */
  error?: string;
}

/**
 * Renders the standard sizes toggle with animated reveal of chip selector
 * When toggle is ON, shows a smooth height/fade transition
 * When toggle is OFF, hides the selector with hint text
 */
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
          label={t('features.catalog.components.standardSizesToggle.standardSizes')}
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
          {t('features.catalog.components.standardSizesToggle.noStandardSizes')}
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
              selectAllLabel={t('features.catalog.components.standardSizesToggle.selectAllSizes')}
              clearAllLabel={t('features.catalog.components.standardSizesToggle.clearAll')}
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
