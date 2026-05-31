// Mock data for the Create Product feature — frontend-only, no API calls

export interface MockColor {
  id: string;
  name: string;
  hexCode: string;
}

export interface MockSize {
  id: string;
  name: string;
  sortOrder: number;
}

export interface MockBrand {
  id: string;
  name: string;
}

export interface MockCategory {
  id: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
}

export interface MockSavedProduct {
  id: string;
  name: string;
  modelNumber: string;
  brand: string;
  category: string;
  description: string;
  variants: MockSavedVariant[];
}

export interface MockSavedVariant {
  id: string;
  colorName: string;
  colorHex: string;
  sizeName: string;
  quantity: number;
  price: number;
  sku: string;
  barcode: string;
}


function getUserDefaultColors(): MockColor[] {
  const local = typeof window !== 'undefined' ? localStorage.getItem('naseej.defaultColors') : null;
  if (local) {
    try {
      const arr = JSON.parse(local);
      return arr.map((c: any, i: number) => ({
        id: `c${i+1}`,
        name: c.name,
        hexCode: c.hex,
      }));
    } catch {
      // fallback below
    }
  }
  return [
    { id: "c1", name: "Black", hexCode: "#000000" },
    { id: "c2", name: "White", hexCode: "#FFFFFF" },
    { id: "c3", name: "Navy", hexCode: "#1E3A5F" },
    { id: "c4", name: "Red", hexCode: "#DC2626" },
    { id: "c5", name: "Forest Green", hexCode: "#166534" },
    { id: "c6", name: "Camel", hexCode: "#C19A6B" },
    { id: "c7", name: "Burgundy", hexCode: "#800020" },
    { id: "c8", name: "Sky Blue", hexCode: "#87CEEB" },
    { id: "c9", name: "Charcoal", hexCode: "#36454F" },
    { id: "c10", name: "Olive", hexCode: "#808000" },
    { id: "c11", name: "Blush Pink", hexCode: "#DE5D83" },
    { id: "c12", name: "Sand", hexCode: "#C2B280" },
  ];
}

export const mockColors: MockColor[] = getUserDefaultColors();


function getUserDefaultSizes(): MockSize[] {
  const local = typeof window !== 'undefined' ? localStorage.getItem('naseej.defaultSizes') : null;
  if (local) {
    try {
      const arr = JSON.parse(local);
      return arr.map((name: string, i: number) => ({
        id: `s${i+1}`,
        name,
        sortOrder: i+1,
      }));
    } catch {
      // fallback below
    }
  }
  return [
    { id: "s1", name: "XS", sortOrder: 1 },
    { id: "s2", name: "S", sortOrder: 2 },
    { id: "s3", name: "M", sortOrder: 3 },
    { id: "s4", name: "L", sortOrder: 4 },
    { id: "s5", name: "XL", sortOrder: 5 },
    { id: "s6", name: "XXL", sortOrder: 6 },
    { id: "s7", name: "36", sortOrder: 7 },
    { id: "s8", name: "37", sortOrder: 8 },
    { id: "s9", name: "38", sortOrder: 9 },
    { id: "s10", name: "39", sortOrder: 10 },
    { id: "s11", name: "40", sortOrder: 11 },
    { id: "s12", name: "41", sortOrder: 12 },
    { id: "s13", name: "42", sortOrder: 13 },
    { id: "s14", name: "43", sortOrder: 14 },
    { id: "s15", name: "44", sortOrder: 15 },
  ];
}

export const mockSizes: MockSize[] = getUserDefaultSizes();

export const mockBrands: MockBrand[] = [
  { id: "b1", name: "Nike" },
  { id: "b2", name: "Adidas" },
  { id: "b3", name: "Zara" },
  { id: "b4", name: "H&M" },
  { id: "b5", name: "Uniqlo" },
  { id: "b6", name: "Massimo Dutti" },
  { id: "b7", name: "Mango" },
  { id: "b8", name: "Levi's" },
  { id: "b9", name: "Tommy Hilfiger" },
  { id: "b10", name: "Calvin Klein" },
];

export const mockCategories: MockCategory[] = [
  { id: "cat1", name: "Men's Clothing", parentId: null, parentName: null },
  { id: "cat2", name: "Women's Clothing", parentId: null, parentName: null },
  { id: "cat3", name: "T-Shirts", parentId: "cat1", parentName: "Men's Clothing" },
  { id: "cat4", name: "Shirts", parentId: "cat1", parentName: "Men's Clothing" },
  { id: "cat5", name: "Pants", parentId: "cat1", parentName: "Men's Clothing" },
  { id: "cat6", name: "Jackets", parentId: "cat1", parentName: "Men's Clothing" },
  { id: "cat7", name: "Dresses", parentId: "cat2", parentName: "Women's Clothing" },
  { id: "cat8", name: "Blouses", parentId: "cat2", parentName: "Women's Clothing" },
  { id: "cat9", name: "Skirts", parentId: "cat2", parentName: "Women's Clothing" },
  { id: "cat10", name: "Footwear", parentId: null, parentName: null },
  { id: "cat11", name: "Sneakers", parentId: "cat10", parentName: "Footwear" },
  { id: "cat12", name: "Boots", parentId: "cat10", parentName: "Footwear" },
  { id: "cat13", name: "Sandals", parentId: "cat10", parentName: "Footwear" },
];

export const mockSavedProducts: MockSavedProduct[] = [
  {
    id: "prod1",
    name: "Classic Fit Oxford Shirt",
    modelNumber: "OXF-2024",
    brand: "Massimo Dutti",
    category: "Shirts",
    description: "Premium cotton oxford shirt with button-down collar",
    variants: [
      { id: "v1", colorName: "White", colorHex: "#FFFFFF", sizeName: "S", quantity: 10, price: 189, sku: "OXF-2024-WHT-S", barcode: "NSJ-OXF2024-001" },
      { id: "v2", colorName: "White", colorHex: "#FFFFFF", sizeName: "M", quantity: 15, price: 189, sku: "OXF-2024-WHT-M", barcode: "NSJ-OXF2024-002" },
      { id: "v3", colorName: "White", colorHex: "#FFFFFF", sizeName: "L", quantity: 12, price: 189, sku: "OXF-2024-WHT-L", barcode: "NSJ-OXF2024-003" },
      { id: "v4", colorName: "Navy", colorHex: "#1E3A5F", sizeName: "S", quantity: 8, price: 199, sku: "OXF-2024-NVY-S", barcode: "NSJ-OXF2024-004" },
      { id: "v5", colorName: "Navy", colorHex: "#1E3A5F", sizeName: "M", quantity: 20, price: 199, sku: "OXF-2024-NVY-M", barcode: "" },
      { id: "v6", colorName: "Navy", colorHex: "#1E3A5F", sizeName: "L", quantity: 14, price: 199, sku: "OXF-2024-NVY-L", barcode: "" },
    ],
  },
];
