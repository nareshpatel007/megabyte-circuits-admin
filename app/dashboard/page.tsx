"use client";

import DashboardLayout from "@/components/layout/dashboard-layout";
import { mockOrders, mockRevenueData } from "@/lib/mock-data";
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  ShoppingCart,
  Cpu,
  UserPlus,
  CheckCircle2,
  Circle,
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

const statusColors: Record<string, string> = {
  Pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "In Review": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Sent to JLC": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Manufacturing: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Shipped: "bg-green-500/20 text-green-400 border-green-500/30",
  Cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

const statusCounts = mockOrders.reduce((acc, o) => {
  acc[o.status] = (acc[o.status] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

const donutData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
const DONUT_COLORS = ["#eab308", "#3b82f6", "#a855f7", "#f97316", "#22c55e", "#ef4444"];

const recentOrders = [...mockOrders].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

const metrics = [
  {
    label: "Total Revenue",
    value: "₹24,78,500",
    change: "+12.4%",
    up: true,
    icon: IndianRupee,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    label: "Pending Orders",
    value: "34",
    change: "+3 today",
    up: false,
    icon: ShoppingCart,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
  {
    label: "Active Mfg Runs",
    value: "12",
    change: "+2 this week",
    up: true,
    icon: Cpu,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
  {
    label: "New Registrations",
    value: "8",
    change: "+8 this week",
    up: true,
    icon: UserPlus,
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
];

const formatRevenue = (value: number) => `₹${(value / 1000).toFixed(0)}k`;

export default function DashboardPage() {
  return (
    <DashboardLayout title="Dashboard" subtitle="PCB Manufacturing Overview">
      <div className="space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                className="bg-card border border-border rounded-xl p-5 flex items-start gap-4"
              >
                <div className={`w-10 h-10 rounded-lg ${m.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${m.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{m.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-0.5">{m.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {m.up ? (
                      <TrendingUp className="w-3 h-3 text-green-400" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-400" />
                    )}
                    <span className={`text-xs font-medium ${m.up ? "text-green-400" : "text-red-400"}`}>
                      {m.change}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Revenue Chart */}
          <div className="xl:col-span-2 bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Revenue Trend</h3>
                <p className="text-xs text-muted-foreground">Last 24 days</p>
              </div>
              <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-medium">
                +18.2% MoM
              </span>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockRevenueData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#6b7280", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval={4}
                  />
                  <YAxis
                    tick={{ fill: "#6b7280", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatRevenue}
                    width={42}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(224, 71.4%, 6%)",
                      border: "1px solid hsl(215, 27.9%, 18%)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#f0f9ff",
                    }}
                    formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(199, 89%, 48%)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: "hsl(199, 89%, 48%)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Order Status Donut */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground">Order Status</h3>
              <p className="text-xs text-muted-foreground">Distribution by status</p>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((_, index) => (
                      <Cell key={index} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(224, 71.4%, 6%)",
                      border: "1px solid hsl(215, 27.9%, 18%)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#f0f9ff",
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "10px", color: "#6b7280" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Recent Orders */}
          <div className="xl:col-span-2 bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Recent Orders</h3>
              <a href="/orders" className="text-xs text-primary hover:underline">View all</a>
            </div>
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-wrap gap-2 items-center justify-between py-2.5 border-b border-border/50 last:border-0"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-primary">{order.id}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${statusColors[order.status]}`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{order.clientName} · {order.date}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    ₹{order.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* API Health */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">API Health Status</h3>
            <div className="space-y-3">
              {[
                { name: "JLCPCB API", status: "Connected", ok: true, latency: "142ms" },
                { name: "Razorpay Gateway", status: "Connected", ok: true, latency: "89ms" },
                { name: "SMTP Server", status: "Connected", ok: true, latency: "210ms" },
                { name: "Webhook Service", status: "Degraded", ok: false, latency: "820ms" },
              ].map((svc) => (
                <div
                  key={svc.name}
                  className="flex items-center justify-between p-3 rounded-lg bg-background border border-border"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2 w-2">
                      {svc.ok ? (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                        </>
                      ) : (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
                        </>
                      )}
                    </span>
                    <div>
                      <p className="text-xs font-medium text-foreground">{svc.name}</p>
                      <p className="text-[10px] text-muted-foreground">{svc.latency}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                      svc.ok
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                    }`}
                  >
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
