"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { ArrowLeft, CheckCircle2, Clock, User, Mail, Phone, FileText, Download, RefreshCw, History, Shield, Calendar, Tag, MessageSquare, Layers, Eye, Save, Plus } from "lucide-react";
import { toast } from "sonner";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { OrderDetailSkeleton } from "@/components/ui/skeleton";
import GerberBoardPreview from "@/components/GerberBoardPreview";
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
    admin_id: number | null;
    admin?: { id: number; name: string; email: string };
    status_name: string;
    remark: string | null;
    created_at: string;
}

interface OrderNote {
    id: number;
    pcb_order_id: number;
    admin_id: number;
    admin_name?: string;
    admin_username?: string;
    note: string;
    created_at: string;
}

interface OrderLog {
    id: number;
    pcb_order_id?: number;
    order_number?: string;
    action?: string;
    description?: string;
    user_name?: string;
    admin_name?: string;
    resolved_user_name?: string;
    admin_id?: number | null;
    user_id?: number | null;
    created_at: string;
}

interface ApiOrder {
    id: number;
    user_id: number | null;
    status_id: number | null;
    order_number: string;
    q_no?: string | number | null;
    c_g?: string | null;
    combo?: string | null;
    bill_number?: string | null;
    board_name: string;
    gerber_file_id?: number | string | null;
    gerber_preview_data?: string;
    customer_name: string | null;
    user_email: string;
    user_mobile: string;
    status: string;
    completed_qty?: number;
    order_qty?: number;
    launch_qty?: number;
    panel_qty?: number;
    ups_qty?: number;
    final_qty?: number;
    failed_qty?: number;
    unit_price: string | number;
    order_value: string | number;
    launch_date?: string | null;
    delivery_date: string | null;
    created_at: string;
    shipping_first_name?: string;
    shipping_last_name?: string;
    shipping_company?: string;
    shipping_building_no?: string;
    shipping_street?: string;
    shipping_city?: string;
    shipping_state?: string;
    shipping_postal?: string;
    shipping_country?: string;
    shipping_mobile?: string;
    billing_first_name?: string;
    billing_last_name?: string;
    billing_company?: string;
    billing_building_no?: string;
    billing_street?: string;
    billing_city?: string;
    billing_state?: string;
    billing_postal?: string;
    billing_country?: string;
    billing_mobile?: string;
    metas?: OrderMeta[];
    status_details?: StatusItem;
    status_histories?: StatusHistory[];
    notes?: OrderNote[];
    logs?: OrderLog[];
}

export default function OrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params?.id;
    const { user } = useAuth();
    const hasPaymentPermission = user?.permissions ? user.permissions.includes("payments.view") : true;

    const [order, setOrder] = useState<ApiOrder | null>(null);
    const [statuses, setStatuses] = useState<StatusItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    // Status & Quantity update form
    const [newStatus, setNewStatus] = useState("");
    const [completedQty, setCompletedQty] = useState<number>(0);
    const [failedQty, setFailedQty] = useState<number>(0);
    const [qNo, setQNo] = useState("");
    const [combo, setCombo] = useState("");
    const [launchQty, setLaunchQty] = useState<number>(0);
    const [panelQty, setPanelQty] = useState<number>(0);
    const [upsQty, setUpsQty] = useState<number>(0);
    const [finalQty, setFinalQty] = useState<number>(0);
    const [billNumber, setBillNumber] = useState("");
    const [remark, setRemark] = useState("");

    // Delivery date state & edit
    const [editingDeliveryDate, setEditingDeliveryDate] = useState(false);
    const [deliveryDate, setDeliveryDate] = useState("");

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
                const o = orderData.data;
                setOrder(o);
                setNewStatus(o.status || "");
                setCompletedQty(o.completed_qty || 0);
                setFailedQty(o.failed_qty || 0);
                setQNo(o.q_no ? String(o.q_no) : "");
                setCombo(o.combo ? String(o.combo) : "");
                setLaunchQty(o.launch_qty || 0);
                setPanelQty(o.panel_qty || 0);
                setUpsQty(o.ups_qty || 0);
                setFinalQty(o.final_qty || 0);
                setBillNumber(o.bill_number ? String(o.bill_number) : "");
                setDeliveryDate(o.delivery_date || "");
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
        const toastId = toast.loading("Updating order details & logging history...");
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
                    completed_qty: completedQty,
                    failed_qty: failedQty,
                    q_no: qNo,
                    combo: combo,
                    launch_qty: launchQty,
                    panel_qty: panelQty,
                    ups_qty: upsQty,
                    final_qty: finalQty,
                    bill_number: billNumber,
                    admin_id: loggedInAdminId || user?.id,
                    admin_name: user?.name,
                    remark: remark
                })
            });

            const data = await res.json();
            if (res.ok && (data.status || data.success)) {
                toast.success(`Order details updated successfully`, { id: toastId });
                setOrder(data.data);
                setRemark("");
            } else {
                toast.error(data.message || data.error || "Failed to update order", { id: toastId });
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

    const getMetaValue = (key: string, fallback = "N/A") => {
        if (!order || !order.metas) return fallback;
        const found = order.metas.find(m => m.meta_key.toLowerCase() === key.toLowerCase());
        return found ? found.meta_value : fallback;
    };

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

    if (loading) {
        return (
            <DashboardLayout title="Order Details" subtitle="Loading order specifications...">
                <OrderDetailSkeleton />
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

    const orderStatusStr = (order?.status || 'Pending').toString().toLowerCase();
    const currentStatusColor = statuses.find(s => s && s.name && s.name.toString().toLowerCase() === orderStatusStr)?.color || "#10b981";
    const gerberUrl = getMetaValue('gerber_file_url', getMetaValue('gerber_file', getMetaValue('gerber_url', getMetaValue('gerber_path', getMetaValue('gerber', '')))));
    const boardNameVal = order.board_name || getMetaValue('board_name', getMetaValue('gerber_file_name', getMetaValue('gerber_name', '')));
    const gerberFileName = getMetaValue('gerber_file_name', getMetaValue('gerber_name', getMetaValue('file_name', boardNameVal ? `${boardNameVal}_gerber.zip` : 'Gerber_Files.zip')));
    const layerCount = getMetaValue('layers', getMetaValue('layer', '2'));

    // Color code mapping for PCB Color property
    const pcbColorName = getMetaValue('pcb_color', getMetaValue('color', 'Green')).toLowerCase();
    const getPcbHexColor = (colorStr: string) => {
        if (colorStr.includes("red")) return "#ef4444";
        if (colorStr.includes("blue")) return "#2563eb";
        if (colorStr.includes("yellow")) return "#d97706";
        if (colorStr.includes("white")) return "#475569";
        if (colorStr.includes("black")) return "#000000";
        if (colorStr.includes("purple")) return "#9333ea";
        return "#10b981"; // Default Green
    };
    const productTypeVal = getMetaValue('product_type', 'pcb').toLowerCase();
    const isPartProduct = productTypeVal === 'part';

    // Filter out preview_data, board_name, build_time, and parent_order_number from technical parameters display
    const filteredMetas = order.metas ? order.metas.filter(m => {
        const key = m.meta_key.toLowerCase();
        if (key === 'preview_data' ||
            key === 'gerber_preview_data' ||
            key === 'board_name' ||
            key === 'board name' ||
            key === 'boardname' ||
            key === 'build_time' ||
            key === 'build time' ||
            key === 'buildtime' ||
            key === 'parent_order_number' ||
            key === 'parent_order' ||
            key === 'parent order number' ||
            key === 'parent order') {
            return false;
        }

        // If product type is "part", hide PCB-specific parameters (Gerber, pcb_color, surface_finish, layers, dimensions, etc.) if not relevant
        if (isPartProduct) {
            if (key === 'gerber_file_name' ||
                key === 'gerber_file' ||
                key === 'pcb_color' ||
                key === 'color' ||
                key === 'surface_finish' ||
                key === 'thickness' ||
                key === 'layers' ||
                key === 'dimensions') {
                return false;
            }
        }
        return true;
    }) : [];

    const pageHeaderTitle = (
        <div className="space-y-1">
            <h1 className="text-lg md:text-xl font-black leading-tight" style={{ color: isPartProduct ? "#2563eb" : "#059669" }}>
                Order #{order.order_number}
            </h1>
            <div className="flex items-center gap-2">
                <span
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-black border uppercase tracking-wider inline-flex items-center gap-1.5 text-black"
                    style={{
                        backgroundColor: `${currentStatusColor}15`,
                        color: "#000000",
                        borderColor: `${currentStatusColor}40`
                    }}
                >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentStatusColor }} />
                    {order.status}
                </span>
                {isPartProduct && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-700 border border-blue-200 uppercase tracking-wider">
                        Part Order
                    </span>
                )}
            </div>
        </div>
    );

    const backActionButton = (
        <button
            onClick={() => router.push('/orders')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-card border border-border/80 rounded-xl hover:bg-muted text-foreground font-bold text-xs transition-all cursor-pointer shadow-xs"
        >
            <ArrowLeft className="w-4 h-4" /> Back to Orders List
        </button>
    );

    return (
        <DashboardLayout title={pageHeaderTitle as any} action={backActionButton}>
            <div className="space-y-6 w-full">
                {/* Primary Highlights Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                    <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-sm">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Order Value</p>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                            {hasPaymentPermission
                                ? `₹${Number(order.order_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                                : "XXXX"}
                        </p>
                    </div>
                    <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-sm">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bill Number</p>
                        <p className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                            {order.bill_number || getMetaValue('bill_number', getMetaValue('bill', 'N/A'))}
                        </p>
                    </div>
                    <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-sm">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Unit Price</p>
                        <p className="text-xl font-bold text-foreground mt-1">
                            {hasPaymentPermission
                                ? `₹${Number(order.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                                : "XXXX"}
                        </p>
                    </div>

                    {/* Quantity Fulfillment Breakdown Card */}
                    {(() => {
                        const totalQtyVal = parseInt(getMetaValue('qty', getMetaValue('quantity', '5'))) || 0;
                        const compQty = order.completed_qty || 0;
                        const pendQty = Math.max(0, totalQtyVal - compQty);
                        return (
                            <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-sm space-y-1">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Quantity Breakdown</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400" title="Completed Qty">
                                        {compQty} Done
                                    </span>
                                    <span className="text-muted-foreground">/</span>
                                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400" title="Pending Qty">
                                        {pendQty} Pending
                                    </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground font-medium pt-0.5">Total: {totalQtyVal} Pcs</p>
                            </div>
                        );
                    })()}

                    <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-sm relative group">
                        <div className="flex justify-between items-center">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Delivery Date</p>
                            {!editingDeliveryDate ? (
                                <button
                                    onClick={() => {
                                        const currentDate = order.delivery_date || getMetaValue('delivery_date', '');
                                        if (currentDate && currentDate !== 'N/A') {
                                            const d = new Date(currentDate);
                                            if (!isNaN(d.getTime())) {
                                                const formatted = d.toISOString().split('T')[0];
                                                setDeliveryDate(formatted);
                                            } else {
                                                setDeliveryDate(currentDate);
                                            }
                                        }
                                        setEditingDeliveryDate(true);
                                    }}
                                    className="text-emerald-500 text-xs font-bold hover:underline cursor-pointer"
                                >
                                    Edit
                                </button>
                            ) : (
                                <button onClick={handleSaveDeliveryDate} className="text-emerald-500 text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer"><Save className="w-3 h-3" /> Save</button>
                            )}
                        </div>
                        {!editingDeliveryDate ? (
                            <p className={`text-base font-bold font-mono mt-1 ${isPastDeliveryDate(order.delivery_date) ? "text-red-600 dark:text-red-400 font-extrabold" : "text-foreground"}`}>
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

                {/* Gerber File Download / Preview Card (Only shown for PCB / Stencil orders, hidden for Part orders) */}
                {!isPartProduct && (
                    <div className="bg-gradient-to-r from-emerald-500/10 via-card to-card border border-emerald-500/30 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-2xl bg-[#0c3b19] flex items-center justify-center p-1 overflow-hidden shrink-0 border border-emerald-500/30 shadow-md">
                                <GerberBoardPreview
                                    previewData={order.gerber_preview_data || getMetaValue('preview_data', '') || getMetaValue('front_preview_url', '') || (order.gerber_file_id ? `/api/gerber/${order.gerber_file_id}/preview/front` : '')}
                                    boardName={boardNameVal}
                                    layers={layerCount}
                                    dimensions={getMetaValue('dimensions', '')}
                                    pcbColor={getMetaValue('pcb_color', 'Green')}
                                />
                            </div>
                            <div>
                                <h3 className="text-sm font-extrabold text-foreground">Gerber Production File</h3>
                                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                    File: <span className="font-mono font-bold text-foreground">{gerberFileName}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            {(gerberUrl && gerberUrl !== 'N/A' && gerberUrl !== '') || gerberFileName ? (
                                <>
                                    {gerberUrl && gerberUrl !== 'N/A' && gerberUrl !== '' && (
                                        <a
                                            href={gerberUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-card border border-border/80 text-foreground font-bold rounded-xl hover:bg-muted text-xs transition-all w-full md:w-auto"
                                        >
                                            <Eye className="w-4 h-4 text-emerald-500" /> View Gerber File
                                        </a>
                                    )}
                                    <a
                                        href={gerberUrl && gerberUrl !== 'N/A' ? gerberUrl : `#`}
                                        download={gerberFileName}
                                        onClick={(e) => {
                                            if (!gerberUrl || gerberUrl === 'N/A') {
                                                e.preventDefault();
                                                toast.info(`Gerber File Name: ${gerberFileName}`);
                                            }
                                        }}
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
                )}

                {/* Customer Information & Technical Parameters Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Customer Info & Addresses Card (Matching User Quote app structure) */}
                    <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-4">
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground flex items-center gap-2 border-b border-border/40 pb-3">
                            <User className="w-4 h-4 text-emerald-500" /> Customer Info
                        </h3>
                        <div className="space-y-4 text-xs">
                            <div className="space-y-2 pb-3 border-b border-border/40">
                                <div className="flex justify-between py-1">
                                    <span className="text-muted-foreground font-medium">Customer Name</span>
                                    <span className="font-bold text-foreground">
                                        {order.shipping_first_name || order.billing_first_name
                                            ? `${order.shipping_first_name || order.billing_first_name || ''} ${order.shipping_last_name || order.billing_last_name || ''}`
                                            : (order.customer_name || (order as any).user?.name || getMetaValue('customer_name', getMetaValue('name', 'N/A')))}
                                    </span>
                                </div>
                                <div className="flex justify-between py-1">
                                    <span className="text-muted-foreground font-medium">Email Address</span>
                                    <span className="font-bold text-foreground">{order.user_email || (order as any).user?.email || getMetaValue('user_email', getMetaValue('email', 'N/A'))}</span>
                                </div>
                                <div className="flex justify-between py-1">
                                    <span className="text-muted-foreground font-medium">Mobile Number</span>
                                    <span className="font-bold text-foreground">{order.shipping_mobile || order.user_mobile || (order as any).user?.mobile || getMetaValue('user_mobile', getMetaValue('mobile', 'N/A'))}</span>
                                </div>
                                <div className="flex justify-between py-1">
                                    <span className="text-muted-foreground font-medium">Bill Number</span>
                                    <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400">
                                        {order.bill_number || getMetaValue('bill_number', getMetaValue('bill', 'N/A'))}
                                    </span>
                                </div>
                                <div className="flex justify-between py-1">
                                    <span className="text-muted-foreground font-medium">GST Number</span>
                                    <span className="font-bold text-foreground">{getMetaValue('gst_number', getMetaValue('gstin', 'N/A'))}</span>
                                </div>
                            </div>

                            {/* Shipping & Billing Address breakdown */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                <div className="p-3.5 bg-muted/30 rounded-xl border border-border/50 space-y-1">
                                    <p className="font-extrabold text-foreground text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Shipping Address</p>
                                    {order.shipping_first_name || order.shipping_street || order.shipping_city ? (
                                        <>
                                            <p className="font-bold text-foreground text-xs">
                                                {`${order.shipping_first_name || ''} ${order.shipping_last_name || ''}`}
                                                {order.shipping_company ? ` (${order.shipping_company})` : ""}
                                            </p>
                                            <p className="text-muted-foreground leading-relaxed">
                                                {order.shipping_building_no ? `${order.shipping_building_no}, ` : ""}
                                                {order.shipping_street || ""}
                                            </p>
                                            <p className="text-muted-foreground">
                                                {order.shipping_city ? `${order.shipping_city}, ` : ""}
                                                {order.shipping_state ? `${order.shipping_state} ` : ""}
                                                {order.shipping_postal || ""}
                                            </p>
                                            {order.shipping_country && <p className="font-bold text-foreground">{order.shipping_country}</p>}
                                        </>
                                    ) : (
                                        <p className="text-muted-foreground italic leading-relaxed pt-1">
                                            {getMetaValue('shipping_address', getMetaValue('address', 'No shipping address recorded on file.'))}
                                        </p>
                                    )}
                                </div>

                                <div className="p-3.5 bg-muted/30 rounded-xl border border-border/50 space-y-1">
                                    <p className="font-extrabold text-foreground text-[11px] uppercase tracking-wider text-blue-500">Billing Address</p>
                                    {order.billing_first_name || order.billing_street || order.billing_city ? (
                                        <>
                                            <p className="font-bold text-foreground text-xs">
                                                {`${order.billing_first_name || ''} ${order.billing_last_name || ''}`}
                                                {order.billing_company ? ` (${order.billing_company})` : ""}
                                            </p>
                                            <p className="text-muted-foreground leading-relaxed">
                                                {order.billing_building_no ? `${order.billing_building_no}, ` : ""}
                                                {order.billing_street || ""}
                                            </p>
                                            <p className="text-muted-foreground">
                                                {order.billing_city ? `${order.billing_city}, ` : ""}
                                                {order.billing_state ? `${order.billing_state} ` : ""}
                                                {order.billing_postal || ""}
                                            </p>
                                            {order.billing_country && <p className="font-bold text-foreground">{order.billing_country}</p>}
                                        </>
                                    ) : (
                                        <p className="text-muted-foreground italic leading-relaxed pt-1">
                                            {getMetaValue('billing_address', getMetaValue('shipping_address', getMetaValue('address', 'Same as shipping address.')))}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Technical Parameters / PCB Specifications Card */}
                    <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-6">
                        <div className="flex items-center justify-between border-b border-border/40 pb-3">
                            <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground flex items-center gap-2">
                                <FileText className="w-4 h-4 text-emerald-500" /> Technical Parameters & PCB Specifications
                            </h3>
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                Order Snapshot
                            </span>
                        </div>

                        {/* PCB Basic Specifications Group */}
                        <div className="space-y-2">
                            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                1. PCB Basic Specifications
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                                <div className="bg-muted/30 rounded-xl p-2.5 border border-border/60">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Base Material</p>
                                    <p className="font-bold text-foreground mt-0.5">{getMetaValue('base_material', getMetaValue('material', 'FR-4'))}</p>
                                </div>
                                {getMetaValue('substrate_type', '') && getMetaValue('substrate_type') !== 'N/A' && (
                                    <div className="bg-muted/30 rounded-xl p-2.5 border border-border/60">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Substrate Type</p>
                                        <p className="font-bold text-foreground mt-0.5">{getMetaValue('substrate_type')}</p>
                                    </div>
                                )}
                                <div className="bg-muted/30 rounded-xl p-2.5 border border-border/60">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Layer Count</p>
                                    <p className="font-bold text-foreground mt-0.5">{getMetaValue('layers', order.layers ? `${order.layers} Layers` : '2 Layers')}</p>
                                </div>
                                <div className="bg-muted/30 rounded-xl p-2.5 border border-border/60">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Dimensions</p>
                                    <p className="font-bold text-foreground mt-0.5">
                                        {getMetaValue('dimensions', (getMetaValue('dimensions_width') && getMetaValue('dimensions_length')) ? `${getMetaValue('dimensions_width')} x ${getMetaValue('dimensions_length')} ${getMetaValue('dimension_unit', 'mm')}` : '100x100mm')}
                                    </p>
                                </div>
                                <div className="bg-muted/30 rounded-xl p-2.5 border border-border/60">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase">PCB Quantity</p>
                                    <p className="font-bold text-foreground mt-0.5">{order.order_qty || getMetaValue('quantity', getMetaValue('qty', '5'))} Pcs</p>
                                </div>
                                <div className="bg-muted/30 rounded-xl p-2.5 border border-border/60">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Different Design Count</p>
                                    <p className="font-bold text-foreground mt-0.5">{getMetaValue('different_design', '1')}</p>
                                </div>
                                <div className="bg-muted/30 rounded-xl p-2.5 border border-border/60">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Delivery Format</p>
                                    <p className="font-bold text-foreground mt-0.5">{getMetaValue('delivery_format', 'Single PCB')}</p>
                                </div>
                                {getMetaValue('panel_format', '') && getMetaValue('panel_format') !== 'N/A' && (
                                    <div className="bg-muted/30 rounded-xl p-2.5 border border-border/60">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Panel Layout</p>
                                        <p className="font-bold text-foreground mt-0.5">{getMetaValue('panel_format')}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* PCB Specifications Group */}
                        <div className="space-y-2 pt-2 border-t border-border/40">
                            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                2. PCB Specifications
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                                <div className="bg-muted/30 rounded-xl p-2.5 border border-border/60">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase">PCB Thickness</p>
                                    <p className="font-bold text-foreground mt-0.5">{getMetaValue('thickness', '1.6mm')}</p>
                                </div>
                                <div className="bg-muted/30 rounded-xl p-2.5 border border-border/60">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Solder Mask / Coverlay Color</p>
                                    <p className="font-bold text-foreground mt-0.5">{getMetaValue('pcb_color', getMetaValue('coverlay_color', 'Green'))}</p>
                                </div>
                                <div className="bg-muted/30 rounded-xl p-2.5 border border-border/60">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Silkscreen Color</p>
                                    <p className="font-bold text-foreground mt-0.5">{getMetaValue('silkscreen', 'White')}</p>
                                </div>
                                <div className="bg-muted/30 rounded-xl p-2.5 border border-border/60">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Material Type</p>
                                    <p className="font-bold text-foreground mt-0.5">{getMetaValue('material_type', 'FR4-TG135')}</p>
                                </div>
                                <div className="bg-muted/30 rounded-xl p-2.5 border border-border/60">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Surface Finish</p>
                                    <p className="font-bold text-foreground mt-0.5">{getMetaValue('surface_finish', 'HASL(Leaded)')}</p>
                                </div>
                                {getMetaValue('gold_thickness', '') && getMetaValue('gold_thickness') !== 'N/A' && (
                                    <div className="bg-muted/30 rounded-xl p-2.5 border border-border/60">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Gold Thickness</p>
                                        <p className="font-bold text-foreground mt-0.5">{getMetaValue('gold_thickness')}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* High-Spec Options Group */}
                        <div className="space-y-2 pt-2 border-t border-border/40">
                            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                3. High-Spec Options
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                                <div className="bg-muted/30 rounded-xl p-2.5 border border-border/60">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Outer Copper Weight</p>
                                    <p className="font-bold text-foreground mt-0.5">{getMetaValue('copper_weight', '1 oz')}</p>
                                </div>
                                {getMetaValue('via_covering', '') && getMetaValue('via_covering') !== 'N/A' && (
                                    <div className="bg-muted/30 rounded-xl p-2.5 border border-border/60">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Via Covering</p>
                                        <p className="font-bold text-foreground mt-0.5">{getMetaValue('via_covering')}</p>
                                    </div>
                                )}
                                {getMetaValue('via_plating', '') && getMetaValue('via_plating') !== 'N/A' && (
                                    <div className="bg-muted/30 rounded-xl p-2.5 border border-border/60">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Via Plating Method</p>
                                        <p className="font-bold text-foreground mt-0.5">{getMetaValue('via_plating')}</p>
                                    </div>
                                )}
                                {getMetaValue('min_hole', '') && getMetaValue('min_hole') !== 'N/A' && (
                                    <div className="bg-muted/30 rounded-xl p-2.5 border border-border/60">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Min Via Hole Size</p>
                                        <p className="font-bold text-foreground mt-0.5">{getMetaValue('min_hole')}</p>
                                    </div>
                                )}
                                <div className="bg-muted/30 rounded-xl p-2.5 border border-border/60">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Confirm Production File</p>
                                    <p className="font-bold text-foreground mt-0.5">{getMetaValue('confirm_file', 'No')}</p>
                                </div>
                                <div className="bg-muted/30 rounded-xl p-2.5 border border-border/60">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Mark on PCB</p>
                                    <p className="font-bold text-foreground mt-0.5">{getMetaValue('mark_on_pcb', 'Remove Mark')}</p>
                                </div>
                                <div className="bg-muted/30 rounded-xl p-2.5 border border-border/60">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Electrical Test</p>
                                    <p className="font-bold text-foreground mt-0.5">{getMetaValue('elec_test', 'Flying Probe Fully Test')}</p>
                                </div>
                                {getMetaValue('coverlay_thickness', '') && getMetaValue('coverlay_thickness') !== 'N/A' && (
                                    <div className="bg-muted/30 rounded-xl p-2.5 border border-border/60">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Coverlay Thickness</p>
                                        <p className="font-bold text-foreground mt-0.5">{getMetaValue('coverlay_thickness')}</p>
                                    </div>
                                )}
                                {getMetaValue('stiffener', '') && getMetaValue('stiffener') !== 'N/A' && (
                                    <div className="bg-muted/30 rounded-xl p-2.5 border border-border/60">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Stiffener</p>
                                        <p className="font-bold text-foreground mt-0.5">{getMetaValue('stiffener')}</p>
                                    </div>
                                )}
                                {getMetaValue('emi_shielding', '') && getMetaValue('emi_shielding') !== 'N/A' && (
                                    <div className="bg-muted/30 rounded-xl p-2.5 border border-border/60">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase">EMI Shielding Film</p>
                                        <p className="font-bold text-foreground mt-0.5">{getMetaValue('emi_shielding')}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Advanced Options Group */}
                        <div className="space-y-2 pt-2 border-t border-border/40">
                            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                4. Advanced Options & Badges
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                                {[
                                    { label: "Gold Fingers", val: getMetaValue('gold_fingers', 'No') },
                                    { label: "Castellated Holes", val: getMetaValue('castellated', 'No') },
                                    { label: "Edge Plating", val: getMetaValue('edge_plating', 'No') },
                                    { label: "Blind Slots", val: getMetaValue('blind_slots', 'No') },
                                    { label: "UL Marking", val: getMetaValue('ul_marking', 'No') },
                                    { label: "Humidity Card", val: getMetaValue('humidity', 'No') },
                                    { label: "Kelvin Test", val: getMetaValue('kelvin_test', 'No') },
                                    { label: "Paper Between PCBs", val: getMetaValue('paper_between', 'No') }
                                ].map((badge, idx) => (
                                    <div key={idx} className={`p-2 rounded-xl border flex items-center justify-between font-bold ${badge.val === 'Yes' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-muted/20 border-border/60 text-muted-foreground'}`}>
                                        <span className="text-[11px]">{badge.label}</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-md uppercase font-black bg-card border border-border/60">{badge.val}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Custom Information & Remarks */}
                        {getMetaValue('pcb_remark', '') && getMetaValue('pcb_remark') !== 'N/A' && (
                            <div className="space-y-1.5 pt-2 border-t border-border/40">
                                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                    5. Customer PCB Remark / Instructions
                                </h4>
                                <div className="p-3 bg-muted/30 rounded-xl border border-border/60 text-xs font-semibold text-foreground italic leading-relaxed">
                                    "{getMetaValue('pcb_remark')}"
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Update Order Parameters & Status Card */}
                <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-emerald-500" /> Update Order Status & Parameters
                    </h3>
                    <form onSubmit={handleUpdateStatus} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1.5">New Status</label>
                                <select
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                    className="w-full px-3.5 py-2.5 text-xs font-bold bg-background border border-border/80 rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                                >
                                    {statuses.map((s) => (
                                        <option key={s.id} value={s.name}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1.5">Q.No</label>
                                <input
                                    type="text"
                                    value={qNo}
                                    onChange={(e) => setQNo(e.target.value)}
                                    placeholder="Q.No..."
                                    className="w-full px-3.5 py-2.5 text-xs bg-background border border-border/80 rounded-xl text-foreground font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1.5">Combo</label>
                                <input
                                    type="text"
                                    value={combo}
                                    onChange={(e) => setCombo(e.target.value)}
                                    placeholder="Combo..."
                                    className="w-full px-3.5 py-2.5 text-xs bg-background border border-border/80 rounded-xl text-foreground font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1.5">Bill Number</label>
                                <input
                                    type="text"
                                    value={billNumber}
                                    onChange={(e) => setBillNumber(e.target.value)}
                                    placeholder="Bill No..."
                                    className="w-full px-3.5 py-2.5 text-xs bg-background border border-border/80 rounded-xl text-foreground font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1.5">Completed Qty (Pcs)</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={completedQty}
                                    onChange={(e) => setCompletedQty(parseInt(e.target.value) || 0)}
                                    placeholder="Completed..."
                                    className="w-full px-3.5 py-2.5 text-xs bg-background border border-border/80 rounded-xl text-foreground font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1.5">Failed Qty (Pcs)</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={failedQty}
                                    onChange={(e) => setFailedQty(parseInt(e.target.value) || 0)}
                                    placeholder="Failed..."
                                    className="w-full px-3.5 py-2.5 text-xs bg-background border border-border/80 rounded-xl text-rose-500 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1.5">Launch Qty</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={launchQty}
                                    onChange={(e) => setLaunchQty(parseInt(e.target.value) || 0)}
                                    placeholder="Launch..."
                                    className="w-full px-3.5 py-2.5 text-xs bg-background border border-border/80 rounded-xl text-foreground font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1.5">Panel Qty</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={panelQty}
                                    onChange={(e) => setPanelQty(parseInt(e.target.value) || 0)}
                                    placeholder="Panel..."
                                    className="w-full px-3.5 py-2.5 text-xs bg-background border border-border/80 rounded-xl text-foreground font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1.5">Ups Qty</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={upsQty}
                                    onChange={(e) => setUpsQty(parseInt(e.target.value) || 0)}
                                    placeholder="Ups..."
                                    className="w-full px-3.5 py-2.5 text-xs bg-background border border-border/80 rounded-xl text-foreground font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1.5">Final Qty</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={finalQty}
                                    onChange={(e) => setFinalQty(parseInt(e.target.value) || 0)}
                                    placeholder="Final..."
                                    className="w-full px-3.5 py-2.5 text-xs bg-background border border-border/80 rounded-xl text-foreground font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="text-xs font-bold text-muted-foreground block mb-1.5">Remark / Audit Note</label>
                                <input
                                    type="text"
                                    value={remark}
                                    onChange={(e) => setRemark(e.target.value)}
                                    placeholder="State reason or notes for update..."
                                    className="w-full px-3.5 py-2.5 text-xs bg-background border border-border/80 rounded-xl text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={updating}
                                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-xl shadow-md transition-all text-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${updating ? 'animate-spin' : ''}`} />
                                {updating ? "Updating..." : "Update Status & Parameters"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* System Activity Logs Table */}
                <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground flex items-center gap-2">
                        <History className="w-4 h-4 text-emerald-500" /> Order Logs
                    </h3>

                    <div className="border border-border/60 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-muted/60 border-b border-border/60 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                                        <th className="py-3 px-4">Action</th>
                                        <th className="py-3 px-4 whitespace-nowrap">User / Admin</th>
                                        <th className="py-3 px-4">Timestamp</th>
                                        <th className="py-3 px-4">Details / Description</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40 font-sans">
                                    {!order.logs || order.logs.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-6 text-center text-muted-foreground italic">
                                                No activity logs recorded for this order yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        order.logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-muted/20">
                                                <td className="py-3 px-4">
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
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
