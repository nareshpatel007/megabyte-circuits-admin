"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { ArrowLeft, CheckCircle2, Clock, User, Mail, Phone, FileText, Download, RefreshCw, History, Shield, Calendar, Tag } from "lucide-react";
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

interface StatusHistory {
    id: number;
    pcb_order_id: number;
    admin_id: number | null;
    admin?: { id: number; name: string; email: string };
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
    unit_price: string | number;
    order_value: string | number;
    delivery_date: string | null;
    created_at: string;
    metas?: OrderMeta[];
    status_details?: StatusItem;
    status_histories?: StatusHistory[];
}

export default function OrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params?.id;

    const [order, setOrder] = useState<ApiOrder | null>(null);
    const [statuses, setStatuses] = useState<StatusItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    
    // Status change form
    const [newStatus, setNewStatus] = useState("");
    const [adminName, setAdminName] = useState("Admin");
    const [remark, setRemark] = useState("");

    const fetchOrderDetail = async () => {
        try {
            const token = localStorage.getItem("admin_token");
            const headers = { Authorization: `Bearer ${token}` };

            const [orderRes, statusesRes] = await Promise.all([
                fetch(`/api/admin/orders/${orderId}`, { headers }),
                fetch("/api/admin/statuses", { headers })
            ]);

            const orderData = await orderRes.json();
            const statusesData = await statusesRes.json();

            if (orderData.status || orderData.success) {
                setOrder(orderData.data);
                setNewStatus(orderData.data.status);
            }
            if (statusesData.status || statusesData.success) {
                setStatuses(statusesData.data || []);
            }
        } catch (err) {
            console.error("Failed to load order detail:", err);
            toast.error("Failed to load order details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (orderId) {
            fetchOrderDetail();
        }
    }, [orderId]);

    const handleUpdateStatus = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStatus) return;

        setUpdating(true);
        const toastId = toast.loading("Updating status & logging history...");
        try {
            const matchedStatus = statuses.find(s => s.name.toLowerCase() === newStatus.toLowerCase());
            const token = localStorage.getItem("admin_token");

            const res = await fetch(`/api/admin/orders/${orderId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: newStatus,
                    status_id: matchedStatus ? matchedStatus.id : null,
                    admin_name: adminName,
                    remark: remark
                })
            });

            const data = await res.json();
            if (data.status || data.success) {
                toast.success(`Status updated to "${newStatus}"`, { id: toastId });
                setOrder(data.data);
                setRemark("");
            } else {
                toast.error(data.message || "Failed to update status", { id: toastId });
            }
        } catch (err) {
            toast.error("Error updating order status", { id: toastId });
        } finally {
            setUpdating(false);
        }
    };

    const getMetaValue = (key: string, fallback = "N/A") => {
        if (!order || !order.metas) return fallback;
        const found = order.metas.find(m => m.meta_key.toLowerCase() === key.toLowerCase());
        return found ? found.meta_value : fallback;
    };

    if (loading) {
        return (
            <DashboardLayout title="Order Details" subtitle="Loading order parameters...">
                <LoadingSpinner text="Fetching complete order specifications..." />
            </DashboardLayout>
        );
    }

    if (!order) {
        return (
            <DashboardLayout title="Order Not Found" subtitle="Requested order does not exist">
                <div className="bg-card border border-border rounded-2xl p-12 text-center max-w-md mx-auto my-12">
                    <p className="text-muted-foreground mb-4 font-semibold">We couldn't find the requested order.</p>
                    <button
                        onClick={() => router.push('/orders')}
                        className="px-6 py-2.5 bg-emerald-500 text-white font-bold rounded-xl shadow-sm hover:bg-emerald-600 transition-all text-xs"
                    >
                        Back to Orders
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    const currentStatusColor = statuses.find(s => s.name.toLowerCase() === order.status.toLowerCase())?.color || "#10b981";

    return (
        <DashboardLayout title={`Order #${order.order_number}`} subtitle={`Board: ${order.board_name}`}>
            <div className="space-y-6 max-w-6xl mx-auto">
                {/* Top Action Bar */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => router.push('/orders')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border/80 rounded-xl hover:bg-muted text-foreground font-bold text-xs transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Orders List
                    </button>
                    <div className="flex items-center gap-2">
                        <span
                            className="px-4 py-1.5 rounded-full text-xs font-black border uppercase tracking-wider flex items-center gap-2"
                            style={{
                                backgroundColor: `${currentStatusColor}15`,
                                color: currentStatusColor,
                                borderColor: `${currentStatusColor}40`
                            }}
                        >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentStatusColor }} />
                            {order.status}
                        </span>
                    </div>
                </div>

                {/* Primary Highlights Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-sm">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Order Value</p>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">₹{Number(order.order_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-sm">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Unit Price</p>
                        <p className="text-xl font-bold text-foreground mt-1">₹{Number(order.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-sm">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Estimated Delivery</p>
                        <p className="text-base font-bold text-foreground mt-1 font-mono">{order.delivery_date || getMetaValue('delivery_date', '3-5 Days')}</p>
                    </div>
                    <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-sm">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Submitted On</p>
                        <p className="text-xs font-bold text-foreground mt-1 font-mono">{new Date(order.created_at).toLocaleString()}</p>
                    </div>
                </div>

                {/* Status Update & History Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Change Status Panel */}
                    <div className="lg:col-span-1 bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-4">
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 text-emerald-500" /> Change Pipeline Status
                        </h3>
                        <form onSubmit={handleUpdateStatus} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1.5">New Status</label>
                                <select
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-border/80 rounded-xl text-foreground font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                                >
                                    {statuses.map((s) => (
                                        <option key={s.id} value={s.name}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1.5">Admin Name</label>
                                <input
                                    type="text"
                                    value={adminName}
                                    onChange={(e) => setAdminName(e.target.value)}
                                    placeholder="Enter your name"
                                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-border/80 rounded-xl text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1.5">Remark / Note (Optional)</label>
                                <textarea
                                    value={remark}
                                    onChange={(e) => setRemark(e.target.value)}
                                    placeholder="Add optional notes for this change..."
                                    rows={2}
                                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-border/80 rounded-xl text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={updating}
                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-xl shadow-md transition-all text-xs cursor-pointer disabled:opacity-50"
                            >
                                {updating ? "Updating..." : "Update Order Status"}
                            </button>
                        </form>
                    </div>

                    {/* Right: Status Change History Table */}
                    <div className="lg:col-span-2 bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-4">
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground flex items-center gap-2">
                            <History className="w-4 h-4 text-emerald-500" /> Status Change History
                        </h3>

                        <div className="border border-border/60 rounded-xl overflow-hidden">
                            <div className="overflow-x-auto max-h-72">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="bg-muted/60 border-b border-border/60 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                                            <th className="py-3 px-4">User / Admin</th>
                                            <th className="py-3 px-4">Status</th>
                                            <th className="py-3 px-4">Timestamp</th>
                                            <th className="py-3 px-4">Remark</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40 font-mono">
                                        {!order.status_histories || order.status_histories.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="py-8 text-center text-muted-foreground italic font-sans">
                                                    No status history recorded yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            order.status_histories.map((h) => (
                                                <tr key={h.id} className="hover:bg-muted/20">
                                                    <td className="py-3 px-4 font-bold text-foreground font-sans">
                                                        {h.admin?.name || (h.admin_id ? `Admin #${h.admin_id}` : 'Admin')}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{h.status_name}</span>
                                                    </td>
                                                    <td className="py-3 px-4 text-muted-foreground">
                                                        {new Date(h.created_at).toLocaleString()}
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-sans italic">
                                                        {h.remark || "-"}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Raw Format Reference Row Display */}
                        {order.status_histories && order.status_histories.length > 0 && (
                            <div className="p-3 bg-muted/40 rounded-xl border border-border/60 space-y-1 font-mono text-[11px] text-muted-foreground max-h-36 overflow-y-auto">
                                {order.status_histories.map(h => (
                                    <div key={h.id} className="truncate">
                                        User: <span className="font-bold text-foreground">{h.admin?.name || (h.admin_id ? `Admin #${h.admin_id}` : 'Admin')}</span> - Status: <span className="font-bold text-emerald-500">{h.status_name}</span> - Timestamp: <span className="text-slate-500">{new Date(h.created_at).toISOString().replace('T', ' ').substring(0, 19)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Customer Information & Technical Parameters Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Customer Info Card */}
                    <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-4">
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground flex items-center gap-2">
                            <User className="w-4 h-4 text-emerald-500" /> Customer Information
                        </h3>
                        <div className="space-y-3 text-xs">
                            <div className="flex justify-between py-2 border-b border-border/40">
                                <span className="text-muted-foreground font-medium">Customer Name</span>
                                <span className="font-bold text-foreground">{order.customer_name || "N/A"}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-border/40">
                                <span className="text-muted-foreground font-medium">Email Address</span>
                                <span className="font-bold text-foreground">{order.user_email}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-border/40">
                                <span className="text-muted-foreground font-medium">Mobile Number</span>
                                <span className="font-bold text-foreground">{order.user_mobile}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-border/40">
                                <span className="text-muted-foreground font-medium">GST Number</span>
                                <span className="font-bold text-foreground">{getMetaValue('gst_number', 'N/A')}</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-muted-foreground font-medium">Shipping Address</span>
                                <span className="font-bold text-foreground max-w-xs text-right">{getMetaValue('shipping_address', 'N/A')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Technical Specifications Card */}
                    <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-4">
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground flex items-center gap-2">
                            <FileText className="w-4 h-4 text-emerald-500" /> Technical Parameters
                        </h3>
                        <div className="grid grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                            {order.metas && order.metas.length > 0 ? (
                                order.metas.map((meta) => (
                                    <div key={meta.id} className="bg-muted/30 rounded-xl p-3 border border-border/60">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase truncate">{meta.meta_key.replace(/_/g, ' ')}</p>
                                        <p className="text-xs font-bold text-foreground mt-0.5 truncate">{meta.meta_value}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-2 text-xs text-muted-foreground italic">No extra metadata recorded.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
