export function simulateAsync<T>(data: T, delayMs = 800): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delayMs);
  });
}

export function generateBarcode(modelNumber: string, index: number): string {
  return `NSJ-${modelNumber}-${String(index).padStart(3, "0")}`;
}

export function generateSku(
  modelNumber: string,
  colorName: string,
  sizeName: string,
): string {
  const colorCode = colorName.substring(0, 3).toUpperCase();
  const sizeCode = sizeName.toUpperCase();
  return `${modelNumber}-${colorCode}-${sizeCode}`;
}

export function generateId(): string {
  return crypto.randomUUID();
}
