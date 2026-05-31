import { useState, useRef, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../../../../lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PopoverAlign = "start" | "center" | "end";
export type PopoverSide = "top" | "bottom" | "left" | "right";

export interface PopoverProps {
  open: boolean;
  onClose: () => void;
  trigger: ReactNode;
  children: ReactNode;
  align?: PopoverAlign;
  side?: PopoverSide;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Popover({
  open,
  onClose,
  trigger,
  children,
  align = "start",
  side = "bottom",
  className,
}: PopoverProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, resolvedSide: side });

  const computePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const gap = 6;
    const popoverHeight = popoverRef.current?.offsetHeight ?? 220;
    const popoverWidth  = popoverRef.current?.offsetWidth  ?? 180;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Determine actual side — flip if overflow
    let actualSide = side;
    if (side === "bottom" && rect.bottom + gap + popoverHeight > vh) {
      actualSide = "top";
    } else if (side === "top" && rect.top - gap - popoverHeight < 0) {
      actualSide = "bottom";
    }

    let top = 0;
    let left = 0;

    if (actualSide === "bottom") {
      top = rect.bottom + gap;
    } else if (actualSide === "top") {
      top = rect.top - gap - popoverHeight;
    } else if (actualSide === "left") {
      left = rect.left - gap - popoverWidth;
      top = rect.top;
    } else if (actualSide === "right") {
      left = rect.right + gap;
      top = rect.top;
    }

    if (actualSide === "bottom" || actualSide === "top") {
      if (align === "start")       left = rect.left;
      else if (align === "center") left = rect.left + rect.width / 2;
      else                         left = rect.right;
    }

    // Prevent horizontal overflow
    if (left + popoverWidth > vw - 8) left = vw - popoverWidth - 8;
    if (left < 8) left = 8;

    setPosition({ top, left, resolvedSide: actualSide });
  }, [align, side]);

  useEffect(() => {
    if (open) {
      // First pass: rough position with estimated height
      computePosition();
      // Second pass (next frame): re-compute once the popover is in the DOM
      // so offsetHeight is accurate for the flip calculation
      const raf = requestAnimationFrame(computePosition);
      return () => cancelAnimationFrame(raf);
    }
  }, [open, computePosition]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        onClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const transformOrigin: Record<PopoverSide, string> = {
    bottom: align === "end" ? "top right" : "top left",
    top: align === "end" ? "bottom right" : "bottom left",
    left: "top right",
    right: "top left",
  };

  const rs = position.resolvedSide;
  const translateYInit = rs === "bottom" ? -6 : rs === "top" ? 6 : 0;
  const translateXInit = rs === "left" ? 6 : rs === "right" ? -6 : 0;

  return (
    <div className="relative inline-block" ref={triggerRef}>
      {trigger}

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              key="popover"
              ref={popoverRef}
              role="dialog"
              aria-modal="false"
              initial={{ opacity: 0, scale: 0.94, y: translateYInit, x: translateXInit }}
              animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: translateYInit, x: translateXInit }}
              transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
              style={{
                position: "fixed",
                top: position.top,
                left: position.left,
                transformOrigin: transformOrigin[rs],
                ...(align === "center" ? { transform: "translateX(-50%)" } : {}),
                ...(align === "end" && rs !== "left" && rs !== "right"
                  ? { transform: "translateX(-100%)" }
                  : {}),
                zIndex: 850,
              }}
              className={cn(
                "min-w-[180px] bg-card border border-border rounded-xl shadow-xl shadow-black/30",
                "overflow-hidden",
                className,
              )}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

// ─── Popover Item ─────────────────────────────────────────────────────────────

export interface PopoverItemProps {
  onClick?: () => void;
  icon?: ReactNode;
  label: string;
  description?: string;
  destructive?: boolean;
  disabled?: boolean;
}

export function PopoverItem({
  onClick,
  icon,
  label,
  description,
  destructive = false,
  disabled = false,
}: PopoverItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors duration-100 cursor-pointer",
        "focus:outline-none focus:bg-muted",
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground hover:bg-muted",
        disabled && "opacity-40 cursor-not-allowed pointer-events-none",
      )}
    >
      {icon && (
        <span className={cn("shrink-0", destructive ? "text-destructive" : "text-muted-foreground")}>
          {icon}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
    </button>
  );
}

export function PopoverSeparator() {
  return <div className="my-1 h-px bg-border" />;
}
