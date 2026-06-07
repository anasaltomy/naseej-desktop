export type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  hasStandardSizes: boolean;
  standardSizes: Size[];
  createdAt: string;
};

export type CreateCategoryFormState = {
  name: string;
  slug: string;
  parentId: string | null;
  hasStandardSizes: boolean;
  selectedSizes: Set<string>;
};

export type CategoriesListPageProps = {
  onNavigate?: (view: string, parentId?: string) => void;
};

export type Variant = {
  id: string;
  colorName: string;
  colorHex: string;
  sizeName: string;
  quantity: number;
  price: number;
  sku: string;
  barcode: string;
};

export interface VariantQuantity {
  colorId: string;
  sizeId: string;
  quantity: number | null;
}

export interface Color {
  id: string;
  name: string;
  hexCode: string;
}

export interface Size {
  id: string;
  name: string;
}

export type DbSize = { id: string; name: string; sort_order?: number };

export type DbColor = { id: string; name: string; hex_code: string };

export type UseVariantsReturn = {
  sizes: DbSize[];
  colors: DbColor[];
  loading: boolean;
  newSize: string;
  newColor: { name: string; hex: string };
  setNewSize: (v: string) => void;
  setNewColor: (v: { name: string; hex: string }) => void;
  addSize: () => Promise<void>;
  removeSize: (id: string) => Promise<void>;
  addColor: () => Promise<void>;
  removeColor: (id: string) => Promise<void>;
};
