import { NavItem, AppLayout, AppView } from "@/types/Global";
import {
  ShoppingCart,
  ClipboardList,
  Package,
  Calculator,
  Barcode,
  Folder,
  LayoutGrid,
  Users,
  Shield,
  FileText,
  Warehouse,
  Tags,
} from "lucide-react";

export const POS_NAV_ITEMS: NavItem[] = [
  {
    view: "register",
    icon: ShoppingCart,
    labelKey: "components.sidebar.pos.register",
    shortcut: "F9",
  },
  {
    view: "orders",
    icon: ClipboardList,
    labelKey: "components.sidebar.pos.orders",
    shortcut: "F7",
  },
  {
    view: "sales-report",
    icon: FileText,
    labelKey: "components.sidebar.pos.salesReport",
  },
  {
    view: "end-of-day",
    icon: Calculator,
    labelKey: "components.sidebar.pos.endOfDay",
    shortcut: "F10",
  },
];

export const CATALOG_NAV_ITEMS: NavItem[] = [
  {
    view: "inventory",
    icon: Package,
    labelKey: "components.sidebar.catalog.inventory",
    shortcut: "F8",
  },
  {
    view: "categories-list",
    icon: Folder,
    labelKey: "components.sidebar.catalog.categories",
  },
  {
    view: "variants",
    icon: Tags,
    labelKey: "components.sidebar.catalog.variants",
  },
  {
    view: "warehouses",
    icon: Warehouse,
    labelKey: "components.sidebar.catalog.warehouses",
  },
  {
    view: "print-barcodes",
    icon: Barcode,
    labelKey: "components.sidebar.catalog.barcodes",
  },
];

export const USERS_NAV_ITEMS: NavItem[] = [
  {
    view: "users-list",
    icon: Users,
    labelKey: "components.sidebar.users.users",
  },
  {
    view: "roles-list",
    icon: Shield,
    labelKey: "components.sidebar.users.roles",
  },
];

export const SETTINGS_NAV_ITEMS: NavItem[] = [
  {
    view: "general-settings",
    icon: LayoutGrid,
    labelKey: "components.sidebar.settings.general",
  },
];

export const LAYOUT_ITEMS: {
  layout: AppLayout;
  icon: typeof ShoppingCart;
  labelKey: string;
}[] = [
  {
    layout: "pos",
    icon: ShoppingCart,
    labelKey: "components.sidebar.layouts.pos",
  },
  {
    layout: "catalog",
    icon: Package,
    labelKey: "components.sidebar.layouts.catalog",
  },
  {
    layout: "users",
    icon: Users,
    labelKey: "components.sidebar.layouts.users",
  },
  {
    layout: "settings",
    icon: LayoutGrid,
    labelKey: "components.sidebar.layouts.settings",
  },
];

export const LAYOUT_DEFAULT_VIEW: Record<AppLayout, AppView> = {
  pos: "register",
  catalog: "inventory",
  users: "users-list",
  settings: "general-settings",
};
