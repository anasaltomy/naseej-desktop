import React, { useEffect, useState } from "react";

interface SuccessToastProps {
  message: string;
  isVisible: boolean;
  onDismiss: () => void;
  duration?: number;
}

export const SuccessToast: React.FC<SuccessToastProps> = ({
  message,
  isVisible,
  onDismiss,
  duration = 3000,
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible);

  useEffect(() => {
    if (!isVisible) {
      // Add delay to allow fade-out animation
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }

    setShouldRender(true);

    // Auto-dismiss after duration
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [isVisible, duration, onDismiss]);

  if (!shouldRender) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`
        fixed top-4 right-4 z-50
        max-w-sm rounded-lg bg-success px-4 py-3
        shadow-lg
        transition-opacity duration-300 ease-out
        ${isVisible ? "opacity-100" : "opacity-0"}
      `}
    >
      <div className="flex items-center gap-3">
        <svg
          className="h-5 w-5 text-white"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <p className="text-sm font-medium text-success-foreground">{message}</p>
      </div>
    </div>
  );
};
