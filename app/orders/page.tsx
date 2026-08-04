"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Search, Download, Eye, ChevronLeft, ChevronRight, X, ExternalLink, User, Mail, Phone, FileText, Clock, History, Calendar as CalendarIcon, RefreshCw, Plus, ShoppingBag, CheckCircle2, Package } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { OrdersSkeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import Link from "next/link";

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

interface StatusHistory {
    id: number;
    pcb_order_id: number;
    admin_name: string;
    status_name: string;
    remark: string | null;
    created_at: string;
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
    completed_qty?: number;
    unit_price: string | number;
    order_value: string | number;
    delivery_date: string | null;
    created_at: string;
    metas?: OrderMeta[];
    status_details?: StatusItem;
    status_histories?: StatusHistory[];
}

const PAGE_SIZE = 10;

export default function OrdersPage() {
    const [orders, setOrders] = useState<ApiOrder[]>([]);
    const [statuses, setStatuses] = useState<StatusItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [page, setPage] = useState(1);

    // Quick preview modal state
    const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);

    // Change status modal state
    const [statusModalOrder, setStatusModalOrder] = useState<ApiOrder | null>(null);
    const [modalNewStatus, setModalNewStatus] = useState("");
    const [modalCompletedQty, setModalCompletedQty] = useState<number>(0);
    const [modalRemark, setModalRemark] = useState("");
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // Order logs modal state
    const [logsModalOrder, setLogsModalOrder] = useState<ApiOrder | null>(null);
    const [logsData, setLogsData] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    const openLogsModal = async (order: ApiOrder) => {
        setLogsModalOrder(order);
        setLogsData([]);
        setLoadingLogs(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/${order.order_number}/logs`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.status || json.success) {
                setLogsData(json.data || []);
            } else {
                toast.error("Failed to load activity logs");
            }
        } catch (e) {
            console.error("Failed to fetch order logs:", e);
            toast.error("Error loading order logs");
        } finally {
            setLoadingLogs(false);
        }
    };

    // Fetch live orders and pipeline statuses
    const fetchData = async () => {
        try {
            const token = localStorage.getItem("admin_token");
            const headers = { Authorization: `Bearer ${token}` };

            let url = "/api/admin/orders?sort_by=delivery_date&sort_order=desc";
            if (startDate) url += `&start_date=${startDate}`;
            if (endDate) url += `&end_date=${endDate}`;

            const [ordersRes, statusesRes] = await Promise.all([
                fetch(url, { headers }),
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
    }, [startDate, endDate]);

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

    // Helper to format date as "17 Dec 2026"
    const formatDeliveryDate = (dateString?: string | null) => {
        if (!dateString || dateString === 'N/A') return 'N/A';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    // Helper to get meta key value
    const getMetaValue = (order: ApiOrder, key: string, fallback = "N/A") => {
        if (!order.metas) return fallback;
        const found = order.metas.find(m => m.meta_key.toLowerCase() === key.toLowerCase());
        return found ? found.meta_value : fallback;
    };

    // Open change status modal
    const openStatusModal = (order: ApiOrder) => {
        const isCompleted = ['completed', 'shipped', 'delivered'].includes((order.status || '').toLowerCase());
        const totalQtyVal = parseInt(getMetaValue(order, 'qty', getMetaValue(order, 'quantity', '5'))) || 0;
        const initialCompletedQty = typeof order.completed_qty === 'number' ? order.completed_qty : (isCompleted ? totalQtyVal : 0);

        setStatusModalOrder(order);
        setModalNewStatus(order.status);
        setModalCompletedQty(initialCompletedQty);
        setModalRemark("");
    };

    // Submit status update
    const handleStatusUpdateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!statusModalOrder || !modalNewStatus) return;

        setUpdatingStatus(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/${statusModalOrder.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: modalNewStatus,
                    completed_qty: modalCompletedQty,
                    remark: modalRemark
                })
            });

            const data = await res.json();
            if (data.status || data.success) {
                toast.success(`Order #${statusModalOrder.order_number} status & quantity updated`);
                // Update live orders list state immediately
                setOrders(prev => prev.map(o => o.id === statusModalOrder.id ? { ...o, status: modalNewStatus, completed_qty: modalCompletedQty } : o));
                setStatusModalOrder(null);
            } else {
                toast.error(data.message || "Failed to update status");
            }
        } catch (err: any) {
            console.error("Status update error:", err);
            toast.error("Error updating status");
        } finally {
            setUpdatingStatus(false);
        }
    };

    const newOrderButton = (
        <Link
            href="/orders/create"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
            <Plus className="w-4 h-4" />
            New Order
        </Link>
    );

    const activeOrdersCount = orders.filter((o) => !['completed', 'cancelled'].includes((o.status || '').toLowerCase())).length;
    const completedOrdersCount = orders.filter((o) => (o.status || '').toLowerCase() === 'completed').length;
    const totalOrderValue = orders.reduce((sum, o) => sum + (Number(o.order_value) || 0), 0);

    return (
        <DashboardLayout
            title="Orders"
            subtitle={`${orders.length} total orders recorded (Sorted by Delivery Date desc)`}
            action={newOrderButton}
        >
            {loading ? (
                <OrdersSkeleton />
            ) : (
                <div className="w-full space-y-5">
                    {/* Stats Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                <ShoppingBag className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Orders</p>
                                <h3 className="text-2xl font-black text-foreground mt-0.5">{orders.length}</h3>
                                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">All time recorded</p>
                            </div>
                        </div>

                        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">In Progress</p>
                                <h3 className="text-2xl font-black text-amber-500 mt-0.5">{activeOrdersCount}</h3>
                                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Active pipeline</p>
                            </div>
                        </div>

                        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Completed</p>
                                <h3 className="text-2xl font-black text-emerald-500 mt-0.5">{completedOrdersCount}</h3>
                                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Delivered / Finished</p>
                            </div>
                        </div>

                        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                                <Package className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Value</p>
                                <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                                    ₹{totalOrderValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </h3>
                                <p className="text-[11px] text-purple-500 font-bold mt-0.5">Combined order value</p>
                            </div>
                        </div>
                    </div>

                    {/* Search & Filter Header Bar */}
                    <div className="flex flex-row items-center gap-2 sm:gap-3 w-full overflow-x-auto pb-1">
                        <div className="relative flex-1 min-w-[140px] sm:min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="search"
                                placeholder="Search orders..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                className="w-full h-10 sm:h-11 pl-9 pr-3 text-xs sm:text-sm bg-card border border-border/80 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium transition-all shadow-xs"
                            />
                        </div>

                        {/* Date Range Picker using Popover & Calendar */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="h-10 sm:h-11 flex items-center justify-between gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 bg-card border border-border/80 rounded-xl text-xs sm:text-sm font-semibold text-foreground hover:bg-accent/40 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all shadow-xs shrink-0 cursor-pointer whitespace-nowrap">
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                        <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                                        <span className="truncate max-w-[120px] sm:max-w-[210px]">
                                            {startDate ? format(parseISO(startDate), "dd MMM") : "Date"}
                                            {endDate ? ` - ${format(parseISO(endDate), "dd MMM")}` : ""}
                                        </span>
                                    </div>
                                    {(startDate || endDate) && (
                                        <span
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setStartDate("");
                                                setEndDate("");
                                            }}
                                            className="p-0.5 rounded hover:bg-zinc-800 text-muted-foreground hover:text-red-400"
                                            title="Clear dates"
                                        >
                                            <X className="w-3 h-3" />
                                        </span>
                                    )}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-4 bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-xl shadow-xl" align="end">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div>
                                        <div className="text-xs font-semibold text-zinc-400 mb-2 px-1">Start Date</div>
                                        <Calendar
                                            mode="single"
                                            selected={startDate ? parseISO(startDate) : undefined}
                                            onSelect={(date) => setStartDate(date ? format(date, "yyyy-MM-dd") : "")}
                                            className="rounded-lg border border-zinc-800/80 bg-zinc-950/50"
                                        />
                                    </div>
                                    <div className="border-t sm:border-t-0 sm:border-l border-zinc-800 pt-4 sm:pt-0 sm:pl-4">
                                        <div className="text-xs font-semibold text-zinc-400 mb-2 px-1">End Date</div>
                                        <Calendar
                                            mode="single"
                                            selected={endDate ? parseISO(endDate) : undefined}
                                            onSelect={(date) => setEndDate(date ? format(date, "yyyy-MM-dd") : "")}
                                            className="rounded-lg border border-zinc-800/80 bg-zinc-950/50"
                                        />
                                    </div>
                                </div>
                                {(startDate || endDate) && (
                                    <div className="flex justify-end mt-3 pt-2 border-t border-zinc-800">
                                        <button
                                            onClick={() => { setStartDate(""); setEndDate(""); }}
                                            className="text-xs font-medium text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-950/30 transition-colors"
                                        >
                                            Reset Date Range
                                        </button>
                                    </div>
                                )}
                            </PopoverContent>
                        </Popover>

                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className="h-10 sm:h-11 px-2.5 sm:px-3.5 text-xs sm:text-sm bg-card border border-border/80 rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold transition-all cursor-pointer shadow-xs shrink-0 max-w-[130px] sm:max-w-none truncate"
                        >
                            <option value="All">All Statuses</option>
                            {statuses.map((s) => (
                                <option key={s.id} value={s.name}>{s.name}</option>
                            ))}
                        </select>
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
                                            <th className="py-3.5 px-5">Status</th>
                                            <th className="py-3.5 px-5">Order Number</th>
                                            <th className="py-3.5 px-5">Layers</th>
                                            <th className="py-3.5 px-5">Qty (Total / Completed / Pending)</th>
                                            <th className="py-3.5 px-5">Order Date</th>
                                            <th className="py-3.5 px-5">Delivery Date</th>
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
                                                const orderStatusStr = (order?.status || 'Pending').toString().toLowerCase();
                                                const matchedStatus = statuses.find(s => s && s.name && s.name.toString().toLowerCase() === orderStatusStr);
                                                const statusColor = matchedStatus?.color || "#10b981";
                                                const pcbColorVal = getMetaValue(order, 'pcb_color', getMetaValue(order, 'solder_mask', 'Green'));
                                                const getPcbColorCode = (col: string) => {
                                                    const lower = col.toLowerCase().trim();
                                                    if (lower.includes("red")) return "#ef4444";
                                                    if (lower.includes("blue")) return "#3b82f6";
                                                    if (lower.includes("black")) return "#3f3f46";
                                                    if (lower.includes("yellow")) return "#d97706";
                                                    if (lower.includes("white")) return "#0284c7";
                                                    if (lower.includes("purple")) return "#9333ea";
                                                    return "#10b981";
                                                };
                                                const orderNumColor = getPcbColorCode(pcbColorVal);
                                                const layerCount = getMetaValue(order, 'layers', getMetaValue(order, 'layer', '2'));

                                                const totalQty = parseInt(getMetaValue(order, 'qty', getMetaValue(order, 'quantity', '5'))) || 0;
                                                const isCompleted = ['completed', 'shipped', 'delivered'].includes(orderStatusStr);
                                                const completedQty = typeof order.completed_qty === 'number' ? order.completed_qty : (isCompleted ? totalQty : 0);
                                                const pendingQty = Math.max(0, totalQty - completedQty);

                                                const createdDateFormatted = order.created_at
                                                    ? new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                                    : 'N/A';

                                                return (
                                                    <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                                                        {/* 1. Status */}
                                                        <td className="py-4 px-5 whitespace-nowrap">
                                                            <span
                                                                className="inline-flex items-center px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider border shadow-2xs text-foreground"
                                                                style={{
                                                                    backgroundColor: `${statusColor}22`,
                                                                    borderColor: `${statusColor}60`
                                                                }}
                                                            >
                                                                {order.status}
                                                            </span>
                                                        </td>
                                                        {/* 2. Order Number */}
                                                        <td className="py-4 px-5 whitespace-nowrap">
                                                            <button
                                                                type="button"
                                                                onClick={() => openStatusModal(order)}
                                                                title="Click to Change Status"
                                                                className="font-mono text-sm font-black px-2.5 py-1 rounded-md border transition-all cursor-pointer hover:opacity-85 hover:scale-105 active:scale-95 shadow-2xs"
                                                                style={{
                                                                    color: orderNumColor,
                                                                    backgroundColor: `${orderNumColor}15`,
                                                                    borderColor: `${orderNumColor}35`
                                                                }}
                                                            >
                                                                #{order.order_number}
                                                            </button>
                                                        </td>

                                                        {/* 3. Layers */}
                                                        <td className="py-4 px-5 whitespace-nowrap">
                                                            <span className="px-2.5 py-1 rounded-lg text-foreground font-extrabold text-xs">
                                                                {layerCount}
                                                            </span>
                                                        </td>

                                                        {/* 4. Qty (Total / Completed / Pending) */}
                                                        <td className="py-4 px-5 whitespace-nowrap">
                                                            <div className="flex items-center gap-1.5 font-bold text-xs">
                                                                <span className="text-foreground font-extrabold" title="Total Order Quantity">
                                                                    {totalQty} Pcs
                                                                </span>
                                                                <span className="text-muted-foreground">·</span>
                                                                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold" title="Completed Quantity">
                                                                    {completedQty} Done
                                                                </span>
                                                                <span className="text-muted-foreground">/</span>
                                                                <span className="text-amber-600 dark:text-amber-400 font-extrabold" title="Pending Quantity">
                                                                    {pendingQty} Pend
                                                                </span>
                                                            </div>
                                                        </td>

                                                        {/* 5. Order Date */}
                                                        <td className="py-4 px-5 font-bold text-foreground font-mono whitespace-nowrap">
                                                            {createdDateFormatted}
                                                        </td>

                                                        {/* 6. Delivery Date */}
                                                        <td className="py-4 px-5 font-bold text-foreground font-mono whitespace-nowrap">
                                                            {formatDeliveryDate(order.delivery_date)}
                                                        </td>

                                                        {/* 7. Actions */}
                                                        <td className="py-4 px-5 text-right whitespace-nowrap">
                                                            <div className="inline-flex items-center justify-end gap-1.5">
                                                                {/* Change Status Icon Button */}
                                                                <button
                                                                    onClick={() => openStatusModal(order)}
                                                                    title="Change Status"
                                                                    aria-label="Change Status"
                                                                    className="p-2 bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-xl transition-all cursor-pointer shadow-2xs group relative"
                                                                >
                                                                    <RefreshCw className="w-4 h-4" />
                                                                </button>

                                                                {/* View Activity Logs Icon Button */}
                                                                <button
                                                                    onClick={() => openLogsModal(order)}
                                                                    title="View Order Logs"
                                                                    aria-label="View Order Logs"
                                                                    className="p-2 bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-xl transition-all cursor-pointer shadow-2xs"
                                                                >
                                                                    <History className="w-4 h-4" />
                                                                </button>

                                                                {/* View Detail Page Icon Button */}
                                                                <Link
                                                                    href={`/orders/${order.order_number}`}
                                                                    title="View Order Details"
                                                                    aria-label="View Order Details"
                                                                    className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500 hover:text-white transition-all cursor-pointer shadow-2xs"
                                                                >
                                                                    <ExternalLink className="w-4 h-4" />
                                                                </Link>
                                                            </div>
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
                        <div className="p-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground font-medium bg-card">
                            <span>
                                Showing <strong className="text-foreground">{filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}</strong> to{" "}
                                <strong className="text-foreground">{Math.min(page * PAGE_SIZE, filtered.length)}</strong> of{" "}
                                <strong className="text-foreground">{filtered.length}</strong> orders
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold cursor-pointer"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Previous
                                </button>
                                <span className="font-extrabold text-foreground px-2">
                                    Page {page} of {totalPages || 1}
                                </span>
                                <button
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold cursor-pointer"
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Status Modal */}
            <Dialog.Root open={!!statusModalOrder} onOpenChange={(open) => !open && setStatusModalOrder(null)}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-card border border-border/80 rounded-2xl p-6 md:p-7 shadow-2xl space-y-5">
                        {statusModalOrder && (
                            <>
                                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                                            <RefreshCw className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <Dialog.Title className="text-base font-extrabold text-foreground">
                                                Update Order Status
                                            </Dialog.Title>
                                            <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                                Order #{statusModalOrder.order_number}
                                            </p>
                                        </div>
                                    </div>
                                    <Dialog.Close className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer">
                                        <X className="w-5 h-5" />
                                    </Dialog.Close>
                                </div>

                                <form onSubmit={handleStatusUpdateSubmit} className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground block mb-1.5">
                                            Select New Pipeline Status
                                        </label>
                                        <select
                                            value={modalNewStatus}
                                            onChange={(e) => setModalNewStatus(e.target.value)}
                                            className="w-full px-3.5 py-2.5 text-xs font-bold bg-background border border-border/80 rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                                        >
                                            {statuses.map((s) => (
                                                <option key={s.id} value={s.name}>
                                                    {s.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground block mb-1.5">
                                            Completed Quantity (Pcs)
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={parseInt(getMetaValue(statusModalOrder, 'qty', getMetaValue(statusModalOrder, 'quantity', '100000'))) || 100000}
                                            value={modalCompletedQty}
                                            onChange={(e) => setModalCompletedQty(parseInt(e.target.value) || 0)}
                                            placeholder="Enter completed Pcs..."
                                            className="w-full px-3.5 py-2.5 text-xs bg-background border border-border/80 rounded-xl text-foreground font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground block mb-1.5">
                                            Add Audit Note / Remark (Optional)
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={modalRemark}
                                            onChange={(e) => setModalRemark(e.target.value)}
                                            placeholder="Enter reason or details for this status change..."
                                            className="w-full px-3.5 py-2.5 text-xs bg-background border border-border/80 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none font-medium"
                                        />
                                    </div>

                                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
                                        <button
                                            type="button"
                                            onClick={() => setStatusModalOrder(null)}
                                            className="px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-xl transition-all cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={updatingStatus}
                                            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                                        >
                                            <RefreshCw className={`w-3.5 h-3.5 ${updatingStatus ? 'animate-spin' : ''}`} />
                                            {updatingStatus ? "Saving..." : "Update Status"}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Quick Preview Modal */}
            <Dialog.Root open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border/80 rounded-2xl p-6 md:p-8 shadow-2xl space-y-5">
                        {selectedOrder && (
                            <>
                                <div className="flex items-start justify-between pb-4 border-b border-border/60">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl font-black text-foreground font-mono">#{selectedOrder.order_number}</span>
                                            <span className="px-3 py-0.5 rounded-full text-xs font-extrabold border bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                                {selectedOrder.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 font-medium">
                                            Board: <span className="font-bold text-foreground">{selectedOrder.board_name}</span>
                                        </p>
                                    </div>
                                    <Dialog.Close className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer">
                                        <X className="w-5 h-5" />
                                    </Dialog.Close>
                                </div>

                                <div className="grid grid-cols-2 gap-3 bg-muted/30 p-4 rounded-xl text-xs">
                                    <div><span className="text-muted-foreground">Amount:</span> <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{Number(selectedOrder.order_value).toLocaleString('en-IN')}</span></div>
                                    <div><span className="text-muted-foreground">Email:</span> <span className="font-bold text-foreground">{selectedOrder.user_email}</span></div>
                                    <div><span className="text-muted-foreground">Mobile:</span> <span className="font-bold text-foreground">{selectedOrder.user_mobile}</span></div>
                                    <div><span className="text-muted-foreground">Delivery:</span> <span className="font-bold text-foreground">{formatDeliveryDate(selectedOrder.delivery_date)}</span></div>
                                </div>

                                <div className="pt-2 flex justify-end gap-3">
                                    <Link
                                        href={`/orders/${selectedOrder.id}`}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white font-bold rounded-xl shadow-md hover:bg-emerald-600 transition-all text-xs"
                                    >
                                        <ExternalLink className="w-4 h-4" /> Go to Full Order Detail Page
                                    </Link>
                                </div>
                            </>
                        )}
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
            {/* View Order Activity Logs Modal */}
            <Dialog.Root open={!!logsModalOrder} onOpenChange={(open) => !open && setLogsModalOrder(null)}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-card border border-border/80 rounded-2xl p-6 md:p-7 shadow-2xl space-y-5">
                        {logsModalOrder && (
                            <>
                                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                                            <History className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <Dialog.Title className="text-base font-extrabold text-foreground flex items-center gap-2">
                                                Order Activity Logs
                                                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground border">
                                                    #{logsModalOrder.order_number}
                                                </span>
                                            </Dialog.Title>
                                            <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                                Audit trail & pipeline status history for {logsModalOrder.board_name}
                                            </p>
                                        </div>
                                    </div>
                                    <Dialog.Close className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer">
                                        <X className="w-5 h-5" />
                                    </Dialog.Close>
                                </div>

                                <div className="border border-border/60 rounded-xl overflow-hidden">
                                    <div className="overflow-x-auto">
                                        {loadingLogs ? (
                                            <div className="p-6 space-y-4">
                                                <div className="h-6 bg-muted/60 rounded-md animate-pulse w-full" />
                                                <div className="h-6 bg-muted/40 rounded-md animate-pulse w-full" />
                                                <div className="h-6 bg-muted/40 rounded-md animate-pulse w-full" />
                                                <div className="h-6 bg-muted/30 rounded-md animate-pulse w-full" />
                                            </div>
                                        ) : (
                                            <table className="w-full text-left text-xs">
                                                <thead>
                                                    <tr className="bg-muted/60 border-b border-border/60 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                                                        <th className="py-3 px-4">Action</th>
                                                        <th className="py-3 px-4">User / Admin</th>
                                                        <th className="py-3 px-4">Timestamp</th>
                                                        <th className="py-3 px-4">Details / Description</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/40 font-sans">
                                                    {logsData.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={4} className="py-8 text-center text-muted-foreground italic">
                                                                No activity logs recorded for this order yet.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        logsData.map((log: any) => (
                                                            <tr key={log.id} className="hover:bg-muted/20">
                                                                <td className="py-3 px-4 whitespace-nowrap">
                                                                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                                                                        {log.action || "Order Action"}
                                                                    </span>
                                                                </td>
                                                                <td className="py-3 px-4 font-bold text-foreground whitespace-nowrap">
                                                                    {log.admin_name || log.resolved_user_name || log.user_name || (log.admin_id ? `Admin #${log.admin_id}` : (log.user_id ? `User #${log.user_id}` : "System"))}
                                                                </td>
                                                                <td className="py-3 px-4 font-medium text-foreground whitespace-nowrap">
                                                                    {new Date(log.created_at).toLocaleString()}
                                                                </td>
                                                                <td className="py-3 px-4 font-medium text-foreground">
                                                                    {log.description || "-"}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setLogsModalOrder(null)}
                                        className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-xl transition-all cursor-pointer"
                                    >
                                        Close
                                    </button>
                                </div>
                            </>
                        )}
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </DashboardLayout>
    );
}
