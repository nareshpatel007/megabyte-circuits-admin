"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Search, Download, Eye, ChevronLeft, ChevronRight, X, ExternalLink, User, Mail, Phone, FileText, Clock, History, Calendar as CalendarIcon, RefreshCw, Plus, ShoppingBag, CheckCircle2, Package, Film, Printer, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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

    // Reorder modal state
    const [reorderModalOrder, setReorderModalOrder] = useState<ApiOrder | null>(null);
    const [reordering, setReordering] = useState(false);

    const handleReorderSubmit = async () => {
        if (!reorderModalOrder) return;
        setReordering(true);
        const toastId = toast.loading(`Creating reorder for #${reorderModalOrder.order_number}...`);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/${reorderModalOrder.id}/reorder`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (res.ok && (data.status || data.success)) {
                toast.success(data.message || `Order reordered successfully!`, { id: toastId });
                setReorderModalOrder(null);
                fetchData(debouncedSearch);
            } else {
                toast.error(data.message || "Failed to reorder", { id: toastId });
            }
        } catch (err: any) {
            console.error("Reorder error:", err);
            toast.error(err?.message || "Error processing reorder", { id: toastId });
        } finally {
            setReordering(false);
        }
    };

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

    // Add / Edit Film modal state
    const [filmModalOrder, setFilmModalOrder] = useState<ApiOrder | null>(null);
    const [filmDateTime, setFilmDateTime] = useState("");
    const [savingFilm, setSavingFilm] = useState(false);

    // Job Card modal state
    const [jobCardModalOrder, setJobCardModalOrder] = useState<ApiOrder | null>(null);

    const openJobCardModal = (order: ApiOrder) => {
        setJobCardModalOrder(order);
    };

    const openFilmModal = (order: ApiOrder) => {
        setFilmModalOrder(order);
        const existingFilmVal = getMetaValue(order, 'film_datetime', getMetaValue(order, 'film_date', ''));
        if (existingFilmVal && existingFilmVal !== 'N/A') {
            let formatted = existingFilmVal;
            try {
                const dateObj = new Date(existingFilmVal);
                if (!isNaN(dateObj.getTime())) {
                    const pad = (n: number) => n < 10 ? '0' + n : n;
                    formatted = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
                }
            } catch (e) { }
            setFilmDateTime(formatted);
        } else {
            const now = new Date();
            const pad = (n: number) => n < 10 ? '0' + n : n;
            const defaultNow = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
            setFilmDateTime(defaultNow);
        }
    };

    const handleSaveFilm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!filmModalOrder) return;
        if (!filmDateTime) {
            toast.error("Please select a date and time");
            return;
        }

        setSavingFilm(true);
        const toastId = toast.loading("Saving Film Date & Time...");

        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/${filmModalOrder.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    meta_key: "film_datetime",
                    meta_value: filmDateTime,
                    metas: {
                        film_datetime: filmDateTime,
                        film_date: filmDateTime
                    }
                })
            });

            const data = await res.json();
            if (res.ok && (data.status || data.success)) {
                toast.success("Film date & time saved successfully", { id: toastId });
                setFilmModalOrder(null);
                fetchData(debouncedSearch);
            } else {
                toast.error(data.message || "Failed to save film date & time", { id: toastId });
            }
        } catch (err: any) {
            toast.error(err?.message || "Error saving film date & time", { id: toastId });
        } finally {
            setSavingFilm(false);
        }
    };

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

        const filmVal = getMetaValue(o, 'film_datetime', getMetaValue(o, 'film_date', '')).toLowerCase();
        const filmStatus = filmVal && filmVal !== 'n/a' ? `yes ${filmVal} ${formatDate(filmVal).toLowerCase()}` : 'no';

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
            orderValue.includes(query) ||
            filmStatus.includes(query);

        const matchStatus = statusFilter === "All" || (o.status || "").toString().toLowerCase() === statusFilter.toLowerCase();
        return matchSearch && matchStatus;
    });

    const [pageSize, setPageSize] = useState<number>(10);
    const totalPages = Math.ceil(filtered.length / pageSize);
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

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

    // Quick inline status change handler
    const handleInlineStatusChange = async (order: ApiOrder, newStatus: string) => {
        if (!hasChangeStatusPermission || order.status === newStatus) return;
        const toastId = toast.loading(`Updating Order #${order.order_number} status...`);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/${order.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: newStatus
                })
            });

            const data = await res.json();
            if (data.status || data.success) {
                toast.success(`Order #${order.order_number} status updated to "${newStatus}"`, { id: toastId });
                setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o));
            } else {
                toast.error(data.message || "Failed to update status", { id: toastId });
            }
        } catch (err: any) {
            console.error("Inline status update error:", err);
            toast.error("Error updating status", { id: toastId });
        }
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
                                    <div key={i} className="p-4 border-b border-border/40 flex items-center justify-between gap-4">
                                        <div className="h-7 bg-muted/60 rounded-lg animate-pulse w-28 shrink-0" />
                                        <div className="h-5 bg-muted/40 rounded-md animate-pulse w-12 shrink-0" />
                                        <div className="h-5 bg-muted/40 rounded-md animate-pulse w-44 shrink-0" />
                                        <div className="h-5 bg-muted/40 rounded-md animate-pulse w-32 shrink-0" />
                                        <div className="h-5 bg-muted/40 rounded-md animate-pulse w-32 shrink-0" />
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
                                            <th className="py-2 px-3.5">Film</th>
                                            <th className="py-2 px-3.5">Qty (Total / Completed / Pending)</th>
                                            <th className="py-2 px-3.5">Order Date</th>
                                            <th className="py-2 px-3.5">Delivery Date</th>
                                            <th className="py-2 px-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40">
                                        {paginated.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-5 py-16 text-center text-muted-foreground text-sm font-medium">
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
                                                                {(() => {
                                                                    const rawVal = (layerCount || '').toString().trim();
                                                                    if (!rawVal) return '2 Layers';
                                                                    if (rawVal.toLowerCase().includes('layer')) return rawVal;
                                                                    return `${rawVal} ${parseInt(rawVal, 10) === 1 ? 'Layer' : 'Layers'}`;
                                                                })()}
                                                            </span>
                                                        </td>

                                                        {/* 4. Film */}
                                                        <td className="py-1.5 px-3.5 whitespace-nowrap text-xs">
                                                            {(() => {
                                                                const filmVal = getMetaValue(order, 'film_datetime', getMetaValue(order, 'film_date', ''));
                                                                const hasFilm = filmVal && filmVal !== 'N/A' && filmVal.trim() !== '';
                                                                if (hasFilm) {
                                                                    return (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-sans">
                                                                            Yes
                                                                        </span>
                                                                    );
                                                                }
                                                                return (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-sans">
                                                                        No
                                                                    </span>
                                                                );
                                                            })()}
                                                        </td>

                                                        {/* 5. Qty (Total / Completed / Pending) */}
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

                                                        {/* 6. Order Date */}
                                                        <td className="py-1.5 px-3.5 font-bold text-foreground font-mono text-xs whitespace-nowrap">
                                                            {createdDateFormatted}
                                                        </td>

                                                        {/* 7. Delivery Date */}
                                                        <td className={`py-1.5 px-3.5 font-bold font-mono text-xs whitespace-nowrap ${isPastDeliveryDate(order.delivery_date) ? "text-red-500 font-extrabold" : "text-foreground"}`}>
                                                            {formatDate(order.delivery_date)}
                                                        </td>

                                                        {/* 8. Actions */}
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

                                                                {/* Add/Edit Film Icon Button */}
                                                                {(() => {
                                                                    const existingFilm = getMetaValue(order, 'film_datetime', getMetaValue(order, 'film_date', ''));
                                                                    const hasFilm = existingFilm && existingFilm !== 'N/A';
                                                                    return (
                                                                        <button
                                                                            onClick={() => openFilmModal(order)}
                                                                            title={hasFilm ? `Edit Film (${existingFilm})` : "Add Film"}
                                                                            aria-label="Add Film"
                                                                            className={`p-1.5 rounded-lg border transition-all cursor-pointer shadow-2xs ${
                                                                                hasFilm
                                                                                    ? "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/40 hover:bg-purple-500 hover:text-white"
                                                                                    : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500 hover:text-white"
                                                                            }`}
                                                                        >
                                                                            <Film className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    );
                                                                })()}

                                                                {/* Generate Job Card Icon Button */}
                                                                <button
                                                                    onClick={() => openJobCardModal(order)}
                                                                    title="Generate Job Card"
                                                                    aria-label="Generate Job Card"
                                                                    className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500 hover:text-white text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-lg transition-all cursor-pointer shadow-2xs"
                                                                >
                                                                    <FileText className="w-3.5 h-3.5" />
                                                                </button>

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

                                                                {/* Reorder Icon Button */}
                                                                <button
                                                                    onClick={() => setReorderModalOrder(order)}
                                                                    title="Reorder"
                                                                    aria-label="Reorder"
                                                                    className="p-1.5 bg-blue-500/10 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-lg transition-all cursor-pointer shadow-2xs"
                                                                >
                                                                    <Copy className="w-3.5 h-3.5" />
                                                                </button>

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
                                        <SelectContent className="max-h-60 overflow-y-auto font-semibold">
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
                                <Button
                                    type="button"
                                    onClick={() => {
                                        const ord = selectedOrder;
                                        setSelectedOrder(null);
                                        openJobCardModal(ord);
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all text-xs active:scale-95 cursor-pointer h-auto"
                                >
                                    <FileText className="w-4 h-4" /> Generate Job Card
                                </Button>
                                <Link
                                    href={`/orders/${selectedOrder.order_number}`}
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

            {/* Add / Edit Film Date & Time Modal */}
            <Dialog open={!!filmModalOrder} onOpenChange={(open) => !open && setFilmModalOrder(null)}>
                {filmModalOrder && (() => {
                    const modalPcbColorVal = getMetaValue(filmModalOrder, 'pcb_color', getMetaValue(filmModalOrder, 'solder_mask', 'Green'));
                    const modalPcbColor = getPcbColorCode(modalPcbColorVal);
                    const existingFilmVal = getMetaValue(filmModalOrder, 'film_datetime', getMetaValue(filmModalOrder, 'film_date', ''));
                    const isExisting = existingFilmVal && existingFilmVal !== 'N/A';

                    return (
                        <DialogContent
                            className="max-w-md border rounded-2xl p-6 md:p-7 shadow-2xl space-y-5 text-slate-900 overflow-hidden"
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
                                        <Film className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-base font-black text-slate-900">
                                            {isExisting ? "Update Film Date & Time" : "Add Film Date & Time"}
                                        </DialogTitle>
                                        <DialogDescription className="text-xs text-slate-600 font-semibold mt-0.5">
                                            Order #{filmModalOrder.order_number} · {filmModalOrder.board_name}
                                        </DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            <form onSubmit={handleSaveFilm} className="space-y-4">
                                {isExisting && (
                                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs space-y-0.5">
                                        <span className="font-bold text-purple-900 block">Current Saved Film Date & Time:</span>
                                        <span className="font-mono text-purple-700 font-extrabold">{existingFilmVal}</span>
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                                        Select Film Date & Time
                                    </label>
                                    <Input
                                        type="datetime-local"
                                        value={filmDateTime}
                                        onChange={(e) => setFilmDateTime(e.target.value)}
                                        className="w-full px-3.5 py-2.5 text-xs bg-white border-slate-300 rounded-xl text-slate-900 font-bold shadow-xs h-auto cursor-pointer"
                                        required
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/80">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setFilmModalOrder(null)}
                                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer border-slate-300/80 h-auto"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={savingFilm}
                                        className="inline-flex items-center gap-1.5 px-5 py-2.5 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 hover:opacity-90 active:scale-95 h-auto"
                                        style={{ backgroundColor: modalPcbColor }}
                                    >
                                        <Film className={`w-3.5 h-3.5 ${savingFilm ? 'animate-spin' : ''}`} />
                                        {savingFilm ? "Saving..." : isExisting ? "Update Film" : "Save Film"}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    );
                })()}
            </Dialog>

            {/* Dynamic Job Card Generator & Preview Modal */}
            <Dialog open={!!jobCardModalOrder} onOpenChange={(open) => !open && setJobCardModalOrder(null)}>
                {jobCardModalOrder && (() => {
                    const order = jobCardModalOrder;
                    const layersStr = getMetaValue(order, 'layers', getMetaValue(order, 'layer', '2'));
                    const isSingleSide = layersStr === "1" || layersStr.toLowerCase().includes("1-side") || layersStr.toLowerCase().includes("single");
                    
                    const createdDate = formatDate(order.created_at);
                    const launchDate = formatDate(getMetaValue(order, 'launch_date', order.created_at));
                    const shippingDate = formatDate(order.delivery_date);
                    
                    const orderQty = getMetaValue(order, 'qty', getMetaValue(order, 'quantity', 'N/A'));
                    const launchedQty = getMetaValue(order, 'launched_qty', getMetaValue(order, 'launched', orderQty));
                    const ups = getMetaValue(order, 'ups', '1');
                    const panels = getMetaValue(order, 'panels', '1');
                    const minHole = getMetaValue(order, 'min_hole', getMetaValue(order, 'min_hole_size', '0.8 MM'));
                    
                    const panelSize = getMetaValue(order, 'panel_size', getMetaValue(order, 'dimensions', ''));
                    const cuttingSize = getMetaValue(order, 'cutting_size', '');
                    
                    const material = getMetaValue(order, 'material', getMetaValue(order, 'base_material', 'FR4'));
                    const thickness = getMetaValue(order, 'board_thickness', getMetaValue(order, 'thickness', '1.6'));
                    const copperThickness = getMetaValue(order, 'copper_thickness', getMetaValue(order, 'copper_weight', '1 Oz'));
                    const surfaceFinish = getMetaValue(order, 'surface_finish', getMetaValue(order, 'finish', 'HAL Finish'));
                    
                    const maskColour = getMetaValue(order, 'pcb_color', getMetaValue(order, 'solder_mask', 'Green'));
                    const lpColor = getMetaValue(order, 'legend_color', getMetaValue(order, 'silkscreen', 'White'));
                    const lpSide = getMetaValue(order, 'silkscreen_side', getMetaValue(order, 'legend_side', 'Top'));
                    
                    const route = getMetaValue(order, 'route', getMetaValue(order, 'routing', 'CNC Routing'));
                    const vCut = getMetaValue(order, 'v_cut', 'Yes');
                    const fptProgram = getMetaValue(order, 'fpt_program', 'MNF-1 / MNF-2');
                    const secondStage = getMetaValue(order, 'second_stage', 'Yes');
                    const copperArea = getMetaValue(order, 'copper_area', '');
                    const internalCutouts = getMetaValue(order, 'internal_cutouts', 'No');
                    
                    const productionNote = getMetaValue(order, 'production_note', '');
                    const customerNote = getMetaValue(order, 'customer_note', getMetaValue(order, 'special_instructions', ''));

                    const singleSideProcesses = [
                        "CUTTING",
                        "DRILL",
                        "DH Print",
                        "Expose/P&E",
                        "Devloping",
                        "ETCHING",
                        "ETCHING QC",
                        "PISM",
                        "HAL",
                        "LP",
                        "Manual Cutting",
                        "V-CUT",
                        "Routing",
                        "Final QC with QTY",
                        "Packing"
                    ];

                    const multiLayerProcesses = [
                        "CUTTING",
                        "DRILL",
                        "DH Print",
                        "Exposing",
                        "DEVLOPING QC",
                        "PLATING",
                        "PLATING QC",
                        "CAUSTIC",
                        "ETCHING",
                        "ETCH QC",
                        "PISM",
                        "HAL",
                        "LP",
                        "ROUT",
                        "V-CUT",
                        "BBT / FPT",
                        "FINAL QC",
                        "Packing"
                    ];

                    const processList = isSingleSide ? singleSideProcesses : multiLayerProcesses;

                    const handlePrint = () => {
                        const printContent = document.getElementById("job-card-printable-content");
                        if (!printContent) return;
                        const printWin = window.open("", "_blank");
                        if (!printWin) {
                            toast.error("Popup blocked! Please allow popups to print/download job cards.");
                            return;
                        }
                        printWin.document.write(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <title>JOB_CARD_${order.order_number}</title>
                                <style>
                                    @page { size: A4 portrait; margin: 5mm; }
                                    body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 5px; color: #000; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                                    * { box-sizing: border-box; }
                                    table { width: 100%; border-collapse: collapse !important; border-spacing: 0; }
                                    td, th { color: #000; font-family: Arial, sans-serif; }
                                    @media print {
                                        body { padding: 0; }
                                    }
                                </style>
                            </head>
                            <body>
                                ${printContent.innerHTML}
                                <script>
                                    window.onload = function() {
                                        window.focus();
                                        setTimeout(function() {
                                            window.print();
                                        }, 300);
                                    };
                                </script>
                            </body>
                            </html>
                        `);
                        printWin.document.close();
                    };

                    const handleDownload = () => {
                        handlePrint();
                    };

                    return (
                        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto border border-slate-300 rounded-2xl p-4 md:p-6 shadow-2xl space-y-4 text-slate-900 bg-slate-50 dark:bg-slate-900 dark:text-slate-100">
                            <DialogHeader className="pb-3 border-b border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between">
                                <div>
                                    <DialogTitle className="text-lg font-extrabold flex items-center gap-2 text-indigo-900 dark:text-indigo-300">
                                        <FileText className="w-5 h-5 text-indigo-600" />
                                        Job Card Preview & Generator
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-slate-500 font-semibold mt-0.5">
                                        Order #{order.order_number} · {order.board_name || 'PCB Order'} ({isSingleSide ? '1-SIDE' : `${layersStr}-Layer`})
                                    </DialogDescription>
                                </div>

                                <div className="flex items-center gap-2.5 mr-6">
                                    <Button
                                        type="button"
                                        onClick={handlePrint}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer h-auto"
                                    >
                                        <Printer className="w-4 h-4" /> Print Job Card
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={handleDownload}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer h-auto"
                                    >
                                        <Download className="w-4 h-4" /> Download PDF
                                    </Button>
                                </div>
                            </DialogHeader>

                            {/* Single Master Table Container Matching PDF Screenshot */}
                            <div className="p-3 bg-white border border-slate-300 rounded-lg shadow-md font-sans text-black overflow-x-auto">
                                <div id="job-card-printable-content" className="text-black bg-white">
                                    <table className="w-full border-collapse border-2 border-black text-xs font-semibold text-black" style={{ borderCollapse: 'collapse', border: '2px solid #000' }}>
                                        <tbody>
                                            {/* Header Row */}
                                            <tr className="border-b-2 border-black">
                                                <td className="p-2 border-r-2 border-black w-1/3 font-black text-sm align-middle" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>
                                                    JOB NO: <span className="font-extrabold text-base underline ml-1">{order.order_number}</span>
                                                </td>
                                                <td className="p-2 border-r-2 border-black w-1/3 text-center align-middle" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>
                                                    {isSingleSide ? (
                                                        <>
                                                            <div className="flex items-center justify-center gap-4 text-xs font-bold mb-0.5">
                                                                <span>Expose <span className="inline-block border border-black px-1 font-mono font-bold">✓</span></span>
                                                                <span>Print & Etch <span className="inline-block border border-black px-1.5 font-mono">&nbsp;</span></span>
                                                            </div>
                                                            <div className="text-xl font-black uppercase tracking-wider underline">JOB CARD</div>
                                                        </>
                                                    ) : (
                                                        <div className="text-xl font-black uppercase tracking-wider underline">JOB CARD</div>
                                                    )}
                                                </td>
                                                <td className="p-2 w-1/3 text-right font-black text-base align-middle" style={{ borderBottom: '2px solid #000' }}>
                                                    {isSingleSide ? "1- SIDE" : `${layersStr}-Layer Board`}
                                                </td>
                                            </tr>

                                            {/* Row 2: Dates */}
                                            <tr className="border-b-2 border-black">
                                                <td className="p-1.5 border-r-2 border-black" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>Order Date: <span className="font-bold ml-1">{createdDate}</span></td>
                                                <td className="p-1.5 border-r-2 border-black" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>Launch Date: <span className="font-bold ml-1">{launchDate}</span></td>
                                                <td className="p-1.5" style={{ borderBottom: '2px solid #000' }}>Shipping Date: <span className="font-bold ml-1">{shippingDate}</span></td>
                                            </tr>

                                            {/* Row 3: Quantities & Min Hole */}
                                            <tr className="border-b-2 border-black">
                                                <td className="p-1.5 border-r-2 border-black" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>ORDER QTY: <span className="font-bold ml-1">{orderQty}</span></td>
                                                <td className="p-1.5 border-r-2 border-black" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>LAUNCHED: <span className="font-bold ml-1">{launchedQty}</span></td>
                                                <td className="p-0" style={{ borderBottom: '2px solid #000' }}>
                                                    <table className="w-full border-collapse" style={{ borderCollapse: 'collapse' }}>
                                                        <tbody>
                                                            <tr>
                                                                <td className="p-1.5 border-r-2 border-black w-1/3" style={{ borderRight: '2px solid #000' }}>UPS: <span className="font-bold ml-1">{ups}</span></td>
                                                                <td className="p-1.5 border-r-2 border-black w-1/3" style={{ borderRight: '2px solid #000' }}>PANELS: <span className="font-bold ml-1">{panels}</span></td>
                                                                <td className="p-1.5 w-1/3">Min.Hole: <span className="font-bold ml-1">{minHole}</span></td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>

                                            {/* Row 4: Panel & Cutting Size */}
                                            <tr className="border-b-2 border-black">
                                                <td colSpan={2} className="p-1.5 border-r-2 border-black" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>PANEL SIZE: <span className="font-bold ml-1">{panelSize ? `${panelSize} MM` : 'MM'}</span></td>
                                                <td className="p-1.5" style={{ borderBottom: '2px solid #000' }}>CUTTING SIZE: <span className="font-bold ml-1">{cuttingSize ? `${cuttingSize} MM` : 'MM'}</span></td>
                                            </tr>

                                            {/* Row 5: Material, Thickness, Copper, Finish */}
                                            <tr className="border-b-2 border-black">
                                                <td className="p-1.5 border-r-2 border-black" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>Material: <span className="font-bold ml-1">{material}</span></td>
                                                <td className="p-1.5 border-r-2 border-black" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>Thick: <span className="font-bold ml-1">{thickness} MM</span></td>
                                                <td className="p-0" style={{ borderBottom: '2px solid #000' }}>
                                                    <table className="w-full border-collapse" style={{ borderCollapse: 'collapse' }}>
                                                        <tbody>
                                                            <tr>
                                                                <td className="p-1.5 border-r-2 border-black w-1/2" style={{ borderRight: '2px solid #000' }}>Copper Thick: <span className="font-bold ml-1">{copperThickness} Micron</span></td>
                                                                <td className="p-1.5 w-1/2">Finish: <span className="font-bold ml-1">{surfaceFinish}</span></td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>

                                            {/* Row 6: Mask Colour, LP Color, LP Side */}
                                            <tr className="border-b-2 border-black">
                                                <td className="p-1.5 border-r-2 border-black" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>Mask Colour: <span className="font-bold ml-1">{maskColour}</span></td>
                                                <td className="p-1.5 border-r-2 border-black" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>LP Color: <span className="font-bold ml-1">{lpColor}</span></td>
                                                <td className="p-1.5" style={{ borderBottom: '2px solid #000' }}>LP Side: <span className="font-bold ml-1">{lpSide}</span></td>
                                            </tr>

                                            {/* Row 7: Routing / V-Cut / FPT / Stage / Cutouts */}
                                            <tr className="border-b-2 border-black">
                                                {isSingleSide ? (
                                                    <>
                                                        <td className="p-1.5 border-r-2 border-black" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>Route: <span className="font-bold ml-1">{route}</span></td>
                                                        <td className="p-1.5 border-r-2 border-black" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>V-Cut: <span className="font-bold ml-1">{vCut}</span></td>
                                                        <td className="p-0" style={{ borderBottom: '2px solid #000' }}>
                                                            <table className="w-full border-collapse" style={{ borderCollapse: 'collapse' }}>
                                                                <tbody>
                                                                    <tr>
                                                                        <td className="p-1.5 border-r-2 border-black w-1/2" style={{ borderRight: '2px solid #000' }}>Shearing Cut: <span className="font-bold ml-1">Yes</span></td>
                                                                        <td className="p-1.5 w-1/2">Internal Cutouts Reqd.?: <span className="font-bold ml-1">{internalCutouts}</span></td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="p-1.5 border-r-2 border-black" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>Route: <span className="font-bold ml-1">{route}</span></td>
                                                        <td className="p-1.5 border-r-2 border-black" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>V-Cut: <span className="font-bold ml-1">{vCut}</span></td>
                                                        <td className="p-0" style={{ borderBottom: '2px solid #000' }}>
                                                            <table className="w-full border-collapse" style={{ borderCollapse: 'collapse' }}>
                                                                <tbody>
                                                                    <tr style={{ borderBottom: '2px solid #000' }}>
                                                                        <td className="p-1.5 border-r-2 border-black w-1/2" style={{ borderRight: '2px solid #000' }}>FPT Program: <span className="font-bold ml-1">{fptProgram}</span></td>
                                                                        <td className="p-1.5 w-1/2">2<sup>nd</sup> stage reqd.?: <span className="font-bold ml-1">{secondStage}</span></td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="p-1.5 border-r-2 border-black w-1/2" style={{ borderRight: '2px solid #000' }}>Copper Area: <span className="font-bold ml-1">{copperArea ? `${copperArea} Amp` : 'Amp'}</span></td>
                                                                        <td className="p-1.5 w-1/2">Internal Cutouts Reqd.?: <span className="font-bold ml-1">{internalCutouts}</span></td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>

                                            {/* Row 8: Notes Section */}
                                            <tr className="border-b-2 border-black">
                                                <td colSpan={2} className="p-2 border-r-2 border-black align-top h-20" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>
                                                    <div className="font-black text-xs underline mb-1">Production Note:</div>
                                                    <div className="text-[11px] font-medium leading-relaxed pl-2 whitespace-pre-wrap">
                                                        {productionNote ? productionNote : "• \n• "}
                                                    </div>
                                                </td>
                                                <td className="p-2 align-top h-20" style={{ borderBottom: '2px solid #000' }}>
                                                    <div className="font-black text-xs underline mb-1">Customer Special Note:</div>
                                                    <div className="text-[11px] font-medium leading-relaxed pl-2 whitespace-pre-wrap">
                                                        {customerNote ? customerNote : ""}
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Row 9: Final Quantities Header & Blank Row */}
                                            <tr className="border-b-2 border-black">
                                                <td colSpan={3} className="p-0" style={{ borderBottom: '2px solid #000' }}>
                                                    <table className="w-full border-collapse text-center" style={{ borderCollapse: 'collapse' }}>
                                                        <thead>
                                                            <tr className="border-b-2 border-black font-bold">
                                                                <th className="p-1.5 border-r-2 border-black w-1/4 font-bold text-xs" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>Final Panel Qty.</th>
                                                                <th className="p-1.5 border-r-2 border-black w-1/4 font-bold text-xs" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>Final Board Qty.</th>
                                                                <th className="p-1.5 border-r-2 border-black w-1/4 font-bold text-xs" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>Rejected Board Qty.</th>
                                                                <th className="p-1.5 w-1/4 font-bold text-xs" style={{ borderBottom: '2px solid #000' }}>Why Rejected?</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr className="h-7">
                                                                <td className="p-1 border-r-2 border-black" style={{ borderRight: '2px solid #000' }}></td>
                                                                <td className="p-1 border-r-2 border-black" style={{ borderRight: '2px solid #000' }}></td>
                                                                <td className="p-1 border-r-2 border-black" style={{ borderRight: '2px solid #000' }}></td>
                                                                <td className="p-1"></td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>

                                            {/* Row 10: Process Table Header & Rows */}
                                            <tr>
                                                <td colSpan={3} className="p-0">
                                                    <table className="w-full border-collapse text-xs" style={{ borderCollapse: 'collapse' }}>
                                                        <thead>
                                                            <tr className="border-b-2 border-black font-black uppercase text-[10px] text-center" style={{ borderBottom: '2px solid #000' }}>
                                                                <th className="p-1.5 border-r-2 border-black text-left font-black w-1/4 pl-3" style={{ borderRight: '2px solid #000' }}>PROCESS</th>
                                                                <th className="p-1.5 border-r-2 border-black text-center font-black w-12" style={{ borderRight: '2px solid #000' }}>IN</th>
                                                                <th className="p-1.5 border-r-2 border-black text-center font-black" style={{ borderRight: '2px solid #000' }}>PANEL QTY</th>
                                                                <th className="p-1.5 border-r-2 border-black text-center font-black w-12" style={{ borderRight: '2px solid #000' }}>OUT</th>
                                                                <th className="p-1.5 border-r-1.5 border-black text-center font-black" style={{ borderRight: '2px solid #000' }}>PANEL QTY</th>
                                                                <th className="p-1.5 border-r-2 border-black text-center font-black w-14" style={{ borderRight: '2px solid #000' }}>Q.C</th>
                                                                <th className="p-1.5 border-r-2 border-black text-center font-black w-20" style={{ borderRight: '2px solid #000' }}>SIGN</th>
                                                                <th className="p-1.5 text-center font-black">REMARK</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {processList.map((proc, idx) => (
                                                                <tr key={idx} className="border-b border-black h-5.5 text-[10px]" style={{ borderBottom: idx === processList.length - 1 ? 'none' : '1px solid #000' }}>
                                                                    <td className="p-1 border-r-2 border-black font-black text-left pl-3 uppercase" style={{ borderRight: '2px solid #000' }}>{proc}</td>
                                                                    <td className="p-1 border-r-2 border-black text-center" style={{ borderRight: '2px solid #000' }}></td>
                                                                    <td className="p-1 border-r-2 border-black text-center" style={{ borderRight: '2px solid #000' }}></td>
                                                                    <td className="p-1 border-r-2 border-black text-center" style={{ borderRight: '2px solid #000' }}></td>
                                                                    <td className="p-1 border-r-2 border-black text-center" style={{ borderRight: '2px solid #000' }}></td>
                                                                    <td className="p-1 border-r-2 border-black text-center" style={{ borderRight: '2px solid #000' }}></td>
                                                                    <td className="p-1 border-r-2 border-black text-center" style={{ borderRight: '2px solid #000' }}></td>
                                                                    <td className="p-1 text-center"></td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </DialogContent>
                    );
                })()}
            </Dialog>

            {/* Reorder Confirmation Dialog */}
            <Dialog open={!!reorderModalOrder} onOpenChange={(open) => !open && setReorderModalOrder(null)}>
                <DialogContent className="max-w-md rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
                            <Copy className="w-5 h-5 text-blue-500" />
                            Confirm Reorder
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground pt-1">
                            Are you sure you want to reorder this PCB order? A new order will be generated with all specifications duplicated.
                        </DialogDescription>
                    </DialogHeader>

                    {reorderModalOrder && (() => {
                        const custName = reorderModalOrder.customer_name 
                            || getMetaValue(reorderModalOrder, 'customer_name', getMetaValue(reorderModalOrder, 'name', ''))
                            || reorderModalOrder.user_email 
                            || reorderModalOrder.user_mobile 
                            || 'N/A';

                        return (
                            <div className="py-4 space-y-3">
                                <div className="bg-muted/40 p-4 rounded-xl border border-border/60 space-y-2 text-xs font-medium">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground font-semibold">Original Order #:</span>
                                        <span className="font-mono font-bold text-foreground">#{reorderModalOrder.order_number}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground font-semibold">Customer:</span>
                                        <span className="font-bold text-foreground">{custName}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground font-semibold">Order Value:</span>
                                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{Number(reorderModalOrder.order_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    <DialogFooter className="flex items-center justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setReorderModalOrder(null)}
                            disabled={reordering}
                            className="rounded-xl text-xs font-bold cursor-pointer"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleReorderSubmit}
                            disabled={reordering}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-2 cursor-pointer"
                        >
                            {reordering ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    Reordering...
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3.5 h-3.5" />
                                    Confirm Reorder
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
