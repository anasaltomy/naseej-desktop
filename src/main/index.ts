import { app, shell, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { closeDb, getDb } from "./db/database";
import { registerStaffHandlers } from "./ipc/staff";
import { registerProductHandlers } from "./ipc/products";
import { registerCustomerHandlers } from "./ipc/customers";
import { registerOrderHandlers } from "./ipc/orders";
import { registerInventoryHandlers } from "./ipc/inventory";
import { registerCategoryHandlers } from "./ipc/categories";
import { registerLocationHandlers } from "./ipc/locations";
import { registerUserHandlers } from "./ipc/users";
import { registerRoleHandlers } from "./ipc/roles";
import { registerVariantTypeHandlers } from "./ipc/variantTypes";
import { registerDailySummaryHandlers } from "./ipc/dailySummary";
import { registerMerchantHandlers } from "./ipc/merchant";
import { registerDiscountHandlers } from "./ipc/discounts";
import { registerColorHandlers } from "./ipc/colors";
import { registerSizeHandlers } from "./ipc/sizes";

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    show: false,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#020617",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.naseej.pos");

  // Initialize database (creates .db file, runs schema, seeds data)
  getDb();

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // Register all database IPC handlers
  registerStaffHandlers();
  registerProductHandlers();
  registerCustomerHandlers();
  registerOrderHandlers();
  registerInventoryHandlers();
  registerCategoryHandlers();
  registerLocationHandlers();
  registerUserHandlers();
  registerRoleHandlers();
  registerVariantTypeHandlers();
  registerDailySummaryHandlers();
  registerMerchantHandlers();
  registerDiscountHandlers();
  registerColorHandlers();
  registerSizeHandlers();

  // Window controls IPC
  ipcMain.on("window:minimize", () => {
    BrowserWindow.getFocusedWindow()?.minimize();
  });
  ipcMain.on("window:maximize", () => {
    const win = BrowserWindow.getFocusedWindow();
    win?.isMaximized() ? win.unmaximize() : win?.maximize();
  });
  ipcMain.on("window:close", () => {
    BrowserWindow.getFocusedWindow()?.close();
  });

  // Hardware stubs (to be implemented)
  ipcMain.handle("hardware:print-receipt", async (_event, _data) => {
    console.log("[IPC] Print receipt requested");
    return { success: true };
  });
  ipcMain.handle("hardware:open-drawer", async () => {
    console.log("[IPC] Cash drawer open requested");
    return { success: true };
  });
  ipcMain.handle("system:network-status", async () => {
    return { online: true };
  });

  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  closeDb();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
