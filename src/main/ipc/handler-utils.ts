import { ipcMain } from "electron";
import type { IpcMainInvokeEvent } from "electron";

/**
 * Structured IPC response type.
 * All IPC handlers wrapped with `registerHandler` return this shape.
 */
export interface IpcResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Wraps an IPC handler function with standardized error handling.
 * Returns `{ success: true, data }` on success and `{ success: false, error }` on failure.
 */
export function registerHandler<T>(
  channel: string,
  handler: (event: IpcMainInvokeEvent, ...args: unknown[]) => T | Promise<T>,
): void {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      const result = await handler(event, ...args);
      return { success: true, data: result };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`[IPC Error] ${channel}:`, message);
      return { success: false, error: message };
    }
  });
}

/**
 * Same as registerHandler but for handlers that return data directly
 * without the success wrapper (backward-compatible with existing renderer code).
 *
 * Use this during migration period — handlers return raw data on success
 * but throw errors that get caught and logged.
 */
export function registerSafeHandler<T>(
  channel: string,
  handler: (event: IpcMainInvokeEvent, ...args: unknown[]) => T | Promise<T>,
): void {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await handler(event, ...args);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`[IPC Error] ${channel}:`, message);
      return null;
    }
  });
}
