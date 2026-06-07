import { useTranslation } from "react-i18next";
import { LogOut } from "lucide-react";

import type { AppLayout, NavItem, SidebarProps } from "@/types/Global";
import { cn } from "@/lib/utils";
import {
  LAYOUT_ITEMS,
  POS_NAV_ITEMS,
  CATALOG_NAV_ITEMS,
  USERS_NAV_ITEMS,
  SETTINGS_NAV_ITEMS,
} from "@/constants/NavLinks";

const getNavItems = (layout: AppLayout): NavItem[] => {
  switch (layout) {
    case "pos":
      return POS_NAV_ITEMS;
    case "catalog":
      return CATALOG_NAV_ITEMS;
    case "users":
      return USERS_NAV_ITEMS;
    case "settings":
      return SETTINGS_NAV_ITEMS;
    default:
      return POS_NAV_ITEMS;
  }
};

const Sidebar = ({
  activeView,
  activeLayout,
  onNavigate,
  onLayoutChange,
  onLogout,
}: SidebarProps) => {
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
                activeLayout === layout &&
                  "nav-item-active bg-accent/15 text-accent",
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
        title={t("components.sidebar.logout")}
        aria-label={t("components.sidebar.logout")}
      >
        <LogOut className="w-5 h-5" />
        <span className="text-[9px] font-medium leading-none">
          {t("components.sidebar.logout")}
        </span>
      </button>
    </nav>
  );
};

export default Sidebar;
