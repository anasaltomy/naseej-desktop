export type SidebarProps = {
  activeView: AppView;
  activeLayout: AppLayout;
  onNavigate: (view: AppView) => void;
  onLayoutChange: (layout: AppLayout) => void;
  onLogout: () => void;
};

export type NavItem = {
  view: AppView;
  icon: typeof ShoppingCart;
  labelKey: string;
  shortcut?: string;
};

export type AppLayout = "pos" | "catalog" | "users" | "settings";

export type AppView =
  | "login"
  | "register"
  | "inventory"
  | "orders"
  | "end-of-day"
  | "sales-report"
  | "print-barcodes"
  | "categories-list"
  | "variants"
  | "warehouses"
  | "users-list"
  | "roles-list"
  | "ui-showcase"
  | "general-settings"
  | "catalog-settings";
