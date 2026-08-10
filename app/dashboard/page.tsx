"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { IndianRupee, ShoppingCart, Cpu, UserPlus, ExternalLink, Layers, Calendar, CheckCircle2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import GerberBoardPreview from "@/components/GerberBoardPreview";
import { useAuth } from "@/lib/auth-context";

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

const formatRevenue = (value: number) => `₹${(value / 1000).toFixed(0)}k`;

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

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentOrders, setRecentOrders] = useState<ApiOrder[]>([]);
    const [recentPayments, setRecentPayments] = useState<PaymentTransaction[]>([]);
    const [statuses, setStatuses] = useState<StatusItem[]>([]);
    const [allOrders, setAllOrders] = useState<ApiOrder[]>([]);
    const [revenuePeriod, setRevenuePeriod] = useState<"day" | "month" | "year">("day");
    const [revenueTrend, setRevenueTrend] = useState<{ date: string; revenue: number }[]>([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const token = localStorage.getItem("admin_token");
                const headers = { Authorization: `Bearer ${token}` };

                const [statsRes, ordersRes, statusesRes, paymentsRes] = await Promise.all([
                    fetch("/api/admin/stats", { headers }),
                    fetch("/api/admin/orders", { headers }),
                    fetch("/api/admin/statuses", { headers }),
                    fetch("/api/admin/payments?per_page=10", { headers }),
                ]);

                const statsData = await statsRes.json();
                const ordersData = await ordersRes.json();
                const statusesData = await statusesRes.json();
                const paymentsData = await paymentsRes.json();

                if (statsData.status || statsData.success) {
                    setStats(statsData.stats);
                }

                if (statusesData.status || statusesData.success) {
                    setStatuses(statusesData.data || []);
                }

                if (ordersData.status || ordersData.success) {
                    const fetchedOrders: ApiOrder[] = ordersData.data || [];
                    setAllOrders(fetchedOrders);
                    setRecentOrders(fetchedOrders.slice(0, 5));
                }

                if (paymentsData.status || paymentsData.success) {
                    setRecentPayments(paymentsData.data || []);
                }
            } catch (err) {
                console.error("Error loading dashboard metrics:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    useEffect(() => {
        if (!allOrders.length) return;

        const trendMap: Record<string, { timeMs: number; revenue: number }> = {};

        allOrders.forEach(o => {
            const dateObj = new Date(o.created_at);
            if (isNaN(dateObj.getTime())) return;

            let label = "";
            let timeKey = 0;

            if (revenuePeriod === "day") {
                label = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                timeKey = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()).getTime();
            } else if (revenuePeriod === "month") {
                label = dateObj.toLocaleDateString("en-US", { month: "short", year: "numeric" });
                timeKey = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1).getTime();
            } else if (revenuePeriod === "year") {
                label = String(dateObj.getFullYear());
                timeKey = new Date(dateObj.getFullYear(), 0, 1).getTime();
            }

            const val = parseFloat(String(o.order_value)) || 0;
            if (!trendMap[label]) {
                trendMap[label] = { timeMs: timeKey, revenue: 0 };
            }
            trendMap[label].revenue += val;
        });

        const trendArray = Object.entries(trendMap)
            .map(([date, item]) => ({ date, timeMs: item.timeMs, revenue: item.revenue }))
            .sort((a, b) => a.timeMs - b.timeMs)
            .map(({ date, revenue }) => ({ date, revenue }));

        setRevenueTrend(trendArray);
    }, [allOrders, revenuePeriod]);

    if (loading) {
        return (
            <DashboardLayout title="Dashboard" subtitle="PCB Manufacturing Overview">
                <DashboardSkeleton />
            </DashboardLayout>
        );
    }

    const donutData = stats?.status_counts
        ? Object.entries(stats.status_counts).map(([name, value]) => ({ name, value }))
        : [];

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

    return (
        <DashboardLayout title="Dashboard" subtitle="PCB Manufacturing Overview">
            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                    {metrics.map((m) => {
                        const Icon = m.icon;
                        return (
                            <div
                                key={m.label}
                                className="bg-card border border-border/80 rounded-xl p-5 flex items-start gap-4 hover:-translate-y-1 hover:shadow-lg hover:border-emerald-500/20 transition-all duration-300 relative group overflow-hidden"
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
                {hasAnalyticsPermission && (
                    <>
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                            <div className="xl:col-span-2 bg-card border border-border/80 rounded-xl p-5 md:p-6 hover:shadow-md transition-shadow duration-300">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                                    <div>
                                        <h3 className="text-sm font-bold text-foreground tracking-tight">Revenue Trend</h3>
                                        <p className="text-xs text-muted-foreground mt-0.5">Real-time revenue computed from submitted PCB orders</p>
                                    </div>
                                    <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 self-start sm:self-auto">
                                        {(["day", "month", "year"] as const).map((period) => (
                                            <button
                                                key={period}
                                                type="button"
                                                onClick={() => setRevenuePeriod(period)}
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
                                <div className="h-56">
                                    {revenueTrend.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
                                            No order revenue data recorded yet.
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={revenueTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" />
                                                <XAxis
                                                    dataKey="date"
                                                    tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 500 }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                />
                                                <YAxis
                                                    tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 500 }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tickFormatter={formatRevenue}
                                                    width={42}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                                                        border: "1px solid #e2e8f0",
                                                        borderRadius: "12px",
                                                        fontSize: "12px",
                                                        fontWeight: 600,
                                                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
                                                        color: "#1e293b",
                                                    }}
                                                    formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="revenue"
                                                    stroke="#10b981"
                                                    strokeWidth={3}
                                                    dot={{ r: 3, fill: "#10b981" }}
                                                    activeDot={{ r: 6, fill: "#10b981", strokeWidth: 0 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>

                            {/* Order Status Donut */}
                            <div className="bg-card border border-border/80 rounded-xl p-5 md:p-6 hover:shadow-md transition-shadow duration-300">
                                <div className="mb-6">
                                    <h3 className="text-sm font-bold text-foreground tracking-tight">Order Status Breakdown</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">Live distribution by manufacturing pipeline stage</p>
                                </div>
                                <div className="h-56">
                                    {donutData.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
                                            No status distribution data.
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={donutData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={55}
                                                    outerRadius={75}
                                                    paddingAngle={4}
                                                    dataKey="value"
                                                >
                                                    {donutData.map((_, index) => (
                                                        <Cell key={index} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                                                        border: "1px solid #e2e8f0",
                                                        borderRadius: "12px",
                                                        fontSize: "12px",
                                                        fontWeight: 600,
                                                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
                                                        color: "#1e293b",
                                                    }}
                                                />
                                                <Legend
                                                    iconType="circle"
                                                    iconSize={8}
                                                    wrapperStyle={{ fontSize: "11px", fontWeight: 500, color: "#64748b" }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Bottom Row - Recent Orders & API Health */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                            {/* Recent Orders */}
                            <div className="xl:col-span-2 bg-card border border-border/80 rounded-xl p-5 md:p-6 hover:shadow-md transition-shadow duration-300">
                                <div className="flex items-center justify-between mb-5">
                                    <div>
                                        <h3 className="text-sm font-bold text-foreground tracking-tight">Recent Orders</h3>
                                        <p className="text-xs text-muted-foreground mt-0.5">Live order submissions from database</p>
                                    </div>
                                    <Link href="/orders" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                                        View all orders →
                                    </Link>
                                </div>
                                <div className="space-y-3">
                                    {recentOrders.length === 0 ? (
                                        <div className="p-8 text-center text-xs text-muted-foreground italic">No recent orders found.</div>
                                    ) : (
                                        recentOrders.map((order) => {
                                            const orderStatusStr = (order?.status || 'Pending').toString().toLowerCase();
                                            const matchedStatus = statuses.find(s => s && s.name && s.name.toString().toLowerCase() === orderStatusStr);
                                            const statusColor = matchedStatus?.color || "#10b981";

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
                                                    key={order.id}
                                                    onClick={() => router.push(`/orders/${order.id}`)}
                                                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-muted/20 hover:bg-muted/50 border border-border/40 transition-all duration-200 cursor-pointer group shadow-sm gap-3"
                                                >
                                                    <div className="flex items-start sm:items-center gap-3.5 min-w-0 w-full sm:w-auto">
                                                        {/* Gerber Preview Vector Thumbnail */}
                                                        <div className="w-14 h-14 bg-[#0c3b19] rounded-xl border border-emerald-500/30 flex items-center justify-center p-0.5 overflow-hidden shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                                            <GerberBoardPreview
                                                                previewData={order.gerber_preview_data || getMetaVal("preview_data", "")}
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
                                                                <span
                                                                    className="text-[10px] px-2.5 py-0.5 rounded-full border font-extrabold"
                                                                    style={{
                                                                        backgroundColor: `${statusColor}15`,
                                                                        color: statusColor,
                                                                        borderColor: `${statusColor}30`
                                                                    }}
                                                                >
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
                            <div className="bg-card border border-border/80 rounded-xl p-5 md:p-6 hover:shadow-md transition-shadow duration-300 flex flex-col">
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/60">
                                    <div>
                                        <h3 className="text-sm font-bold text-foreground tracking-tight">Recent Transactions</h3>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">Last 10 payment transactions</p>
                                    </div>
                                    <Link href="/payments" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                                        View all →
                                    </Link>
                                </div>

                                <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-1">
                                    {recentPayments.length === 0 ? (
                                        <div className="p-8 text-center text-xs text-muted-foreground italic">No recent transactions found.</div>
                                    ) : (
                                        recentPayments.slice(0, 10).map((tx) => {
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
                                                    key={tx.id}
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
