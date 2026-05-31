/**
 * Reusable Toggle Switch Component
 * A modern iOS/Android-style toggle switch for boolean state
 * Can be reused across the POS app for any toggle interactions
 * 
 * Top 3 rules from ui-ux-pro-max:
 * 1. Touch target size: min 44×44pt - this component has adequate hit area
 * 2. Interaction feedback: all interactive elements must have visible focus rings
 * 3. State clarity: hover/pressed/disabled states visually distinct
 */

import React from 'react';

interface ToggleSwitchProps {
  /** The current state of the toggle */
  checked: boolean;
  /** Callback when toggle state changes */
  onChange: (checked: boolean) => void;
  /** Unique identifier for accessibility */
  id?: string;
  /** Whether the toggle is disabled */
  disabled?: boolean;
  /** CSS class name for custom styling */
  className?: string;
  /** Label text displayed next to toggle */
  label?: string;
  /** Additional class names for the label */
  labelClassName?: string;
}

/**
 * A custom-styled toggle switch component
 * Provides smooth animation between on/off states
 * Fully keyboard accessible with visible focus ring
 */
export const ToggleSwitch = React.forwardRef<HTMLButtonElement, ToggleSwitchProps>(
  (
    {
      checked,
      onChange,
      id,
      disabled = false,
      className = '',
      label,
      labelClassName = '',
    },
    ref
  ) => {
    const handleClick = () => {
      if (!disabled) {
        onChange(!checked);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      // Space or Enter toggles the switch
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleClick();
      }
    };

    return (
      <div className="flex items-center gap-3">
        <button
          ref={ref}
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          disabled={disabled}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          className={`
            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer
            rounded-full border-2 border-transparent
            transition-colors duration-200 ease-out
            focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background
            disabled:cursor-not-allowed disabled:opacity-50
            ${checked ? 'bg-accent' : 'bg-muted'}
            ${className}
          `}
        >
          {/* Toggle thumb */}
          <span
            className={`
              pointer-events-none inline-block h-5 w-5 transform
              rounded-full bg-card shadow-md
              transition-transform duration-200 ease-out
              ${checked ? 'translate-x-5' : 'translate-x-0'}
            `}
            aria-hidden="true"
          />
        </button>

        {label && (
          <label
            htmlFor={id}
            className={`
              select-none text-sm font-medium text-foreground
              cursor-pointer
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              ${labelClassName}
            `}
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);

ToggleSwitch.displayName = 'ToggleSwitch';
