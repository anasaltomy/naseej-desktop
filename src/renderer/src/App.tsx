import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";

import type { AppLayout, AppView } from "./types/Global";
import type { User } from "./features/pos";

import { ErrorBoundary } from "./components/ErrorBoundary";
import StatusBar from "./components/layout/StatusBar";
import Sidebar from "./components/layout/Sidebar";

import LoginPage from "./pages/LoginPage";
// POS screens
import { RegisterPage } from "./features/pos";
import { OrdersPage } from "./features/pos";
import { EndOfDayPage } from "./features/pos";
import SalesReportPage from "./features/pos/screens/SalesReportPage";
// Catalog screens
import { InventoryScreen, BarcodeScreen } from "./features/catalog";
import CategoriesListScreen from "./features/catalog/screens/CategoriesListScreen";
import VariantsPage from "./features/catalog/screens/VariantsScreen";
import WarehousesPage from "./features/catalog/screens/WarehousesScreen";
// Users screens
import UsersPage from "./features/users/screens/UsersPage";
import RolesPage from "./features/users/screens/RolesPage";
// Other
import type { SavedProductResult } from "./features/catalog/types/Product.types";
import { ToastProvider } from "./components/ui/custom/toast";
import "./types/electron.d";

import GeneralSettingsPage from "./features/Settings/screens/GeneralSettingsPage";
import { LAYOUT_DEFAULT_VIEW } from "./constants/NavLinks";
import VariantsScreen from "./features/catalog/screens/VariantsScreen";
import WarehousesScreen from "./features/catalog/screens/WarehousesScreen";

export default function App() {
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeLayout, setActiveLayout] = useState<AppLayout>("pos");
  const [activeView, setActiveView] = useState<AppView>("login");
  const [preloadedProduct, setPreloadedProduct] =
    useState<SavedProductResult | null>(null);
  const [autoOpenPrint, setAutoOpenPrint] = useState(false);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveView("register");
    setActiveLayout("pos");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveView("login");
  };

  const handleLayoutChange = useCallback((layout: AppLayout) => {
    setActiveLayout(layout);
    setActiveView(LAYOUT_DEFAULT_VIEW[layout]);
  }, []);

  const handleNavigateToBarcodes = useCallback(
    (product?: SavedProductResult) => {
      setPreloadedProduct(product ?? null);
      setAutoOpenPrint(false);
      setActiveView("print-barcodes");
    },
    [],
  );

  const handlePrintNow = useCallback((product: SavedProductResult) => {
    setPreloadedProduct(product);
    setAutoOpenPrint(true);
    setActiveView("print-barcodes");
  }, []);

  const handleExitToProducts = useCallback(() => {
    setPreloadedProduct(null);
    setAutoOpenPrint(false);
    setActiveView("inventory");
  }, []);

  // Auto-login as first user (Anas) for development/testing
  useEffect(() => {
    const autoLogin = async () => {
      try {
        const staffMembers = await window.api?.staff.getAll();
        if (staffMembers && staffMembers.length > 0) {
          const firstUser = staffMembers[0];
          const user: User = {
            id: firstUser.id as string,
            firstName: firstUser.first_name as string,
            lastName: firstUser.last_name as string,
            email: firstUser.email as string,
            role: firstUser.role as User["role"],
            avatarUrl: firstUser.avatar_url as string | undefined,
          };
          handleLogin(user);
        }
      } catch (error) {
        console.error("Failed to auto-login:", error);
      }
    };

    autoLogin();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!currentUser) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "F7":
          e.preventDefault();
          setActiveLayout("pos");
          setActiveView("orders");
          break;
        case "F8":
          e.preventDefault();
          setActiveLayout("catalog");
          setActiveView("inventory");
          break;
        case "F9":
          e.preventDefault();
          setActiveLayout("pos");
          setActiveView("register");
          break;
        case "F10":
          e.preventDefault();
          setActiveLayout("pos");
          setActiveView("end-of-day");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentUser]);

  // Login screen — full window
  if (!currentUser || activeView === "login") {
    return (
      <div className="h-screen flex flex-col bg-background">
        <StatusBar currentUser={null} />
        <LoginPage onLogin={handleLogin} />
      </div>
    );
  }

  const renderView = () => {
    switch (activeView) {
      // POS layout views
      case "register":
        return <RegisterPage currentUser={currentUser} />;
      case "orders":
        return <OrdersPage />;
      case "end-of-day":
        return <EndOfDayPage />;
      case "sales-report":
        return <SalesReportPage />;

      // Catalog layout views
      case "inventory":
        return <InventoryScreen />;
      case "categories-list":
        return <CategoriesListScreen />;
      case "variants":
        return <VariantsScreen />;
      case "warehouses":
        return <WarehousesScreen />;
      case "print-barcodes":
        return (
          <BarcodeScreen
            preloadedProduct={preloadedProduct}
            autoOpenPrintPreview={autoOpenPrint}
          />
        );

      // Users layout views
      case "users-list":
        return <UsersPage />;
      case "roles-list":
        return <RolesPage />;

      // Settings layout views
      case "general-settings":
        return <GeneralSettingsPage />;

      default:
        return <RegisterPage currentUser={currentUser} />;
    }
  };

  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className="h-screen flex flex-col bg-background overflow-hidden">
          {/* Title bar / status bar */}
          <StatusBar currentUser={currentUser} />

          {/* Main content area */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left navigation rail with layout switcher */}
            <Sidebar
              activeView={activeView}
              activeLayout={activeLayout}
              onNavigate={setActiveView}
              onLayoutChange={handleLayoutChange}
              onLogout={handleLogout}
            />

            {/* Page content */}
            <main className="flex-1 flex overflow-hidden" role="main">
              <ErrorBoundary>{renderView()}</ErrorBoundary>
            </main>
          </div>

          {/* Keyboard shortcut hint bar */}
          <footer className="h-7 bg-primary border-t border-border flex items-center gap-4 px-4 shrink-0">
            {activeLayout === "pos" &&
              [
                { key: "F1", labelKey: "keyboard.search" },
                { key: "F2", labelKey: "keyboard.customer" },
                { key: "F5", labelKey: "keyboard.discount" },
                { key: "F7", labelKey: "keyboard.orders" },
                { key: "F9", labelKey: "keyboard.register" },
                { key: "F10", labelKey: "keyboard.endOfDay" },
                { key: "F12", labelKey: "keyboard.pay" },
                { key: "Esc", labelKey: "keyboard.escape" },
              ].map(({ key, labelKey }) => (
                <div key={key} className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono text-muted-foreground">
                    {key}
                  </kbd>
                  <span className="text-[10px] text-muted-foreground/60">
                    {t(labelKey)}
                  </span>
                </div>
              ))}
            {activeLayout === "catalog" &&
              [
                { key: "F8", labelKey: "keyboard.inventory" },
                { key: "Esc", labelKey: "keyboard.escape" },
              ].map(({ key, labelKey }) => (
                <div key={key} className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono text-muted-foreground">
                    {key}
                  </kbd>
                  <span className="text-[10px] text-muted-foreground/60">
                    {t(labelKey)}
                  </span>
                </div>
              ))}
            {activeLayout === "users" &&
              [{ key: "Esc", labelKey: "keyboard.escape" }].map(
                ({ key, labelKey }) => (
                  <div key={key} className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono text-muted-foreground">
                      {key}
                    </kbd>
                    <span className="text-[10px] text-muted-foreground/60">
                      {t(labelKey)}
                    </span>
                  </div>
                ),
              )}
          </footer>
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}
