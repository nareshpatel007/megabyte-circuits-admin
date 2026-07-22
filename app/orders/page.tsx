"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Search, Download, Eye, ChevronLeft, ChevronRight, X, Loader2, ArrowLeft, Calendar, User, Mail, Phone, FileText, CheckCircle2 } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import LoadingSpinner from "@/components/ui/loading-spinner";

interface StatusItem {
    id: number;
    name: string;
    slug: string;
    color: string;
}

interface OrderMeta {
    id: number;
    pcb_order_id: number;
    meta_key: string;
    meta_value: string;
}

interface ApiOrder {
    id: number;
    user_id: number | null;
    status_id: number | null;
    order_number: string;
    board_name: string;
    customer_name: string | null;
    user_email: string;
    user_mobile: string;
    status: string;
    unit_price: string | number;
    order_value: string | number;
    delivery_date: string | null;
    created_at: string;
    metas?: OrderMeta[];
    status_details?: StatusItem;
}

const PAGE_SIZE = 10;

export default function OrdersPage() {
    const [orders, setOrders] = useState<ApiOrder[]>([]);
    const [statuses, setStatuses] = useState<StatusItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [page, setPage] = useState(1);
    
    // Modal states
    const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // Fetch live orders and pipeline statuses
    const fetchData = async () => {
        try {
            const token = localStorage.getItem("admin_token");
            const headers = { Authorization: `Bearer ${token}` };

            const [ordersRes, statusesRes] = await Promise.all([
                fetch("/api/admin/orders", { headers }),
                fetch("/api/admin/statuses", { headers })
            ]);

            const ordersData = await ordersRes.json();
            const statusesData = await statusesRes.json();

            if (ordersData.status || ordersData.success) {
                setOrders(ordersData.data || []);
            }
            if (statusesData.status || statusesData.success) {
                setStatuses(statusesData.data || []);
            }
        } catch (err) {
            console.error("Failed to load orders data:", err);
            toast.error("Failed to load orders");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filter logic
    const filtered = orders.filter((o) => {
        const query = search.toLowerCase();
        const matchSearch =
            o.order_number.toLowerCase().includes(query) ||
            o.board_name.toLowerCase().includes(query) ||
            o.user_email.toLowerCase().includes(query) ||
            o.user_mobile.toLowerCase().includes(query) ||
            (o.customer_name && o.customer_name.toLowerCase().includes(query));

        const matchStatus = statusFilter === "All" || o.status.toLowerCase() === statusFilter.toLowerCase();
        return matchSearch && matchStatus;
    });

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // Update Status Action
    const handleStatusUpdate = async (orderId: number, newStatusName: string) => {
        setUpdatingStatus(true);
        const toastId = toast.loading("Updating order status...");
        try {
            const matchedStatus = statuses.find(s => s.name.toLowerCase() === newStatusName.toLowerCase());
            const token = localStorage.getItem("admin_token");

            const res = await fetch(`/api/admin/orders/${orderId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: newStatusName,
                    status_id: matchedStatus ? matchedStatus.id : null
                })
            });

            const data = await res.json();
            if (data.status || data.success) {
                toast.success(`Order #${selectedOrder?.order_number || orderId} status updated to "${newStatusName}"`, { id: toastId });
                fetchData();
                if (selectedOrder?.id === orderId) {
                    setSelectedOrder(prev => prev ? { ...prev, status: newStatusName, status_id: matchedStatus ? matchedStatus.id : prev.status_id } : null);
                }
            } else {
                toast.error(data.message || "Failed to update status", { id: toastId });
            }
        } catch (err) {
            toast.error("Error updating order status", { id: toastId });
        } finally {
            setUpdatingStatus(false);
        }
    };

    // Helper to get meta key value
    const getMetaValue = (order: ApiOrder, key: string, fallback = "N/A") => {
        if (!order.metas) return fallback;
        const found = order.metas.find(m => m.meta_key.toLowerCase() === key.toLowerCase());
        return found ? found.meta_value : fallback;
    };

    return (
        <DashboardLayout title="Orders & Management" subtitle={`${orders.length} total orders recorded`}>
            <div className="w-full space-y-5">
                {/* Search & Filter Header Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="search"
                            placeholder="Search by Order #, Board Name, Email, or Mobile..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-card border border-border/80 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-medium transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className="w-full sm:w-56 px-3.5 py-2.5 text-sm bg-card border border-border/80 rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-bold transition-all cursor-pointer"
                        >
                            <option value="All">All Pipeline Statuses</option>
                            {statuses.map((s) => (
                                <option key={s.id} value={s.name}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Orders Data Table */}
                <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-sm">
                    {loading ? (
                        <LoadingSpinner text="Loading order history..." />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-muted/80 border-b border-border/80 text-foreground uppercase tracking-wider font-extrabold text-[11px]">
                                        <th className="py-3.5 px-5">Order #</th>
                                        <th className="py-3.5 px-5">Board & Customer</th>
                                        <th className="py-3.5 px-5">Date</th>
                                        <th className="py-3.5 px-5">Specs Overview</th>
                                        <th className="py-3.5 px-5">Order Amount</th>
                                        <th className="py-3.5 px-5">Pipeline Status</th>
                                        <th className="py-3.5 px-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {paginated.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-16 text-center text-muted-foreground text-sm font-medium">
                                                No orders matched your search or status filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginated.map((order) => {
                                            const matchedStatus = statuses.find(s => s.name.toLowerCase() === order.status.toLowerCase());
                                            const statusColor = matchedStatus?.color || "#10b981";

                                            return (
                                                <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                                                    <td className="py-4 px-5 font-mono text-sm font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                                        {order.order_number}
                                                    </td>
                                                    <td className="py-4 px-5 whitespace-nowrap">
                                                        <div>
                                                            <p className="font-bold text-foreground text-sm">{order.board_name}</p>
                                                            <p className="text-[11px] text-muted-foreground font-medium">{order.customer_name || order.user_email}</p>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-5 font-medium text-foreground whitespace-nowrap">
                                                        {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </td>
                                                    <td className="py-4 px-5 whitespace-nowrap">
                                                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                                                            <span className="bg-muted px-2 py-0.5 rounded font-bold">{getMetaValue(order, 'layers', '2')} Layers</span>
                                                            <span>·</span>
                                                            <span>{getMetaValue(order, 'qty', '5')} Pcs</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-5 font-extrabold text-foreground text-sm whitespace-nowrap">
                                                        ₹{Number(order.order_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="py-4 px-5 whitespace-nowrap">
                                                        <span
                                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold border"
                                                            style={{
                                                                backgroundColor: `${statusColor}15`,
                                                                color: statusColor,
                                                                borderColor: `${statusColor}30`
                                                            }}
                                                        >
                                                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                                                            {order.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-5 text-right whitespace-nowrap">
                                                        <button
                                                            onClick={() => setSelectedOrder(order)}
                                                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500 hover:text-white transition-all text-xs font-bold cursor-pointer"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                            Manage Order
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination Footer */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-5 py-4 border-t border-border/60 bg-muted/20">
                            <span className="text-xs text-muted-foreground font-semibold">
                                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} orders
                            </span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 rounded-xl border border-border/80 hover:bg-muted disabled:opacity-40 transition-colors cursor-pointer"
                                >
                                    <ChevronLeft className="w-4 h-4 text-foreground" />
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`w-8 h-8 text-xs rounded-xl font-bold transition-all cursor-pointer ${p === page
                                                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                                                : "border border-border/80 hover:bg-muted text-muted-foreground"
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-2 rounded-xl border border-border/80 hover:bg-muted disabled:opacity-40 transition-colors cursor-pointer"
                                >
                                    <ChevronRight className="w-4 h-4 text-foreground" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Single Order Details & Status Manager Modal */}
            <Dialog.Root open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-card border border-border/80 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
                        {selectedOrder && (
                            <>
                                {/* Header */}
                                <div className="flex items-start justify-between pb-4 border-b border-border/60">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl font-black text-foreground font-mono">#{selectedOrder.order_number}</span>
                                            <span
                                                className="px-3 py-0.5 rounded-full text-xs font-extrabold border"
                                                style={{
                                                    backgroundColor: `${statuses.find(s => s.name.toLowerCase() === selectedOrder.status.toLowerCase())?.color || "#10b981"}20`,
                                                    color: statuses.find(s => s.name.toLowerCase() === selectedOrder.status.toLowerCase())?.color || "#10b981",
                                                    borderColor: `${statuses.find(s => s.name.toLowerCase() === selectedOrder.status.toLowerCase())?.color || "#10b981"}40`
                                                }}
                                            >
                                                {selectedOrder.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 font-medium">
                                            Board Name: <span className="font-bold text-foreground">{selectedOrder.board_name}</span> · Created on {new Date(selectedOrder.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <Dialog.Close className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer">
                                        <X className="w-5 h-5" />
                                    </Dialog.Close>
                                </div>

                                {/* Quick Info Bar */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="bg-muted/40 p-4 rounded-xl border border-border/60">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Value</p>
                                        <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">₹{Number(selectedOrder.order_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                    <div className="bg-muted/40 p-4 rounded-xl border border-border/60">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Unit Price</p>
                                        <p className="text-lg font-bold text-foreground mt-0.5">₹{Number(selectedOrder.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                    <div className="bg-muted/40 p-4 rounded-xl border border-border/60">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Estimated Delivery</p>
                                        <p className="text-sm font-bold text-foreground mt-1 font-mono">{selectedOrder.delivery_date || getMetaValue(selectedOrder, 'delivery_date', '3-5 Days')}</p>
                                    </div>
                                </div>

                                {/* Customer Info */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                                        <User className="w-4 h-4 text-emerald-500" /> Customer Information
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/20 p-4 rounded-xl border border-border/60 text-xs">
                                        <div>
                                            <span className="text-muted-foreground font-semibold block">Customer Name</span>
                                            <span className="font-bold text-foreground">{selectedOrder.customer_name || "N/A"}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground font-semibold block">Email Address</span>
                                            <span className="font-bold text-foreground">{selectedOrder.user_email}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground font-semibold block">Mobile Number</span>
                                            <span className="font-bold text-foreground">{selectedOrder.user_mobile}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground font-semibold block">GST Number</span>
                                            <span className="font-bold text-foreground">{getMetaValue(selectedOrder, 'gst_number', 'N/A')}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Full PCB Specifications */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                                        <FileText className="w-4 h-4 text-emerald-500" /> Technical Parameters & Meta Data
                                    </h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                                        {selectedOrder.metas && selectedOrder.metas.length > 0 ? (
                                            selectedOrder.metas.map((meta) => (
                                                <div key={meta.id} className="bg-background/80 rounded-xl p-3 border border-border/60">
                                                    <p className="text-[10px] text-muted-foreground font-bold uppercase truncate">{meta.meta_key.replace(/_/g, ' ')}</p>
                                                    <p className="text-xs font-bold text-foreground mt-0.5 truncate">{meta.meta_value}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-span-3 text-xs text-muted-foreground italic">No extra metadata recorded.</div>
                                        )}
                                    </div>
                                </div>

                                {/* Gerber File Downloads */}
                                {getMetaValue(selectedOrder, 'gerber_file_url', '') && (
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Gerber Design Files</h4>
                                        <a
                                            href={getMetaValue(selectedOrder, 'gerber_file_url', '#')}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs hover:bg-emerald-500 hover:text-white transition-all w-full sm:w-auto gap-3"
                                        >
                                            <span>Download Gerber Files ({getMetaValue(selectedOrder, 'gerber_file_name', 'gerber.zip')})</span>
                                            <Download className="w-4 h-4" />
                                        </a>
                                    </div>
                                )}

                                {/* Pipeline Stage Update Control */}
                                <div className="pt-4 border-t border-border/60 space-y-3">
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Update Manufacturing Pipeline Status</h4>
                                    <div className="flex flex-col sm:flex-row items-center gap-3">
                                        <select
                                            value={selectedOrder.status}
                                            onChange={(e) => handleStatusUpdate(selectedOrder.id, e.target.value)}
                                            disabled={updatingStatus}
                                            className="flex-1 w-full px-4 py-3 text-sm bg-background border border-emerald-500/50 rounded-xl text-foreground font-bold focus:outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-50"
                                        >
                                            {statuses.map((s) => (
                                                <option key={s.id} value={s.name}>{s.name}</option>
                                            ))}
                                        </select>
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
