import { useToast } from "@/components/ui/custom/toast";

export function useProductExport() {
  const { toast } = useToast();

  const exportProducts = async () => {
    try {
      const result = await window.api?.products.exportCsv();
      if (!result) return;
      if (result.canceled) return;
      if (result.success) {
        toast({
          variant: "success",
          title: "Export complete",
          description: result.filePath ? `Saved to ${result.filePath}` : undefined,
        });
      }
    } catch {
      toast({ variant: "error", title: "Export failed" });
    }
  };

  return { exportProducts };
}
