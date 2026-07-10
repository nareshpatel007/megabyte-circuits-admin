"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { mockOrders, type Order } from "@/lib/mock-data";
import { Search, Download, Eye, ChevronLeft, ChevronRight, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  Pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "In Review": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Sent to JLC": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Manufacturing: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Shipped: "bg-green-500/20 text-green-400 border-green-500/30",
  Cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

const ALL_STATUSES = ["All", "Pending", "In Review", "Sent to JLC", "Manufacturing", "Shipped", "Cancelled"];
const PAGE_SIZE = 8;

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState(mockOrders);

  const filtered = orders.filter((o) => {
    const matchSearch =
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.clientName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const updateStatus = (orderId: string, newStatus: Order["status"]) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev) => prev ? { ...prev, status: newStatus } : null);
    }
    toast.success(`Order ${orderId} status updated to "${newStatus}"`);
  };

  return (
    <DashboardLayout title="Orders & Quotes" subtitle={`${orders.length} total orders`}>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search by order ID or client..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="sm:w-44 px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/40">
                  {["Order ID", "Client", "Date", "PCB Type", "Amount", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                      No orders match your filters.
                    </td>
                  </tr>
                ) : (
                  paginated.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-primary whitespace-nowrap">{order.id}</td>
                      <td className="px-4 py-3 text-foreground whitespace-nowrap">{order.clientName}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{order.date}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{order.pcbType}</td>
                      <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                        ₹{order.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[order.status]}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-background/30">
              <span className="text-xs text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 text-xs rounded ${
                      p === page
                        ? "bg-primary text-white font-semibold"
                        : "hover:bg-accent text-muted-foreground"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      <Dialog.Root open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl p-6 shadow-2xl">
            {selectedOrder && (
              <>
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <Dialog.Title className="text-base font-semibold text-foreground">
                      {selectedOrder.id}
                    </Dialog.Title>
                    <p className="text-xs text-muted-foreground mt-0.5">{selectedOrder.clientName} · {selectedOrder.date}</p>
                  </div>
                  <Dialog.Close className="p-1.5 rounded-md hover:bg-accent text-muted-foreground">
                    <X className="w-4 h-4" />
                  </Dialog.Close>
                </div>

                {/* PCB Parameters */}
                <div className="mb-5">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">PCB Parameters</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["Base Material", selectedOrder.params.baseMaterial],
                      ["Layers", String(selectedOrder.params.layers)],
                      ["Dimensions", selectedOrder.params.dimensions + " mm"],
                      ["Copper Thickness", selectedOrder.params.copperThickness],
                      ["Mask Color", selectedOrder.params.maskColor],
                      ["Surface Finish", selectedOrder.params.surfaceFinish],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-background rounded-lg p-3 border border-border">
                        <p className="text-[10px] text-muted-foreground mb-0.5">{k}</p>
                        <p className="text-xs font-semibold text-foreground">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* File Downloads */}
                <div className="mb-5">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Files</h4>
                  <div className="space-y-2">
                    {["Gerber Files (.zip)", "BOM File (.xlsx)"].map((file) => (
                      <button
                        key={file}
                        onClick={() => toast.success(`Downloading ${file}...`)}
                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-background border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors"
                      >
                        <span className="text-xs font-medium text-foreground">{file}</span>
                        <Download className="w-3.5 h-3.5 text-primary" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Updater */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Update Status</h4>
                  <div className="flex items-center gap-3">
                    <select
                      defaultValue={selectedOrder.status}
                      onChange={(e) => updateStatus(selectedOrder.id, e.target.value as Order["status"])}
                      className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {["Pending", "In Review", "Sent to JLC", "Manufacturing", "Shipped", "Cancelled"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Amount</p>
                      <p className="text-sm font-bold text-foreground">₹{selectedOrder.amount.toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </DashboardLayout>
  );
}
