import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  ShoppingCart,
  User,
  Zap,
  SlidersHorizontal,
  Package,
  CreditCard,
  Trash2,
  Edit3,
  MoreHorizontal,
  LogOut,
  Settings,
  ChevronRight,
  Star,
  AlertCircle,
} from "lucide-react";

import { Dialog } from "../components/ui/custom/dialog/Dialog";
import { Modal } from "../components/ui/custom/modal/Modal";
import { Drawer } from "../components/ui/custom/drawer/Drawer";
import {
  Popover,
  PopoverItem,
  PopoverSeparator,
} from "../components/ui/custom/popover/Popover";
import { useToast } from "../components/ui/custom/toast/useToast";

// ─── Demo Data ────────────────────────────────────────────────────────────────
import {
  TOAST_DEMOS,
  DIALOG_DEMOS,
  MODAL_DEMOS,
  DRAWER_DEMOS,
  POPOVER_DEMOS,
} from "../data/ui-demo-data";
import type {
  DialogDemoItem,
  ModalDemoItem,
  DrawerDemoItem,
} from "../data/ui-demo-data";
import { cn } from "../lib/utils";

// ─── Section Wrapper ──────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function Section({ title, description, children }: SectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col gap-4"
    >
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
      {children}
    </motion.section>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("bg-card border border-border rounded-2xl p-5", className)}
    >
      {children}
    </div>
  );
}
// ─── Toast Section ────────────────────────────────────────────────────────────

function ToastSection() {
  const { toast } = useToast();

  const variantColors: Record<string, string> = {
    success: "bg-success/15 text-success border-success/20 hover:bg-success/25",
    error:
      "bg-destructive/15 text-destructive border-destructive/20 hover:bg-destructive/25",
    warning: "bg-warning/15 text-warning border-warning/20 hover:bg-warning/25",
    info: "bg-blue-500/15 text-blue-400 border-blue-500/20 hover:bg-blue-500/25",
  };

  return (
    <Section
      title="Toast Notifications"
      description="Animated notification stack with auto-dismiss. Click each button to trigger a real toast."
    >
      <Card>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TOAST_DEMOS.map((item) => (
            <button
              key={item.variant}
              onClick={() => toast(item)}
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold",
                "transition-all duration-150 active:scale-[0.97] cursor-pointer",
                variantColors[item.variant ?? "info"],
              )}
            >
              <Bell className="w-4 h-4" aria-hidden="true" />
              {item.variant!.charAt(0).toUpperCase() + item.variant!.slice(1)}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Toasts appear bottom-right · Auto-dismiss after 4s · Click × to
          dismiss early
        </p>
      </Card>
    </Section>
  );
}

// ─── Dialog Section ───────────────────────────────────────────────────────────

function DialogSection() {
  const [active, setActive] = useState<DialogDemoItem | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConfirm = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setActive(null);
    }, 1200);
  };

  const variantBadge: Record<string, string> = {
    danger: "bg-destructive/15 text-destructive",
    warning: "bg-warning/15 text-warning",
    neutral: "bg-muted text-muted-foreground",
  };

  return (
    <Section
      title="Confirmation Dialogs"
      description="Keyboard-accessible confirmation dialogs with semantic variants and loading states."
    >
      <Card>
        <div className="flex flex-wrap gap-3">
          {DIALOG_DEMOS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium",
                "transition-all duration-150 active:scale-[0.97] cursor-pointer",
                variantBadge[item.variant ?? "neutral"],
                "border-border hover:border-border/80",
              )}
            >
              {item.variant === "danger" && (
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              )}
              {item.variant === "warning" && (
                <AlertCircle className="w-4 h-4" aria-hidden="true" />
              )}
              {item.variant === "neutral" && (
                <LogOut className="w-4 h-4" aria-hidden="true" />
              )}
              {item.label}
            </button>
          ))}
        </div>
      </Card>

      {active && (
        <Dialog
          open={!!active}
          onClose={() => setActive(null)}
          onConfirm={handleConfirm}
          variant={active.variant}
          title={active.title}
          description={active.description}
          confirmLabel={active.confirmLabel}
          loading={loading}
        />
      )}
    </Section>
  );
}

// ─── Modal Section ────────────────────────────────────────────────────────────

function ModalSection() {
  const [active, setActive] = useState<ModalDemoItem | null>(null);

  return (
    <Section
      title="Modals"
      description="Full-featured modals with header, scrollable body, footer, and size variants."
    >
      <Card>
        <div className="flex flex-wrap gap-3">
          {MODAL_DEMOS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item)}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              {item.id === "modal-product" && (
                <Package className="w-4 h-4" aria-hidden="true" />
              )}
              {item.id === "modal-profile" && (
                <User className="w-4 h-4" aria-hidden="true" />
              )}
              {item.id === "modal-checkout" && (
                <CreditCard className="w-4 h-4" aria-hidden="true" />
              )}
              {item.label}
            </button>
          ))}
        </div>
      </Card>

      {active && (
        <Modal
          open={!!active}
          onClose={() => setActive(null)}
          title={active.title}
          description={active.description}
          size={active.size}
          footer={
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setActive(null)}
                className="btn-secondary text-sm px-4 py-2"
              >
                Cancel
              </button>
              <button className="btn-primary text-sm px-4 py-2">
                {active.id === "modal-checkout" ? "Pay Now" : "Save"}
              </button>
            </div>
          }
        >
          <ModalBody modalId={active.id} />
        </Modal>
      )}
    </Section>
  );
}

function ModalBody({ modalId }: { modalId: string }) {
  if (modalId === "modal-product") {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">
              Product Name *
            </label>
            <input className="pos-input" placeholder="e.g. Nike Air Max 270" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">SKU *</label>
            <input className="pos-input" placeholder="e.g. NIKE-AM270-BLK" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">
            Category *
          </label>
          <select className="pos-input">
            <option value="">Select a category…</option>
            <option>Footwear</option>
            <option>Apparel</option>
            <option>Accessories</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">
              Price *
            </label>
            <input className="pos-input" type="number" placeholder="0.00" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">
              Stock Qty
            </label>
            <input className="pos-input" type="number" placeholder="0" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">
            Description
          </label>
          <textarea
            className="pos-input min-h-[80px] resize-none"
            placeholder="Optional product description…"
          />
        </div>
      </div>
    );
  }

  if (modalId === "modal-profile") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4 p-4 bg-muted rounded-xl">
          <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
            <User className="w-6 h-6 text-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Ramla Al-Harbi
            </p>
            <p className="text-xs text-muted-foreground">Store Manager</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">
              First Name
            </label>
            <input className="pos-input" defaultValue="Ramla" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">
              Last Name
            </label>
            <input className="pos-input" defaultValue="Al-Harbi" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Email</label>
          <input
            className="pos-input"
            type="email"
            defaultValue="ramla@naseej.sa"
          />
        </div>
      </div>
    );
  }

  // Checkout
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {["Nike Air Max 270 × 1", "Adidas Ultraboost × 2"].map((item, i) => (
          <div
            key={i}
            className="flex justify-between items-center py-2 border-b border-border last:border-0"
          >
            <span className="text-sm text-foreground">{item}</span>
            <span className="text-sm font-semibold text-foreground">
              {i === 0 ? "JD 450" : "JD 720"}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center pt-1">
        <span className="text-sm font-semibold text-foreground">Total</span>
        <span className="text-base font-bold text-accent">JD 1,170</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-1">
        {["Cash", "Card"].map((m) => (
          <button
            key={m}
            className="py-2.5 rounded-lg border border-border bg-muted hover:bg-muted/80 text-sm font-medium text-foreground transition-colors cursor-pointer"
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Drawer Section ───────────────────────────────────────────────────────────

function DrawerSection() {
  const [active, setActive] = useState<DrawerDemoItem | null>(null);

  return (
    <Section
      title="Drawers"
      description="Slide-in panels from left, right, or bottom with smooth Framer Motion animations."
    >
      <Card>
        <div className="flex flex-wrap gap-3">
          {DRAWER_DEMOS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item)}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              {item.id === "drawer-cart" && (
                <ShoppingCart className="w-4 h-4" aria-hidden="true" />
              )}
              {item.id === "drawer-filters" && (
                <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
              )}
              {item.id === "drawer-menu" && (
                <Zap className="w-4 h-4" aria-hidden="true" />
              )}
              {item.label}
            </button>
          ))}
        </div>
      </Card>

      {active && (
        <Drawer
          open={!!active}
          onClose={() => setActive(null)}
          side={active.side}
          title={active.title}
          description={active.description}
          footer={
            <button className="btn-primary w-full text-sm">
              {active.id === "drawer-cart" ? "Proceed to Checkout" : "Apply"}
            </button>
          }
        >
          <DrawerBody drawerId={active.id} />
        </Drawer>
      )}
    </Section>
  );
}

function DrawerBody({ drawerId }: { drawerId: string }) {
  if (drawerId === "drawer-cart") {
    const items = [
      { name: "Nike Air Max 270", size: "42", qty: 1, price: "JD 450" },
      { name: "Adidas Ultraboost 22", size: "41", qty: 2, price: "JD 720" },
    ];
    return (
      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <div key={i} className="flex gap-3 p-3 bg-muted rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {item.name}
              </p>
              <p className="text-xs text-muted-foreground">
                Size {item.size} · Qty {item.qty}
              </p>
            </div>
            <p className="text-sm font-semibold text-foreground shrink-0">
              {item.price}
            </p>
          </div>
        ))}
        <div className="mt-2 pt-3 border-t border-border flex justify-between">
          <span className="text-sm text-muted-foreground">Subtotal</span>
          <span className="text-sm font-bold text-accent">JD 1,170</span>
        </div>
      </div>
    );
  }

  if (drawerId === "drawer-filters") {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-sm font-medium text-foreground mb-2">Category</p>
          <div className="flex flex-col gap-1.5">
            {["Footwear", "Apparel", "Accessories"].map((c) => (
              <label key={c} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded accent-accent" />
                <span className="text-sm text-foreground">{c}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground mb-2">
            Price Range
          </p>
          <div className="flex gap-2">
            <input className="pos-input text-sm" placeholder="Min" />
            <input className="pos-input text-sm" placeholder="Max" />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground mb-2">Stock</p>
          <div className="flex flex-col gap-1.5">
            {["In Stock", "Low Stock", "Out of Stock"].map((s) => (
              <label key={s} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="stock" className="accent-accent" />
                <span className="text-sm text-foreground">{s}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Bottom menu
  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { icon: Package, label: "Add Product" },
        { icon: Edit3, label: "Edit Item" },
        { icon: Trash2, label: "Delete" },
        { icon: Star, label: "Feature" },
        { icon: Settings, label: "Settings" },
        { icon: LogOut, label: "Log Out" },
      ].map(({ icon: Icon, label }) => (
        <button
          key={label}
          className="flex flex-col items-center gap-2 p-4 bg-muted rounded-xl hover:bg-muted/80 transition-colors cursor-pointer"
        >
          <Icon className="w-5 h-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Popover Section ──────────────────────────────────────────────────────────

function PopoverSection() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Section
      title="Popovers"
      description="Anchor-positioned floating menus with click-outside dismissal and keyboard support."
    >
      <Card>
        <div className="flex flex-wrap gap-4 items-start">
          {/* User Menu Popover */}
          <Popover
            open={openId === "user"}
            onClose={() => setOpenId(null)}
            align="start"
            side="bottom"
            trigger={
              <button
                onClick={() => setOpenId(openId === "user" ? null : "user")}
                className="btn-secondary text-sm flex items-center gap-2"
                aria-expanded={openId === "user"}
                aria-haspopup="true"
              >
                <User className="w-4 h-4" aria-hidden="true" />
                {POPOVER_DEMOS[0].label}
              </button>
            }
          >
            <div className="py-1">
              <PopoverItem
                icon={<User className="w-4 h-4" />}
                label="View Profile"
                description="Edit your account details"
              />
              <PopoverItem
                icon={<Settings className="w-4 h-4" />}
                label="Settings"
                description="Manage preferences"
              />
              <PopoverItem
                icon={<Star className="w-4 h-4" />}
                label="Upgrade Plan"
                description="Unlock premium features"
              />
              <PopoverSeparator />
              <PopoverItem
                icon={<LogOut className="w-4 h-4" />}
                label="Log Out"
                destructive
              />
            </div>
          </Popover>

          {/* Quick Actions Popover */}
          <Popover
            open={openId === "actions"}
            onClose={() => setOpenId(null)}
            align="start"
            side="bottom"
            trigger={
              <button
                onClick={() =>
                  setOpenId(openId === "actions" ? null : "actions")
                }
                className="btn-secondary text-sm flex items-center gap-2"
                aria-expanded={openId === "actions"}
                aria-haspopup="true"
              >
                <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
                {POPOVER_DEMOS[1].label}
              </button>
            }
          >
            <div className="py-1">
              <PopoverItem
                icon={<Edit3 className="w-4 h-4" />}
                label="Edit Product"
              />
              <PopoverItem
                icon={<Package className="w-4 h-4" />}
                label="Duplicate"
              />
              <PopoverItem
                icon={<Star className="w-4 h-4" />}
                label="Feature Item"
              />
              <PopoverSeparator />
              <PopoverItem
                icon={<Trash2 className="w-4 h-4" />}
                label="Delete"
                destructive
              />
            </div>
          </Popover>

          {/* Notifications Popover */}
          <Popover
            open={openId === "notifications"}
            onClose={() => setOpenId(null)}
            align="start"
            side="bottom"
            className="w-72"
            trigger={
              <button
                onClick={() =>
                  setOpenId(openId === "notifications" ? null : "notifications")
                }
                className="btn-secondary text-sm flex items-center gap-2"
                aria-expanded={openId === "notifications"}
                aria-haspopup="true"
              >
                <Bell className="w-4 h-4" aria-hidden="true" />
                {POPOVER_DEMOS[2].label}
              </button>
            }
          >
            <div>
              <div className="px-3 py-2.5 border-b border-border">
                <p className="text-sm font-semibold text-foreground">
                  Notifications
                </p>
              </div>
              <div className="flex flex-col">
                {[
                  {
                    icon: AlertCircle,
                    text: "Low stock: Nike Air Max (Sz 42)",
                    time: "2m ago",
                    color: "text-warning",
                  },
                  {
                    icon: Package,
                    text: "New shipment received at Warehouse A",
                    time: "1h ago",
                    color: "text-success",
                  },
                  {
                    icon: User,
                    text: "Shift ended by Ahmad Al-Qahtani",
                    time: "3h ago",
                    color: "text-blue-400",
                  },
                ].map(({ icon: Icon, text, time, color }, i) => (
                  <button
                    key={i}
                    className="flex items-start gap-3 px-3 py-3 hover:bg-muted transition-colors text-left cursor-pointer border-b border-border last:border-0"
                  >
                    <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", color)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-tight">
                        {text}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {time}
                      </p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
                  </button>
                ))}
              </div>
              <div className="px-3 py-2 border-t border-border">
                <button className="text-xs text-accent hover:text-accent/80 transition-colors font-medium cursor-pointer">
                  View all notifications
                </button>
              </div>
            </div>
          </Popover>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Click outside or press Esc to close · Only one popover can be open at
          a time
        </p>
      </Card>
    </Section>
  );
}

// ─── Component Grid Overview ──────────────────────────────────────────────────

const COMPONENT_OVERVIEW = [
  { label: "Alert", count: 5, icon: AlertCircle, color: "text-success" },
  { label: "Toast", count: 4, icon: Bell, color: "text-blue-400" },
  { label: "Dialog", count: 3, icon: Trash2, color: "text-destructive" },
  { label: "Modal", count: 3, icon: Package, color: "text-warning" },
  { label: "Drawer", count: 3, icon: SlidersHorizontal, color: "text-accent" },
  {
    label: "Popover",
    count: 3,
    icon: MoreHorizontal,
    color: "text-muted-foreground",
  },
];

function OverviewGrid() {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {COMPONENT_OVERVIEW.map(({ label, count, icon: Icon, color }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.04, ease: "easeOut" }}
          className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-2xl"
        >
          <Icon className={cn("w-6 h-6", color)} aria-hidden="true" />
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="text-[11px] text-muted-foreground">
              {count} variants
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UIShowcasePage() {
  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-4xl mx-auto px-6 py-6 flex flex-col gap-8">
        {/* Header */}
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="text-2xl font-bold text-foreground"
          >
            UI Component Showcase
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            className="text-sm text-muted-foreground mt-1"
          >
            Interactive preview of all reusable feedback and overlay components.
          </motion.p>
        </div>

        {/* Overview grid */}
        <OverviewGrid />

        {/* Component sections */}

        <ToastSection />
        <DialogSection />
        <ModalSection />
        <DrawerSection />
        <PopoverSection />
      </div>
    </div>
  );
}
