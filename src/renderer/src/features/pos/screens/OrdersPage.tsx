import React, {
  useState,
  useEffect,
  Key,
  ReactElement,
  ReactNode,
  JSXElementConstructor,
  ReactPortal,
} from "react";
import {
  Search,
  ClipboardList,
  Printer,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Order } from "../types";
import { cn, formatJOD, formatDateTime } from "@/lib/utils";

export default function OrdersPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    window.api?.orders.getPage({ search: searchQuery, pageSize: 100 }).then((data) => {
      if (data) {
        setOrders(data.orders as Order[]);
        setTotal(data.total);
      }
    });
  }, [searchQuery]);

  const filtered = orders; // filtering is now server-side

  const totalSales = orders.filter(
    (o) => o.status === "completed",
  ).reduce((sum, o) => sum + o.total, 0);

  const paymentBadgeClass = (method: Order["paymentMethod"]) => {
    switch (method) {
      case "CASH":
        return "badge bg-blue-500/15 text-blue-400";
      case "CARD":
        return "badge bg-purple-500/15 text-purple-400";
      case "SPLIT":
        return "badge bg-orange-500/15 text-orange-400";
      case "LOYALTY":
        return "badge bg-warning/15 text-warning";
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-12 bg-card border-b border-border flex items-center gap-3 px-4 shrink-0">
        <ClipboardList className="w-4 h-4 text-muted-foreground" />
        <h1 className="text-sm font-semibold text-foreground">
          {t('features.pos.screens.orders.title')}
        </h1>
        <div className="ml-auto flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('features.pos.screens.orders.searchPlaceholder')}
              className="pos-input pl-8 text-sm h-8"
              aria-label="Search orders"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-px bg-border shrink-0">
        {[
          {
            label: t('features.pos.screens.orders.todaysSales'),
            value: formatJOD(totalSales),
            color: "text-success",
          },
          {
            label: t('features.pos.screens.orders.transactions'),
            value: String(
              orders.filter((o) => o.status === "completed").length,
            ),
            color: "text-foreground",
          },
          {
            label: t('features.pos.screens.orders.refunds'),
            value: String(
              orders.filter((o) => o.status === "refunded").length,
            ),
            color: "text-destructive",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex-1 bg-card px-4 py-2">
            <p className={cn("text-lg font-bold tabular-nums", color)}>
              {value}
            </p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Orders list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <ClipboardList className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-foreground">
              No transactions found
            </p>
          </div>
        ) : (
          filtered.map((order) => {
            const isExpanded = expandedOrder === order.id;
            return (
              <div key={order.id} className="border-b border-border/50">
                {/* Order row */}
                <div
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    setExpandedOrder(isExpanded ? null : order.id)
                  }
                  aria-expanded={isExpanded}
                >
                  {/* Receipt + status */}
                  <div className="w-36 shrink-0">
                    <p className="text-sm font-medium text-foreground font-mono">
                      {order.receiptNumber}
                    </p>
                    <span
                      className={cn(
                        "badge mt-0.5",
                        order.status === "completed"
                          ? "badge-success"
                          : order.status === "refunded"
                            ? "badge-destructive"
                            : "badge-warning",
                      )}
                    >
                      {order.status}
                    </span>
                  </div>

                  {/* Time */}
                  <div className="w-28 shrink-0">
                    <p className="text-sm text-foreground tabular-nums">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </div>

                  {/* Customer / Staff */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {order.customerName ?? (
                        <span className="text-muted-foreground">Walk-in</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {order.staffName}
                    </p>
                  </div>

                  {/* Payment method */}
                  <div className="shrink-0">
                    <span className={paymentBadgeClass(order.paymentMethod)}>
                      {order.paymentMethod}
                    </span>
                  </div>

                  {/* Total */}
                  <div className="w-24 text-right shrink-0">
                    <p className="text-sm font-semibold text-foreground tabular-nums">
                      {formatJOD(order.total)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.items.length} item
                      {order.items.length !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        alert(`Reprinting ${order.receiptNumber}`);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Reprint receipt"
                      aria-label="Reprint receipt"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    {order.status === "completed" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          alert(
                            `Opening return wizard for ${order.receiptNumber}`,
                          );
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                        title="Process return"
                        aria-label="Process return"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded: order line items */}
                {isExpanded && (
                  <div className="bg-muted/20 border-t border-border/30 px-8 py-3 space-y-1.5 animate-fade-in">
                    {order.items.map(
                      (item: {
                        id: Key | null | undefined;
                        quantity:
                          | string
                          | number
                          | boolean
                          | ReactElement<
                              any,
                              string | JSXElementConstructor<any>
                            >
                          | Iterable<ReactNode>
                          | ReactPortal
                          | null
                          | undefined;
                        productName:
                          | string
                          | number
                          | boolean
                          | ReactElement<
                              any,
                              string | JSXElementConstructor<any>
                            >
                          | Iterable<ReactNode>
                          | ReactPortal
                          | null
                          | undefined;
                        size:
                          | string
                          | number
                          | boolean
                          | ReactElement<
                              any,
                              string | JSXElementConstructor<any>
                            >
                          | Iterable<ReactNode>
                          | ReactPortal
                          | null
                          | undefined;
                        color:
                          | string
                          | number
                          | boolean
                          | ReactElement<
                              any,
                              string | JSXElementConstructor<any>
                            >
                          | Iterable<ReactNode>
                          | ReactPortal
                          | null
                          | undefined;
                        lineTotal: number;
                      }) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground tabular-nums w-5 text-right">
                              {item.quantity}×
                            </span>
                            <span className="text-sm text-foreground">
                              {item.productName}
                            </span>
                            <span className="badge-muted">{item.size}</span>
                            <span className="text-xs text-muted-foreground">
                              {item.color}
                            </span>
                          </div>
                          <span className="text-sm text-foreground tabular-nums">
                            {formatJOD(item.lineTotal)}
                          </span>
                        </div>
                      ),
                    )}
                    <div className="pt-2 mt-2 border-t border-border/50 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">
                          Subtotal:{" "}
                        </span>
                        <span className="text-foreground tabular-nums">
                          {formatJOD(order.subtotal)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tax: </span>
                        <span className="text-foreground tabular-nums">
                          {formatJOD(order.taxAmount)}
                        </span>
                      </div>
                      {order.discountAmount > 0 && (
                        <div>
                          <span className="text-muted-foreground">
                            Discount:{" "}
                          </span>
                          <span className="text-success tabular-nums">
                            -{formatJOD(order.discountAmount)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
