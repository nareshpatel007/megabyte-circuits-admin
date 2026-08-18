"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import {
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    Building,
    CreditCard,
    ShoppingBag,
    CheckCircle2,
    Clock,
    ExternalLink,
    ShieldAlert,
    RefreshCw,
    Receipt,
    DollarSign,
    Pencil,
    Trash2,
    AlertTriangle
} from "lucide-react";
import { ClientDetailSkeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const POSSIBLE_STATUSES = ["Active", "Inactive", "Pending", "Suspended", "On Hold"];

interface ClientUser {
    id: number | string;
    name?: string;
    first_name?: string;
    last_name?: string;
    email: string;
    phone?: string;
    phone_number?: string;
    mobile?: string;
    company?: string;
    company_name?: string;
    gstin?: string;
    gst_number?: string;
    tax_id?: string;
    status?: string;
    created_at?: string;
    address?: string;
}

interface ClientOrder {
    id: number | string;
    order_number: string;
    status?: string;
    status_name?: string;
    order_value?: number;
    gerber_file_name?: string;
    gerber_file_sys_name?: string;
    created_at?: string;
}

interface PaymentTransaction {
    id?: number | string;
    transaction_number?: string;
    razorpay_payment_id?: string;
    razorpay_order_id?: string;
    payment_id?: string;
    transaction_id?: string;
    order_number?: string;
    pcb_order_id?: number | string;
    amount?: number;
    payment_method?: string;
    payment_status?: string;
    status?: string;
    created_at?: string;
    date?: string;
}

interface AddressItem {
    id?: number | string;
    title?: string;
    address_type?: string;
    recipient_name?: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    phone?: string;
    mobile?: string;
    street_address?: string;
    building_no?: string;
    address_line1?: string;
    address_line2?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    postal_code?: string;
    country?: string;
    is_default?: boolean | number;
}

interface ClientStats {
    orders_count: number;
    total_spent: number;
    completed_orders: number;
    pending_orders: number;
    total_transactions: number;
}

const statusBadgeStyles: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    inactive: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

const orderStatusStyles: Record<string, string> = {
    completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    shipped: "bg-green-500/15 text-green-400 border-green-500/30",
    delivered: "bg-teal-500/15 text-teal-400 border-teal-500/30",
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    "in production": "bg-blue-500/15 text-blue-400 border-blue-500/30",
    processing: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    cancelled: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

const paymentStatusStyles: Record<string, string> = {
    paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    failed: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    refunded: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return 'N/A';
        const formatted = d.toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        // Convert AM/PM to lowercase (am/pm) as requested: "05 Aug 2026, 11:41 am"
        return formatted.replace(/\b(AM|PM)\b/gi, (m) => m.toLowerCase());
    } catch {
        return 'N/A';
    }
};

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [client, setClient] = useState<ClientUser | null>(null);
    const [orders, setOrders] = useState<ClientOrder[]>([]);
    const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
    const [addresses, setAddresses] = useState<AddressItem[]>([]);
    const [stats, setStats] = useState<ClientStats>({
        orders_count: 0,
        total_spent: 0,
        completed_orders: 0,
        pending_orders: 0,
        total_transactions: 0
    });

    const [activeTab, setActiveTab] = useState<"orders" | "transactions" | "addresses">("orders");

    // Modals state
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState("Active");
    const [updatingStatus, setUpdatingStatus] = useState(false);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const fetchClientDetails = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const result = await res.json();

            if (result.status && result.data) {
                const d = result.data;
                setClient(d.user || null);
                if (d.user?.status) {
                    setSelectedStatus(d.user.status);
                }
                setOrders(d.orders || []);
                setTransactions(d.transactions || []);
                setAddresses(d.addresses || []);
                if (d.stats) {
                    setStats(d.stats);
                }
            } else {
                toast.error(result.message || "Failed to load client details");
            }
        } catch (err) {
            console.error("Error fetching client detail:", err);
            toast.error("Error connecting to server");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchClientDetails();
        }
    }, [id]);

    const handleUpdateStatus = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdatingStatus(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/users/${id}/status`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: selectedStatus })
            });
            const data = await res.json();

            if (data.status || data.success) {
                toast.success(data.message || `Client status updated to ${selectedStatus}`);
                setClient(prev => prev ? { ...prev, status: selectedStatus } : prev);
                setShowStatusModal(false);
            } else {
                toast.error(data.message || "Failed to update status");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error updating client status");
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleDeleteClient = async () => {
        setDeleting(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/users/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.status || data.success) {
                toast.success(data.message || "Client account soft deleted successfully");
                router.push("/clients");
            } else {
                toast.error(data.message || "Failed to delete client account");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error soft deleting client account");
        } finally {
            setDeleting(false);
        }
    };

    const backButton = (
        <Link
            href="/clients"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-card border border-border/80 hover:bg-muted text-foreground transition-all shadow-xs"
        >
            <ArrowLeft className="w-4 h-4 text-emerald-500" />
            Back to Clients
        </Link>
    );

    const displayName = client
        ? (`${client.first_name || ''} ${client.last_name || ''}`.trim() || client.name || `Client #${id}`)
        : `Client #${id}`;

    const clientStatus = (client?.status || "active").toLowerCase();

    return (
        <DashboardLayout
            title={loading ? "Loading Client..." : displayName}
            subtitle={client ? (client.email ? `${displayName} · ${client.email}` : displayName) : undefined}
            action={backButton}
        >
            {loading ? (
                <ClientDetailSkeleton />
            ) : !client ? (
                <div className="py-20 text-center bg-card border border-border/80 rounded-2xl p-8 shadow-xs">
                    <ShieldAlert className="w-12 h-12 mx-auto text-rose-500/80 mb-3" />
                    <h3 className="text-lg font-bold text-foreground">Client Not Found</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                        Client with ID <span className="font-mono text-primary font-bold">#{id}</span> could not be found or has been soft deleted.
                    </p>
                    <div className="mt-6">
                        <Link
                            href="/clients"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:opacity-90 transition-all shadow-xs"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Return to Clients List
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="w-full space-y-6 animate-in fade-in duration-300">
                    {/* Profile Overview Header Banner */}
                    <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 font-black text-2xl flex items-center justify-center shrink-0 shadow-inner">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-xl font-extrabold text-foreground tracking-tight">{displayName}</h1>
                                    <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider ${statusBadgeStyles[clientStatus] || statusBadgeStyles.active}`}>
                                        {client?.status || "Active"}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                                    <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-muted-foreground" /> {client.email}</span>
                                    {(client.phone || client.phone_number || client.mobile) && (
                                        <span className="flex items-center gap-1 border-l border-border/80 pl-2">
                                            <Phone className="w-3.5 h-3.5 text-muted-foreground" /> {client.phone || client.phone_number || client.mobile}
                                        </span>
                                    )}
                                    {(client.company_name || client.company) && (
                                        <span className="flex items-center gap-1 border-l border-border/80 pl-2">
                                            <Building className="w-3.5 h-3.5 text-muted-foreground" /> {client.company_name || client.company}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
                            <Link
                                href={`/clients/${id}/edit`}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-400 transition-all cursor-pointer shadow-xs"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                                Edit Details
                            </Link>
                            <button
                                onClick={() => setShowStatusModal(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500 hover:text-black text-amber-400 transition-all cursor-pointer shadow-xs"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Change Status
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 transition-all cursor-pointer shadow-xs"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                            </button>
                        </div>
                    </div>

                    {/* Key Metrics Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                <ShoppingBag className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Orders</p>
                                <h3 className="text-2xl font-black text-foreground mt-0.5">{stats.orders_count}</h3>
                            </div>
                        </div>

                        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Spent</p>
                                <h3 className="text-2xl font-black text-emerald-500 mt-0.5">
                                    ₹{Number(stats.total_spent || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </h3>
                            </div>
                        </div>

                        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Completed Orders</p>
                                <h3 className="text-2xl font-black text-teal-500 mt-0.5">{stats.completed_orders}</h3>
                            </div>
                        </div>

                        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pending Orders</p>
                                <h3 className="text-2xl font-black text-amber-500 mt-0.5">{stats.pending_orders}</h3>
                            </div>
                        </div>
                    </div>

                    {/* Main Details & Tabs Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Left Column: Client Information Card */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-5">
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border/60 pb-3 flex items-center gap-2">
                                    <Building className="w-4 h-4 text-emerald-500" />
                                    Client Information
                                </h3>

                                <div className="space-y-4 text-xs">
                                    <div>
                                        <span className="text-muted-foreground block font-medium uppercase tracking-wider text-[10px]">Email Address</span>
                                        <span className="text-foreground font-semibold text-xs mt-0.5 block select-all">
                                            {client.email}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="text-muted-foreground block font-medium uppercase tracking-wider text-[10px]">Phone Number</span>
                                        <span className="text-foreground font-medium text-xs mt-0.5 block">
                                            {client.phone || client.phone_number || client.mobile || "Not specified"}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="text-muted-foreground block font-medium uppercase tracking-wider text-[10px]">Company Name</span>
                                        <span className="text-foreground font-medium text-xs mt-0.5 block">
                                            {client.company_name || client.company || "Individual Account"}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="text-muted-foreground block font-medium uppercase tracking-wider text-[10px]">GSTIN / Tax ID</span>
                                        <span className="text-foreground font-mono font-semibold text-xs mt-0.5 block bg-muted/40 p-2 rounded-lg border border-border/60">
                                            {client.gstin || client.gst_number || client.tax_id || "N/A"}
                                        </span>
                                    </div>

                                    {(() => {
                                        const primaryAddr = client.address || (addresses.length > 0 ? [addresses[0].building_no, addresses[0].street_address, addresses[0].address_line1, addresses[0].city, addresses[0].state, addresses[0].postal_code || addresses[0].pincode, addresses[0].country].filter(Boolean).join(", ") : "");
                                        if (!primaryAddr) return null;
                                        return (
                                            <div>
                                                <span className="text-muted-foreground block font-medium uppercase tracking-wider text-[10px]">Primary Address</span>
                                                <span className="text-foreground font-medium text-xs mt-0.5 block leading-relaxed">
                                                    {primaryAddr}
                                                </span>
                                            </div>
                                        );
                                    })()}

                                    <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-3 text-[11px]">
                                        <div>
                                            <span className="text-muted-foreground block">Account Status</span>
                                            <span className="font-semibold text-foreground capitalize mt-0.5 block">{client.status || "Active"}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block">Joined Date</span>
                                            <span className="font-semibold text-foreground mt-0.5 block">
                                                {formatDate(client.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Dynamic Tabs (Orders, Transactions, Saved Addresses) */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden">

                                {/* Tab Navigation */}
                                <div className="flex items-center border-b border-border/80 bg-muted/30 px-6 pt-3 gap-6 overflow-x-auto">
                                    <button
                                        onClick={() => setActiveTab("orders")}
                                        className={`pb-3 font-bold text-xs border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${activeTab === "orders"
                                            ? "border-emerald-500 text-emerald-400"
                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                            }`}
                                    >
                                        <ShoppingBag className="w-4 h-4" />
                                        Orders History ({orders.length})
                                    </button>

                                    <button
                                        onClick={() => setActiveTab("transactions")}
                                        className={`pb-3 font-bold text-xs border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${activeTab === "transactions"
                                            ? "border-emerald-500 text-emerald-400"
                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                            }`}
                                    >
                                        <Receipt className="w-4 h-4" />
                                        Payment Transactions ({transactions.length})
                                    </button>

                                    <button
                                        onClick={() => setActiveTab("addresses")}
                                        className={`pb-3 font-bold text-xs border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${activeTab === "addresses"
                                            ? "border-emerald-500 text-emerald-400"
                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                            }`}
                                    >
                                        <MapPin className="w-4 h-4" />
                                        Saved Addresses ({addresses.length})
                                    </button>
                                </div>

                                {/* Tab 1: Orders History Table */}
                                {activeTab === "orders" && (
                                    <div className="p-0">
                                        {orders.length === 0 ? (
                                            <div className="py-12 px-4 text-center text-muted-foreground space-y-2">
                                                <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground/40" />
                                                <p className="text-sm font-semibold">No orders found for this client</p>
                                                <p className="text-xs text-muted-foreground">When the client places orders, they will appear here.</p>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs text-left">
                                                    <thead>
                                                        <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                                                            <th className="py-3 px-5">Order #</th>
                                                            <th className="py-3 px-5">Gerber File</th>
                                                            <th className="py-3 px-5">Status</th>
                                                            <th className="py-3 px-5">Order Value</th>
                                                            <th className="py-3 px-5">Date</th>
                                                            <th className="py-3 px-5 text-right">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border/40">
                                                        {orders.map((ord) => {
                                                            const stLower = (ord.status_name || ord.status || "pending").toLowerCase();
                                                            const gerberName = ord.gerber_file_name || ord.gerber_file_sys_name || "gerber_archive.zip";
                                                            return (
                                                                <tr key={ord.id} className="hover:bg-muted/20 transition-colors">
                                                                    <td className="py-3.5 px-5 font-bold font-mono text-emerald-400">
                                                                        {ord.order_number || `#ORD-${ord.id}`}
                                                                    </td>
                                                                    <td className="py-3.5 px-5 font-medium text-foreground">
                                                                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] bg-muted/40 px-2 py-0.5 rounded border border-border/60 text-muted-foreground" title={gerberName}>
                                                                            {gerberName.length > 22 ? `${gerberName.substring(0, 20)}...` : gerberName}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-3.5 px-5">
                                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${orderStatusStyles[stLower] || orderStatusStyles.pending}`}>
                                                                            {ord.status_name || ord.status || "Pending"}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-3.5 px-5 font-bold text-foreground">
                                                                        ₹{Number(ord.order_value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                                                    </td>
                                                                    <td className="py-3.5 px-5 text-muted-foreground font-mono text-[11px]">
                                                                        {formatDate(ord.created_at)}
                                                                    </td>
                                                                    <td className="py-3.5 px-5 text-right">
                                                                        <Link
                                                                            href={`/orders/${ord.id}`}
                                                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 hover:underline"
                                                                        >
                                                                            View <ExternalLink className="w-3 h-3" />
                                                                        </Link>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Tab 2: Payment Transactions Table */}
                                {activeTab === "transactions" && (
                                    <div className="p-0">
                                        {transactions.length === 0 ? (
                                            <div className="py-12 px-4 text-center text-muted-foreground space-y-2">
                                                <Receipt className="w-10 h-10 mx-auto text-muted-foreground/40" />
                                                <p className="text-sm font-semibold">No payment transactions recorded</p>
                                                <p className="text-xs text-muted-foreground">Payment gateway transactions will show up here.</p>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs text-left">
                                                    <thead>
                                                        <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                                                            <th className="py-3 px-5">Transaction ID</th>
                                                            <th className="py-3 px-5">Order Ref</th>
                                                            <th className="py-3 px-5">Amount</th>
                                                            <th className="py-3 px-5">Payment Status</th>
                                                            <th className="py-3 px-5">Date</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border/40">
                                                        {transactions.map((txn, idx) => {
                                                            const actualTxnId = txn.razorpay_payment_id || txn.transaction_number || txn.payment_id || txn.transaction_id || `TXN-${txn.id || idx}`;
                                                            const statusRaw = (txn.status || txn.payment_status || "Success").toLowerCase();

                                                            const formattedDateTime = formatDate(txn.created_at || txn.date);

                                                            const orderId = txn.pcb_order_id || txn.order_number;
                                                            const orderNumText = txn.order_number || (txn.pcb_order_id ? `#ORD-${txn.pcb_order_id}` : null);

                                                            return (
                                                                <tr key={txn.id || idx} className="hover:bg-muted/20 transition-colors">
                                                                    {/* 1st Column: Actual Payment Transaction ID */}
                                                                    <td className="py-3.5 px-5 font-mono font-bold text-foreground">
                                                                        {actualTxnId}
                                                                    </td>

                                                                    {/* 2nd Column: Order Reference with click link & icon */}
                                                                    <td className="py-3.5 px-5 font-mono text-muted-foreground">
                                                                        {orderNumText ? (
                                                                            <Link
                                                                                href={`/orders/${orderId}`}
                                                                                className="inline-flex items-center gap-1 font-bold text-emerald-500 hover:text-emerald-400 hover:underline transition-colors group"
                                                                            >
                                                                                <span>{orderNumText}</span>
                                                                                <ExternalLink className="w-3 h-3 opacity-70 group-hover:opacity-100 shrink-0" />
                                                                            </Link>
                                                                        ) : (
                                                                            <span className="text-muted-foreground">N/A</span>
                                                                        )}
                                                                    </td>

                                                                    <td className="py-3.5 px-5 font-extrabold text-foreground">
                                                                        ₹{Number(txn.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                                                    </td>

                                                                    <td className="py-3.5 px-5">
                                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${paymentStatusStyles[statusRaw] || paymentStatusStyles.success}`}>
                                                                            {txn.status || txn.payment_status || "Success"}
                                                                        </span>
                                                                    </td>

                                                                    {/* Last Column: Date Time (e.g. 12 Jan 2022 12:22 AM) */}
                                                                    <td className="py-3.5 px-5 text-muted-foreground font-mono text-[11px] whitespace-nowrap">
                                                                        {formattedDateTime}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Tab 3: Saved Addresses Content */}
                                {activeTab === "addresses" && (
                                    <div className="p-6">
                                        {addresses.length === 0 ? (
                                            <div className="py-12 px-4 text-center text-muted-foreground space-y-2">
                                                <MapPin className="w-10 h-10 mx-auto text-muted-foreground/40" />
                                                <p className="text-sm font-semibold">No saved addresses</p>
                                                <p className="text-xs text-muted-foreground">Addresses saved during checkout will be displayed here.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {addresses.map((addr, idx) => {
                                                    const name = [addr.first_name, addr.last_name].filter(Boolean).join(" ") || addr.recipient_name || addr.name || displayName;
                                                    const streetLine = [addr.building_no, addr.street_address, addr.address_line1, addr.address_line2, addr.address].filter(Boolean).join(", ");
                                                    const cityStateZip = [addr.city, addr.state, addr.postal_code || addr.pincode].filter(Boolean).join(", ");
                                                    const phoneNum = addr.mobile || addr.phone;

                                                    return (
                                                        <div key={addr.id || idx} className="p-4 rounded-xl border border-border/80 bg-muted/10 space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-bold text-xs uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                                                    {addr.address_type || addr.title || `Address #${idx + 1}`}
                                                                </span>
                                                                {addr.is_default ? (
                                                                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Default</span>
                                                                ) : null}
                                                            </div>
                                                            <p className="text-sm font-bold text-foreground">{name}</p>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                {streetLine && <>{streetLine}<br /></>}
                                                                {cityStateZip && <>{cityStateZip}<br /></>}
                                                                {addr.country || 'India'}
                                                            </p>
                                                            {phoneNum && (
                                                                <p className="text-xs text-muted-foreground pt-1 flex items-center gap-1 font-mono">
                                                                    <Phone className="w-3 h-3 text-muted-foreground" /> {phoneNum}
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Change Status Modal */}
                    {showStatusModal && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                            <div className="bg-card border border-border/90 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                        <RefreshCw className="w-5 h-5 text-amber-500" />
                                        Change Client Status
                                    </h3>
                                    <button
                                        onClick={() => setShowStatusModal(false)}
                                        className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
                                    <div>
                                        <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">Client Account</span>
                                        <p className="text-foreground font-bold text-sm mt-0.5">{displayName} ({client.email})</p>
                                    </div>

                                    <div>
                                        <label className="block text-muted-foreground font-semibold mb-1 uppercase tracking-wider text-[10px]">
                                            Select Status
                                        </label>
                                        <select
                                            value={selectedStatus}
                                            onChange={(e) => setSelectedStatus(e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-foreground font-bold focus:outline-hidden focus:border-emerald-500 text-xs"
                                        >
                                            {POSSIBLE_STATUSES.map((st) => (
                                                <option key={st} value={st}>
                                                    {st}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                                        <button
                                            type="button"
                                            onClick={() => setShowStatusModal(false)}
                                            className="px-4 py-2 rounded-xl font-bold border border-border bg-card hover:bg-muted text-foreground transition-all cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={updatingStatus}
                                            className="px-4 py-2 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-black font-extrabold transition-all disabled:opacity-50 cursor-pointer"
                                        >
                                            {updatingStatus ? "Saving..." : "Save Status"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Delete Confirmation Modal (Soft Delete) */}
                    {showDeleteModal && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                            <div className="bg-card border border-border/90 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                                <div className="flex items-center gap-3 text-rose-500 border-b border-border/60 pb-3">
                                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-foreground">Confirm Delete Client</h3>
                                        <p className="text-[11px] text-muted-foreground">Soft Delete Account</p>
                                    </div>
                                </div>

                                <div className="space-y-2 text-xs">
                                    <p className="text-muted-foreground leading-relaxed">
                                        Are you sure you want to soft delete client <strong className="text-foreground">{displayName}</strong>?
                                    </p>
                                    <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl text-rose-400 text-[11px] leading-relaxed">
                                        This operation will soft delete the client account along with all associated orders, payment transactions, and saved addresses.
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteModal(false)}
                                        className="px-4 py-2 rounded-xl font-bold border border-border bg-card hover:bg-muted text-foreground transition-all cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        disabled={deleting}
                                        onClick={handleDeleteClient}
                                        className="px-4 py-2 rounded-xl font-bold bg-rose-500 hover:bg-rose-600 text-white transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                                    >
                                        {deleting ? (
                                            <>
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                Deleting...
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Yes, Delete Client
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            )}
        </DashboardLayout>
    );
}
