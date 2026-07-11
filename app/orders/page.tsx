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
            <div className="space-y-5">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="search"
                            placeholder="Search by order ID or client..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border/80 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="sm:w-48 px-3.5 py-2.5 text-sm bg-card border border-border/80 rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium cursor-pointer"
                    >
                        {ALL_STATUSES.map((s) => (
                            <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>
                        ))}
                    </select>
                </div>

                {/* Table */}
                <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/60 bg-muted/40">
                                    {["Order ID", "Client", "Date", "PCB Type", "Amount", "Status", "Actions"].map((h) => (
                                        <th key={h} className="px-5 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-16 text-center text-muted-foreground text-sm font-medium">
                                            No orders match your filters.
                                        </td>
                                    </tr>
                                ) : (
                                    paginated.map((order) => (
                                        <tr
                                            key={order.id}
                                            className="border-b border-border/40 hover:bg-muted/30 transition-colors duration-150"
                                        >
                                            <td className="px-5 py-4 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{order.id}</td>
                                            <td className="px-5 py-4 text-foreground font-semibold whitespace-nowrap">{order.clientName}</td>
                                            <td className="px-5 py-4 text-muted-foreground font-medium whitespace-nowrap">{order.date}</td>
                                            <td className="px-5 py-4 text-muted-foreground font-medium whitespace-nowrap">{order.pcbType}</td>
                                            <td className="px-5 py-4 font-bold text-foreground whitespace-nowrap">
                                                ₹{order.amount.toLocaleString("en-IN")}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold ${statusColors[order.status]}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => setSelectedOrder(order)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all font-semibold"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    View Specs
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
                        <div className="flex items-center justify-between px-5 py-4 border-t border-border/60 bg-muted/20">
                            <span className="text-xs text-muted-foreground font-medium">
                                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} orders
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 rounded-lg border border-border/80 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4 text-foreground" />
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`w-8 h-8 text-xs rounded-lg transition-all ${
                                            p === page
                                                ? "bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/10"
                                                : "border border-border/80 hover:bg-muted text-muted-foreground font-medium"
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-2 rounded-lg border border-border/80 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4 text-foreground" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Order Detail Modal */}
            <Dialog.Root open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl p-6 md:p-8 shadow-2xl">
                        {selectedOrder && (
                            <>
                                <div className="flex items-start justify-between mb-6 pb-4 border-b border-border/60">
                                    <div>
                                        <Dialog.Title className="text-lg font-bold text-foreground tracking-tight">
                                            Order Details
                                        </Dialog.Title>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            ID: <span className="font-mono text-emerald-600 font-bold">{selectedOrder.id}</span> · Client: <span className="font-semibold text-foreground">{selectedOrder.clientName}</span>
                                        </p>
                                    </div>
                                    <Dialog.Close className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
                                        <X className="w-4.5 h-4.5" />
                                    </Dialog.Close>
                                </div>

                                {/* PCB Parameters */}
                                <div className="mb-6">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">PCB Parameters</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            ["Base Material", selectedOrder.params.baseMaterial],
                                            ["Layers", String(selectedOrder.params.layers)],
                                            ["Dimensions", selectedOrder.params.dimensions + " mm"],
                                            ["Copper Thickness", selectedOrder.params.copperThickness],
                                            ["Mask Color", selectedOrder.params.maskColor],
                                            ["Surface Finish", selectedOrder.params.surfaceFinish],
                                        ].map(([k, v]) => (
                                            <div key={k} className="bg-background/50 rounded-xl p-3 border border-border/60">
                                                <p className="text-[10px] text-muted-foreground font-semibold mb-0.5">{k}</p>
                                                <p className="text-xs font-bold text-foreground">{v}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* File Downloads */}
                                <div className="mb-6">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Technical Documents</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        {["Gerber Files (.zip)", "BOM File (.xlsx)"].map((file) => (
                                            <button
                                                key={file}
                                                onClick={() => toast.success(`Downloading ${file}...`)}
                                                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-background/50 border border-border/80 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all text-left"
                                            >
                                                <span className="text-xs font-bold text-foreground">{file}</span>
                                                <Download className="w-4 h-4 text-emerald-500 shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Status Updater */}
                                <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Update Stage</h4>
                                        <select
                                            defaultValue={selectedOrder.status}
                                            onChange={(e) => updateStatus(selectedOrder.id, e.target.value as Order["status"])}
                                            className="w-full px-3 py-2.5 text-sm bg-background border border-border/80 rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-medium cursor-pointer"
                                        >
                                            {["Pending", "In Review", "Sent to JLC", "Manufacturing", "Shipped", "Cancelled"].map((s) => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="sm:text-right bg-emerald-500/5 sm:bg-transparent p-3.5 sm:p-0 rounded-xl border border-emerald-500/10 sm:border-transparent">
                                        <p className="text-xs text-muted-foreground font-semibold">Total Amount</p>
                                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">₹{selectedOrder.amount.toLocaleString("en-IN")}</p>
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
