import {
  ShoppingCart,
  ClipboardList,
  Package,
  Calculator,
  LogOut,

  Barcode,
  Folder,
  LayoutGrid,
  Users,
  Shield,
  FileText,
  Warehouse,
  Tags,
  UserPlus,
  ShieldPlus,
} from "lucide-react";
import type { AppView, AppLayout } from "@/features/pos/types";
import { cn } from "../../lib/utils";
import { useTranslation } from "react-i18next";

interface SidebarProps {
  activeView: AppView;
  activeLayout: AppLayout;
  onNavigate: (view: AppView) => void;
  onLayoutChange: (layout: AppLayout) => void;
  onLogout: () => void;
}

interface NavItem {
  view: AppView;
  icon: typeof ShoppingCart;
  labelKey: string;
  shortcut?: string;
}

const POS_NAV_ITEMS: NavItem[] = [
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

const CATALOG_NAV_ITEMS: NavItem[] = [
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
    view: "inventory",
    icon: Package,
    labelKey: "components.sidebar.catalog.inventory",
    shortcut: "F8",
  },
  {
    view: "print-barcodes",
    icon: Barcode,
    labelKey: "components.sidebar.catalog.barcodes",
  },
  {
    view: "catalog-settings",
    icon: LayoutGrid,
    labelKey: "components.sidebar.catalog.settings",
  },
];

const USERS_NAV_ITEMS: NavItem[] = [
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

const LAYOUT_ITEMS: { layout: AppLayout; icon: typeof ShoppingCart; labelKey: string }[] = [
  { layout: "pos", icon: ShoppingCart, labelKey: "components.sidebar.layouts.pos" },
  { layout: "catalog", icon: Package, labelKey: "components.sidebar.layouts.catalog" },
  { layout: "users", icon: Users, labelKey: "components.sidebar.layouts.users" },
  { layout: "settings", icon: LayoutGrid, labelKey: "components.sidebar.layouts.settings" },
];

function getNavItems(layout: AppLayout): NavItem[] {
  switch (layout) {
    case "pos":
      return POS_NAV_ITEMS;
    case "catalog":
      return CATALOG_NAV_ITEMS;
    case "users":
      return USERS_NAV_ITEMS;
    case "settings":
      return [
        {
          view: "general-settings",
          icon: LayoutGrid,
          labelKey: "components.sidebar.settings.general",
        },
      ];
    default:
      return POS_NAV_ITEMS;
  }
}

export default function Sidebar({
  activeView,
  activeLayout,
  onNavigate,
  onLayoutChange,
  onLogout,
}: SidebarProps) {
  const { t } = useTranslation();
  const navItems = getNavItems(activeLayout);

  return (
    <nav
      className="w-16 bg-primary border-r border-border flex flex-col items-center py-3 gap-1 shrink-0"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Layout switcher */}
      <div className="w-full flex flex-col items-center gap-0.5 pb-2 mb-2 border-b border-border">
        {LAYOUT_ITEMS.map(({ layout, icon: Icon, labelKey }) => {
          const label = t(labelKey);
          return (
            <button
              key={layout}
              onClick={() => onLayoutChange(layout)}
              className={cn(
                "nav-item w-full",
                activeLayout === layout && "nav-item-active bg-accent/15 text-accent",
              )}
              title={label}
              aria-label={label}
              aria-current={activeLayout === layout ? "true" : undefined}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[8px] font-medium leading-none">
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Feature navigation for active layout */}
      {navItems.map(({ view, icon: Icon, labelKey, shortcut }) => {
        const label = t(labelKey);
        return (
          <button
            key={view}
            onClick={() => onNavigate(view)}
            className={cn(
              "nav-item w-full",
              activeView === view && "nav-item-active",
            )}
            title={shortcut ? `${label} (${shortcut})` : label}
            aria-label={label}
            aria-current={activeView === view ? "page" : undefined}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[9px] font-medium leading-none">
              {label.split(" ")[0]}
            </span>
          </button>
        );
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Logout */}
      <button
        onClick={onLogout}
        className="nav-item w-full text-destructive/70 hover:text-destructive hover:bg-destructive/10"
        title={t('components.sidebar.logout')}
        aria-label={t('components.sidebar.logout')}
      >
        <LogOut className="w-5 h-5" />
        <span className="text-[9px] font-medium leading-none">{t('components.sidebar.logout')}</span>
      </button>
    </nav>
  );
}
