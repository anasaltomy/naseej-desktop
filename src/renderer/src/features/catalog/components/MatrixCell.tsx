import { memo, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface MatrixCellProps {
  colorId: string;
  sizeId: string;
  value: number | null;
  onChange: (colorId: string, sizeId: string, quantity: number | null) => void;
  onNavigate: (
    colorId: string,
    sizeId: string,
    direction: "right" | "left" | "down" | "up"
  ) => void;
  isFocused: boolean;
  onFocus: (colorId: string, sizeId: string) => void;
}

const MatrixCell = memo(function MatrixCell({
  colorId,
  sizeId,
  value,
  onChange,
  onNavigate,
  isFocused,
  onFocus,
}: MatrixCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isFocused]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw === "") {
        onChange(colorId, sizeId, null);
      } else {
        const num = parseInt(raw, 10);
        if (!isNaN(num) && num >= 0) {
          onChange(colorId, sizeId, num);
        }
      }
    },
    [colorId, sizeId, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case "Tab":
          e.preventDefault();
          onNavigate(colorId, sizeId, e.shiftKey ? "left" : "right");
          break;
        case "ArrowRight":
          if (
            inputRef.current &&
            inputRef.current.selectionStart === inputRef.current.value.length
          ) {
            e.preventDefault();
            onNavigate(colorId, sizeId, "right");
          }
          break;
        case "ArrowLeft":
          if (inputRef.current && inputRef.current.selectionStart === 0) {
            e.preventDefault();
            onNavigate(colorId, sizeId, "left");
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          onNavigate(colorId, sizeId, "down");
          break;
        case "ArrowUp":
          e.preventDefault();
          onNavigate(colorId, sizeId, "up");
          break;
        case "Enter":
          e.preventDefault();
          onNavigate(colorId, sizeId, "down");
          break;
      }
    },
    [colorId, sizeId, onNavigate]
  );

  const hasValue = value !== null && value > 0;

  return (
    <td className="p-1">
      <input
        ref={inputRef}
        type="number"
        inputMode="numeric"
        min="0"
        step="1"
        value={value ?? ""}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => onFocus(colorId, sizeId)}
        placeholder="Qty"
        className={cn(
          "w-full h-9 px-2 text-sm text-center rounded-md outline-none transition-all tabular-nums",
          hasValue
            ? "bg-accent/10 border border-accent/30 text-foreground focus:ring-2 focus:ring-accent/40"
            : "bg-transparent border border-dashed border-border text-muted-foreground focus:border-accent focus:ring-1 focus:ring-accent/30"
        )}
      />
    </td>
  );
});

export default MatrixCell;
