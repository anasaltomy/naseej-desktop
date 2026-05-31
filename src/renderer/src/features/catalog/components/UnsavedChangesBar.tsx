/**
 * Unsaved Changes Confirmation Bar Component
 * Slides up from footer with confirmation options when user tries to leave with unsaved changes
 * 
 * Top 3 rules from ui-ux-pro-max:
 * 1. Animation: smooth slide-up from bottom (~200ms)
 * 2. Escape routes: always provide cancel/back options in flows
 * 3. Clear feedback: both buttons visually distinct (primary vs secondary)
 */

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface UnsavedChangesBarProps {
  /** Whether the bar should be visible */
  isVisible: boolean;
  /** Callback when user clicks "Leave" button */
  onLeave: () => void;
  /** Callback when user clicks "Keep Editing" button */
  onKeepEditing: () => void;
}

/**
 * Renders an inline confirmation bar that slides up from the footer
 * Shows when user tries to leave with unsaved changes
 */
export const UnsavedChangesBar: React.FC<UnsavedChangesBarProps> = ({
  isVisible,
  onLeave,
  onKeepEditing,
}) => {
  const { t } = useTranslation();
  useEffect(() => {
    if (!isVisible) return;

    // Handle Escape key to close the bar
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onKeepEditing();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, onKeepEditing]);

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-50
        border-t border-border bg-card shadow-lg
        transition-transform duration-200 ease-out
        ${isVisible ? 'translate-y-0' : 'translate-y-full'}
      `}
    >
      <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-foreground">
            {t('features.catalog.components.unsavedChangesBar.message')}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onKeepEditing}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium
                transition-colors duration-150
                focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background
                bg-muted text-foreground
                border border-border
                hover:bg-muted/80
              `}
            >
              {t('features.catalog.components.unsavedChangesBar.keepEditing')}
            </button>
            <button
              type="button"
              onClick={onLeave}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium
                transition-colors duration-150
                focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background
                bg-destructive text-destructive-foreground
                hover:bg-destructive/90
              `}
            >
              {t('features.catalog.components.unsavedChangesBar.leave')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
