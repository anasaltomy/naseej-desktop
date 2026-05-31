import { useState, useEffect, useCallback } from "react";
import type { User, AppView, AppLayout } from "./features/pos";
import StatusBar from "./components/layout/StatusBar";
import Sidebar from "./components/layout/Sidebar";
import LoginPage from "./pages/LoginPage";
// POS screens
import { RegisterPage } from "./features/pos";
import { OrdersPage } from "./features/pos";
import { EndOfDayPage } from "./features/pos";
import SalesReportPage from "./features/pos/screens/SalesReportPage";
// Catalog screens
import { InventoryPage, BarcodeScreen, CatalogSettingsPage } from "./features/catalog";
import { CategoriesListPage } from "./features/catalog/screens/CategoriesListPage";
import VariantsPage from "./features/catalog/screens/VariantsPage";
import WarehousesPage from "./features/catalog/screens/WarehousesPage";
// Users screens
import UsersPage from "./features/users/screens/UsersPage";
import RolesPage from "./features/users/screens/RolesPage";
// Other
import type { SavedProductResult } from "./features/catalog/types/product";
import { ToastProvider } from "./components/ui/custom/toast";
import "./types/electron.d";

// Default view per layout
const LAYOUT_DEFAULT_VIEW: Record<AppLayout, AppView> = {
  pos: "register",
  catalog: "categories-list",
  users: "users-list",
  settings: "general-settings",
};
import GeneralSettingsPage from "./features/Settings/screens/GeneralSettingsPage";

export default function App() {
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
        return <InventoryPage />;
      case "print-barcodes":
        return (
          <BarcodeScreen
            preloadedProduct={preloadedProduct}
            autoOpenPrintPreview={autoOpenPrint}
          />
        );
      case "categories-list":
        return (
          <CategoriesListPage
            onNavigate={(view) => {
              setActiveView(view as AppView);
            }}
          />
        );
      case "variants":
        return <VariantsPage />;
      case "warehouses":
        return <WarehousesPage />;
      case "catalog-settings":
        return <CatalogSettingsPage />;

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
            {renderView()}
          </main>
        </div>

        {/* Keyboard shortcut hint bar */}
        <footer className="h-7 bg-primary border-t border-border flex items-center gap-4 px-4 shrink-0">
          {activeLayout === "pos" && [
            { key: "F1", label: "Search" },
            { key: "F2", label: "Customer" },
            { key: "F5", label: "Discount" },
            { key: "F7", label: "Orders" },
            { key: "F9", label: "Register" },
            { key: "F10", label: "End of Day" },
            { key: "F12", label: "Pay" },
            { key: "Esc", label: "Cancel" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono text-muted-foreground">
                {key}
              </kbd>
              <span className="text-[10px] text-muted-foreground/60">
                {label}
              </span>
            </div>
          ))}
          {activeLayout === "catalog" && [
            { key: "F8", label: "Inventory" },
            { key: "Esc", label: "Cancel" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono text-muted-foreground">
                {key}
              </kbd>
              <span className="text-[10px] text-muted-foreground/60">
                {label}
              </span>
            </div>
          ))}
          {activeLayout === "users" && [
            { key: "Esc", label: "Cancel" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono text-muted-foreground">
                {key}
              </kbd>
              <span className="text-[10px] text-muted-foreground/60">
                {label}
              </span>
            </div>
          ))}
        </footer>
      </div>
    </ToastProvider>
  );
}
