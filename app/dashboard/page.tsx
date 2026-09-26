"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { IndianRupee, ShoppingCart, Cpu, UserPlus, ExternalLink, Layers, Calendar, CheckCircle2, RotateCcw, TrendingUp, BarChart3, PieChart as PieIcon, X, LayoutDashboard, RefreshCw, CreditCard } from "lucide-react";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import GerberBoardPreview from "@/components/GerberBoardPreview";
import { useAuth } from "@/lib/auth-context";
import { getStatusColor } from "@/lib/status-colors";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StatusItem {
    id: number;
    name: string;
    slug: string;
    color: string;
}

interface ApiOrder {
    id: number;
    order_number: string;
    board_name?: string;
    gerber_name?: string;
    gerber_preview_data?: string;
    customer_name?: string | null;
    user_email?: string;
    user_mobile?: string;
    status: string;
    unit_price?: string | number;
    order_value: string | number;
    launch_date?: string | null;
    delivery_date?: string | null;
    created_at: string;
    metas?: Array<{ meta_key: string; meta_value: string }>;
}

interface DashboardStats {
    total_revenue: number;
    total_orders: number;
    pending_orders: number;
    active_mfg_runs: number;
    total_users: number;
    status_counts: Record<string, number>;
}

const DONUT_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#ef4444", "#06b6d4"];

const formatRevenue = (value: number) => {
    if (value >= 1000000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
    return `₹${value}`;
};

interface PaymentTransaction {
    id: number;
    transaction_number: string;
    razorpay_payment_id: string | null;
    amount: number | string;
    currency: string;
    status: string;
    payment_method: string | null;
    user_name: string | null;
    user_email: string | null;
    created_at: string;
}

export default function DashboardPage() {
    const router = useRouter();
    const { user } = useAuth();
    const hasPaymentPermission = user?.permissions ? user.permissions.includes("payments.view") : true;
    const hasAnalyticsPermission = user?.permissions ? user.permissions.includes("dashboard.analytics") : true;

    const [loadingStats, setLoadingStats] = useState(true);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [loadingPayments, setLoadingPayments] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentOrders, setRecentOrders] = useState<ApiOrder[]>([]);
    const [recentPayments, setRecentPayments] = useState<PaymentTransaction[]>([]);
    const [statuses, setStatuses] = useState<StatusItem[]>([]);
    const [allOrders, setAllOrders] = useState<ApiOrder[]>([]);
    const [revenuePeriod, setRevenuePeriod] = useState<"day" | "month" | "year">("day");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [revenueTrend, setRevenueTrend] = useState<{ date: string; revenue: number }[]>([]);
    const [activeStatusHover, setActiveStatusHover] = useState<{ name: string; value: number; color: string } | null>(null);
    const [statusViewMode, setStatusViewMode] = useState<"donut" | "list">("donut");
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [tempStartDate, setTempStartDate] = useState<string>("");
    const [tempEndDate, setTempEndDate] = useState<string>("");
    const [activePreset, setActivePreset] = useState<string | null>(null);

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

    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

    useEffect(() => {
        const token = localStorage.getItem("admin_token");
        const headers = { Authorization: `Bearer ${token}` };

        // 1. Fetch Stats
        fetch("/api/admin/stats", { headers })
            .then((res) => res.json())
            .then((data) => {
                if (data.status || data.success) setStats(data.stats);
            })
            .catch((err) => console.error("Error loading stats:", err))
            .finally(() => setLoadingStats(false));

        // 2. Fetch Statuses
        fetch("/api/admin/statuses", { headers })
            .then((res) => res.json())
            .then((data) => {
                if (data.status || data.success) setStatuses(data.data || []);
            })
            .catch((err) => console.error("Error loading statuses:", err));

        // 3. Fetch Recent Orders (limit=10 for ultra fast query)
        fetch("/api/admin/orders?limit=10&per_page=10", { headers })
            .then((res) => res.json())
            .then((data) => {
                if (data.status || data.success) {
                    const fetchedOrders: ApiOrder[] = data.data || [];
                    setAllOrders(fetchedOrders);
                    setRecentOrders(fetchedOrders.slice(0, 5));
                }
            })
            .catch((err) => console.error("Error loading orders:", err))
            .finally(() => setLoadingOrders(false));

        // 4. Fetch Payments
        fetch("/api/admin/payments?per_page=10", { headers })
            .then((res) => res.json())
            .then((data) => {
                if (data.status || data.success) setRecentPayments(data.data || []);
            })
            .catch((err) => console.error("Error loading payments:", err))
            .finally(() => setLoadingPayments(false));
    }, []);

    const [loadingTrend, setLoadingTrend] = useState<boolean>(true);

    useEffect(() => {
        const token = localStorage.getItem("admin_token");
        const headers = { Authorization: `Bearer ${token}` };

        setLoadingTrend(true);
        let url = `/api/admin/revenue-trend?period=${revenuePeriod}`;
        if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
        if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`;

        fetch(url, { headers })
            .then((res) => res.json())
            .then((data) => {
                if (data.status || data.success) {
                    setRevenueTrend(data.data || []);
                }
            })
            .catch((err) => console.error("Error loading revenue trend:", err))
            .finally(() => setLoadingTrend(false));
    }, [revenuePeriod, startDate, endDate]);

    const donutData = stats?.status_counts
        ? Object.entries(stats.status_counts).map(([name, value]) => ({ name, value }))
        : [];

    const totalStatusOrders = donutData.reduce((sum, d) => sum + d.value, 0);

    const enhancedDonutData = donutData
        .map((entry, index) => {
            const matched = statuses.find(s => s && s.name && s.name.trim().toLowerCase() === entry.name.trim().toLowerCase());
            const color = getStatusColor(entry.name, matched, index);
            const percentage = totalStatusOrders > 0 ? ((entry.value / totalStatusOrders) * 100).toFixed(1) : "0";
            return {
                ...entry,
                color,
                percentage,
            };
        })
        .sort((a, b) => b.value - a.value);

    const metrics = [
        {
            label: "Total Revenue",
            value: hasPaymentPermission
                ? `₹${(stats?.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                : "XXXX",
            up: true,
            icon: IndianRupee,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
        },
        {
            label: "Total Orders",
            value: String(stats?.total_orders || 0),
            up: true,
            icon: ShoppingCart,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
        },
        {
            label: "Active Mfg Runs",
            value: String(stats?.active_mfg_runs || 0),
            up: true,
            icon: Cpu,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
        },
        {
            label: "Total Customers",
            value: String(stats?.total_users || 0),
            up: true,
            icon: UserPlus,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
        },
    ];

    const [refreshing, setRefreshing] = useState(false);

    const refreshData = async () => {
        setRefreshing(true);
        const token = localStorage.getItem("admin_token");
        const headers = { Authorization: `Bearer ${token}` };

        try {
            const [statsRes, statusesRes, ordersRes, paymentsRes] = await Promise.all([
                fetch("/api/admin/stats", { headers }),
                fetch("/api/admin/statuses", { headers }),
                fetch("/api/admin/orders?limit=10&per_page=10", { headers }),
                fetch("/api/admin/payments?per_page=10", { headers }),
            ]);

            const statsData = await statsRes.json();
            if (statsData.status || statsData.success) setStats(statsData.stats);

            const statusesData = await statusesRes.json();
            if (statusesData.status || statusesData.success) setStatuses(statusesData.data || []);

            const ordersData = await ordersRes.json();
            if (ordersData.status || ordersData.success) {
                const fetchedOrders: ApiOrder[] = ordersData.data || [];
                setAllOrders(fetchedOrders);
                setRecentOrders(fetchedOrders.slice(0, 5));
            }

            const paymentsData = await paymentsRes.json();
            if (paymentsData.status || paymentsData.success) setRecentPayments(paymentsData.data || []);

            let trendUrl = `/api/admin/revenue-trend?period=${revenuePeriod}`;
            if (startDate) trendUrl += `&start_date=${encodeURIComponent(startDate)}`;
            if (endDate) trendUrl += `&end_date=${encodeURIComponent(endDate)}`;

            const trendRes = await fetch(trendUrl, { headers });
            const trendData = await trendRes.json();
            if (trendData.status || trendData.success) setRevenueTrend(trendData.data || []);
        } catch (e) {
            console.error("Failed to refresh data:", e);
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <DashboardLayout title="Dashboard" subtitle="PCB Manufacturing Overview">
            <div className="space-y-6">
                {/* Metric KPI Cards */}
                {loadingStats ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-card border border-border/80 rounded-2xl p-5 flex items-start gap-4 animate-pulse shadow-2xs">
                                <div className="w-12 h-12 rounded-xl bg-muted shrink-0" />
                                <div className="min-w-0 flex-1 space-y-2">
                                    <div className="h-3 bg-muted rounded w-24" />
                                    <div className="h-6 bg-muted rounded w-16" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                        {metrics.map((m) => {
                            const Icon = m.icon;
                            return (
                                <div
                                    key={m.label}
                                    className="bg-card border border-border/80 rounded-2xl p-5 flex items-start gap-4 hover:-translate-y-1 hover:shadow-md hover:border-emerald-500/20 transition-all duration-300 relative group overflow-hidden shadow-2xs"
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <div className={`w-12 h-12 rounded-xl ${m.bg} flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-300`}>
                                        <Icon className={`w-6 h-6 ${m.color}`} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{m.label}</p>
                                        <p className="text-2xl font-bold text-foreground mt-1 tracking-tight">{m.value}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                {hasAnalyticsPermission && (
                    <>
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            {/* Revenue Trend Area Chart */}
                            <div className="xl:col-span-2 rounded-2xl bg-card border border-border/80 overflow-hidden shadow-2xs flex flex-col justify-between">
                                <div className="p-4 sm:px-6 border-b border-border/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-muted/20">
                                    <div>
                                        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                                            Revenue Trend
                                        </h2>
                                        <p className="text-xs text-muted-foreground mt-0.5 font-medium">Real-time revenue computed from submitted PCB orders</p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2.5">
                                        {/* Popover Date Range & Presets Selector */}
                                        <Popover open={popoverOpen} onOpenChange={(open) => {
                                            setPopoverOpen(open);
                                            if (open) {
                                                setTempStartDate(startDate);
                                                setTempEndDate(endDate);
                                            }
                                        }}>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="h-9 min-w-[150px] sm:min-w-[170px] flex items-center justify-between gap-2 px-3.5 bg-background border-border/80 rounded-xl text-xs font-bold text-foreground hover:bg-accent/40 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all shadow-xs shrink-0 cursor-pointer whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
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
                                                align="start"
                                                sideOffset={8}
                                            >
                                                <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
                                                    <span className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                        <Calendar className="w-4 h-4 text-emerald-500" /> Select Date Range
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

                                                {/* Quick Presets Grid */}
                                                <div>
                                                    <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block mb-1.5">Quick Presets</span>
                                                    <div className="grid grid-cols-2 gap-1.5">
                                                        {PRESET_OPTIONS.map((p) => {
                                                            const isActive = activePreset === p.value;
                                                            return (
                                                                <Button
                                                                    key={p.value}
                                                                    type="button"
                                                                    variant={isActive ? "default" : "outline"}
                                                                    size="sm"
                                                                    onClick={() => applyPreset(p.value)}
                                                                    className={`justify-start px-2.5 py-1.5 text-xs font-extrabold rounded-xl transition-all h-auto cursor-pointer ${isActive
                                                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs"
                                                                        : "bg-muted/40 hover:bg-muted text-foreground border-border/60"
                                                                        }`}
                                                                >
                                                                    {p.label}
                                                                </Button>
                                                            );
                                                        })}
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
                                                            setPopoverOpen(false);
                                                        }}
                                                        className="px-4 py-1.5 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs h-auto cursor-pointer"
                                                    >
                                                        Apply Filter
                                                    </Button>
                                                </div>
                                            </PopoverContent>
                                        </Popover>

                                        {/* Period Toggle Buttons */}
                                        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60">
                                            {(["day", "month", "year"] as const).map((period) => (
                                                <button
                                                    key={period}
                                                    type="button"
                                                    onClick={() => {
                                                        setRevenuePeriod(period);
                                                        setStartDate("");
                                                        setEndDate("");
                                                    }}
                                                    className={`px-3 py-1 text-xs font-bold rounded-lg capitalize transition-all cursor-pointer ${revenuePeriod === period
                                                        ? "bg-primary text-primary-foreground shadow-xs"
                                                        : "text-muted-foreground hover:text-foreground"
                                                        }`}
                                                >
                                                    {period === "day" ? "Day" : period === "month" ? "Month" : "Year"}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 md:p-6">
                                    <div className="h-64">
                                        {loadingTrend ? (
                                            <div className="h-full flex flex-col items-center justify-center space-y-2">
                                                <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                                                <span className="text-xs text-muted-foreground font-semibold">Loading analytics trend...</span>
                                            </div>
                                        ) : revenueTrend.length === 0 ? (
                                            <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
                                                No order revenue data recorded yet.
                                            </div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={revenueTrend} margin={{ top: 10, right: 15, left: 0, bottom: 5 }}>
                                                    <defs>
                                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                                        </linearGradient>
                                                        <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
                                                    <XAxis
                                                        dataKey="date"
                                                        minTickGap={35}
                                                        tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }}
                                                        tickLine={false}
                                                        axisLine={{ stroke: "rgba(148, 163, 184, 0.15)" }}
                                                    />
                                                    <YAxis
                                                        yAxisId="left"
                                                        tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }}
                                                        tickLine={false}
                                                        axisLine={false}
                                                        tickFormatter={formatRevenue}
                                                        width={46}
                                                    />
                                                    <YAxis
                                                        yAxisId="right"
                                                        orientation="right"
                                                        tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }}
                                                        tickLine={false}
                                                        axisLine={false}
                                                        allowDecimals={false}
                                                        width={30}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{
                                                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                                                            border: "1px solid #e2e8f0",
                                                            borderRadius: "12px",
                                                            fontSize: "12px",
                                                            fontWeight: 600,
                                                            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                                                            color: "#0f172a",
                                                        }}
                                                        formatter={(value: number, name: string) => [
                                                            name === "revenue" ? `₹${value.toLocaleString("en-IN")}` : value,
                                                            name === "revenue" ? "Revenue" : "Total Orders",
                                                        ]}
                                                    />
                                                    <Area
                                                        yAxisId="left"
                                                        type="monotone"
                                                        dataKey="revenue"
                                                        name="revenue"
                                                        stroke="#10b981"
                                                        strokeWidth={2.5}
                                                        fillOpacity={1}
                                                        fill="url(#colorRevenue)"
                                                        dot={false}
                                                        activeDot={{ r: 6, fill: "#10b981", stroke: "#ffffff", strokeWidth: 2 }}
                                                    />
                                                    <Area
                                                        yAxisId="right"
                                                        type="monotone"
                                                        dataKey="orders"
                                                        name="orders"
                                                        stroke="#6366f1"
                                                        strokeWidth={2}
                                                        strokeDasharray="4 4"
                                                        fillOpacity={1}
                                                        fill="url(#colorOrders)"
                                                        dot={false}
                                                        activeDot={{ r: 5, fill: "#6366f1", stroke: "#ffffff", strokeWidth: 2 }}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Order Status Breakdown */}
                            <div className="rounded-2xl bg-card border border-border/80 overflow-hidden shadow-2xs flex flex-col justify-between">
                                <div className="p-4 sm:px-6 border-b border-border/80 flex items-center justify-between bg-muted/20">
                                    <div>
                                        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                                            <PieIcon className="w-4 h-4 text-emerald-500" />
                                            Order Status Breakdown
                                        </h2>
                                        <p className="text-xs text-muted-foreground mt-0.5 font-medium">Live distribution by manufacturing pipeline stage</p>
                                    </div>
                                    {/* Toggle View Mode */}
                                    <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60">
                                        <button
                                            type="button"
                                            onClick={() => setStatusViewMode("donut")}
                                            title="Donut Chart View"
                                            className={`p-1.5 rounded-md transition-all cursor-pointer ${statusViewMode === "donut"
                                                ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-xs"
                                                : "text-muted-foreground hover:text-foreground"
                                                }`}
                                        >
                                            <PieIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setStatusViewMode("list")}
                                            title="Detailed Breakdown List"
                                            className={`p-1.5 rounded-md transition-all cursor-pointer ${statusViewMode === "list"
                                                ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-xs"
                                                : "text-muted-foreground hover:text-foreground"
                                                }`}
                                        >
                                            <BarChart3 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-5 md:p-6 flex-1 flex flex-col justify-between">
                                    {statusViewMode === "donut" ? (
                                        <div className="space-y-3">
                                            {/* Donut Chart with MinAngle */}
                                            <div className="h-[185px] relative">
                                                {enhancedDonutData.length === 0 ? (
                                                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
                                                        No status distribution data.
                                                    </div>
                                                ) : (
                                                    <>
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <PieChart>
                                                                <Pie
                                                                    data={enhancedDonutData}
                                                                    cx="50%"
                                                                    cy="50%"
                                                                    innerRadius={58}
                                                                    outerRadius={82}
                                                                    paddingAngle={3}
                                                                    minAngle={5}
                                                                    dataKey="value"
                                                                    onMouseEnter={(data) => setActiveStatusHover(data)}
                                                                    onMouseLeave={() => setActiveStatusHover(null)}
                                                                >
                                                                    {enhancedDonutData.map((entry, index) => (
                                                                        <Cell
                                                                            key={index}
                                                                            fill={entry.color}
                                                                            stroke="rgba(0,0,0,0.05)"
                                                                            strokeWidth={1}
                                                                            className="transition-all duration-200 hover:opacity-80 cursor-pointer"
                                                                        />
                                                                    ))}
                                                                </Pie>
                                                                <Tooltip
                                                                    contentStyle={{
                                                                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                                                                        border: "1px solid #e2e8f0",
                                                                        borderRadius: "12px",
                                                                        fontSize: "12px",
                                                                        fontWeight: 600,
                                                                        boxShadow: "0 10px 20px -3px rgba(0, 0, 0, 0.08)",
                                                                        color: "#0f172a",
                                                                    }}
                                                                    formatter={(val: number, name: string, item: any) => [
                                                                        `${val.toLocaleString()} orders (${item.payload.percentage}%)`,
                                                                        item.payload.name,
                                                                    ]}
                                                                />
                                                            </PieChart>
                                                        </ResponsiveContainer>

                                                        {/* Interactive Center Callout */}
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                                                            {activeStatusHover ? (
                                                                <div className="text-center px-2 animate-in fade-in zoom-in-95 duration-150">
                                                                    <div className="w-2.5 h-2.5 rounded-full mx-auto mb-0.5 shadow-xs" style={{ backgroundColor: activeStatusHover.color }} />
                                                                    <p className="text-[11px] font-bold max-w-[110px] truncate leading-tight" style={{ color: activeStatusHover.color }}>
                                                                        {activeStatusHover.name}
                                                                    </p>
                                                                    <p className="text-lg font-black text-foreground tracking-tight my-0.5">
                                                                        {activeStatusHover.value.toLocaleString()}
                                                                    </p>
                                                                    <span className="inline-block px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-muted text-muted-foreground">
                                                                        {totalStatusOrders > 0 ? ((activeStatusHover.value / totalStatusOrders) * 100).toFixed(1) : 0}%
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <div className="text-center">
                                                                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Total</p>
                                                                    <p className="text-xl font-black text-foreground tracking-tight my-0.5">
                                                                        {totalStatusOrders.toLocaleString()}
                                                                    </p>
                                                                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                                                        {enhancedDonutData.length} Stages
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* Scrollable Badges / Legend Pills showing every color prominently */}
                                            <div className="flex flex-wrap items-center justify-center gap-1.5 max-h-20 overflow-y-auto pr-1 pt-1 border-t border-border/40">
                                                {enhancedDonutData.map((item, idx) => (
                                                    <div
                                                        key={idx}
                                                        onMouseEnter={() => setActiveStatusHover(item)}
                                                        onMouseLeave={() => setActiveStatusHover(null)}
                                                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${activeStatusHover?.name === item.name
                                                            ? "bg-muted border-foreground/30 scale-105 shadow-xs"
                                                            : "bg-muted/30 border-border/60 hover:bg-muted/60"
                                                            }`}
                                                    >
                                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                                        <span className="text-foreground max-w-[90px] truncate">{item.name}</span>
                                                        <span className="text-muted-foreground font-mono text-[10px] font-bold">({item.value})</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        /* Detailed List Breakdown View */
                                        <div className="h-[250px] overflow-y-auto space-y-2 pr-2">
                                            {enhancedDonutData.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    onMouseEnter={() => setActiveStatusHover(item)}
                                                    onMouseLeave={() => setActiveStatusHover(null)}
                                                    className="p-2 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/50 transition-colors"
                                                >
                                                    <div className="flex items-center justify-between text-xs mb-1">
                                                        <div className="flex items-center gap-2 font-bold text-foreground">
                                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                                            <span>{item.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-foreground font-mono">{item.value.toLocaleString()} orders</span>
                                                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                                                {item.percentage}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {/* Visual Progress Bar filled with exact status color */}
                                                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-500"
                                                            style={{
                                                                width: `${Math.max(Number(item.percentage), item.value > 0 ? 2 : 0)}%`,
                                                                backgroundColor: item.color,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Bottom Row - Recent Orders & API Health */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            {/* Recent Orders */}
                            <div className="xl:col-span-2 rounded-2xl bg-card border border-border/80 overflow-hidden shadow-2xs">
                                <div className="p-4 sm:px-6 border-b border-border/80 flex items-center justify-between bg-muted/20">
                                    <div>
                                        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                                            <ShoppingCart className="w-4 h-4 text-emerald-500" />
                                            Recent Orders
                                        </h2>
                                        <p className="text-xs text-muted-foreground mt-0.5 font-medium">Live order submissions from database</p>
                                    </div>
                                    <Link href="/orders" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                                        View all orders →
                                    </Link>
                                </div>
                                <div className="p-5 md:p-6 space-y-3">
                                    {loadingOrders ? (
                                        <div className="space-y-3">
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <div key={i} className="p-4 rounded-xl bg-muted/20 border border-border/40 animate-pulse flex items-center gap-3.5">
                                                    <div className="w-14 h-14 bg-muted rounded-xl shrink-0" />
                                                    <div className="flex-1 space-y-2">
                                                        <div className="h-3 bg-muted rounded w-32" />
                                                        <div className="h-4 bg-muted rounded w-48" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : recentOrders.length === 0 ? (
                                        <div className="p-8 text-center text-xs text-muted-foreground italic">No recent orders found.</div>
                                    ) : (
                                        recentOrders.map((order, index) => {
                                            const orderStatusStr = (order?.status || 'Pending').toString().toLowerCase();
                                            const matchedStatus = statuses.find(s => s && s.name && s.name.toString().toLowerCase() === orderStatusStr);
                                            const statusColor = getStatusColor(order.status, matchedStatus, index);

                                            const getMetaVal = (key: string, fallback = "") => {
                                                if (!order.metas) return fallback;
                                                const found = order.metas.find(m => m.meta_key.toLowerCase() === key.toLowerCase());
                                                return found ? found.meta_value : fallback;
                                            };

                                            const boardTitle = order.board_name && order.board_name !== "."
                                                ? order.board_name
                                                : getMetaVal("board_name", getMetaVal("gerber_file_name", "PCB Order Project"));

                                            const customerText = order.customer_name
                                                ? `${order.customer_name} · ${order.user_email || order.user_mobile || ""}`
                                                : (order.user_email || order.user_mobile || "Guest User");

                                            const pcbColorVal = getMetaVal("pcb_color", getMetaVal("solder_mask", "Green"));
                                            const layersVal = getMetaVal("layers", "2");
                                            const dimensionsVal = getMetaVal("dimensions", "100x100mm");
                                            const quantityVal = getMetaVal("quantity", "5");
                                            const finishVal = getMetaVal("surface_finish", "HASL");
                                            const orderDateStr = new Date(order.created_at).toLocaleDateString("en-IN", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric"
                                            });

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

                                            return (
                                                <div
                                                    key={`order-${order.id}-${index}`}
                                                    onClick={() => router.push(`/orders/${order.id}`)}
                                                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-muted/20 hover:bg-muted/50 border border-border/40 transition-all duration-200 cursor-pointer group shadow-sm gap-3"
                                                >
                                                    <div className="flex items-start sm:items-center gap-3.5 min-w-0 w-full sm:w-auto">
                                                        {/* Gerber Preview Vector Thumbnail */}
                                                        <div className="w-14 h-14 bg-[#0c3b19] rounded-xl border border-emerald-500/30 flex items-center justify-center p-0.5 overflow-hidden shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                                            <GerberBoardPreview
                                                                previewData={order.gerber_preview_data || getMetaVal("preview_data", "")}
                                                                gerberFileId={(order as any).gerber_file_id || undefined}
                                                                boardName={boardTitle}
                                                                pcbColor={pcbColorVal}
                                                            />
                                                        </div>

                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                {/* Order Number styled in selected PCB color */}
                                                                <span
                                                                    className="text-xs font-mono font-black px-2 py-0.5 rounded-md border"
                                                                    style={{
                                                                        color: orderNumColor,
                                                                        backgroundColor: `${orderNumColor}15`,
                                                                        borderColor: `${orderNumColor}35`
                                                                    }}
                                                                >
                                                                    #{order.order_number}
                                                                </span>
                                                                <span className="text-[10px] px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider bg-white text-black border border-zinc-300 shadow-2xs">
                                                                    {order.status}
                                                                </span>
                                                            </div>

                                                            <p className="text-xs font-bold text-foreground mt-1 truncate max-w-[340px]">
                                                                {boardTitle}
                                                                {customerText && <span className="text-muted-foreground font-normal"> ({customerText})</span>}
                                                            </p>

                                                            {/* Specification details chips */}
                                                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px] text-muted-foreground font-semibold">
                                                                <span className="px-2 py-0.5 rounded-md bg-background border border-border/60">
                                                                    {layersVal} Layer{Number(layersVal) > 1 ? "s" : ""}
                                                                </span>
                                                                <span className="px-2 py-0.5 rounded-md bg-background border border-border/60">
                                                                    {dimensionsVal}
                                                                </span>
                                                                <span className="px-2 py-0.5 rounded-md bg-background border border-border/60">
                                                                    Qty: {quantityVal}
                                                                </span>
                                                                <span className="px-2 py-0.5 rounded-md bg-background border border-border/60">
                                                                    {finishVal}
                                                                </span>
                                                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-background border border-border/60 text-muted-foreground">
                                                                    <Calendar className="w-3 h-3 text-muted-foreground" />
                                                                    {orderDateStr}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-border/40">
                                                        <div className="text-left sm:text-right">
                                                            <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Total Value</span>
                                                            <span className="text-sm font-black text-foreground">
                                                                {hasPaymentPermission
                                                                    ? `₹${Number(order.order_value).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                                                                    : "XXXX"}
                                                            </span>
                                                        </div>
                                                        <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
                                                            <ExternalLink className="w-4 h-4" />
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Recent Transactions List (Last 10) */}
                            <div className="rounded-2xl bg-card border border-border/80 overflow-hidden shadow-2xs flex flex-col">
                                <div className="p-4 sm:px-6 border-b border-border/80 flex items-center justify-between bg-muted/20">
                                    <div>
                                        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                                            <CreditCard className="w-4 h-4 text-emerald-500" />
                                            Recent Transactions
                                        </h2>
                                        <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">Last 10 payment transactions</p>
                                    </div>
                                    <Link href="/payments" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                                        View all →
                                    </Link>
                                </div>

                                <div className="p-5 md:p-6 space-y-3 flex-1 overflow-y-auto max-h-[500px]">
                                    {recentPayments.length === 0 ? (
                                        <div className="p-8 text-center text-xs text-muted-foreground italic">No recent transactions found.</div>
                                    ) : (
                                        recentPayments.slice(0, 10).map((tx, index) => {
                                            const isSuccess = tx.status.toLowerCase() === "success";
                                            const displayTxId = tx.razorpay_payment_id || tx.transaction_number;
                                            const customerDisplay = tx.user_name ? tx.user_name : "Customer";
                                            const formattedTime = new Date(tx.created_at).toLocaleString("en-IN", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                hour12: true
                                            });

                                            return (
                                                <div
                                                    key={`tx-${tx.id}-${index}`}
                                                    onClick={() => router.push("/payments")}
                                                    className="p-3.5 rounded-xl bg-muted/20 hover:bg-muted/50 border border-border/40 transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-sm"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-xs font-mono font-extrabold text-foreground truncate max-w-[170px]" title={displayTxId}>
                                                                {displayTxId}
                                                            </span>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold capitalize ${isSuccess ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30" : "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                                                                }`}>
                                                                {tx.status}
                                                            </span>
                                                        </div>

                                                        <p className="text-xs font-bold text-foreground mt-1 truncate">
                                                            {customerDisplay}
                                                        </p>

                                                        <span className="text-[10px] text-muted-foreground font-mono block mt-1">
                                                            {formattedTime}
                                                        </span>
                                                    </div>

                                                    <div className="text-right shrink-0">
                                                        <span className="text-xs text-muted-foreground font-semibold block uppercase text-[9px]">Amount</span>
                                                        <span className="text-sm font-black text-foreground">
                                                            {hasPaymentPermission
                                                                ? `₹${Number(tx.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                                                                : "XXXX"}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
