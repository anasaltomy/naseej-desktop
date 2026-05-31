import { useState, useEffect } from "react";
import {
  Search,
  Receipt,
  Calendar,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import ReceiptExecutionModal from "../modals/ReceiptExecutionModal";

interface SalesSummary {
  totalSales: number;
  totalOrders: number;
  averageOrder: number;
  topProduct: string;
}

const FALLBACK_SUMMARY: SalesSummary = {
  totalSales: 0,
  totalOrders: 0,
  averageOrder: 0,
  topProduct: "-",
};

export default function SalesReportPage() {
  const [showReceiptsModal, setShowReceiptsModal] = useState(false);
  const [dateRange, setDateRange] = useState("today");
  const [summary, setSummary] = useState<SalesSummary>(FALLBACK_SUMMARY);

  function getDateRange(range: string): { dateFrom: string; dateTo: string } {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split("T")[0];
    switch (range) {
      case "today":
        return { dateFrom: fmt(today), dateTo: fmt(today) };
      case "week": {
        const start = new Date(today);
        start.setDate(today.getDate() - 6);
        return { dateFrom: fmt(start), dateTo: fmt(today) };
      }
      case "month": {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return { dateFrom: fmt(start), dateTo: fmt(today) };
      }
      case "quarter": {
        const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        return { dateFrom: fmt(start), dateTo: fmt(today) };
      }
      default:
        return { dateFrom: fmt(today), dateTo: fmt(today) };
    }
  }

  useEffect(() => {
    const { dateFrom, dateTo } = getDateRange(dateRange);
    window.api?.salesReport.getSummary({ dateFrom, dateTo }).then((data) => {
      if (data) {
        setSummary({
          totalSales:   data.totalSales   ?? 0,
          totalOrders:  data.totalOrders  ?? 0,
          averageOrder: data.averageOrder ?? 0,
          topProduct:   data.topProduct   ?? "-",
        });
      }
    });
  }, [dateRange]);

  return (
    <>
      <div className="flex flex-col flex-1 overflow-hidden bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card shadow-sm shrink-0">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Sales Report
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Overview of sales performance and receipts
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiptsModal(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-accent text-accent-foreground hover:bg-accent/90 flex items-center gap-2"
              >
                <Receipt className="w-4 h-4" />
                View Receipts
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 w-full">
          {/* Date Range Filter */}
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="pos-input w-auto text-sm"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Total Sales
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                JD {summary.totalSales.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2 text-accent text-xs">
                <TrendingUp className="w-3 h-3" />
                <span>+12% vs yesterday</span>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Orders
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {summary.totalOrders}
              </p>
              <div className="flex items-center gap-1 mt-2 text-accent text-xs">
                <TrendingUp className="w-3 h-3" />
                <span>+5 vs yesterday</span>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Average Order
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                JD {summary.averageOrder.toFixed(2)}
              </p>
              <div className="flex items-center gap-1 mt-2 text-destructive text-xs">
                <TrendingDown className="w-3 h-3" />
                <span>-3% vs yesterday</span>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Top Product
              </p>
              <p className="text-sm font-semibold text-foreground mt-2">
                {summary.topProduct}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                12 units sold
              </p>
            </div>
          </div>

          {/* Recent Sales Table */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h2 className="text-sm font-semibold text-foreground">
                Recent Transactions
              </h2>
            </div>
            <div className="divide-y divide-border">
              {[
                {
                  id: "TXN-001",
                  time: "14:32",
                  amount: 850,
                  items: 3,
                  method: "Card",
                },
                {
                  id: "TXN-002",
                  time: "13:15",
                  amount: 420,
                  items: 1,
                  method: "Cash",
                },
                {
                  id: "TXN-003",
                  time: "12:45",
                  amount: 1200,
                  items: 4,
                  method: "Card",
                },
                {
                  id: "TXN-004",
                  time: "11:20",
                  amount: 350,
                  items: 2,
                  method: "Cash",
                },
                {
                  id: "TXN-005",
                  time: "10:55",
                  amount: 680,
                  items: 2,
                  method: "Card",
                },
              ].map((txn) => (
                <div
                  key={txn.id}
                  className="grid grid-cols-[100px_80px_1fr_100px_80px] gap-4 px-4 py-3 items-center"
                >
                  <span className="text-sm font-mono text-foreground">
                    {txn.id}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {txn.time}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {txn.items} items
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    JD {txn.amount}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full text-center ${
                      txn.method === "Card"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-accent/20 text-accent"
                    }`}
                  >
                    {txn.method}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Receipts Modal */}
      <ReceiptExecutionModal
        open={showReceiptsModal}
        onClose={() => setShowReceiptsModal(false)}
      />
    </>
  );
}
