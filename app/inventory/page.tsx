"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/dashboard-layout";
import {
    Search,
    Plus,
    Pencil,
    Trash2,
    AlertTriangle,
    Boxes,
    XCircle,
    DollarSign,
    ChevronLeft,
    ChevronRight,
    PlusCircle,
    MinusCircle,
    History,
    ArrowDownRight,
    ArrowUpRight,
    FileText,
    Clock,
    UserCheck
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/ui/skeleton";

interface ApiInventoryItem {
    id: number | string;
    sku: string;
    name: string;
    unit_price?: number;
    unitPrice?: number;
    available_quantity?: number;
    availableQuantity?: number;
    low_stock_threshold?: number;
    lowStockThreshold?: number;
    status: string;
}

interface ApiInventoryLog {
    id: number;
    inventory_item_id: number;
    type: "in" | "out";
    quantity: number;
    previous_quantity: number;
    new_quantity: number;
    note?: string;
    created_by?: string;
    created_at: string;
}

const PAGE_SIZE = 10;

export default function InventoryPage() {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<ApiInventoryItem[]>([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [page, setPage] = useState(1);
    const [deleteId, setDeleteId] = useState<number | string | null>(null);

    // Stock Adjustment Modal State (In / Out)
    const [stockModalItem, setStockModalItem] = useState<ApiInventoryItem | null>(null);
    const [stockType, setStockType] = useState<"in" | "out">("in");
    const [stockQty, setStockQty] = useState("");
    const [stockNote, setStockNote] = useState("");
    const [submittingStock, setSubmittingStock] = useState(false);

    // View Logs Modal State
    const [logsModalItem, setLogsModalItem] = useState<ApiInventoryItem | null>(null);
    const [itemLogs, setItemLogs] = useState<ApiInventoryLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    const fetchInventory = async () => {
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/inventory", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && (data.status || data.success || Array.isArray(data.data))) {
                setItems(data.data || []);
            } else {
                toast.error("Failed to load component inventory");
            }
        } catch (err) {
            console.error("Error fetching inventory:", err);
            toast.error("Error loading inventory from backend API");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    const getItemPrice = (i: ApiInventoryItem) => Number(i.unit_price ?? i.unitPrice ?? 0);
    const getItemQty = (i: ApiInventoryItem) => Number(i.available_quantity ?? i.availableQuantity ?? 0);
    const getItemThreshold = (i: ApiInventoryItem) => Number(i.low_stock_threshold ?? i.lowStockThreshold ?? 0);

    const totalItemsCount = items.length;
    const inStockCount = items.filter((i) => (i.status || "").toLowerCase() === "in stock").length;
    const lowStockCount = items.filter((i) => {
        const qty = getItemQty(i);
        const th = getItemThreshold(i);
        return (i.status || "").toLowerCase() === "low stock" || (qty <= th && qty > 0);
    }).length;
    const outOfStockCount = items.filter((i) => (i.status || "").toLowerCase() === "out of stock" || getItemQty(i) === 0).length;
    const totalInventoryValue = items.reduce((acc, curr) => acc + getItemQty(curr) * getItemPrice(curr), 0);

    const filtered = items.filter((i) => {
        const query = search.toLowerCase();
        const matchSearch =
            i.name.toLowerCase().includes(query) ||
            i.sku.toLowerCase().includes(query);

        const matchStatus = statusFilter === "All" || (i.status || "").toLowerCase() === statusFilter.toLowerCase();
        return matchSearch && matchStatus;
    });

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const openStockModal = (item: ApiInventoryItem, type: "in" | "out") => {
        setStockModalItem(item);
        setStockType(type);
        setStockQty("");
        setStockNote("");
    };

    const handleStockSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stockModalItem) return;

        const qty = parseInt(stockQty);
        if (isNaN(qty) || qty <= 0) {
            toast.error("Please enter a valid positive quantity");
            return;
        }

        const currentQty = getItemQty(stockModalItem);
        if (stockType === "out" && qty > currentQty) {
            toast.error(`Cannot remove ${qty} units. Only ${currentQty} available in stock.`);
            return;
        }

        setSubmittingStock(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/inventory/${stockModalItem.id}/stock`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    type: stockType,
                    quantity: qty,
                    note: stockNote.trim()
                })
            });

            const data = await res.json();
            if (res.ok && (data.status || data.success)) {
                const updatedItem = data.data?.item;
                toast.success(data.message || `Stock updated successfully (${stockType.toUpperCase()} +${qty})`);

                if (updatedItem) {
                    setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
                } else {
                    fetchInventory();
                }

                setStockModalItem(null);
            } else {
                toast.error(data.message || "Failed to update stock");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error submitting stock movement log");
        } finally {
            setSubmittingStock(false);
        }
    };

    const openLogsModal = async (item: ApiInventoryItem) => {
        setLogsModalItem(item);
        setItemLogs([]);
        setLoadingLogs(true);

        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/inventory/${item.id}/logs`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && (data.status || data.success)) {
                setItemLogs(data.data?.logs || []);
            } else {
                toast.error("Failed to load component stock movement logs");
            }
        } catch (err) {
            console.error("Error loading logs:", err);
            toast.error("Error loading logs");
        } finally {
            setLoadingLogs(false);
        }
    };

    const handleDelete = async (id: number | string) => {
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/inventory/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && (data.status || data.success)) {
                toast.success(data.message || "Component deleted successfully");
                setItems(prev => prev.filter(i => i.id !== id));
            } else {
                toast.error(data.message || "Failed to delete component");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error deleting component");
        } finally {
            setDeleteId(null);
        }
    };

    const addComponentButton = (
        <Link
            href="/inventory/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-600 text-black transition-all shadow-xs cursor-pointer whitespace-nowrap"
        >
            <Plus className="w-4 h-4" />
            Add Component
        </Link>
    );

    return (
        <DashboardLayout
            title="Component Inventory"
            subtitle={`${items.length} total components tracked in warehouse`}
            action={addComponentButton}
        >
            {loading ? (
                <TableSkeleton rows={7} />
            ) : (
                <div className="space-y-5 animate-in fade-in duration-300">
                    {/* Stats Cards Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                <Boxes className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Components</p>
                                <h3 className="text-2xl font-black text-foreground mt-0.5">{totalItemsCount}</h3>
                                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Unique SKUs active</p>
                            </div>
                        </div>

                        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Low Stock Warning</p>
                                <h3 className="text-2xl font-black text-amber-500 mt-0.5">{lowStockCount}</h3>
                                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Requires reordering</p>
                            </div>
                        </div>

                        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                                <XCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Out of Stock</p>
                                <h3 className="text-2xl font-black text-red-500 mt-0.5">{outOfStockCount}</h3>
                                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Zero quantity available</p>
                            </div>
                        </div>

                        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Valuation</p>
                                <h3 className="text-2xl font-black text-foreground mt-0.5">
                                    ₹{totalInventoryValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                </h3>
                                <p className="text-[11px] text-emerald-500 font-bold mt-0.5">{inStockCount} items in stock</p>
                            </div>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative w-full md:w-80">
                            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                            <input
                                type="search"
                                placeholder="Search components by name or SKU code..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full pl-9 pr-4 py-2 bg-muted/30 border border-border/80 rounded-xl text-xs text-foreground focus:outline-hidden focus:border-emerald-500 font-medium"
                            />
                        </div>

                        <div className="w-full md:w-auto">
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full md:w-auto px-3.5 py-2 bg-muted/40 border border-border/80 rounded-xl text-foreground font-bold text-xs focus:outline-hidden focus:border-emerald-500 cursor-pointer shadow-xs"
                            >
                                <option value="All">All Stock Statuses</option>
                                <option value="In Stock">In Stock</option>
                                <option value="Low Stock">Low Stock</option>
                                <option value="Out of Stock">Out of Stock</option>
                            </select>
                        </div>
                    </div>

                    {/* Components Table */}
                    <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead>
                                    <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                                        <th className="py-3.5 px-5">SKU Code</th>
                                        <th className="py-3.5 px-5">Component Name</th>
                                        <th className="py-3.5 px-5">Unit Price</th>
                                        <th className="py-3.5 px-5">Available Qty</th>
                                        <th className="py-3.5 px-5">Threshold</th>
                                        <th className="py-3.5 px-5">Stock Status</th>
                                        <th className="py-3.5 px-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {paginated.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12 text-muted-foreground">
                                                No components found matching your search.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginated.map((item) => {
                                            const status = item.status || "In Stock";
                                            const isOut = status.toLowerCase() === "out of stock";
                                            const isLow = status.toLowerCase() === "low stock";

                                            const price = getItemPrice(item);
                                            const qty = getItemQty(item);
                                            const threshold = getItemThreshold(item);

                                            return (
                                                <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                                                    <td className="py-4 px-5 font-mono text-xs font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                                        {item.sku}
                                                    </td>
                                                    <td className="py-4 px-5 whitespace-nowrap">
                                                        <p className="font-bold text-foreground text-sm">{item.name}</p>
                                                    </td>
                                                    <td className="py-4 px-5 font-black text-foreground text-sm whitespace-nowrap">
                                                        ₹{price.toFixed(2)}
                                                    </td>
                                                    <td className="py-4 px-5 font-extrabold text-foreground text-xs whitespace-nowrap">
                                                        {qty.toLocaleString("en-IN")}
                                                    </td>
                                                    <td className="py-4 px-5 text-muted-foreground font-semibold font-mono text-xs whitespace-nowrap">
                                                        {threshold.toLocaleString("en-IN")}
                                                    </td>
                                                    <td className="py-4 px-5 whitespace-nowrap">
                                                        <span
                                                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider border shadow-2xs ${isOut
                                                                ? "bg-red-500/10 text-red-600 border-red-500/20"
                                                                : isLow
                                                                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                                                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                                                }`}
                                                        >
                                                            <span
                                                                className={`w-1.5 h-1.5 rounded-full ${isOut ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-emerald-500"
                                                                    }`}
                                                            />
                                                            {status}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-5 text-right whitespace-nowrap">
                                                        <div className="inline-flex items-center justify-end gap-1.5">
                                                            {/* Stock IN Button */}
                                                            <button
                                                                onClick={() => openStockModal(item, "in")}
                                                                title="Add Stock (IN)"
                                                                aria-label="Add Stock IN"
                                                                className="px-2.5 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500 hover:text-black transition-all text-xs font-black uppercase tracking-wider cursor-pointer shadow-2xs flex items-center gap-1"
                                                            >
                                                                <PlusCircle className="w-3.5 h-3.5" />
                                                                IN
                                                            </button>

                                                            {/* Stock OUT Button */}
                                                            <button
                                                                onClick={() => openStockModal(item, "out")}
                                                                title="Remove Stock (OUT)"
                                                                aria-label="Remove Stock OUT"
                                                                className="px-2.5 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-xl hover:bg-amber-500 hover:text-white transition-all text-xs font-black uppercase tracking-wider cursor-pointer shadow-2xs flex items-center gap-1"
                                                            >
                                                                <MinusCircle className="w-3.5 h-3.5" />
                                                                OUT
                                                            </button>

                                                            {/* View Logs Button */}
                                                            <button
                                                                onClick={() => openLogsModal(item)}
                                                                title="View Movement Logs"
                                                                aria-label="View Movement Logs"
                                                                className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded-xl hover:bg-purple-500 hover:text-white transition-all cursor-pointer shadow-2xs"
                                                            >
                                                                <History className="w-4 h-4" />
                                                            </button>

                                                            {/* Edit Link */}
                                                            <Link
                                                                href={`/inventory/${item.id}/edit`}
                                                                title="Edit Component Details"
                                                                aria-label="Edit Component Details"
                                                                className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500 hover:text-white transition-all cursor-pointer shadow-2xs"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </Link>

                                                            {/* Delete Button */}
                                                            <button
                                                                onClick={() => setDeleteId(item.id)}
                                                                title="Delete Component"
                                                                aria-label="Delete Component"
                                                                className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white transition-all cursor-pointer shadow-2xs"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        <div className="p-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground font-medium bg-card">
                            <span>
                                Showing <strong className="text-foreground">{filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}</strong> to{" "}
                                <strong className="text-foreground">{Math.min(page * PAGE_SIZE, filtered.length)}</strong> of{" "}
                                <strong className="text-foreground">{filtered.length}</strong> components
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    className="px-3 py-1.5 rounded-lg border border-border/80 bg-muted/30 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold cursor-pointer"
                                >
                                    <ChevronLeft className="w-4 h-4 inline" /> Prev
                                </button>
                                <span className="px-2 font-bold text-foreground">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    className="px-3 py-1.5 rounded-lg border border-border/80 bg-muted/30 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold cursor-pointer"
                                >
                                    Next <ChevronRight className="w-4 h-4 inline" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Stock Adjustment Modal (IN / OUT) */}
                    {stockModalItem && (
                        <Dialog.Root open={!!stockModalItem} onOpenChange={(o) => !o && setStockModalItem(null)}>
                            <Dialog.Portal>
                                <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity" />
                                <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border/90 rounded-2xl p-6 shadow-2xl space-y-4">
                                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                                        <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                                            {stockType === "in" ? (
                                                <>
                                                    <PlusCircle className="w-5 h-5 text-emerald-500" />
                                                    Stock In (Restock Component)
                                                </>
                                            ) : (
                                                <>
                                                    <MinusCircle className="w-5 h-5 text-amber-500" />
                                                    Stock Out (Dispatch / Consume)
                                                </>
                                            )}
                                        </h3>
                                        <Dialog.Close className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground font-bold cursor-pointer">
                                            ✕
                                        </Dialog.Close>
                                    </div>

                                    <form onSubmit={handleStockSubmit} className="space-y-4 text-xs">
                                        <div className="p-3.5 bg-muted/40 border border-border/60 rounded-xl space-y-1">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Target Component</span>
                                            <p className="font-extrabold text-foreground text-sm">{stockModalItem.name}</p>
                                            <p className="text-muted-foreground font-mono text-[11px] flex items-center gap-2">
                                                <span>SKU: <strong className="text-emerald-500">{stockModalItem.sku}</strong></span>
                                                <span>•</span>
                                                <span>Current Stock: <strong className="text-foreground">{getItemQty(stockModalItem)} units</strong></span>
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-muted-foreground font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                                                Adjustment Quantity ({stockType === "in" ? "Units to Add +" : "Units to Remove -"}) <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                required
                                                placeholder="e.g. 500"
                                                value={stockQty}
                                                onChange={(e) => setStockQty(e.target.value)}
                                                className="w-full px-3.5 py-2.5 bg-background border border-border/80 rounded-xl text-foreground font-bold text-sm focus:outline-hidden focus:border-emerald-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-muted-foreground font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                                                Reason / Reference Note (Optional)
                                            </label>
                                            <textarea
                                                rows={2}
                                                placeholder="e.g. PO-8842 Batch receipt from supplier, Assembly batch #42, etc."
                                                value={stockNote}
                                                onChange={(e) => setStockNote(e.target.value)}
                                                className="w-full px-3.5 py-2.5 bg-background border border-border/80 rounded-xl text-foreground font-medium text-xs focus:outline-hidden focus:border-emerald-500"
                                            />
                                        </div>

                                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                                            <button
                                                type="button"
                                                onClick={() => setStockModalItem(null)}
                                                className="px-4 py-2 rounded-xl font-bold border border-border bg-card hover:bg-muted text-foreground transition-all cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={submittingStock}
                                                className={`px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${stockType === "in"
                                                    ? "bg-emerald-500 hover:bg-emerald-600 text-black shadow-md"
                                                    : "bg-amber-500 hover:bg-amber-600 text-white shadow-md"
                                                    }`}
                                            >
                                                {stockType === "in" ? <PlusCircle className="w-4 h-4" /> : <MinusCircle className="w-4 h-4" />}
                                                {submittingStock ? "Saving..." : stockType === "in" ? "Confirm Stock IN" : "Confirm Stock OUT"}
                                            </button>
                                        </div>
                                    </form>
                                </Dialog.Content>
                            </Dialog.Portal>
                        </Dialog.Root>
                    )}

                    {/* View Logs Modal */}
                    {logsModalItem && (
                        <Dialog.Root open={!!logsModalItem} onOpenChange={(o) => !o && setLogsModalItem(null)}>
                            <Dialog.Portal>
                                <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity" />
                                <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl bg-card border border-border/90 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
                                    <div className="flex items-center justify-between border-b border-border/60 pb-3 shrink-0">
                                        <div>
                                            <h3 className="text-base font-black text-foreground flex items-center gap-2">
                                                <History className="w-5 h-5 text-purple-500" />
                                                Stock Movement Logs
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Historical audit trail of IN and OUT stock transactions
                                            </p>
                                        </div>
                                        <Dialog.Close className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground font-bold cursor-pointer">
                                            ✕
                                        </Dialog.Close>
                                    </div>

                                    {/* Target Component Info Header */}
                                    <div className="p-3.5 bg-muted/40 border border-border/60 rounded-xl shrink-0 flex items-center justify-between gap-4">
                                        <div>
                                            <p className="font-extrabold text-foreground text-sm">{logsModalItem.name}</p>
                                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                                SKU: <strong className="text-emerald-500">{logsModalItem.sku}</strong>
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Current Stock</span>
                                            <span className="text-base font-black text-foreground">{getItemQty(logsModalItem).toLocaleString("en-IN")} units</span>
                                        </div>
                                    </div>

                                    {/* Logs Table / List */}
                                    <div className="overflow-y-auto space-y-2 pr-1 flex-1">
                                        {loadingLogs ? (
                                            <div className="py-12 text-center text-xs text-muted-foreground font-medium">
                                                Loading stock logs...
                                            </div>
                                        ) : itemLogs.length === 0 ? (
                                            <div className="py-12 text-center text-xs text-muted-foreground font-medium bg-muted/20 border border-dashed border-border/60 rounded-xl">
                                                No stock movement logs recorded yet for this component.
                                            </div>
                                        ) : (
                                            itemLogs.map((log) => {
                                                const isIn = log.type === "in";
                                                const dateFormatted = log.created_at
                                                    ? new Date(log.created_at).toLocaleString("en-GB", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })
                                                    : "—";

                                                return (
                                                    <div
                                                        key={log.id}
                                                        className="p-3.5 bg-muted/20 border border-border/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${isIn
                                                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                                                    : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                                                    }`}
                                                            >
                                                                {isIn ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                                            </div>

                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span
                                                                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${isIn
                                                                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                                                            : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                                                            }`}
                                                                    >
                                                                        Stock {isIn ? "IN (+)" : "OUT (-)"}
                                                                    </span>
                                                                    <span className="font-extrabold text-foreground text-xs">
                                                                        {isIn ? `+${log.quantity}` : `-${log.quantity}`} units
                                                                    </span>
                                                                </div>

                                                                {log.note && (
                                                                    <p className="text-muted-foreground font-medium text-[11px] mt-1 flex items-center gap-1">
                                                                        <FileText className="w-3 h-3 text-muted-foreground" /> {log.note}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex sm:flex-col items-baseline sm:items-end justify-between text-right border-t sm:border-0 border-border/40 pt-2 sm:pt-0">
                                                            <div className="text-[11px] font-mono text-muted-foreground font-bold">
                                                                {log.previous_quantity} ➔ <strong className="text-foreground">{log.new_quantity} units</strong>
                                                            </div>
                                                            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                                                                <Clock className="w-3 h-3" /> {dateFormatted}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    <div className="pt-2 border-t border-border/60 text-right shrink-0">
                                        <Dialog.Close className="px-5 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-xl transition-all cursor-pointer">
                                            Close Logs
                                        </Dialog.Close>
                                    </div>
                                </Dialog.Content>
                            </Dialog.Portal>
                        </Dialog.Root>
                    )}

                    {/* Delete Confirmation Modal */}
                    <Dialog.Root open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                        <Dialog.Portal>
                            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity" />
                            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-card border border-border/90 rounded-2xl p-6 shadow-2xl space-y-4">
                                <div className="flex items-center gap-3 text-rose-500 border-b border-border/60 pb-3">
                                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                                        <Trash2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <Dialog.Title className="text-base font-bold text-foreground">Delete Component?</Dialog.Title>
                                        <p className="text-[11px] text-muted-foreground">Permanent Removal</p>
                                    </div>
                                </div>

                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    This action cannot be undone. It will remove the component item permanently from warehouse inventory.
                                </p>

                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60 text-xs">
                                    <Dialog.Close className="px-4 py-2 rounded-xl font-bold border border-border bg-card hover:bg-muted text-foreground transition-all cursor-pointer">
                                        Cancel
                                    </Dialog.Close>
                                    <button
                                        onClick={() => deleteId && handleDelete(deleteId)}
                                        className="px-4 py-2 rounded-xl font-bold bg-rose-500 hover:bg-rose-600 text-white transition-all cursor-pointer flex items-center gap-1.5"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Delete Component
                                    </button>
                                </div>
                            </Dialog.Content>
                        </Dialog.Portal>
                    </Dialog.Root>
                </div>
            )}
        </DashboardLayout>
    );
}
