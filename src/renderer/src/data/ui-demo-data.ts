import type { ToastData } from "../components/ui/custom/toast/toast.types";
import type { DialogProps } from "../components/ui/custom/dialog/Dialog";

// ─── Alert Demo Data ──────────────────────────────────────────────────────────

export interface AlertDemoItem {
  id: string;
  title: string;
  description: string;
  variant: "success" | "error" | "warning" | "info" | "neutral";
  actionLabel?: string;
}

export const ALERT_DEMOS: AlertDemoItem[] = [
  {
    id: "alert-success",
    variant: "success",
    title: "Payment processed successfully",
    description:
      "Transaction #TXN-2024-00841 was completed. Receipt has been sent to the customer.",
    actionLabel: "View receipt",
  },
  {
    id: "alert-error",
    variant: "error",
    title: "Product deletion failed",
    description:
      "SKU-9832 could not be removed. It is linked to 3 active orders and cannot be deleted.",
    actionLabel: "View linked orders",
  },
  {
    id: "alert-warning",
    variant: "warning",
    title: "Low inventory warning",
    description:
      "Nike Air Max (Size 42, Black) has only 2 units left in stock. Consider reordering soon.",
    actionLabel: "Reorder now",
  },
  {
    id: "alert-info",
    variant: "info",
    title: "System update available",
    description:
      "Naseej POS v2.4.1 is available with bug fixes and performance improvements.",
    actionLabel: "Update now",
  },
  {
    id: "alert-neutral",
    variant: "neutral",
    title: "Shift report ready",
    description:
      "Your end-of-day report for May 23, 2026 has been generated and is ready to review.",
  },
];

// ─── Toast Demo Data ──────────────────────────────────────────────────────────

export const TOAST_DEMOS: Array<Omit<ToastData, "id">> = [
  {
    variant: "success",
    title: "Order completed",
    description: "Order #ORD-2026-00193 has been finalized successfully.",
    duration: 4000,
  },
  {
    variant: "error",
    title: "Payment declined",
    description:
      "The card ending in 4532 was declined. Please try another method.",
    duration: 5000,
  },
  {
    variant: "warning",
    title: "Session expiring soon",
    description: "Your session will expire in 5 minutes. Save your work.",
    duration: 4000,
  },
  {
    variant: "info",
    title: "Sync in progress",
    description: "Inventory data is being synced with the cloud server.",
    duration: 4000,
  },
];

// ─── Dialog Demo Data ─────────────────────────────────────────────────────────

export interface DialogDemoItem {
  id: string;
  label: string;
  variant: DialogProps["variant"];
  title: string;
  description: string;
  confirmLabel: string;
}

export const DIALOG_DEMOS: DialogDemoItem[] = [
  {
    id: "dialog-delete",
    label: "Delete Product",
    variant: "danger",
    title: "Delete this product?",
    description:
      "This will permanently remove 'Nike Air Max 270' and all its variants from your inventory. This action cannot be undone.",
    confirmLabel: "Delete Product",
  },
  {
    id: "dialog-archive",
    label: "Archive Item",
    variant: "warning",
    title: "Archive this item?",
    description:
      "Archiving 'Adidas Ultraboost 22' will hide it from the storefront but keep all historical data intact. You can restore it later.",
    confirmLabel: "Archive Item",
  },
  {
    id: "dialog-logout",
    label: "Confirm Logout",
    variant: "neutral",
    title: "Log out of the session?",
    description:
      "You are about to end your POS session. Any unsaved cart data will be lost. Are you sure you want to continue?",
    confirmLabel: "Log Out",
  },
];

// ─── Modal Demo Data ──────────────────────────────────────────────────────────

export interface ModalDemoItem {
  id: string;
  label: string;
  title: string;
  description?: string;
  size: "sm" | "md" | "lg" | "xl";
  body: string;
}

export const MODAL_DEMOS: ModalDemoItem[] = [
  {
    id: "modal-product",
    label: "Create Product",
    title: "Add New Product",
    description:
      "Fill in the product details below. All fields marked * are required.",
    size: "lg",
    body: "product-form",
  },
  {
    id: "modal-profile",
    label: "Edit Profile",
    title: "Edit Staff Profile",
    description: "Update your personal information and role settings.",
    size: "md",
    body: "profile-form",
  },
  {
    id: "modal-checkout",
    label: "Checkout",
    title: "Complete Payment",
    description: "Review the order total and select a payment method.",
    size: "sm",
    body: "checkout",
  },
];

// ─── Drawer Demo Data ─────────────────────────────────────────────────────────

export interface DrawerDemoItem {
  id: string;
  label: string;
  side: "left" | "right" | "bottom";
  title: string;
  description?: string;
  body: string;
}

export const DRAWER_DEMOS: DrawerDemoItem[] = [
  {
    id: "drawer-cart",
    label: "Cart Drawer (Right)",
    side: "right",
    title: "Shopping Cart",
    description: "Review items before checkout",
    body: "cart",
  },
  {
    id: "drawer-filters",
    label: "Filters (Left)",
    side: "left",
    title: "Filter Products",
    description: "Narrow down your inventory search",
    body: "filters",
  },
  {
    id: "drawer-menu",
    label: "Bottom Menu",
    side: "bottom",
    title: "Quick Actions",
    body: "menu",
  },
];

// ─── Popover Demo Data ────────────────────────────────────────────────────────

export interface PopoverDemoItem {
  id: string;
  label: string;
  description: string;
}

export const POPOVER_DEMOS: PopoverDemoItem[] = [
  {
    id: "popover-user",
    label: "User Menu",
    description: "Account, settings, and logout options",
  },
  {
    id: "popover-actions",
    label: "Quick Actions",
    description: "Context actions for the selected item",
  },
  {
    id: "popover-notifications",
    label: "Notifications",
    description: "Recent system alerts and updates",
  },
];
