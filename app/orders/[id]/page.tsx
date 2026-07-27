"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { ArrowLeft, CheckCircle2, Clock, User, Mail, Phone, FileText, Download, RefreshCw, History, Shield, Calendar, Tag, MessageSquare, Layers, Eye, Save, Plus } from "lucide-react";
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

interface OrderNote {
    id: number;
    pcb_order_id: number;
    admin_id: number | null;
    admin_name?: string;
    admin_username?: string;
    note: string;
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
    notes?: OrderNote[];
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
    const [remark, setRemark] = useState("");

    // Delivery date state & edit
    const [editingDeliveryDate, setEditingDeliveryDate] = useState(false);
    const [deliveryDate, setDeliveryDate] = useState("");

    // Notes state
    const [newNote, setNewNote] = useState("");
    const [addingNote, setAddingNote] = useState(false);

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
                setDeliveryDate(orderData.data.delivery_date || "");
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

            const savedAdminUser = localStorage.getItem("user") || localStorage.getItem("admin_user");
            let loggedInAdminId = null;
            if (savedAdminUser) {
                try {
                    const parsed = JSON.parse(savedAdminUser);
                    loggedInAdminId = parsed.id || null;
                } catch (e) { }
            }

            const res = await fetch(`/api/admin/orders/${orderId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: newStatus,
                    status_id: matchedStatus ? matchedStatus.id : null,
                    admin_id: loggedInAdminId,
                    remark: remark
                })
            });

            const data = await res.json();
            if (res.ok && (data.status || data.success)) {
                toast.success(`Status updated to "${newStatus}"`, { id: toastId });
                setOrder(data.data);
                setRemark("");
            } else {
                toast.error(data.message || data.error || "Failed to update status", { id: toastId });
            }
        } catch (err: any) {
            toast.error(err?.message || "Error updating order status", { id: toastId });
        } finally {
            setUpdating(false);
        }
    };

    const handleSaveDeliveryDate = async () => {
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/${orderId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ delivery_date: deliveryDate })
            });
            const data = await res.json();
            if (res.ok && (data.status || data.success)) {
                toast.success("Delivery date updated successfully");
                setEditingDeliveryDate(false);
                fetchOrderDetail();
            } else {
                toast.error(data.message || "Failed to update delivery date");
            }
        } catch (err) {
            toast.error("Error updating delivery date");
        }
    };

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        setAddingNote(true);
        try {
            const token = localStorage.getItem("admin_token");
            const savedAdminUser = localStorage.getItem("user");
            let loggedInAdminId = 1;
            if (savedAdminUser) {
                try { loggedInAdminId = JSON.parse(savedAdminUser).id || 1; } catch (e) { }
            }

            const res = await fetch(`/api/admin/orders/${orderId}/notes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ note: newNote, admin_id: loggedInAdminId })
            });

            const data = await res.json();
            if (res.ok && (data.status || data.success)) {
                toast.success("Internal note added");
                setNewNote("");
                fetchOrderDetail();
            } else {
                toast.error(data.message || "Failed to add note");
            }
        } catch (err) {
            toast.error("Error adding note");
        } finally {
            setAddingNote(false);
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
    const gerberUrl = getMetaValue('gerber_file_url', getMetaValue('gerber_file'));
    const gerberFileName = getMetaValue('gerber_file_name', 'Gerber_Files.zip');
    const layerCount = getMetaValue('layers', getMetaValue('layer', '2'));

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
                    <div className="flex items-center gap-3">
                        <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5" />
                            {layerCount} {layerCount === '1' ? 'Layer' : 'Layers'}
                        </span>
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
                    <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-sm relative group">
                        <div className="flex justify-between items-center">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Delivery Date</p>
                            {!editingDeliveryDate ? (
                                <button onClick={() => setEditingDeliveryDate(true)} className="text-emerald-500 text-xs font-bold hover:underline">Edit</button>
                            ) : (
                                <button onClick={handleSaveDeliveryDate} className="text-emerald-500 text-xs font-bold hover:underline flex items-center gap-1"><Save className="w-3 h-3" /> Save</button>
                            )}
                        </div>
                        {!editingDeliveryDate ? (
                            <p className="text-base font-bold text-foreground mt-1 font-mono">
                                {order.delivery_date && !isNaN(new Date(order.delivery_date).getTime())
                                    ? new Date(order.delivery_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                    : 'N/A'}
                            </p>
                        ) : (
                            <input
                                type="date"
                                value={deliveryDate}
                                onChange={(e) => setDeliveryDate(e.target.value)}
                                className="mt-1 w-full text-xs font-bold bg-background border border-emerald-500 rounded-lg p-1 text-foreground"
                            />
                        )}
                    </div>
                    <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-sm">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Submitted On</p>
                        <p className="text-xs font-bold text-foreground mt-1 font-mono">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                </div>

                {/* Gerber File Download / Preview Card (Requirement #1) */}
                <div className="bg-gradient-to-r from-emerald-500/10 via-card to-card border border-emerald-500/30 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-sm font-extrabold text-foreground">Gerber Production File</h3>
                            <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                File: <span className="font-mono font-bold text-foreground">{gerberFileName}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        {gerberUrl && gerberUrl !== 'N/A' ? (
                            <>
                                <a
                                    href={gerberUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-card border border-border/80 text-foreground font-bold rounded-xl hover:bg-muted text-xs transition-all w-full md:w-auto"
                                >
                                    <Eye className="w-4 h-4 text-emerald-500" /> View Gerber File
                                </a>
                                <a
                                    href={gerberUrl}
                                    download
                                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 text-xs shadow-md transition-all w-full md:w-auto"
                                >
                                    <Download className="w-4 h-4" /> Download Gerber File
                                </a>
                            </>
                        ) : (
                            <span className="text-xs text-muted-foreground italic">No Gerber file uploaded for this order.</span>
                        )}
                    </div>
                </div>

                {/* Status Update & History Row (Requirement #4 - Logs ID & Timestamp) */}
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
                                <label className="text-xs font-bold text-muted-foreground block mb-1.5">Remark / Audit Note</label>
                                <textarea
                                    value={remark}
                                    onChange={(e) => setRemark(e.target.value)}
                                    placeholder="State reason or notes for this status transition..."
                                    rows={2}
                                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-border/80 rounded-xl text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={updating}
                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-xl shadow-md transition-all text-xs cursor-pointer disabled:opacity-50"
                            >
                                {updating ? "Updating..." : "Update & Log Status"}
                            </button>
                        </form>
                    </div>

                    {/* Right: Status Change History Table */}
                    <div className="lg:col-span-2 bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-4">
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground flex items-center gap-2">
                            <History className="w-4 h-4 text-emerald-500" /> Status Audit Trail (User ID & Timestamp)
                        </h3>

                        <div className="border border-border/60 rounded-xl overflow-hidden">
                            <div className="overflow-x-auto max-h-72">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="bg-muted/60 border-b border-border/60 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                                            <th className="py-3 px-4">Admin / User ID</th>
                                            <th className="py-3 px-4">Status</th>
                                            <th className="py-3 px-4">Logged Timestamp</th>
                                            <th className="py-3 px-4">Remark</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40 font-mono">
                                        {!order.status_histories || order.status_histories.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="py-8 text-center text-muted-foreground italic font-sans">
                                                    No status transitions recorded yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            order.status_histories.map((h) => (
                                                <tr key={h.id} className="hover:bg-muted/20">
                                                    <td className="py-3 px-4 font-bold text-foreground font-sans">
                                                        {h.admin?.name || `Admin #${h.admin_id || 1}`}
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
                    </div>
                </div>

                {/* Internal Notes Section (Requirement #7) */}
                <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-emerald-500" /> Internal Notes & Discussions
                    </h3>

                    <form onSubmit={handleAddNote} className="flex gap-3">
                        <input
                            type="text"
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Add an internal note or production instruction..."
                            className="flex-1 px-4 py-2.5 text-sm bg-background border border-border/80 rounded-xl text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <button
                            type="submit"
                            disabled={addingNote}
                            className="px-5 py-2.5 bg-emerald-500 text-white font-bold rounded-xl text-xs hover:bg-emerald-600 transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <Plus className="w-4 h-4" /> Add Note
                        </button>
                    </form>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {!order.notes || order.notes.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic py-4">No internal notes added yet.</p>
                        ) : (
                            order.notes.map((n) => (
                                <div key={n.id} className="p-3 bg-muted/30 border border-border/60 rounded-xl space-y-1">
                                    <div className="flex justify-between items-center text-[11px]">
                                        <span className="font-extrabold text-foreground">{n.admin_name || `@${n.admin_username}` || "Admin"}</span>
                                        <span className="text-muted-foreground font-mono">{new Date(n.created_at).toLocaleString()}</span>
                                    </div>
                                    <p className="text-xs text-slate-700 dark:text-slate-200 font-medium">{n.note}</p>
                                </div>
                            ))
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
