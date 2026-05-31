import { useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { TargetAndTransition } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "../../../../lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DrawerSide = "left" | "right" | "bottom";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: DrawerSide;
  title?: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
  width?: string; // tailwind class e.g. "w-80"
  className?: string;
}

// ─── Slide Variants by Side ──────────────────────────────────────────────────

const slideVariants: Record<
  DrawerSide,
  { hidden: TargetAndTransition; visible: TargetAndTransition }
> = {
  left: {
    hidden: { x: "-100%", opacity: 0 },
    visible: { x: 0, opacity: 1 },
  },
  right: {
    hidden: { x: "100%", opacity: 0 },
    visible: { x: 0, opacity: 1 },
  },
  bottom: {
    hidden: { y: "100%", opacity: 0 },
    visible: { y: 0, opacity: 1 },
  },
};

const panelClass: Record<DrawerSide, string> = {
  left: "inset-y-0 left-0 rounded-r-2xl",
  right: "inset-y-0 right-0 rounded-l-2xl",
  bottom: "inset-x-0 bottom-0 rounded-t-2xl",
};

const defaultWidth: Record<DrawerSide, string> = {
  left: "w-80",
  right: "w-80",
  bottom: "w-full h-[60vh]",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Drawer({
  open,
  onClose,
  side = "right",
  title,
  description,
  footer,
  children,
  width,
  className,
}: DrawerProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  const variants = slideVariants[side];
  const sidePanel = panelClass[side];
  const sizeClass = width ?? defaultWidth[side];

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[800] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <motion.aside
            key="drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "drawer-title" : undefined}
            initial={variants.hidden}
            animate={variants.visible}
            exit={variants.hidden}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              "fixed z-[801] bg-card border-border shadow-2xl shadow-black/40",
              "flex flex-col",
              sidePanel,
              sizeClass,
              side !== "bottom" && "border-l" && side === "left"
                ? "border-r"
                : "border-l",
              side === "bottom" && "border-t",
              className,
            )}
          >
            {/* Header */}
            {(title || description) && (
              <div className="flex items-start gap-3 p-5 pb-4 border-b border-border shrink-0">
                <div className="flex-1 min-w-0">
                  {title && (
                    <h2
                      id="drawer-title"
                      className="text-base font-semibold text-foreground"
                    >
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close drawer"
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="shrink-0 px-5 py-4 border-t border-border">
                {footer}
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
