"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, User, Mail, Phone, FileText, Download, RefreshCw, History, Shield, Calendar, Tag, MessageSquare, Layers, Eye, Save, Plus, ExternalLink, Trash2, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { OrderDetailSkeleton } from "@/components/ui/skeleton";
import GerberBoardPreview from "@/components/GerberBoardPreview";
import { useAuth } from "@/lib/auth-context";
import { ComboSelect, ComboOrderItem } from "@/components/ComboSelect";
import { OldOrderSelect, OldOrderItem } from "@/components/OldOrderSelect";

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

interface CustomerUser {
    id: number;
    name: string | null;
    company_name?: string | null;
    email?: string | null;
    mobile?: string | null;
}

interface ApiOrder {
    id: number;
    user_id: number | null;
    user?: CustomerUser | null;
    layers?: string | number | null;
    status_id: number | null;
    order_number: string;
    pn_number?: string | null;
    q_no?: string | number | null;
    c_g?: string | null;
    combo?: string | null;
    combo_orders?: Array<{ id: number; order_number: string; status?: string }>;
    old_order_number?: string | null;
    old_orders?: Array<{ id: number; order_number: string; status?: string }>;
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
    const isSuperAdmin = user?.role?.toLowerCase() === "super admin";
    const hasPaymentPermission = user?.permissions ? user.permissions.includes("payments.view") : true;
    const hasDeleteOrderPermission = isSuperAdmin || (user?.permissions ? (user.permissions.includes("orders.delete") || user.permissions.includes("orders.manage")) : false);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deletingOrder, setDeletingOrder] = useState(false);

    const handleDeleteOrder = async () => {
        if (!order) return;
        setDeletingOrder(true);
        const toastId = toast.loading(`Deleting order #${order.order_number}...`);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/${order.id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });
            const json = await res.json();
            if (res.ok && (json.success || json.status)) {
                toast.success(json.message || `Order #${order.order_number} deleted successfully.`, { id: toastId });
                setDeleteModalOpen(false);
                router.push('/orders');
            } else {
                toast.error(json.message || "Failed to delete order.", { id: toastId });
            }
        } catch (err: any) {
            toast.error(err?.message || "Error deleting order.", { id: toastId });
        } finally {
            setDeletingOrder(false);
        }
    };

    const [order, setOrder] = useState<ApiOrder | null>(null);
    const [statuses, setStatuses] = useState<StatusItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    // Status & Quantity update form
    const [newStatus, setNewStatus] = useState("");
    const [orderQty, setOrderQty] = useState<number>(0);
    const [completedQty, setCompletedQty] = useState<number>(0);
    const [failedQty, setFailedQty] = useState<number>(0);
    const [qNo, setQNo] = useState("");
    const [combo, setCombo] = useState("");
    const [comboOrdersState, setComboOrdersState] = useState<ComboOrderItem[]>([]);
    const [oldOrderNumber, setOldOrderNumber] = useState("");
    const [oldOrdersState, setOldOrdersState] = useState<OldOrderItem[]>([]);
    const [launchQty, setLaunchQty] = useState<number>(0);
    const [panelQty, setPanelQty] = useState<number>(0);
    const [upsQty, setUpsQty] = useState<number>(0);
    const [finalQty, setFinalQty] = useState<number>(0);
    const [billNumber, setBillNumber] = useState("");
    const [billNumberError, setBillNumberError] = useState("");
    const [remark, setRemark] = useState("");

    // Order Number edit state
    const [editingOrderNumber, setEditingOrderNumber] = useState(false);
    const [orderNumberState, setOrderNumberState] = useState("");
    const [orderNumberError, setOrderNumberError] = useState("");

    // P/N Number edit state
    const [editingPnNumber, setEditingPnNumber] = useState(false);
    const [pnNumberState, setPnNumberState] = useState("");

    // Delivery date state & edit
    const [editingDeliveryDate, setEditingDeliveryDate] = useState(false);
    const [deliveryDate, setDeliveryDate] = useState("");

    // Top summary boxes edit states
    const [editingOrderValue, setEditingOrderValue] = useState(false);
    const [orderValueState, setOrderValueState] = useState("");

    const [editingTopBillNumber, setEditingTopBillNumber] = useState(false);
    const [topBillNumberState, setTopBillNumberState] = useState("");

    const [editingUnitPrice, setEditingUnitPrice] = useState(false);
    const [unitPriceState, setUnitPriceState] = useState("");

    const [editingTopQty, setEditingTopQty] = useState(false);
    const [topOrderQty, setTopOrderQty] = useState(0);
    const [topFinalQty, setTopFinalQty] = useState(0);

    const [editingSubmittedOn, setEditingSubmittedOn] = useState(false);
    const [submittedOnState, setSubmittedOnState] = useState("");

    // Technical Parameters & PCB Specifications edit states
    const [activeEditingSpec, setActiveEditingSpec] = useState<string | null>(null);
    const [specFormValues, setSpecFormValues] = useState<Record<string, string>>({});

    // C/G states
    const [cgState, setCgState] = useState<string>("");
    const [editingOrderCg, setEditingOrderCg] = useState(false);
    const [inlineCgState, setInlineCgState] = useState("");

    const extractQty = (targetOrder: any, directKey: string, metaKeys: string[], fallbackVal = 0): number => {
        if (!targetOrder) return fallbackVal;
        const directVal = targetOrder[directKey];
        if (directVal !== undefined && directVal !== null && directVal !== "" && !isNaN(Number(directVal)) && Number(directVal) > 0) {
            return Number(directVal);
        }
        if (Array.isArray(targetOrder.metas)) {
            for (const k of metaKeys) {
                const found = targetOrder.metas.find((m: any) => m.meta_key && m.meta_key.toLowerCase() === k.toLowerCase());
                if (found && found.meta_value !== undefined && found.meta_value !== null && found.meta_value !== "" && !isNaN(Number(found.meta_value))) {
                    return Number(found.meta_value);
                }
            }
        }
        if (directVal !== undefined && directVal !== null && directVal !== "" && !isNaN(Number(directVal))) {
            return Number(directVal);
        }
        return fallbackVal;
    };

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
                setOrderNumberState(o.order_number || "");
                setOrderNumberError("");
                setPnNumberState(o.pn_number ? String(o.pn_number) : "");
                setNewStatus(o.status || "");
                
                const orderQtyVal = extractQty(o, 'order_qty', ['order_qty', 'qty', 'quantity', 'pcs'], 0);
                const compQtyVal = extractQty(o, 'completed_qty', ['completed_qty', 'completed', 'final_qty', 'final'], 0);
                const failQtyVal = extractQty(o, 'failed_qty', ['failed_qty', 'failed'], 0);
                const panelQtyVal = extractQty(o, 'panel_qty', ['panel_qty', 'panel'], 0);
                const upsQtyVal = extractQty(o, 'ups_qty', ['ups_qty', 'ups'], 0);
                const launchQtyVal = extractQty(o, 'launch_qty', ['launch_qty', 'launch', 'launched_qty', 'launched'], (panelQtyVal > 0 && upsQtyVal > 0) ? (panelQtyVal * upsQtyVal) : 0);
                const finalQtyVal = extractQty(o, 'final_qty', ['final_qty', 'final', 'completed_qty', 'completed'], compQtyVal);

                setOrderQty(orderQtyVal);
                setCompletedQty(compQtyVal);
                setFailedQty(failQtyVal);
                setLaunchQty(launchQtyVal);
                setPanelQty(panelQtyVal);
                setUpsQty(upsQtyVal);
                setCgState(o.c_g ? String(o.c_g).toUpperCase() : "");
                setInlineCgState(o.c_g ? String(o.c_g).toUpperCase() : "");
                const defaultPn = o.pn_number 
                    || o.gerber_file?.original_name 
                    || o.gerber_file?.file_name 
                    || (Array.isArray(o.metas) ? o.metas.find((m: any) => ['gerber_file_name', 'gerber_name', 'board_name', 'p_n', 'part_number'].includes(m.meta_key?.toLowerCase()))?.meta_value : null)
                    || o.board_name 
                    || "";

                setPnNumberState(o.pn_number ? String(o.pn_number) : (defaultPn ? String(defaultPn) : ""));
                setCombo(o.combo ? String(o.combo) : "");

                let initialComboItems: ComboOrderItem[] = [];
                if (Array.isArray(o.combo_orders) && o.combo_orders.length > 0) {
                    initialComboItems = o.combo_orders.map((c: any) => ({
                        id: c.id,
                        order_number: c.order_number,
                        status: c.status,
                    }));
                } else if (o.combo && String(o.combo).trim() !== "") {
                    const parsed = String(o.combo).split(/[\+,\s]+/).filter(Boolean);
                    initialComboItems = parsed.map((no, idx) => ({
                        id: 990000 + idx,
                        order_number: no,
                    }));
                }
                setComboOrdersState(initialComboItems);

                setOldOrderNumber(o.old_order_number ? String(o.old_order_number) : "");
                let initialOldItems: OldOrderItem[] = [];
                if (Array.isArray(o.old_orders) && o.old_orders.length > 0) {
                    initialOldItems = o.old_orders.map((c: any) => ({
                        id: c.id,
                        order_number: c.order_number,
                        status: c.status,
                    }));
                } else if (o.old_order_number && String(o.old_order_number).trim() !== "") {
                    const parsed = String(o.old_order_number).split(/[\+,\s]+/).filter(Boolean);
                    initialOldItems = parsed.map((no, idx) => ({
                        id: 880000 + idx,
                        order_number: no,
                    }));
                }
                setOldOrdersState(initialOldItems);
                setBillNumber(o.bill_number ? String(o.bill_number) : "");
                setDeliveryDate(parseDeliveryDateToYYYYMMDD(o.delivery_date));
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

    const handleSaveOrderNumber = async () => {
        const cleanNum = orderNumberState.trim();
        if (!cleanNum) {
            setOrderNumberError("Order number is required.");
            toast.error("Order number cannot be empty.");
            return;
        }
        setOrderNumberError("");
        const toastId = toast.loading("Updating Order Number...");
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/${orderId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ order_number: cleanNum })
            });
            const data = await res.json();
            if (res.ok && (data.status || data.success)) {
                toast.success("Order Number updated successfully", { id: toastId });
                setEditingOrderNumber(false);
                if (data.data) {
                    setOrder(data.data);
                    setOrderNumberState(data.data.order_number || cleanNum);
                } else {
                    fetchOrderDetail();
                }
            } else {
                const errMsg = data.errors?.order_number?.[0] || data.message || "Failed to update order number";
                if (data.errors?.order_number?.[0]) {
                    setOrderNumberError(data.errors.order_number[0]);
                }
                toast.error(errMsg, { id: toastId });
            }
        } catch (err: any) {
            toast.error("Error updating order number", { id: toastId });
        }
    };

    const handleSavePnNumber = async () => {
        const cleanPn = pnNumberState.trim();
        const toastId = toast.loading("Updating P/N Number...");
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/${order?.id || orderId}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    pn_number: cleanPn
                })
            });
            const data = await res.json();
            if (res.ok && (data.status || data.success)) {
                toast.success("P/N Number updated successfully", { id: toastId });
                setEditingPnNumber(false);
                setOrder((prev) => (prev ? { ...prev, pn_number: cleanPn || null } : prev));
                setPnNumberState(cleanPn);
            } else {
                toast.error(data.message || "Failed to update P/N Number", { id: toastId });
            }
        } catch (err: any) {
            toast.error("Error updating P/N Number", { id: toastId });
        }
    };

    const handleUpdateStatus = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStatus) return;

        setBillNumberError("");
        setOrderNumberError("");

        if (!orderNumberState || orderNumberState.trim() === "") {
            setOrderNumberError("Order number is required.");
            toast.error("Order number cannot be empty.");
            return;
        }

        const completedStatuses = ['completed', 'delivered', 'order completed', 'production completed'];
        const isCompleted = completedStatuses.includes((newStatus || '').toLowerCase().trim());

        if (isCompleted && (!billNumber || billNumber.trim() === "")) {
            setBillNumberError("Bill number is required when completing an order.");
            toast.error("Cannot change order status to Completed. Bill Number is required.");
            return;
        }

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

            const comboOrderNos = comboOrdersState.map((c) => c.order_number);
            const comboStr = comboOrderNos.join(", ");

            const oldOrderNos = oldOrdersState.map((c) => c.order_number);
            const oldOrderStr = oldOrderNos.join(", ");

            const res = await fetch(`/api/admin/orders/${orderId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    order_number: orderNumberState.trim(),
                    pn_number: pnNumberState.trim(),
                    status: newStatus,
                    status_id: matchedStatus ? matchedStatus.id : null,
                    order_qty: orderQty,
                    completed_qty: completedQty,
                    failed_qty: failedQty,
                    q_no: qNo,
                    c_g: cgState || null,
                    combo: comboStr,
                    combo_order_ids: comboOrderNos,
                    old_order_number: oldOrderStr,
                    old_order_ids: oldOrderNos,
                    launch_qty: launchQty,
                    panel_qty: panelQty,
                    ups_qty: upsQty,
                    final_qty: finalQty,
                    bill_number: billNumber.trim(),
                    admin_id: loggedInAdminId || user?.id,
                    admin_name: user?.name,
                    remark: remark
                })
            });

            const data = await res.json();
            if (res.ok && (data.status || data.success)) {
                const updated = data.data;
                toast.success(`Order details updated successfully`, { id: toastId });
                setOrder(updated);
                setOrderNumberState(updated?.order_number || orderNumberState.trim());
                if (updated) {
                    setPnNumberState(updated.pn_number || pnNumberState.trim());
                    setCgState(updated?.c_g ? String(updated.c_g).toUpperCase() : "");
                    setInlineCgState(updated?.c_g ? String(updated.c_g).toUpperCase() : "");
                    setOrderQty(extractQty(updated, 'order_qty', ['order_qty', 'qty', 'quantity', 'pcs'], orderQty));
                    setCompletedQty(extractQty(updated, 'completed_qty', ['completed_qty', 'completed', 'final_qty', 'final'], completedQty));
                    setFailedQty(extractQty(updated, 'failed_qty', ['failed_qty', 'failed'], failedQty));
                    setLaunchQty(extractQty(updated, 'launch_qty', ['launch_qty', 'launch', 'launched_qty', 'launched'], launchQty));
                    setPanelQty(extractQty(updated, 'panel_qty', ['panel_qty', 'panel'], panelQty));
                    setUpsQty(extractQty(updated, 'ups_qty', ['ups_qty', 'ups'], upsQty));
                    setFinalQty(extractQty(updated, 'final_qty', ['final_qty', 'final', 'completed_qty', 'completed'], finalQty));
                }
                setRemark("");
            } else {
                const errMsg = data.errors?.order_number?.[0] || data.errors?.bill_number?.[0] || data.message || data.error || "Failed to update order";
                if (data.errors?.order_number?.[0]) {
                    setOrderNumberError(data.errors.order_number[0]);
                }
                if (data.errors?.bill_number?.[0]) {
                    setBillNumberError(data.errors.bill_number[0]);
                }
                toast.error(errMsg, { id: toastId });
            }
        } catch (err: any) {
            toast.error(err?.message || "Error updating order status", { id: toastId });
        } finally {
            setUpdating(false);
        }
    };

    const handleSaveDeliveryDate = async () => {
        const normNewDate = parseDeliveryDateToYYYYMMDD(deliveryDate);
        const normOldDate = parseDeliveryDateToYYYYMMDD(order?.delivery_date);
        if (normNewDate === normOldDate) {
            toast.info("Delivery date is unchanged.");
            setEditingDeliveryDate(false);
            return;
        }
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/${orderId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ delivery_date: normNewDate || null })
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

    const handleSaveOrderValue = async () => {
        const val = parseFloat(orderValueState);
        if (isNaN(val) || val < 0) {
            toast.error("Please enter a valid order value.");
            return;
        }
        const toastId = toast.loading("Updating Order Value...");
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/${order?.id || orderId}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ order_value: val })
            });
            const data = await res.json();
            if (res.ok && (data.status || data.success)) {
                toast.success("Order Value updated successfully", { id: toastId });
                setEditingOrderValue(false);
                if (data.data) {
                    setOrder(data.data);
                } else {
                    fetchOrderDetail();
                }
            } else {
                toast.error(data.message || "Failed to update order value", { id: toastId });
            }
        } catch (err: any) {
            toast.error(err?.message || "Error updating order value", { id: toastId });
        }
    };

    const handleSaveTopBillNumber = async () => {
        const val = topBillNumberState.trim();
        const toastId = toast.loading("Updating Bill Number...");
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/${order?.id || orderId}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ bill_number: val })
            });
            const data = await res.json();
            if (res.ok && (data.status || data.success)) {
                toast.success("Bill Number updated successfully", { id: toastId });
                setEditingTopBillNumber(false);
                setBillNumber(val);
                if (data.data) {
                    setOrder(data.data);
                } else {
                    fetchOrderDetail();
                }
            } else {
                toast.error(data.message || "Failed to update bill number", { id: toastId });
            }
        } catch (err: any) {
            toast.error(err?.message || "Error updating bill number", { id: toastId });
        }
    };

    const handleSaveInlineCg = async () => {
        const toastId = toast.loading("Updating C/G...");
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/${order?.id || orderId}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ c_g: inlineCgState || null })
            });
            const data = await res.json();
            if (res.ok && (data.status || data.success)) {
                toast.success("C/G updated successfully", { id: toastId });
                setEditingOrderCg(false);
                setCgState(inlineCgState);
                if (data.data) {
                    setOrder(data.data);
                } else {
                    fetchOrderDetail();
                }
            } else {
                toast.error(data.message || "Failed to update C/G", { id: toastId });
            }
        } catch (err: any) {
            toast.error(err?.message || "Error updating C/G", { id: toastId });
        }
    };

    const handleSaveUnitPrice = async () => {
        const val = parseFloat(unitPriceState);
        if (isNaN(val) || val < 0) {
            toast.error("Please enter a valid unit price.");
            return;
        }
        const toastId = toast.loading("Updating Unit Price...");
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/${order?.id || orderId}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ unit_price: val })
            });
            const data = await res.json();
            if (res.ok && (data.status || data.success)) {
                toast.success("Unit Price updated successfully", { id: toastId });
                setEditingUnitPrice(false);
                if (data.data) {
                    setOrder(data.data);
                } else {
                    fetchOrderDetail();
                }
            } else {
                toast.error(data.message || "Failed to update unit price", { id: toastId });
            }
        } catch (err: any) {
            toast.error(err?.message || "Error updating unit price", { id: toastId });
        }
    };

    const handleSaveTopQty = async () => {
        const toastId = toast.loading("Updating Quantities...");
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/${order?.id || orderId}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    order_qty: Number(topOrderQty),
                    final_qty: Number(topFinalQty)
                })
            });
            const data = await res.json();
            if (res.ok && (data.status || data.success)) {
                toast.success("Quantities updated successfully", { id: toastId });
                setEditingTopQty(false);
                setOrderQty(Number(topOrderQty));
                setFinalQty(Number(topFinalQty));
                if (data.data) {
                    setOrder(data.data);
                } else {
                    fetchOrderDetail();
                }
            } else {
                toast.error(data.message || "Failed to update quantities", { id: toastId });
            }
        } catch (err: any) {
            toast.error(err?.message || "Error updating quantities", { id: toastId });
        }
    };

    const handleSaveSubmittedOn = async () => {
        if (!submittedOnState) {
            toast.error("Please select a valid date.");
            return;
        }
        const toastId = toast.loading("Updating Submitted Date...");
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/${order?.id || orderId}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ created_at: submittedOnState })
            });
            const data = await res.json();
            if (res.ok && (data.status || data.success)) {
                toast.success("Submitted Date updated successfully", { id: toastId });
                setEditingSubmittedOn(false);
                if (data.data) {
                    setOrder(data.data);
                } else {
                    fetchOrderDetail();
                }
            } else {
                toast.error(data.message || "Failed to update submitted date", { id: toastId });
            }
        } catch (err: any) {
            toast.error(err?.message || "Error updating submitted date", { id: toastId });
        }
    };

    const startEditSpec = (fieldKey: string, initialVal: string) => {
        setActiveEditingSpec(fieldKey);
        setSpecFormValues(prev => ({ ...prev, [fieldKey]: initialVal }));
    };

    const cancelEditSpec = () => {
        setActiveEditingSpec(null);
    };

    const handleSaveSpec = async (specKey: string, val: string, label: string) => {
        const toastId = toast.loading(`Updating ${label}...`);
        try {
            const token = localStorage.getItem("admin_token");
            let payload: Record<string, any> = { [specKey]: val };
            if (specKey === 'layers') {
                const num = parseInt(val, 10);
                if (!isNaN(num)) payload.layers = num;
            } else if (specKey === 'order_qty' || specKey === 'quantity') {
                const num = parseInt(val, 10);
                if (!isNaN(num)) {
                    payload.order_qty = num;
                    payload.quantity = num;
                }
            } else if (specKey === 'pcb_color' || specKey === 'mask') {
                payload.mask = val;
                payload.pcb_color = val;
                payload.solder_mask = val;
            } else if (specKey === 'pn_number') {
                payload.pn_number = val;
            }

            const res = await fetch(`/api/admin/orders/${order?.id || orderId}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok && (data.status || data.success)) {
                toast.success(`${label} updated successfully`, { id: toastId });
                setActiveEditingSpec(null);
                if (data.data) {
                    setOrder(data.data);
                    if (data.data.pn_number) setPnNumberState(data.data.pn_number);
                    if (data.data.order_qty) setOrderQty(data.data.order_qty);
                } else {
                    fetchOrderDetail();
                }
            } else {
                toast.error(data.message || `Failed to update ${label}`, { id: toastId });
            }
        } catch (err: any) {
            toast.error(err?.message || `Error updating ${label}`, { id: toastId });
        }
    };

    const renderSpecItem = (
        key: string,
        label: string,
        currentValue: string,
        type: 'text' | 'number' | 'select' = 'text',
        options?: string[],
        displayValue?: string
    ) => {
        const isEditing = activeEditingSpec === key;
        const valToEdit = specFormValues[key] !== undefined ? specFormValues[key] : (currentValue === 'N/A' ? '' : currentValue);

        return (
            <div className={`bg-muted/30 rounded-xl p-2.5 border transition-all ${isEditing ? 'border-emerald-500 ring-1 ring-emerald-500/20 bg-background' : 'border-border/60'} relative group`}>
                <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase truncate pr-1" title={label}>{label}</p>
                    {isEditing ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                                type="button"
                                onClick={() => handleSaveSpec(key, valToEdit, label)}
                                className="text-emerald-500 text-[11px] font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                                <Save className="w-3 h-3" /> Save
                            </button>
                            <button
                                type="button"
                                onClick={cancelEditSpec}
                                className="text-muted-foreground hover:text-foreground text-[11px] font-bold cursor-pointer"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => startEditSpec(key, currentValue === 'N/A' ? '' : currentValue)}
                            className="text-emerald-500 text-[11px] font-bold hover:underline cursor-pointer shrink-0"
                        >
                            Edit
                        </button>
                    )}
                </div>
                {isEditing ? (
                    type === 'select' && options ? (
                        <select
                            value={valToEdit}
                            onChange={(e) => setSpecFormValues(prev => ({ ...prev, [key]: e.target.value }))}
                            className="mt-1 w-full text-xs font-bold bg-background border border-emerald-500 rounded p-1 text-foreground"
                            autoFocus
                        >
                            {options.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    ) : (
                        <input
                            type={type}
                            value={valToEdit}
                            onChange={(e) => setSpecFormValues(prev => ({ ...prev, [key]: e.target.value }))}
                            placeholder={`Enter ${label}...`}
                            className="mt-1 w-full text-xs font-bold bg-background border border-emerald-500 rounded p-1 text-foreground"
                            autoFocus
                        />
                    )
                ) : (
                    <p className="font-bold text-foreground mt-0.5 truncate" title={displayValue || currentValue || 'N/A'}>
                        {displayValue || currentValue || 'N/A'}
                    </p>
                )}
            </div>
        );
    };

    const renderBadgeItem = (key: string, label: string, currentVal: string) => {
        const isEditing = activeEditingSpec === key;
        const valToEdit = specFormValues[key] !== undefined ? specFormValues[key] : (currentVal || 'No');
        const isYes = (currentVal || '').toLowerCase() === 'yes';

        if (isEditing) {
            return (
                <div key={key} className="p-2 rounded-xl border border-emerald-500/50 bg-background space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-foreground truncate pr-1" title={label}>{label}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                                type="button"
                                onClick={() => handleSaveSpec(key, valToEdit, label)}
                                className="text-emerald-500 text-[10px] font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                                <Save className="w-2.5 h-2.5" /> Save
                            </button>
                            <button
                                type="button"
                                onClick={cancelEditSpec}
                                className="text-muted-foreground hover:text-foreground text-[10px] font-bold cursor-pointer"
                            >
                                <X className="w-2.5 h-2.5" />
                            </button>
                        </div>
                    </div>
                    <select
                        value={valToEdit}
                        onChange={(e) => setSpecFormValues(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-full text-xs font-bold bg-background border border-emerald-500 rounded p-0.5 text-foreground"
                        autoFocus
                    >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select>
                </div>
            );
        }

        return (
            <div key={key} className={`p-2 rounded-xl border flex items-center justify-between font-bold ${isYes ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-muted/20 border-border/60 text-muted-foreground'}`}>
                <span className="text-[11px] truncate pr-1" title={label}>{label}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded-md uppercase font-black bg-card border border-border/60">{currentVal || 'No'}</span>
                    <button
                        type="button"
                        onClick={() => startEditSpec(key, currentVal || 'No')}
                        className="text-emerald-500 text-[10px] font-bold hover:underline cursor-pointer"
                    >
                        Edit
                    </button>
                </div>
            </div>
        );
    };

    const parseDeliveryDateToYYYYMMDD = (dateStr: string | null | undefined): string => {
        if (!dateStr || dateStr === 'N/A') return '';
        const str = String(dateStr).trim();
        // If it contains time or UTC marker (e.g. 2026-10-09T18:30:00.000000Z), parse with Date to convert to local date
        if (str.includes('T') || str.includes('Z')) {
            const d = new Date(str);
            if (!isNaN(d.getTime())) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
        }
        const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) return `${match[1]}-${match[2]}-${match[3]}`;
        const d = new Date(str);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatDeliveryDateDisplay = (dateStr?: string | null) => {
        if (!dateStr || dateStr === 'N/A') return 'N/A';
        try {
            const str = String(dateStr).trim();
            let d: Date;
            if (str.includes('T') || str.includes('Z')) {
                d = new Date(str);
            } else {
                const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (match) {
                    const year = parseInt(match[1], 10);
                    const month = parseInt(match[2], 10) - 1;
                    const day = parseInt(match[3], 10);
                    d = new Date(year, month, day);
                } else {
                    d = new Date(str);
                }
            }
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch {
            return dateStr || 'N/A';
        }
    };

    const getMetaValue = (key: string, fallback = "N/A") => {
        if (!order || !order.metas) return fallback;
        const found = order.metas.find(m => m.meta_key.toLowerCase() === key.toLowerCase());
        return found ? found.meta_value : fallback;
    };

    const isPastDeliveryDate = (dateString?: string | null, status?: string | null) => {
        if (!dateString || dateString === 'N/A') return false;
        if (status) {
            const s = status.toString().toLowerCase().trim();
            if (['completed', 'shipped', 'delivered', 'cancelled', 'canceled'].includes(s)) {
                return false;
            }
        }
        try {
            const str = String(dateString).trim();
            let d: Date;
            if (str.includes('T') || str.includes('Z')) {
                d = new Date(str);
            } else {
                const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (match) {
                    d = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
                } else {
                    d = new Date(str);
                }
            }
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
    const productTypeVal = getMetaValue('product_type', 'pcb').toLowerCase();
    const isPartProduct = productTypeVal === 'part';
    const gerberFileRel = (order as any)?.gerber_file || (order as any)?.gerberFile;
    const rawGerberUrl = getMetaValue('gerber_file_url', getMetaValue('gerber_url', getMetaValue('gerber_path', '')));
    const gerberUrl = (gerberFileRel?.file_url) || (rawGerberUrl && rawGerberUrl !== 'N/A' && !rawGerberUrl.includes('null') ? rawGerberUrl : '');
    const rawGerberName = (gerberFileRel?.original_name || gerberFileRel?.file_name) || getMetaValue('gerber_file_name', getMetaValue('gerber_name', ''));
    // Only show Gerber file section if an actual file physically exists (valid URL or verified file)
    const hasActualGerber = !isPartProduct && Boolean(
        (order as any)?.has_actual_gerber ?? (
            (order?.gerber_file_id || gerberFileRel) &&
            gerberUrl &&
            gerberUrl !== 'N/A' &&
            gerberUrl.trim() !== '' &&
            !gerberUrl.includes('null')
        )
    );
    const gerberFileName = rawGerberName || (gerberUrl ? gerberUrl.split('/').pop() : '');
    const boardNameVal = order.board_name || getMetaValue('board_name', '');
    const fallbackPnNumber = order.pn_number 
        || rawGerberName 
        || (gerberUrl ? gerberUrl.split('/').pop() : '') 
        || boardNameVal 
        || getMetaValue('p_n', getMetaValue('part_number', ''));
    const effectivePn = order.pn_number || fallbackPnNumber;
    const layerCount = getMetaValue('layers', getMetaValue('layer', '2'));

    // Color code mapping for PCB Color property - matches getPcbColorCode used across orders list and dashboard
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
    const pcbColorVal = getMetaValue('pcb_color', getMetaValue('solder_mask', getMetaValue('coverlay_color', getMetaValue('color', 'Green'))));
    const orderNumColor = getPcbColorCode(pcbColorVal);

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

    const orderNumUpper = (order?.order_number || "").toUpperCase().trim();
    const isJlcpcbOrder = orderNumUpper.startsWith("JL") || (
        !orderNumUpper.startsWith("J") && (
            (order as any)?.order_type === 'jlcpcb' ||
            (order as any)?.quotation_source === 'jlcpcb' ||
            getMetaValue('quotation_source') === 'jlcpcb'
        )
    );

    const pageHeaderTitle = (
        <div className="flex flex-wrap items-center gap-2.5 md:gap-3">
            {editingOrderNumber ? (
                <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                        <input
                            type="text"
                            value={orderNumberState}
                            onChange={(e) => {
                                setOrderNumberState(e.target.value);
                                if (orderNumberError) setOrderNumberError("");
                            }}
                            className={`px-2.5 py-1 text-sm font-black border rounded-lg bg-background text-foreground ${orderNumberError ? "border-rose-500 ring-1 ring-rose-500" : "border-emerald-500"}`}
                            placeholder="Order Number..."
                            autoFocus
                        />
                        {orderNumberError && (
                            <span className="text-[11px] text-rose-500 font-semibold mt-0.5">{orderNumberError}</span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={handleSaveOrderNumber}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                        Save
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setEditingOrderNumber(false);
                            setOrderNumberState(order.order_number || "");
                            setOrderNumberError("");
                        }}
                        className="px-2.5 py-1 bg-muted hover:bg-accent text-foreground font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <h1 className="text-lg md:text-xl font-black leading-tight" style={{ color: isPartProduct ? "#2563eb" : orderNumColor }}>
                        Order #{order.order_number}
                    </h1>
                    <button
                        type="button"
                        onClick={() => {
                            setEditingOrderNumber(true);
                            setOrderNumberState(order.order_number || "");
                            setOrderNumberError("");
                        }}
                        className="text-xs font-semibold hover:underline flex items-center gap-1 cursor-pointer opacity-85 hover:opacity-100 transition-opacity"
                        style={{ color: isPartProduct ? "#2563eb" : orderNumColor }}
                    >
                        [Edit]
                    </button>
                </div>
            )}

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
            {isJlcpcbOrder && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-100 text-purple-700 border border-purple-200 uppercase tracking-wider">
                    JLCPCB Order
                </span>
            )}
            {((order.combo && String(order.combo).trim() !== "") || (Array.isArray(order.combo_orders) && order.combo_orders.length > 0)) && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200/80 inline-flex items-center gap-1">
                    <Layers className="w-3 h-3 text-indigo-500" />
                    Combo: {Array.isArray(order.combo_orders) && order.combo_orders.length > 0
                        ? order.combo_orders.map(c => c.order_number).join(', ')
                        : order.combo}
                </span>
            )}
            {((order.old_order_number && String(order.old_order_number).trim() !== "") || (Array.isArray(order.old_orders) && order.old_orders.length > 0)) && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200/80 inline-flex items-center gap-1">
                    <History className="w-3 h-3 text-amber-600" />
                    Old Order Number: {Array.isArray(order.old_orders) && order.old_orders.length > 0
                        ? order.old_orders.map(c => c.order_number).join(', ')
                        : order.old_order_number}
                </span>
            )}
        </div>
    );

    const backActionButton = (
        <div className="flex items-center gap-2">
            <button
                onClick={() => router.push('/orders')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-card border border-border/80 rounded-xl hover:bg-muted text-foreground font-bold text-xs transition-all cursor-pointer shadow-xs"
            >
                <ArrowLeft className="w-4 h-4" /> Back to Orders List
            </button>
            {hasDeleteOrderPermission && (
                <button
                    onClick={() => setDeleteModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs"
                >
                    <Trash2 className="w-4 h-4" /> Delete Order
                </button>
            )}
        </div>
    );

    return (
        <DashboardLayout title={pageHeaderTitle as any} action={backActionButton}>
            <div className="space-y-6 w-full">
                {/* Primary Highlights Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
                    <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-sm relative group">
                        <div className="flex justify-between items-center">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">P/N Number</p>
                            {!editingPnNumber ? (
                                <button
                                    onClick={() => {
                                        setPnNumberState(effectivePn || '');
                                        setEditingPnNumber(true);
                                    }}
                                    className="text-emerald-500 text-xs font-bold hover:underline cursor-pointer"
                                >
                                    Edit
                                </button>
                            ) : (
                                <div className="flex items-center gap-1.5">
                                    <button onClick={handleSavePnNumber} className="text-emerald-500 text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer">
                                        <Save className="w-3 h-3" /> Save
                                    </button>
                                    <button onClick={() => setEditingPnNumber(false)} className="text-muted-foreground hover:text-foreground text-xs font-bold cursor-pointer">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                        {!editingPnNumber ? (
                            <p className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 truncate" title={effectivePn || 'N/A'}>
                                {effectivePn || <span className="text-muted-foreground font-normal text-sm">N/A</span>}
                            </p>
                        ) : (
                            <input
                                type="text"
                                value={pnNumberState}
                                onChange={(e) => setPnNumberState(e.target.value)}
                                placeholder="Enter P/N..."
                                className="mt-1 w-full text-xs font-mono font-bold bg-background border border-emerald-500 rounded-lg p-1 text-foreground"
                                autoFocus
                            />
                        )}
                    </div>
                    <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-sm relative group">
                        <div className="flex justify-between items-center">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Order Value</p>
                            {hasPaymentPermission && (
                                !editingOrderValue ? (
                                    <button
                                        onClick={() => {
                                            setOrderValueState(String(order.order_value ?? ''));
                                            setEditingOrderValue(true);
                                        }}
                                        className="text-emerald-500 text-xs font-bold hover:underline cursor-pointer"
                                    >
                                        Edit
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-1.5">
                                        <button onClick={handleSaveOrderValue} className="text-emerald-500 text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer">
                                            <Save className="w-3 h-3" /> Save
                                        </button>
                                        <button onClick={() => setEditingOrderValue(false)} className="text-muted-foreground hover:text-foreground text-xs font-bold cursor-pointer">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )
                            )}
                        </div>
                        {!editingOrderValue ? (
                            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                                {hasPaymentPermission
                                    ? `₹${Number(order.order_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                                    : "XXXX"}
                            </p>
                        ) : (
                            <input
                                type="number"
                                step="0.01"
                                value={orderValueState}
                                onChange={(e) => setOrderValueState(e.target.value)}
                                placeholder="Enter Order Value..."
                                className="mt-1 w-full text-sm font-bold bg-background border border-emerald-500 rounded-lg p-1 text-foreground"
                                autoFocus
                            />
                        )}
                    </div>
                    <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-sm relative group">
                        <div className="flex justify-between items-center">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bill Number</p>
                            {!editingTopBillNumber ? (
                                <button
                                    onClick={() => {
                                        setTopBillNumberState(String(order.bill_number || getMetaValue('bill_number', getMetaValue('bill', ''))));
                                        setEditingTopBillNumber(true);
                                    }}
                                    className="text-emerald-500 text-xs font-bold hover:underline cursor-pointer"
                                >
                                    Edit
                                </button>
                            ) : (
                                <div className="flex items-center gap-1.5">
                                    <button onClick={handleSaveTopBillNumber} className="text-emerald-500 text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer">
                                        <Save className="w-3 h-3" /> Save
                                    </button>
                                    <button onClick={() => setEditingTopBillNumber(false)} className="text-muted-foreground hover:text-foreground text-xs font-bold cursor-pointer">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                        {!editingTopBillNumber ? (
                            <p className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                                {order.bill_number || getMetaValue('bill_number', getMetaValue('bill', 'N/A'))}
                            </p>
                        ) : (
                            <input
                                type="text"
                                value={topBillNumberState}
                                onChange={(e) => setTopBillNumberState(e.target.value)}
                                placeholder="Enter Bill Number..."
                                className="mt-1 w-full text-xs font-mono font-bold bg-background border border-emerald-500 rounded-lg p-1 text-foreground"
                                autoFocus
                            />
                        )}
                    </div>
                    <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-sm relative group">
                        <div className="flex justify-between items-center">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Unit Price</p>
                            {hasPaymentPermission && (
                                !editingUnitPrice ? (
                                    <button
                                        onClick={() => {
                                            setUnitPriceState(String(order.unit_price ?? ''));
                                            setEditingUnitPrice(true);
                                        }}
                                        className="text-emerald-500 text-xs font-bold hover:underline cursor-pointer"
                                    >
                                        Edit
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-1.5">
                                        <button onClick={handleSaveUnitPrice} className="text-emerald-500 text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer">
                                            <Save className="w-3 h-3" /> Save
                                        </button>
                                        <button onClick={() => setEditingUnitPrice(false)} className="text-muted-foreground hover:text-foreground text-xs font-bold cursor-pointer">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )
                            )}
                        </div>
                        {!editingUnitPrice ? (
                            <p className="text-xl font-bold text-foreground mt-1">
                                {hasPaymentPermission
                                    ? `₹${Number(order.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                                    : "XXXX"}
                            </p>
                        ) : (
                            <input
                                type="number"
                                step="0.01"
                                value={unitPriceState}
                                onChange={(e) => setUnitPriceState(e.target.value)}
                                placeholder="Enter Unit Price..."
                                className="mt-1 w-full text-sm font-bold bg-background border border-emerald-500 rounded-lg p-1 text-foreground"
                                autoFocus
                            />
                        )}
                    </div>

                    {/* Quantity Fulfillment Breakdown Card */}
                    {(() => {
                        const orderQtyVal = extractQty(order, 'order_qty', ['order_qty', 'qty', 'quantity', 'pcs'], 0);
                        const finalQtyVal = extractQty(order, 'final_qty', ['final_qty', 'final', 'completed_qty', 'completed'], 0);
                        return (
                            <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-sm space-y-1 relative group">
                                <div className="flex justify-between items-center">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Quantity Breakdown</p>
                                    {!editingTopQty ? (
                                        <button
                                            onClick={() => {
                                                setTopOrderQty(orderQtyVal);
                                                setTopFinalQty(finalQtyVal);
                                                setEditingTopQty(true);
                                            }}
                                            className="text-emerald-500 text-xs font-bold hover:underline cursor-pointer"
                                        >
                                            Edit
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-1.5">
                                            <button onClick={handleSaveTopQty} className="text-emerald-500 text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer">
                                                <Save className="w-3 h-3" /> Save
                                            </button>
                                            <button onClick={() => setEditingTopQty(false)} className="text-muted-foreground hover:text-foreground text-xs font-bold cursor-pointer">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {!editingTopQty ? (
                                    <>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400" title="Order Qty">
                                                Order Qty: {orderQtyVal}
                                            </span>
                                            <span className="text-muted-foreground">/</span>
                                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400" title="Final Qty">
                                                Final Qty: {finalQtyVal}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground font-medium pt-0.5">Total: {orderQtyVal} Pcs</p>
                                    </>
                                ) : (
                                    <div className="space-y-1 pt-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1/2">
                                                <label className="text-[9px] text-muted-foreground font-bold uppercase block">Order Qty</label>
                                                <input
                                                    type="number"
                                                    value={topOrderQty}
                                                    onChange={(e) => setTopOrderQty(Number(e.target.value))}
                                                    className="w-full text-xs font-bold bg-background border border-emerald-500 rounded p-1 text-foreground"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="w-1/2">
                                                <label className="text-[9px] text-muted-foreground font-bold uppercase block">Final Qty</label>
                                                <input
                                                    type="number"
                                                    value={topFinalQty}
                                                    onChange={(e) => setTopFinalQty(Number(e.target.value))}
                                                    className="w-full text-xs font-bold bg-background border border-indigo-500 rounded p-1 text-foreground"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
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
                                        setDeliveryDate(parseDeliveryDateToYYYYMMDD(currentDate));
                                        setEditingDeliveryDate(true);
                                    }}
                                    className="text-emerald-500 text-xs font-bold hover:underline cursor-pointer"
                                >
                                    Edit
                                </button>
                            ) : (
                                <div className="flex items-center gap-1.5">
                                    <button onClick={handleSaveDeliveryDate} className="text-emerald-500 text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer">
                                        <Save className="w-3 h-3" /> Save
                                    </button>
                                    <button onClick={() => setEditingDeliveryDate(false)} className="text-muted-foreground hover:text-foreground text-xs font-bold cursor-pointer">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                        {!editingDeliveryDate ? (
                            <p className={`text-base font-bold font-mono mt-1 ${isPastDeliveryDate(order.delivery_date, order.status) ? "text-red-600 dark:text-red-400 font-extrabold" : "text-foreground"}`}>
                                {formatDeliveryDateDisplay(order.delivery_date)}
                            </p>
                        ) : (
                            <input
                                type="date"
                                value={deliveryDate}
                                onChange={(e) => setDeliveryDate(e.target.value)}
                                className="mt-1 w-full text-xs font-bold bg-background border border-emerald-500 rounded-lg p-1 text-foreground"
                                autoFocus
                            />
                        )}
                    </div>
                    <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-sm relative group">
                        <div className="flex justify-between items-center">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Submitted On</p>
                            {!editingSubmittedOn ? (
                                <button
                                    onClick={() => {
                                        setSubmittedOnState(parseDeliveryDateToYYYYMMDD(order.created_at));
                                        setEditingSubmittedOn(true);
                                    }}
                                    className="text-emerald-500 text-xs font-bold hover:underline cursor-pointer"
                                >
                                    Edit
                                </button>
                            ) : (
                                <div className="flex items-center gap-1.5">
                                    <button onClick={handleSaveSubmittedOn} className="text-emerald-500 text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer">
                                        <Save className="w-3 h-3" /> Save
                                    </button>
                                    <button onClick={() => setEditingSubmittedOn(false)} className="text-muted-foreground hover:text-foreground text-xs font-bold cursor-pointer">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                        {!editingSubmittedOn ? (
                            <p className="text-xs font-bold text-foreground mt-1 font-mono">{new Date(order.created_at).toLocaleDateString()}</p>
                        ) : (
                            <input
                                type="date"
                                value={submittedOnState}
                                onChange={(e) => setSubmittedOnState(e.target.value)}
                                className="mt-1 w-full text-xs font-bold bg-background border border-emerald-500 rounded-lg p-1 text-foreground"
                                autoFocus
                            />
                        )}
                    </div>
                </div>

                {/* Gerber File Download / Preview Card (Only shown if an actual Gerber file exists, completely hidden otherwise) */}
                {hasActualGerber && (
                    <div className="bg-gradient-to-r from-emerald-500/10 via-card to-card border border-emerald-500/30 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-2xl bg-[#0c3b19] flex items-center justify-center p-1 overflow-hidden shrink-0 border border-emerald-500/30 shadow-md">
                                <GerberBoardPreview
                                    previewData={order.gerber_preview_data || getMetaValue('preview_data', '') || getMetaValue('front_preview_url', '') || (order.gerber_file_id ? `/api/gerber/${order.gerber_file_id}/preview/front` : '')}
                                    gerberFileId={order.gerber_file_id || undefined}
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
                                <div className="flex justify-between py-1 items-center">
                                    <span className="text-muted-foreground font-medium">Customer Name</span>
                                    <span className="font-bold text-foreground">
                                        {(() => {
                                            const custName = order.shipping_first_name || order.billing_first_name
                                                ? `${order.shipping_first_name || order.billing_first_name || ''} ${order.shipping_last_name || order.billing_last_name || ''}`
                                                : (order.customer_name || order.user?.company_name || order.user?.name || getMetaValue('customer_name', getMetaValue('name', 'N/A')));
                                            const customerId = order.user_id || order.user?.id;
                                            if (customerId) {
                                                return (
                                                    <Link
                                                        href={`/clients/${customerId}`}
                                                        className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-bold"
                                                    >
                                                        {custName}
                                                        <ExternalLink className="w-3 h-3 inline" />
                                                    </Link>
                                                );
                                            }
                                            return custName;
                                        })()}
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
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-muted-foreground font-medium">C/G</span>
                                    {!editingOrderCg ? (
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-foreground">
                                                {order.c_g ? (
                                                    <span className={`px-2 py-0.5 rounded-md text-xs font-black border ${order.c_g === 'GST'
                                                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                                            : order.c_g === 'CASH'
                                                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                                                : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                                                        }`}>
                                                        {order.c_g}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground/60 italic text-xs">N/A</span>
                                                )}
                                            </span>
                                            <button
                                                onClick={() => {
                                                    setInlineCgState(order.c_g ? String(order.c_g).toUpperCase() : "");
                                                    setEditingOrderCg(true);
                                                }}
                                                className="text-emerald-500 text-xs font-bold hover:underline cursor-pointer"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5">
                                            <select
                                                value={inlineCgState}
                                                onChange={(e) => setInlineCgState(e.target.value)}
                                                className="text-xs font-bold bg-background border border-emerald-500 rounded-lg p-1 text-foreground"
                                                autoFocus
                                            >
                                                <option value="">Select C/G</option>
                                                <option value="CASH">CASH</option>
                                                <option value="GST">GST</option>
                                                <option value="BOTH">BOTH</option>
                                            </select>
                                            <button onClick={handleSaveInlineCg} className="text-emerald-500 text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer">
                                                <Save className="w-3 h-3" /> Save
                                            </button>
                                            <button onClick={() => setEditingOrderCg(false)} className="text-muted-foreground hover:text-foreground text-xs font-bold cursor-pointer">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
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
                                {renderSpecItem('pn_number', 'P/N Number', effectivePn || 'N/A', 'text')}
                                {renderSpecItem('base_material', 'Base Material', getMetaValue('base_material', getMetaValue('material', 'FR-4')), 'select', ['FR-4', 'Aluminum', 'Rogers', 'FR-4 TG150', 'FR-4 TG170', 'Copper Base', 'PTFE', 'Polyimide', 'Flex/Rigid-Flex'])}
                                {renderSpecItem('substrate_type', 'Substrate Type', getMetaValue('substrate_type', 'N/A'), 'select', ['Rigid', 'Flexible', 'Rigid-Flex', 'Aluminum', 'Rogers', 'Copper Base', 'N/A'])}
                                {renderSpecItem('layers', 'Layer Count', getMetaValue('layers', order.layers ? `${order.layers} Layers` : '2 Layers'), 'select', ['1 Layers', '2 Layers', '4 Layers', '6 Layers', '8 Layers', '10 Layers', '12 Layers', '14 Layers', '16 Layers'])}
                                {renderSpecItem('dimensions', 'Dimensions', getMetaValue('dimensions', (getMetaValue('dimensions_width') && getMetaValue('dimensions_length')) ? `${getMetaValue('dimensions_width')} x ${getMetaValue('dimensions_length')} ${getMetaValue('dimension_unit', 'mm')}` : '100x100mm'), 'text')}
                                {renderSpecItem('order_qty', 'PCB Quantity', String(order.order_qty || getMetaValue('quantity', getMetaValue('qty', '5'))), 'number', undefined, `${order.order_qty || getMetaValue('quantity', getMetaValue('qty', '5'))} Pcs`)}
                                {renderSpecItem('different_design', 'Different Design Count', getMetaValue('different_design', '1'), 'select', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'])}
                                {renderSpecItem('delivery_format', 'Delivery Format', getMetaValue('delivery_format', 'Single PCB'), 'select', ['Single PCB', 'Panel by Customer', 'Panel by Megabyte'])}
                                {renderSpecItem('panel_format', 'Panel Layout', getMetaValue('panel_format', 'N/A'), 'text')}
                            </div>
                        </div>

                        {/* PCB Specifications Group */}
                        <div className="space-y-2 pt-2 border-t border-border/40">
                            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                2. PCB Specifications
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                                {renderSpecItem('thickness', 'PCB Thickness', getMetaValue('thickness', '1.6mm'), 'select', ['0.4mm', '0.6mm', '0.8mm', '1.0mm', '1.2mm', '1.6mm', '2.0mm', '2.4mm', '2.6mm', '3.0mm'])}
                                {renderSpecItem('pcb_color', 'Solder Mask / Coverlay Color', getMetaValue('pcb_color', getMetaValue('coverlay_color', 'Green')), 'select', ['Green', 'Red', 'Yellow', 'Blue', 'White', 'Black', 'Matte Green', 'Matte Black', 'Purple', 'None'])}
                                {renderSpecItem('silkscreen', 'Silkscreen Color', getMetaValue('silkscreen', 'White'), 'select', ['White', 'Black', 'None'])}
                                {renderSpecItem('material_type', 'Material Type', getMetaValue('material_type', 'FR4-TG135'), 'select', ['FR4-TG135', 'FR4-TG150', 'FR4-TG170', 'Standard TG', 'High TG', 'Aluminum TG', 'Rogers 4350B'])}
                                {renderSpecItem('surface_finish', 'Surface Finish', getMetaValue('surface_finish', 'HASL(Leaded)'), 'select', ['HASL(Leaded)', 'Lead Free HASL', 'ENIG', 'OSP', 'Immersion Tin', 'Immersion Silver', 'Hard Gold', 'ENEPIG'])}
                                {renderSpecItem('gold_thickness', 'Gold Thickness', getMetaValue('gold_thickness', 'N/A'), 'select', ['1 U"', '2 U"', '3 U"', 'N/A'])}
                            </div>
                        </div>

                        {/* High-Spec Options Group */}
                        <div className="space-y-2 pt-2 border-t border-border/40">
                            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                3. High-Spec Options
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                                {renderSpecItem('copper_weight', 'Outer Copper Weight', getMetaValue('copper_weight', '1 oz'), 'select', ['1 oz', '2 oz', '3 oz', '4 oz'])}
                                {renderSpecItem('via_covering', 'Via Covering', getMetaValue('via_covering', 'N/A'), 'select', ['Tented', 'Untented (Through Holes)', 'Plugged', 'Epoxy Filled & Capped', 'N/A'])}
                                {renderSpecItem('via_plating', 'Via Plating Method', getMetaValue('via_plating', 'N/A'), 'select', ['Standard Plating', 'Button Plating', 'Through-Hole Plating', 'N/A'])}
                                {renderSpecItem('min_hole', 'Min Via Hole Size', getMetaValue('min_hole', 'N/A'), 'select', ['0.2mm', '0.25mm', '0.3mm', '0.35mm', '0.4mm', '0.5mm', 'N/A'])}
                                {renderSpecItem('confirm_file', 'Confirm Production File', getMetaValue('confirm_file', 'No'), 'select', ['Yes', 'No'])}
                                {renderSpecItem('mark_on_pcb', 'Mark on PCB', getMetaValue('mark_on_pcb', 'Remove Mark'), 'select', ['Remove Mark', 'Specify Location', 'Any Location', 'No Mark'])}
                                {renderSpecItem('elec_test', 'Electrical Test', getMetaValue('elec_test', 'Flying Probe Fully Test'), 'select', ['Flying Probe Fully Test', 'Random Test', 'None'])}
                                {renderSpecItem('coverlay_thickness', 'Coverlay Thickness', getMetaValue('coverlay_thickness', 'N/A'), 'select', ['0.5 mil', '1.0 mil', 'N/A'])}
                                {renderSpecItem('stiffener', 'Stiffener', getMetaValue('stiffener', 'N/A'), 'select', ['FR4', 'PI/Polyimide', 'Stainless Steel', 'None', 'N/A'])}
                                {renderSpecItem('emi_shielding', 'EMI Shielding Film', getMetaValue('emi_shielding', 'N/A'), 'select', ['Yes', 'No', 'Single-sided', 'Double-sided', 'N/A'])}
                            </div>
                        </div>

                        {/* Advanced Options Group */}
                        <div className="space-y-2 pt-2 border-t border-border/40">
                            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                4. Advanced Options & Badges
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                                {[
                                    { label: "Gold Fingers", key: 'gold_fingers', val: getMetaValue('gold_fingers', 'No') },
                                    { label: "Castellated Holes", key: 'castellated', val: getMetaValue('castellated', 'No') },
                                    { label: "Edge Plating", key: 'edge_plating', val: getMetaValue('edge_plating', 'No') },
                                    { label: "Blind Slots", key: 'blind_slots', val: getMetaValue('blind_slots', 'No') },
                                    { label: "UL Marking", key: 'ul_marking', val: getMetaValue('ul_marking', 'No') },
                                    { label: "Humidity Card", key: 'humidity', val: getMetaValue('humidity', 'No') },
                                    { label: "Kelvin Test", key: 'kelvin_test', val: getMetaValue('kelvin_test', 'No') },
                                    { label: "Paper Between PCBs", key: 'paper_between', val: getMetaValue('paper_between', 'No') }
                                ].map((badge) => renderBadgeItem(badge.key, badge.label, badge.val))}
                            </div>
                        </div>

                        {/* Custom Information & Remarks */}
                        <div className="space-y-1.5 pt-2 border-t border-border/40">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                    5. Customer PCB Remark / Instructions
                                </h4>
                                {activeEditingSpec === 'pcb_remark' ? (
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => handleSaveSpec('pcb_remark', specFormValues['pcb_remark'] ?? getMetaValue('pcb_remark', ''), 'PCB Remark')}
                                            className="text-emerald-500 text-[11px] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                            <Save className="w-3 h-3" /> Save
                                        </button>
                                        <button
                                            type="button"
                                            onClick={cancelEditSpec}
                                            className="text-muted-foreground hover:text-foreground text-[11px] font-bold cursor-pointer"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => startEditSpec('pcb_remark', getMetaValue('pcb_remark', ''))}
                                        className="text-emerald-500 text-[11px] font-bold hover:underline cursor-pointer"
                                    >
                                        Edit
                                    </button>
                                )}
                            </div>
                            {activeEditingSpec === 'pcb_remark' ? (
                                <textarea
                                    value={specFormValues['pcb_remark'] ?? getMetaValue('pcb_remark', '')}
                                    onChange={(e) => setSpecFormValues(prev => ({ ...prev, pcb_remark: e.target.value }))}
                                    rows={3}
                                    placeholder="Enter PCB Remark / Instructions..."
                                    className="w-full text-xs font-semibold bg-background border border-emerald-500 rounded-xl p-2.5 text-foreground focus:outline-none"
                                    autoFocus
                                />
                            ) : (
                                <div className="p-3 bg-muted/30 rounded-xl border border-border/60 text-xs font-semibold text-foreground italic leading-relaxed">
                                    {getMetaValue('pcb_remark', '') && getMetaValue('pcb_remark') !== 'N/A' ? `"${getMetaValue('pcb_remark')}"` : <span className="text-muted-foreground not-italic">No custom PCB remarks recorded.</span>}
                                </div>
                            )}
                        </div>
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
                                <label className="text-xs font-bold text-muted-foreground block mb-1.5 flex items-center justify-between">
                                    <span>Order Number</span>
                                    <span className="text-rose-500 font-bold">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={orderNumberState}
                                    onChange={(e) => {
                                        setOrderNumberState(e.target.value);
                                        if (orderNumberError) setOrderNumberError("");
                                    }}
                                    placeholder="Order Number (e.g. M5000-1)..."
                                    className={`w-full px-3.5 py-2.5 text-xs bg-background border rounded-xl text-foreground font-bold focus:outline-none focus:ring-1 ${orderNumberError ? "border-rose-500 focus:ring-rose-500 ring-1 ring-rose-500" : "border-border/80 focus:ring-emerald-500"}`}
                                />
                                {orderNumberError && (
                                    <p className="text-[11px] font-semibold text-rose-500 mt-1">{orderNumberError}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1.5">P/N Number</label>
                                <input
                                    type="text"
                                    value={pnNumberState}
                                    onChange={(e) => setPnNumberState(e.target.value)}
                                    placeholder="P/N Number..."
                                    className="w-full px-3.5 py-2.5 text-xs bg-background border border-border/80 rounded-xl text-foreground font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>

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
                                <label className="text-xs font-bold text-muted-foreground block mb-1.5">C/G</label>
                                <select
                                    value={cgState}
                                    onChange={(e) => setCgState(e.target.value)}
                                    className="w-full px-3.5 py-2.5 text-xs font-bold bg-background border border-border/80 rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                                >
                                    <option value="">Select C/G</option>
                                    <option value="CASH">CASH</option>
                                    <option value="GST">GST</option>
                                    <option value="BOTH">BOTH</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1.5">Combo Orders</label>
                                <ComboSelect
                                    currentOrderId={order?.id}
                                    currentOrderNumber={order?.order_number}
                                    value={comboOrdersState}
                                    onChange={setComboOrdersState}
                                    placeholder="Select combo orders..."
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1.5">Old Order Number</label>
                                <OldOrderSelect
                                    currentOrderId={order?.id}
                                    currentOrderNumber={order?.order_number}
                                    value={oldOrdersState}
                                    onChange={setOldOrdersState}
                                    placeholder="Select old order numbers..."
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1.5 flex items-center gap-1">
                                    <span>Bill Number</span>
                                    {['completed', 'delivered', 'order completed', 'production completed'].includes((newStatus || '').toLowerCase().trim()) && (
                                        <span className="text-rose-500 font-bold">*</span>
                                    )}
                                </label>
                                <input
                                    type="text"
                                    value={billNumber}
                                    onChange={(e) => {
                                        setBillNumber(e.target.value);
                                        if (billNumberError) setBillNumberError("");
                                    }}
                                    placeholder="Bill No..."
                                    className={`w-full px-3.5 py-2.5 text-xs bg-background border rounded-xl text-foreground font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 ${billNumberError ? "border-rose-500 focus:ring-rose-500 ring-1 ring-rose-500" : "border-border/80"}`}
                                />
                                {billNumberError && (
                                    <p className="text-[11px] font-semibold text-rose-500 mt-1">
                                        {billNumberError}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1.5">Order Qty (Pcs)</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={orderQty}
                                    onChange={(e) => setOrderQty(parseInt(e.target.value) || 0)}
                                    placeholder="Order Qty..."
                                    className="w-full px-3.5 py-2.5 text-xs bg-background border border-border/80 rounded-xl text-foreground font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                                    onChange={(e) => {
                                        const p = parseInt(e.target.value) || 0;
                                        setPanelQty(p);
                                        if (p > 0 && upsQty > 0) {
                                            setLaunchQty(p * upsQty);
                                        }
                                    }}
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
                                    onChange={(e) => {
                                        const u = parseInt(e.target.value) || 0;
                                        setUpsQty(u);
                                        if (panelQty > 0 && u > 0) {
                                            setLaunchQty(panelQty * u);
                                        }
                                    }}
                                    placeholder="Ups..."
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

                {/* Soft Delete Confirmation Modal */}
                <Dialog open={deleteModalOpen} onOpenChange={(open) => !open && setDeleteModalOpen(false)}>
                    {order && (
                        <DialogContent className="max-w-md border rounded-2xl p-6 shadow-2xl space-y-4 bg-card text-card-foreground border-rose-500/30">
                            <DialogHeader className="pb-2 border-b border-border/60">
                                <DialogTitle className="text-lg font-black text-rose-600 dark:text-rose-400 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                                    Delete Order #{order.order_number}?
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-1 font-medium leading-relaxed">
                                    Are you sure you want to delete order <span className="font-bold text-foreground">#{order.order_number}</span>?
                                    <br />
                                    This order will be moved to the deleted state/recycle bin and will not be permanently removed.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex items-center justify-end gap-2.5 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setDeleteModalOpen(false)}
                                    disabled={deletingOrder}
                                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-xl border-border h-auto cursor-pointer"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleDeleteOrder}
                                    disabled={deletingOrder}
                                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50 h-auto"
                                >
                                    <Trash2 className={`w-3.5 h-3.5 ${deletingOrder ? 'animate-spin' : ''}`} />
                                    {deletingOrder ? "Deleting..." : "Delete Order"}
                                </Button>
                            </div>
                        </DialogContent>
                    )}
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
