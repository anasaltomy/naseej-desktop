import { useEffect, useCallback } from "react";
import { CheckCircle2, Printer, ArrowRight, X } from "lucide-react";
import type { SavedProductResult } from "../types/product";
import { useTranslation } from "react-i18next";

interface PostSaveModalProps {
  isOpen: boolean;
  product: SavedProductResult | null;
  onPrintNow: () => void;
  onGoToBarcodeScreen: () => void;
  onExit: () => void;
}

export default function PostSaveModal({
  isOpen,
  product,
  onPrintNow,
  onGoToBarcodeScreen,
  onExit,
}: PostSaveModalProps) {
  const { t } = useTranslation();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onExit();
      }
    },
    [onExit],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-sm"
        onClick={onExit}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-card border border-border rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onExit}
          className="absolute top-4 right-4 p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={t('features.catalog.components.postSaveModal.close')}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Success icon */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-success/15 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-7 h-7 text-success" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            {t('features.catalog.components.postSaveModal.productSaved')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-medium text-foreground">{product.name}</span>
            {" · "}
            <span className="tabular-nums">{product.modelNumber}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {product.variants.length} {product.variants.length !== 1 ? t('features.catalog.components.postSaveModal.variantsCreated') : t('features.catalog.components.postSaveModal.variantCreated')} {t('features.catalog.components.postSaveModal.created')}
          </p>
        </div>

        {/* Action heading */}
        <p className="text-sm font-medium text-foreground mb-4 text-center">
          {t('features.catalog.components.postSaveModal.printQuestion')}
        </p>

        {/* Action buttons */}
        <div className="space-y-2.5">
          <button
            onClick={onPrintNow}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            <Printer className="w-4 h-4" />
            {t('features.catalog.components.postSaveModal.printNow')}
          </button>

          <button
            onClick={onGoToBarcodeScreen}
            className="btn-secondary w-full flex items-center justify-center gap-2 py-3"
          >
            <ArrowRight className="w-4 h-4" />
            {t('features.catalog.components.postSaveModal.goToBarcodeScreen')}
          </button>

          <button onClick={onExit} className="btn-ghost w-full py-3 text-sm">
            {t('features.catalog.components.postSaveModal.exitWithoutPrinting')}
          </button>
        </div>
      </div>
    </div>
  );
}
