import { app, shell, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { closeDb, getDb } from "./db/database";
import { createBackup, listBackups } from "./db/backup";
import { HardwareManager } from "./hardware";
import { AppUpdater } from "./updater";
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

  // Daily auto-backup: create backup on app launch (once per day)
  const db = getDb();
  const backups = listBackups();
  const todayStr = new Date().toISOString().split("T")[0];
  const hasBackupToday = backups.some((b) => b.date === todayStr);
  if (!hasBackupToday) {
    createBackup(db);
  }

  // Backup IPC handlers
  ipcMain.handle("backup:create", () => {
    return createBackup(getDb());
  });
  ipcMain.handle("backup:list", () => {
    return listBackups();
  });

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

  // Hardware integration
  const hardwareManager = new HardwareManager();
  ipcMain.handle("hardware:print-receipt", async (_event, data) => {
    return hardwareManager.printReceipt(data);
  });
  ipcMain.handle("hardware:open-drawer", async () => {
    return hardwareManager.openDrawer();
  });
  ipcMain.handle("hardware:status", () => {
    return hardwareManager.getStatus();
  });
  ipcMain.handle("system:network-status", async () => {
    return { online: true };
  });

  // Barcode scanner keyboard input forwarding from renderer
  ipcMain.on("scanner:key-input", (_event, { key, timestamp }: { key: string; timestamp: number }) => {
    // Forward to hardware manager's scanner for processing
    // Scanner emits 'barcode' event which sends to renderer via IPC
  });

  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Initialize hardware after window is ready
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    hardwareManager.initialize(mainWindow);
  }

  // Initialize auto-updater (check after 5s delay to not block startup)
  const updater = new AppUpdater();
  const firstWindow = BrowserWindow.getAllWindows()[0];
  if (firstWindow) {
    updater.initialize(firstWindow);
    setTimeout(() => updater.checkForUpdates(), 5000);
  }
});

app.on("window-all-closed", () => {
  closeDb();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
