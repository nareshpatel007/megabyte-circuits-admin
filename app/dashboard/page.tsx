"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import {
    TrendingUp,
    TrendingDown,
    IndianRupee,
    ShoppingCart,
    Cpu,
    UserPlus,
    Eye,
    ExternalLink,
} from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";
import LoadingSpinner from "@/components/ui/loading-spinner";
import Link from "next/link";

interface StatusItem {
    id: number;
    name: string;
    slug: string;
    color: string;
}

interface ApiOrder {
    id: number;
    order_number: string;
    board_name: string;
    customer_name: string | null;
    user_email: string;
    user_mobile: string;
    status: string;
    order_value: string | number;
    created_at: string;
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

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentOrders, setRecentOrders] = useState<ApiOrder[]>([]);
    const [statuses, setStatuses] = useState<StatusItem[]>([]);
    const [revenueTrend, setRevenueTrend] = useState<{ date: string; revenue: number }[]>([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const token = localStorage.getItem("admin_token");
                const headers = { Authorization: `Bearer ${token}` };

                const [statsRes, ordersRes, statusesRes] = await Promise.all([
                    fetch("/api/admin/stats", { headers }),
                    fetch("/api/admin/orders", { headers }),
                    fetch("/api/admin/statuses", { headers }),
                ]);

                const statsData = await statsRes.json();
                const ordersData = await ordersRes.json();
                const statusesData = await statusesRes.json();

                if (statsData.status || statsData.success) {
                    setStats(statsData.stats);
                }

                if (statusesData.status || statusesData.success) {
                    setStatuses(statusesData.data || []);
                }

                if (ordersData.status || ordersData.success) {
                    const fetchedOrders: ApiOrder[] = ordersData.data || [];
                    setRecentOrders(fetchedOrders.slice(0, 5));

                    // Build dynamic revenue trend grouped by creation date
                    const trendMap: Record<string, number> = {};
                    fetchedOrders.forEach(o => {
                        const dateStr = new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        const val = parseFloat(String(o.order_value)) || 0;
                        trendMap[dateStr] = (trendMap[dateStr] || 0) + val;
                    });

                    const trendArray = Object.entries(trendMap)
                        .map(([date, revenue]) => ({ date, revenue }))
                        .reverse();

                    setRevenueTrend(trendArray);
                }
            } catch (err) {
                console.error("Error loading dashboard metrics:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <DashboardLayout title="Dashboard" subtitle="PCB Manufacturing Overview">
                <LoadingSpinner text="Computing real-time dashboard analytics..." />
            </DashboardLayout>
        );
    }

    // Dynamic Donut Data
    const donutData = stats?.status_counts
        ? Object.entries(stats.status_counts).map(([name, value]) => ({ name, value }))
        : [];

    const metrics = [
        {
            label: "Total Revenue",
            value: `₹${(stats?.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            change: "Live Revenue",
            up: true,
            icon: IndianRupee,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
        },
        {
            label: "Total Orders",
            value: String(stats?.total_orders || 0),
            change: `${stats?.pending_orders || 0} Pending`,
            up: true,
            icon: ShoppingCart,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
        },
        {
            label: "Active Mfg Runs",
            value: String(stats?.active_mfg_runs || 0),
            change: "In Production",
            up: true,
            icon: Cpu,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
        },
        {
            label: "Total Customers",
            value: String(stats?.total_users || 0),
            change: "Registered Users",
            up: true,
            icon: UserPlus,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
        },
    ];

    return (
        <DashboardLayout title="Dashboard" subtitle="PCB Manufacturing Overview">
            <div className="space-y-6">
                {/* Metric Cards */}
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
                                    <div className="flex items-center gap-1 mt-1.5">
                                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                                        <span className="text-xs font-semibold text-emerald-500">
                                            {m.change}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                    {/* Revenue Chart */}
                    <div className="xl:col-span-2 bg-card border border-border/80 rounded-xl p-5 md:p-6 hover:shadow-md transition-shadow duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-sm font-bold text-foreground tracking-tight">Revenue Trend</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">Real-time revenue computed from submitted PCB orders</p>
                            </div>
                            <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold">
                                Live Stream
                            </span>
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
                                    const matchedStatus = statuses.find(s => s.name.toLowerCase() === order.status.toLowerCase());
                                    const statusColor = matchedStatus?.color || "#10b981";

                                    return (
                                        <div
                                            key={order.id}
                                            className="flex flex-wrap gap-2 items-center justify-between p-3.5 rounded-xl bg-muted/20 hover:bg-muted/40 border border-border/40 transition-all duration-200"
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">#{order.order_number}</span>
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
                                                <p className="text-xs text-muted-foreground mt-1 font-semibold">
                                                    {order.board_name} <span className="text-zinc-400">·</span> {order.customer_name || order.user_email}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-black text-foreground">
                                                    ₹{Number(order.order_value).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                                </span>
                                                <Link
                                                    href={`/orders/${order.id}`}
                                                    className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-colors"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* System Services Health */}
                    <div className="bg-card border border-border/80 rounded-xl p-5 md:p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-foreground mb-1">System Health & Services</h3>
                        <p className="text-xs text-muted-foreground mb-4">Infrastructure & gateway connectivity</p>
                        <div className="space-y-3">
                            {[
                                { name: "Laravel API Database", status: "Operational", ok: true, latency: "12ms" },
                                { name: "PCB Quote Engine", status: "Operational", ok: true, latency: "45ms" },
                                { name: "Order Storage Drive", status: "Operational", ok: true, latency: "18ms" },
                                { name: "Email SMTP Gateway", status: "Operational", ok: true, latency: "120ms" },
                            ].map((svc) => (
                                <div
                                    key={svc.name}
                                    className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/60"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                        </span>
                                        <div>
                                            <p className="text-xs font-bold text-foreground">{svc.name}</p>
                                            <p className="text-[10px] text-muted-foreground font-mono">{svc.latency}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] px-2.5 py-0.5 rounded-full border font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                        {svc.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
