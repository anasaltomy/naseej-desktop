import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Upload, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { Modal } from "@/components/ui/custom/modal/Modal";
import { useToast } from "@/components/ui/custom/toast";
import { cn } from "@/lib/utils";

interface ParsedRow {
  productName: string;
  sku: string;
  barcode?: string;
  size: string;
  color: string;
  colorHex: string;
  price: number;
  // validation
  _errors: string[];
}

function parseCsv(csv: string): ParsedRow[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Parse a CSV line respecting quoted fields
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const idx = (name: string) => headers.indexOf(name);

  return lines.slice(1).map((line) => {
    const cols = parseLine(line);
    const get = (name: string) => cols[idx(name)]?.trim() ?? "";

    const productName = get("product_name");
    const sku        = get("sku");
    const size       = get("size");
    const color      = get("color");
    const priceStr   = get("price");
    const price      = parseFloat(priceStr);
    const barcode    = get("barcode") || undefined;
    const colorHex   = get("color_hex") || "#888888";

    const _errors: string[] = [];
    if (!productName)        _errors.push("product_name required");
    if (!sku)                _errors.push("sku required");
    if (!size)               _errors.push("size required");
    if (!color)              _errors.push("color required");
    if (isNaN(price) || price <= 0) _errors.push("invalid price");

    return { productName, sku, barcode, size, color, colorHex, price, _errors };
  });
}

interface ImportProductsModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportProductsModal({
  open,
  onClose,
  onSuccess,
}: ImportProductsModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handlePickFile = useCallback(async () => {
    setIsLoading(true);
    try {
      const csv = await window.api?.products.openCsvFile();
      if (!csv) return;
      const parsed = parseCsv(csv);
      setRows(parsed);
      setFileName("products.csv");
    } catch {
      toast({ variant: "error", title: "Could not read file" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleImport = useCallback(async () => {
    const valid = rows.filter((r) => r._errors.length === 0);
    if (valid.length === 0) return;
    setIsImporting(true);
    try {
      const result = await window.api?.products.importBatch(
        valid.map(({ _errors: _e, ...r }) => r),
      );
      toast({
        variant: "success",
        title: `Imported ${result?.count ?? 0} row${(result?.count ?? 0) !== 1 ? "s" : ""}`,
      });
      onSuccess();
      onClose();
    } catch {
      toast({ variant: "error", title: "Import failed" });
    } finally {
      setIsImporting(false);
    }
  }, [rows, onSuccess, onClose, toast]);

  const handleClose = () => {
    setRows([]);
    setFileName("");
    onClose();
  };

  const validCount   = rows.filter((r) => r._errors.length === 0).length;
  const invalidCount = rows.filter((r) => r._errors.length > 0).length;
  const preview      = rows.slice(0, 10);

  const footer = (
    <div className="flex justify-between items-center">
      <button
        type="button"
        onClick={handlePickFile}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-muted text-foreground border border-border hover:bg-muted/80 transition-colors"
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {rows.length === 0 ? "Choose CSV File" : "Choose Different File"}
      </button>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleClose}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition-colors"
        >
          Cancel
        </button>
        {rows.length > 0 && (
          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting || validCount === 0}
            className="btn-primary flex items-center gap-2 px-6 py-2"
          >
            {isImporting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isImporting ? "Importing…" : `Import ${validCount} row${validCount !== 1 ? "s" : ""}`}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import Products from CSV"
      description="CSV must have headers: product_name, sku, size, color, price — optional: barcode, color_hex"
      size="xl"
      footer={footer}
    >
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4 border-2 border-dashed border-border rounded-lg">
          <FileText className="w-10 h-10 text-muted-foreground/40" />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">{t('empty.noFileSelected')}</p>
            <p className="text-xs text-muted-foreground mt-1">Click "Choose CSV File" to get started</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Summary */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground font-medium flex-1 truncate">{fileName}</span>
            <div className="flex items-center gap-3 shrink-0">
              <span className="flex items-center gap-1 text-xs text-success">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {validCount} valid
              </span>
              {invalidCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-destructive">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {invalidCount} error{invalidCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          {/* Preview table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1.5fr_1fr_0.7fr_1fr_0.8fr_1fr] bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <span>Product Name</span>
              <span>SKU</span>
              <span>Size</span>
              <span>Color</span>
              <span>Price</span>
              <span>Status</span>
            </div>
            {preview.map((row, i) => (
              <div
                key={i}
                className={cn(
                  "grid grid-cols-[1.5fr_1fr_0.7fr_1fr_0.8fr_1fr] px-3 py-2 border-t border-border/50 text-sm items-center",
                  row._errors.length > 0 && "bg-destructive/5",
                )}
              >
                <span className="truncate text-foreground">{row.productName || "—"}</span>
                <span className="truncate font-mono text-muted-foreground text-xs">{row.sku || "—"}</span>
                <span className="text-foreground">{row.size || "—"}</span>
                <div className="flex items-center gap-1.5">
                  {row.colorHex && (
                    <div className="w-3 h-3 rounded-full border border-border/50 shrink-0" style={{ backgroundColor: row.colorHex }} />
                  )}
                  <span className="truncate text-foreground">{row.color || "—"}</span>
                </div>
                <span className="tabular-nums text-foreground">{isNaN(row.price) ? "—" : row.price.toFixed(2)}</span>
                <div>
                  {row._errors.length === 0 ? (
                    <span className="flex items-center gap-1 text-xs text-success">
                      <CheckCircle2 className="w-3 h-3" /> Valid
                    </span>
                  ) : (
                    <span className="text-xs text-destructive truncate" title={row._errors.join(", ")}>
                      {row._errors[0]}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {rows.length > 10 && (
              <div className="px-3 py-2 border-t border-border/50 text-xs text-muted-foreground bg-muted/30">
                …and {rows.length - 10} more row{rows.length - 10 !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
