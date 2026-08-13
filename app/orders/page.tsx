"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Search, Download, Eye, ChevronLeft, ChevronRight, X, ExternalLink, User, Mail, Phone, FileText, Clock, History, Calendar as CalendarIcon, RefreshCw, Plus, ShoppingBag, CheckCircle2, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { OrdersSkeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

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

const getPcbColorCode = (col: string) => {
    const lower = (col || "").toLowerCase().trim();
    if (lower.includes("red")) return "#ef4444";
    if (lower.includes("blue")) return "#3b82f6";
    if (lower.includes("black")) return "#3f3f46";
    if (lower.includes("yellow")) return "#d97706";
    if (lower.includes("white")) return "#0284c7";
    if (lower.includes("purple")) return "#9333ea";
    return "#10b981";
};

const getPcbLightBg = (colorHex: string) => {
    return `color-mix(in srgb, ${colorHex} 7%, #ffffff 93%)`;
};

export default function OrdersPage() {
    const { user } = useAuth();
    const isSuperAdmin = user?.role?.toLowerCase() === "super admin";
    const hasPaymentPermission = isSuperAdmin || (user?.permissions ? user.permissions.includes("payments.view") : true);
    const hasStatisticsPermission = isSuperAdmin || (user?.permissions ? user.permissions.includes("orders.statistics") : false);
    const hasCreateOrderPermission = isSuperAdmin || (user?.permissions ? user.permissions.includes("orders.create") : false);
    const hasChangeStatusPermission = isSuperAdmin || (user?.permissions ? user.permissions.includes("orders.change_status") : false);
    const hasViewLogsPermission = isSuperAdmin || (user?.permissions ? user.permissions.includes("orders.view_logs") : false);

    const [orders, setOrders] = useState<ApiOrder[]>([]);
    const [statuses, setStatuses] = useState<StatusItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    // Temporary dates for Popover drafting before clicking Apply
    const [tempStartDate, setTempStartDate] = useState("");
    const [tempEndDate, setTempEndDate] = useState("");
    const [popoverOpen, setPopoverOpen] = useState(false);
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

    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [activePreset, setActivePreset] = useState<string | null>(null);

    // Generate last 5 months options dynamically (e.g. Aug 2026, Jul 2026, etc.)
    const getLast5MonthsOptions = () => {
        const options: { label: string; start: string; end: string; key: string }[] = [];
        const now = new Date();
        for (let i = 0; i < 5; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const start = `${yyyy}-${mm}-01`;
            const lastDay = new Date(yyyy, d.getMonth() + 1, 0).getDate();
            const end = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;
            options.push({ label, start, end, key: `month_${i}` });
        }
        return options;
    };

    const MONTH_OPTIONS = getLast5MonthsOptions();

    const PRESET_OPTIONS = [
        { label: "Today", value: "today" },
        { label: "Yesterday", value: "yesterday" },
        { label: "Last 7 Days", value: "7days" },
        { label: "Last 30 Days", value: "30days" },
        { label: "This Month", value: "this_month" },
        { label: "Last Month", value: "last_month" },
        { label: "This Year", value: "this_year" },
        { label: "Last Year", value: "last_year" },
    ];

    const applyPreset = (presetKey: string) => {
        setActivePreset(presetKey);
        const now = new Date();
        const formatDateStr = (d: Date) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        };

        let start = new Date();
        let end = new Date();

        if (presetKey === 'today') {
            start = new Date();
            end = new Date();
        } else if (presetKey === 'yesterday') {
            const y = new Date();
            y.setDate(y.getDate() - 1);
            start = y;
            end = y;
        } else if (presetKey === '7days') {
            const d = new Date();
            d.setDate(d.getDate() - 6);
            start = d;
            end = new Date();
        } else if (presetKey === '30days') {
            const d = new Date();
            d.setDate(d.getDate() - 29);
            start = d;
            end = new Date();
        } else if (presetKey === 'this_month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date();
        } else if (presetKey === 'last_month') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
        } else if (presetKey === 'this_year') {
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date();
        } else if (presetKey === 'last_year') {
            start = new Date(now.getFullYear() - 1, 0, 1);
            end = new Date(now.getFullYear() - 1, 11, 31);
        }

        setTempStartDate(formatDateStr(start));
        setTempEndDate(formatDateStr(end));
    };

    const formatDateShort = (dStr: string) => {
        if (!dStr) return "";
        try {
            const parts = dStr.split('-');
            if (parts.length === 3) {
                const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            }
            return dStr;
        } catch {
            return dStr;
        }
    };

    // Debounce search effect (400ms delay)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    // Fetch live orders and pipeline statuses
    const fetchData = async (searchQuery: string = debouncedSearch) => {
        setLoading(true);
        setIsSearching(true);
        try {
            const token = localStorage.getItem("admin_token");
            const headers = { Authorization: `Bearer ${token}` };

            let url = "/api/admin/orders?sort_by=delivery_date&sort_order=desc";
            if (startDate) url += `&start_date=${startDate}`;
            if (endDate) url += `&end_date=${endDate}`;
            if (searchQuery.trim()) {
                const q = encodeURIComponent(searchQuery.trim());
                url += `&search=${q}&q=${q}`;
            }
            if (statusFilter && statusFilter !== "All") {
                url += `&status=${encodeURIComponent(statusFilter)}`;
            }

            const [ordersRes, statusesRes] = await Promise.all([
                fetch(url, { headers }),
                statuses.length === 0 ? fetch("/api/admin/statuses", { headers }) : Promise.resolve(null)
            ]);

            const ordersData = await ordersRes.json();
            if (statusesRes) {
                const statusesData = await statusesRes.json();
                if (statusesData.status || statusesData.success) {
                    setStatuses(statusesData.data || []);
                }
            }

            if (ordersData.status || ordersData.success) {
                setOrders(ordersData.data || []);
            } else {
                setOrders([]);
            }
        } catch (err) {
            console.error("Failed to load orders data:", err);
            toast.error("Failed to load orders");
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    useEffect(() => {
        fetchData(debouncedSearch);
    }, [debouncedSearch, startDate, endDate, statusFilter]);

    const handleResetFilter = () => {
        setSearch("");
        setStatusFilter("All");
        setStartDate("");
        setEndDate("");
        setActivePreset(null);
        setPage(1);
    };

    // Helper to get meta key value
    const getMetaValue = (order: ApiOrder, key: string, fallback = "N/A") => {
        if (!order || !order.metas) return fallback;
        const found = order.metas.find(m => m && m.meta_key && m.meta_key.toLowerCase() === key.toLowerCase());
        return found ? found.meta_value : fallback;
    };

    // Filter logic
    const filtered = orders.filter((o) => {
        if (!o) return false;
        const query = search.toLowerCase();
        const orderNum = (o.order_number || "").toString().toLowerCase();
        const boardName = (o.board_name || "").toString().toLowerCase();
        const userEmail = (o.user_email || "").toString().toLowerCase();
        const userMobile = (o.user_mobile || "").toString().toLowerCase();
        const customerName = (o.customer_name || "").toString().toLowerCase();

        // Gerber file name & URL search
        const gerberFileName = getMetaValue(o, 'gerber_file_name', getMetaValue(o, 'gerber_name', getMetaValue(o, 'file_name', getMetaValue(o, 'gerber_file', '')))).toLowerCase();
        const gerberUrl = getMetaValue(o, 'gerber_file_url', getMetaValue(o, 'gerber_url', getMetaValue(o, 'gerber_path', ''))).toLowerCase();

        // Payment details search
        const paymentId = (getMetaValue(o, 'payment_id', getMetaValue(o, 'razorpay_payment_id', getMetaValue(o, 'transaction_id', (o as any).payment_id || ''))) || "").toString().toLowerCase();
        const paymentStatus = (getMetaValue(o, 'payment_status', (o as any).payment_status || "")).toString().toLowerCase();
        const paymentMode = (getMetaValue(o, 'payment_mode', getMetaValue(o, 'payment_method', (o as any).payment_mode || ""))).toString().toLowerCase();
        const orderValue = (o.order_value || "").toString().toLowerCase();

        const matchSearch =
            orderNum.includes(query) ||
            boardName.includes(query) ||
            userEmail.includes(query) ||
            userMobile.includes(query) ||
            customerName.includes(query) ||
            gerberFileName.includes(query) ||
            gerberUrl.includes(query) ||
            paymentId.includes(query) ||
            paymentStatus.includes(query) ||
            paymentMode.includes(query) ||
            orderValue.includes(query);

        const matchStatus = statusFilter === "All" || (o.status || "").toString().toLowerCase() === statusFilter.toLowerCase();
        return matchSearch && matchStatus;
    });

    const [pageSize, setPageSize] = useState<number>(10);
    const totalPages = Math.ceil(filtered.length / pageSize);
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    // Helper to format date as "05 Aug 2026, 11:41 am"
    const formatDate = (dateString?: string | null) => {
        if (!dateString || dateString === 'N/A') return 'N/A';
        try {
            const d = new Date(dateString);
            if (isNaN(d.getTime())) return dateString;
            const formatted = d.toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
            return formatted.replace(/\b(AM|PM)\b/gi, (m) => m.toLowerCase());
        } catch {
            return dateString || 'N/A';
        }
    };

    // Helper to check if delivery date is before today
    const isPastDeliveryDate = (dateString?: string | null) => {
        if (!dateString || dateString === 'N/A') return false;
        try {
            const d = new Date(dateString);
            if (isNaN(d.getTime())) return false;
            const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            return dDate < today;
        } catch {
            return false;
        }
    };

    // Open change status modal
    const openStatusModal = (order: ApiOrder) => {
        if (!hasChangeStatusPermission) return;
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

    const newOrderButton = hasCreateOrderPermission ? (
        <Link
            href="/orders/create"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
            <Plus className="w-4 h-4" />
            New Order
        </Link>
    ) : undefined;

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
                    {hasStatisticsPermission && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                    <ShoppingBag className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Orders</p>
                                    <h3 className="text-2xl font-black text-foreground mt-0.5">{orders.length}</h3>
                                </div>
                            </div>

                            <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                                    <Clock className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">In Progress</p>
                                    <h3 className="text-2xl font-black text-amber-500 mt-0.5">{activeOrdersCount}</h3>
                                </div>
                            </div>

                            <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Completed</p>
                                    <h3 className="text-2xl font-black text-emerald-500 mt-0.5">{completedOrdersCount}</h3>
                                </div>
                            </div>

                            <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                                    <Package className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Value</p>
                                    <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                                        {hasPaymentPermission
                                            ? `₹${totalOrderValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                                            : "XXXX"}
                                    </h3>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Search & Filter Header Bar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full pb-1">
                        <div className="relative flex-1 min-w-[200px]">
                            {isSearching ? (
                                <RefreshCw className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 animate-spin" />
                            ) : (
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            )}
                            <Input
                                type="search"
                                placeholder="Search orders by number, board, email, mobile..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                className="w-full h-10 sm:h-11 pl-10 pr-3 text-xs sm:text-sm bg-card border-border/80 rounded-xl placeholder:text-muted-foreground focus-visible:ring-emerald-500 font-medium transition-all shadow-xs"
                            />
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                            {/* Popover Date Range & Presets Selector */}
                            <Popover open={popoverOpen} onOpenChange={(open) => {
                                setPopoverOpen(open);
                                if (open) {
                                    setTempStartDate(startDate);
                                    setTempEndDate(endDate);
                                }
                            }}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="h-10 sm:h-11 min-w-[150px] sm:min-w-[170px] flex items-center justify-between gap-2 px-3.5 bg-card border-border/80 rounded-xl text-xs sm:text-sm font-bold text-foreground hover:bg-accent/40 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all shadow-xs shrink-0 cursor-pointer whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <CalendarIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                                            <span>
                                                {activePreset
                                                    ? PRESET_OPTIONS.find(p => p.value === activePreset)?.label || MONTH_OPTIONS.find(m => m.key === activePreset)?.label
                                                    : startDate && endDate
                                                        ? `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`
                                                        : startDate
                                                            ? `From ${formatDateShort(startDate)}`
                                                            : "Date Filter"}
                                            </span>
                                        </div>
                                        {(startDate || endDate) && (
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setStartDate("");
                                                    setEndDate("");
                                                    setTempStartDate("");
                                                    setTempEndDate("");
                                                    setActivePreset(null);
                                                    setPage(1);
                                                    fetchData(debouncedSearch);
                                                }}
                                                className="p-1 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors ml-1"
                                                title="Clear date filter"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="z-50 w-80 sm:w-[360px] p-4 bg-card border-border/80 rounded-2xl shadow-xl space-y-4 text-foreground"
                                    align="end"
                                    sideOffset={8}
                                >
                                    <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
                                        <span className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                            <CalendarIcon className="w-4 h-4 text-emerald-500" /> Select Date Range
                                        </span>
                                    </div>

                                    {/* Side by Side Start & End Date Inputs */}
                                    <div>
                                        <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block mb-1.5">Custom Date Range</span>
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <div>
                                                <label className="text-[10px] font-bold text-muted-foreground block mb-1">Start Date</label>
                                                <Input
                                                    type="date"
                                                    value={tempStartDate}
                                                    onChange={(e) => {
                                                        setTempStartDate(e.target.value);
                                                        setActivePreset(null);
                                                    }}
                                                    className="w-full bg-background border-border rounded-xl px-2.5 py-1.5 text-xs font-bold text-foreground focus-visible:ring-emerald-500 cursor-pointer shadow-2xs h-9"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-muted-foreground block mb-1">End Date</label>
                                                <Input
                                                    type="date"
                                                    value={tempEndDate}
                                                    onChange={(e) => {
                                                        setTempEndDate(e.target.value);
                                                        setActivePreset(null);
                                                    }}
                                                    className="w-full bg-background border-border rounded-xl px-2.5 py-1.5 text-xs font-bold text-foreground focus-visible:ring-emerald-500 cursor-pointer shadow-2xs h-9"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Last 5 Months Quick Options */}
                                    <div className="pt-2 border-t border-border/60">
                                        <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block mb-2">Last 5 Months</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {MONTH_OPTIONS.map((m) => {
                                                const isActive = activePreset === m.key;
                                                return (
                                                    <Button
                                                        key={m.key}
                                                        type="button"
                                                        variant={isActive ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => {
                                                            setActivePreset(m.key);
                                                            setTempStartDate(m.start);
                                                            setTempEndDate(m.end);
                                                        }}
                                                        className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all h-auto cursor-pointer ${isActive
                                                            ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs"
                                                            : "bg-muted/40 hover:bg-muted text-foreground border-border/60"
                                                            }`}
                                                    >
                                                        {m.label}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Action Buttons: Reset & Apply */}
                                    <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setTempStartDate("");
                                                setTempEndDate("");
                                                setStartDate("");
                                                setEndDate("");
                                                setActivePreset(null);
                                                setPage(1);
                                                setPopoverOpen(false);
                                            }}
                                            className="px-3.5 py-1.5 text-xs font-bold rounded-xl border-border/80 text-foreground hover:bg-muted h-auto cursor-pointer"
                                        >
                                            Reset
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                setStartDate(tempStartDate);
                                                setEndDate(tempEndDate);
                                                setPage(1);
                                                setPopoverOpen(false);
                                            }}
                                            className="px-4 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs h-auto cursor-pointer"
                                        >
                                            Apply
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <Select
                                value={statusFilter}
                                onValueChange={(val) => { setStatusFilter(val); setPage(1); }}
                            >
                                <SelectTrigger className="h-10 sm:h-11 w-[150px] sm:w-[170px] px-3 text-xs sm:text-sm bg-card border-border/80 rounded-xl text-foreground font-semibold shadow-xs shrink-0">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All Statuses</SelectItem>
                                    {statuses.map((s) => (
                                        <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Orders Data Table */}
                    <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-sm">
                        {loading || isSearching ? (
                            <div className="p-5 space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                                    <div className="h-4 bg-muted/60 rounded-md animate-pulse w-36" />
                                    <div className="h-4 bg-muted/60 rounded-md animate-pulse w-24" />
                                </div>
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="flex items-center justify-between py-3 px-2 border-b border-border/20 gap-4">
                                        <div className="h-7 bg-muted/60 rounded-full animate-pulse w-24 shrink-0" />
                                        <div className="h-7 bg-muted/60 rounded-lg animate-pulse w-28 shrink-0" />
                                        <div className="h-5 bg-muted/40 rounded-md animate-pulse w-12 shrink-0" />
                                        <div className="h-5 bg-muted/40 rounded-md animate-pulse w-44 shrink-0" />
                                        <div className="h-5 bg-muted/40 rounded-md animate-pulse w-32 shrink-0" />
                                        <div className="h-5 bg-muted/40 rounded-md animate-pulse w-32 shrink-0" />
                                        <div className="h-8 bg-muted/60 rounded-xl animate-pulse w-24 shrink-0" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-muted/80 border-b border-border/80 text-foreground uppercase tracking-wider font-extrabold text-[11px]">
                                            <th className="py-2 px-3.5">Status</th>
                                            <th className="py-2 px-3.5">Order Number</th>
                                            <th className="py-2 px-3.5">Layers</th>
                                            <th className="py-2 px-3.5">Qty (Total / Completed / Pending)</th>
                                            <th className="py-2 px-3.5">Order Date</th>
                                            <th className="py-2 px-3.5">Delivery Date</th>
                                            <th className="py-2 px-3.5 text-right">Actions</th>
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
                                                const orderNumColor = getPcbColorCode(pcbColorVal);
                                                const layerCount = getMetaValue(order, 'layers', getMetaValue(order, 'layer', '2'));

                                                const totalQty = parseInt(getMetaValue(order, 'qty', getMetaValue(order, 'quantity', '5'))) || 0;
                                                const isCompleted = ['completed', 'shipped', 'delivered'].includes(orderStatusStr);
                                                const completedQty = typeof order.completed_qty === 'number' ? order.completed_qty : (isCompleted ? totalQty : 0);
                                                const pendingQty = Math.max(0, totalQty - completedQty);

                                                const createdDateFormatted = formatDate(order.created_at);

                                                return (
                                                    <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                                                        {/* 1. Status */}
                                                        <td className="py-1.5 px-3.5 whitespace-nowrap">
                                                            <span
                                                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-2xs text-black"
                                                                style={{
                                                                    backgroundColor: statusColor,
                                                                    color: "#000000",
                                                                    borderColor: `${statusColor}80`
                                                                }}
                                                            >
                                                                {order.status}
                                                            </span>
                                                        </td>
                                                        {/* 2. Order Number */}
                                                        <td className="py-1.5 px-3.5 whitespace-nowrap">
                                                            {hasChangeStatusPermission ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openStatusModal(order)}
                                                                    title="Click to Change Status"
                                                                    className="font-mono text-xs font-black px-2 py-0.5 rounded-md border transition-all cursor-pointer hover:opacity-85 hover:scale-105 active:scale-95 shadow-2xs"
                                                                    style={{
                                                                        color: orderNumColor,
                                                                        backgroundColor: `${orderNumColor}15`,
                                                                        borderColor: `${orderNumColor}35`
                                                                    }}
                                                                >
                                                                    #{order.order_number}
                                                                </button>
                                                            ) : (
                                                                <span
                                                                    className="font-mono text-xs font-black px-2 py-0.5 rounded-md border shadow-2xs"
                                                                    style={{
                                                                        color: orderNumColor,
                                                                        backgroundColor: `${orderNumColor}15`,
                                                                        borderColor: `${orderNumColor}35`
                                                                    }}
                                                                >
                                                                    #{order.order_number}
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* 3. Layers */}
                                                        <td className="py-1.5 px-3.5 whitespace-nowrap">
                                                            <span className="px-2 py-0.5 rounded-lg text-foreground font-extrabold text-xs">
                                                                {layerCount}
                                                            </span>
                                                        </td>

                                                        {/* 4. Qty (Total / Completed / Pending) */}
                                                        <td className="py-1.5 px-3.5 whitespace-nowrap">
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
                                                        <td className="py-1.5 px-3.5 font-bold text-foreground font-mono text-xs whitespace-nowrap">
                                                            {createdDateFormatted}
                                                        </td>

                                                        {/* 6. Delivery Date */}
                                                        <td className={`py-1.5 px-3.5 font-bold font-mono text-xs whitespace-nowrap ${isPastDeliveryDate(order.delivery_date) ? "text-red-500 font-extrabold" : "text-foreground"}`}>
                                                            {formatDate(order.delivery_date)}
                                                        </td>

                                                        {/* 7. Actions */}
                                                        <td className="py-1.5 px-3.5 text-right whitespace-nowrap">
                                                            <div className="inline-flex items-center justify-end gap-1">
                                                                {/* Change Status Icon Button */}
                                                                {hasChangeStatusPermission && (
                                                                    <button
                                                                        onClick={() => openStatusModal(order)}
                                                                        title="Change Status"
                                                                        aria-label="Change Status"
                                                                        className="p-1.5 bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-lg transition-all cursor-pointer shadow-2xs group relative"
                                                                    >
                                                                        <RefreshCw className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}

                                                                {/* View Activity Logs Icon Button */}
                                                                {hasViewLogsPermission && (
                                                                    <button
                                                                        onClick={() => openLogsModal(order)}
                                                                        title="View Order Logs"
                                                                        aria-label="View Order Logs"
                                                                        className="p-1.5 bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-lg transition-all cursor-pointer shadow-2xs"
                                                                    >
                                                                        <History className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}

                                                                {/* View Detail Page Icon Button */}
                                                                <Link
                                                                    href={`/orders/${order.order_number}`}
                                                                    title="View Order Details"
                                                                    aria-label="View Order Details"
                                                                    className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500 hover:text-white transition-all cursor-pointer shadow-2xs"
                                                                >
                                                                    <ExternalLink className="w-3.5 h-3.5" />
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
                        <div className="p-3 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground font-medium bg-card">
                            <div className="flex items-center gap-3">
                                <span>
                                    Showing <strong className="text-foreground">{filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}</strong> to{" "}
                                    <strong className="text-foreground">{Math.min(page * pageSize, filtered.length)}</strong> of{" "}
                                    <strong className="text-foreground">{filtered.length}</strong> orders
                                </span>
                                <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-border/60">
                                    <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">Rows per page:</span>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => {
                                            setPageSize(Number(e.target.value));
                                            setPage(1);
                                        }}
                                        className="px-2 py-1 bg-card border border-border/80 rounded-lg text-foreground font-bold text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                                    >
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                </div>
                            </div>
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
            <Dialog open={!!statusModalOrder} onOpenChange={(open) => !open && setStatusModalOrder(null)}>
                {statusModalOrder && (() => {
                    const modalPcbColorVal = getMetaValue(statusModalOrder, 'pcb_color', getMetaValue(statusModalOrder, 'solder_mask', 'Green'));
                    const modalPcbColor = getPcbColorCode(modalPcbColorVal);
                    return (
                        <DialogContent
                            className="max-w-lg border rounded-2xl p-6 md:p-7 shadow-2xl space-y-5 text-slate-900 overflow-hidden"
                            style={{
                                backgroundColor: getPcbLightBg(modalPcbColor),
                                borderColor: `${modalPcbColor}60`
                            }}
                        >
                            <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: modalPcbColor }} />

                            <DialogHeader className="pb-3 border-b border-slate-200/80">
                                <div className="flex items-center gap-2.5">
                                    <div
                                        className="p-2 rounded-xl border shadow-xs"
                                        style={{ backgroundColor: `${modalPcbColor}20`, color: modalPcbColor, borderColor: `${modalPcbColor}40` }}
                                    >
                                        <RefreshCw className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-base font-black text-slate-900">
                                            Update Order Status
                                        </DialogTitle>
                                        <DialogDescription className="text-xs text-slate-600 font-semibold mt-0.5">
                                            Order #{statusModalOrder.order_number}
                                        </DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            <form onSubmit={handleStatusUpdateSubmit} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                                        Select New Pipeline Status
                                    </label>
                                    <Select
                                        value={modalNewStatus}
                                        onValueChange={(val) => setModalNewStatus(val)}
                                    >
                                        <SelectTrigger className="w-full px-3.5 py-2.5 text-xs font-bold bg-white border-slate-300 rounded-xl text-slate-900 shadow-xs h-auto">
                                            <SelectValue placeholder="Select status..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statuses.map((s) => (
                                                <SelectItem key={s.id} value={s.name}>
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                                        Completed Quantity (Pcs)
                                    </label>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={parseInt(getMetaValue(statusModalOrder, 'qty', getMetaValue(statusModalOrder, 'quantity', '100000'))) || 100000}
                                        value={modalCompletedQty}
                                        onChange={(e) => setModalCompletedQty(parseInt(e.target.value) || 0)}
                                        placeholder="Enter completed Pcs..."
                                        className="w-full px-3.5 py-2.5 text-xs bg-white border-slate-300 rounded-xl text-slate-900 font-bold shadow-xs h-auto"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                                        Add Audit Note / Remark (Optional)
                                    </label>
                                    <Textarea
                                        rows={3}
                                        value={modalRemark}
                                        onChange={(e) => setModalRemark(e.target.value)}
                                        placeholder="Enter reason or details for this status change..."
                                        className="w-full px-3.5 py-2.5 text-xs bg-white border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 resize-none font-medium shadow-xs"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/80">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setStatusModalOrder(null)}
                                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer border-slate-300/80 h-auto"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={updatingStatus}
                                        className="inline-flex items-center gap-1.5 px-5 py-2.5 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 hover:opacity-90 active:scale-95 h-auto"
                                        style={{ backgroundColor: modalPcbColor }}
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${updatingStatus ? 'animate-spin' : ''}`} />
                                        {updatingStatus ? "Saving..." : "Update Status"}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    );
                })()}
            </Dialog>

            {/* Quick Preview Modal */}
            <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                {selectedOrder && (() => {
                    const previewPcbColorVal = getMetaValue(selectedOrder, 'pcb_color', getMetaValue(selectedOrder, 'solder_mask', 'Green'));
                    const previewPcbColor = getPcbColorCode(previewPcbColorVal);
                    return (
                        <DialogContent
                            className="max-w-2xl max-h-[90vh] overflow-y-auto border rounded-2xl p-6 md:p-8 shadow-2xl space-y-5 text-slate-900 overflow-hidden"
                            style={{
                                backgroundColor: getPcbLightBg(previewPcbColor),
                                borderColor: `${previewPcbColor}60`
                            }}
                        >
                            <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: previewPcbColor }} />
                            <DialogHeader className="pb-4 border-b border-slate-200/80">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <DialogTitle className="text-xl font-black text-slate-900 font-mono">#{selectedOrder.order_number}</DialogTitle>
                                        {(() => {
                                            const selStatusStr = (selectedOrder?.status || 'Pending').toString().toLowerCase();
                                            const selMatchedStatus = statuses.find(s => s && s.name && s.name.toString().toLowerCase() === selStatusStr);
                                            const selStatusColor = selMatchedStatus?.color || "#10b981";
                                            return (
                                                <span
                                                    className="px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border text-black shadow-2xs"
                                                    style={{
                                                        backgroundColor: selStatusColor,
                                                        color: "#000000",
                                                        borderColor: `${selStatusColor}80`
                                                    }}
                                                >
                                                    {selectedOrder.status}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <DialogDescription className="text-xs text-slate-600 mt-1 font-medium">
                                        Board: <span className="font-bold text-slate-900">{selectedOrder.board_name}</span>
                                    </DialogDescription>
                                </div>
                            </DialogHeader>

                            <div className="grid grid-cols-2 gap-3 bg-white/90 p-4 rounded-xl text-xs border border-slate-200 shadow-xs">
                                <div><span className="text-slate-500 font-semibold">Amount:</span> <span className="font-black text-emerald-700">₹{Number(selectedOrder.order_value).toLocaleString('en-IN')}</span></div>
                                <div><span className="text-slate-500 font-semibold">Email:</span> <span className="font-bold text-slate-900">{selectedOrder.user_email}</span></div>
                                <div><span className="text-slate-500 font-semibold">Mobile:</span> <span className="font-bold text-slate-900">{selectedOrder.user_mobile}</span></div>
                                <div><span className="text-slate-500 font-semibold">Delivery:</span> <span className={`font-bold ${isPastDeliveryDate(selectedOrder.delivery_date) ? "text-red-600 font-extrabold" : "text-slate-900"}`}>{formatDate(selectedOrder.delivery_date)}</span></div>
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <Link
                                    href={`/orders/${selectedOrder.id}`}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 text-white font-bold rounded-xl shadow-md hover:opacity-90 transition-all text-xs active:scale-95"
                                    style={{ backgroundColor: previewPcbColor }}
                                >
                                    <ExternalLink className="w-4 h-4" /> Go to Full Order Detail Page
                                </Link>
                            </div>
                        </DialogContent>
                    );
                })()}
            </Dialog>

            {/* View Order Activity Logs Modal */}
            <Dialog open={!!logsModalOrder} onOpenChange={(open) => !open && setLogsModalOrder(null)}>
                {logsModalOrder && (() => {
                    const logsPcbColorVal = getMetaValue(logsModalOrder, 'pcb_color', getMetaValue(logsModalOrder, 'solder_mask', 'Green'));
                    const logsPcbColor = getPcbColorCode(logsPcbColorVal);
                    return (
                        <DialogContent
                            className="max-w-3xl max-h-[85vh] overflow-y-auto border rounded-2xl p-6 md:p-7 shadow-2xl space-y-5 text-slate-900 overflow-hidden"
                            style={{
                                backgroundColor: getPcbLightBg(logsPcbColor),
                                borderColor: `${logsPcbColor}60`
                            }}
                        >
                            <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: logsPcbColor }} />
                            <DialogHeader className="pb-3 border-b border-slate-200/80">
                                <div className="flex items-center gap-2.5">
                                    <div
                                        className="p-2 rounded-xl border shadow-xs"
                                        style={{ backgroundColor: `${logsPcbColor}20`, color: logsPcbColor, borderColor: `${logsPcbColor}40` }}
                                    >
                                        <History className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                                            Order Activity Logs
                                            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-300">
                                                #{logsModalOrder.order_number}
                                            </span>
                                        </DialogTitle>
                                        <DialogDescription className="text-xs text-slate-600 font-semibold mt-0.5">
                                            Audit trail & pipeline status history for {logsModalOrder.board_name}
                                        </DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                                <div className="overflow-x-auto">
                                    {loadingLogs ? (
                                        <div className="p-6 space-y-4">
                                            <div className="h-6 bg-slate-100 rounded-md animate-pulse w-full" />
                                            <div className="h-6 bg-slate-100 rounded-md animate-pulse w-full" />
                                            <div className="h-6 bg-slate-100 rounded-md animate-pulse w-full" />
                                        </div>
                                    ) : (
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold uppercase tracking-wider text-[10px]">
                                                    <th className="py-3 px-4">Action</th>
                                                    <th className="py-3 px-4">User / Admin</th>
                                                    <th className="py-3 px-4">Timestamp</th>
                                                    <th className="py-3 px-4">Details / Description</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-sans">
                                                {logsData.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} className="py-8 text-center text-slate-500 italic">
                                                            No activity logs recorded for this order yet.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    logsData.map((log: any) => (
                                                        <tr key={log.id} className="hover:bg-slate-50">
                                                            <td className="py-3 px-4 whitespace-nowrap">
                                                                <span className="font-extrabold text-emerald-700">
                                                                    {log.action || "Order Action"}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                                                                {log.admin_name || log.resolved_user_name || log.user_name || (log.admin_id ? `Admin #${log.admin_id}` : (log.user_id ? `User #${log.user_id}` : "System"))}
                                                            </td>
                                                            <td className="py-3 px-4 font-medium text-foreground whitespace-nowrap">
                                                                {formatDate(log.created_at)}
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
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setLogsModalOrder(null)}
                                    className="px-4 py-2 font-bold text-xs rounded-xl transition-all cursor-pointer h-auto"
                                >
                                    Close
                                </Button>
                            </div>
                        </DialogContent>
                    );
                })()}
            </Dialog>
        </DashboardLayout>
    );
}
