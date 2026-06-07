import type { MockSavedProduct } from "../__mocks__/productMocks";
import { mockSavedProducts } from "../__mocks__/productMocks";
import { simulateAsync, generateBarcode } from "../utils";
import type { VariantRow } from "../types/Barcode.types";

class BarcodeController {
  static async searchProduct(query: string): Promise<MockSavedProduct | null> {
    try {
      await simulateAsync(null);
      return (
        mockSavedProducts.find(
          (p) =>
            p.modelNumber.toLowerCase().includes(query.toLowerCase()) ||
            p.name.toLowerCase().includes(query.toLowerCase()),
        ) ?? null
      );
    } catch (err) {
      console.error("Error searching products:", err);
      return null;
    }
  }

  static async getProductById(id: string): Promise<MockSavedProduct | null> {
    try {
      return mockSavedProducts.find((p) => p.id === id) ?? null;
    } catch (err) {
      console.error("Error fetching product:", err);
      return null;
    }
  }

  static buildVariantRows(product: MockSavedProduct): VariantRow[] {
    return product.variants.map((v, idx) => ({
      ...v,
      checked: true,
      printQty: v.quantity,
      barcode: generateBarcode(product.modelNumber, idx + 1),
    }));
  }
}

export default BarcodeController;
