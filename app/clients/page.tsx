"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useAuth } from "@/lib/auth-context";
import {
    Search,
    ChevronRight,
    ChevronLeft,
    Users,
    CheckCircle2,
    XCircle,
    ShoppingBag,
    ExternalLink,
    Mail,
    Phone,
    Building,
    UserPlus,
    Plus,
    Pencil,
    Trash2,
    RefreshCw,
    AlertTriangle,
    ShieldAlert,
    GitMerge,
    LogIn
} from "lucide-react";
import { TableSkeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAdminListingParams } from "@/hooks/useAdminListingParams";

interface ApiUser {
    id: number;
    name: string;
    first_name?: string;
    last_name?: string;
    email: string;
    phone_number?: string;
    company_name?: string;
    status?: string;
    available_credits?: number;
    orders_count?: number;
    total_spent?: number;
    created_at: string;
}

const PAGE_SIZE = 10;

const POSSIBLE_STATUSES = ["Active", "Inactive", "Pending", "Suspended", "On Hold"];

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
        return formatted.replace(/\b(AM|PM)\b/gi, (m) => m.toLowerCase());
    } catch {
        return 'N/A';
    }
};

function ClientsContent() {
    const { getParam, page, updateParams } = useAdminListingParams();
    const search = getParam("search", "");
    const statusFilter = getParam("status", "All");
    const pageSize = getParam("per_page", 10);

    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<ApiUser[]>([]);

    // Status Change Modal State
    const [statusModalUser, setStatusModalUser] = useState<ApiUser | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string>("Active");
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // Delete Confirmation Modal State
    const [deleteModalUser, setDeleteModalUser] = useState<ApiUser | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Impersonation Modal State
    const { user: authUser } = useAuth();
    const isSuperAdmin = (authUser?.role || '').toLowerCase() === 'super admin' || (authUser as any)?.isSuperAdmin;
    const hasImpersonatePermission = isSuperAdmin || (authUser?.permissions ? authUser.permissions.includes('clients.impersonate') || authUser.permissions.includes('users.impersonate') : true);

    const [impersonateModalUser, setImpersonateModalUser] = useState<ApiUser | null>(null);
    const [impersonating, setImpersonating] = useState(false);
    const [impersonateReason, setImpersonateReason] = useState("");

    const openImpersonateModal = (user: ApiUser) => {
        setImpersonateModalUser(user);
        setImpersonateReason("");
    };

    const handleConfirmImpersonation = async () => {
        if (!impersonateModalUser) return;
        setImpersonating(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/clients/${impersonateModalUser.id}/impersonate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ reason: impersonateReason.trim() })
            });
            const data = await res.json();
            if (data.status || data.success) {
                toast.success("Impersonation session created! Redirecting to Client application...");
                setImpersonateModalUser(null);
                const redirectUrl = data.data?.redirect_url;
                if (redirectUrl) {
                    window.open(redirectUrl, "_blank") || (window.location.href = redirectUrl);
                }
            } else {
                toast.error(data.message || "Failed to start client impersonation");
            }
        } catch (err) {
            console.error("Impersonation error:", err);
            toast.error("Error starting client impersonation");
        } finally {
            setImpersonating(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem("admin_token");
            const params = new URLSearchParams();
            if (search.trim()) {
                params.set("search", search.trim());
            }
            if (statusFilter && statusFilter !== "All") {
                params.set("status", statusFilter);
            }

            const res = await fetch(`/api/admin/users?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status || data.success) {
                const list: ApiUser[] = data.data || data.users || [];
                // Completely exclude deleted clients
                setUsers(list.filter(u => (u.status || '').toLowerCase() !== 'deleted'));
            } else {
                toast.error("Failed to load clients list");
            }
        } catch (err) {
            console.error("Failed to load clients:", err);
            toast.error("Error loading clients list");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers();
        }, 300);
        return () => clearTimeout(timer);
    }, [search, statusFilter]);

    const openStatusModal = (user: ApiUser) => {
        setStatusModalUser(user);
        setSelectedStatus(user.status || "Active");
    };

    const handleSaveStatus = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!statusModalUser) return;

        setUpdatingStatus(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/users/${statusModalUser.id}/status`, {
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
                setUsers(prev => prev.map(u => u.id === statusModalUser.id ? { ...u, status: selectedStatus } : u));
                setStatusModalUser(null);
            } else {
                toast.error(data.message || "Failed to update client status");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error updating client status");
        } finally {
            setUpdatingStatus(false);
        }
    };

    const openDeleteModal = (user: ApiUser) => {
        setDeleteModalUser(user);
    };

    const handleDeleteUser = async () => {
        if (!deleteModalUser) return;

        setDeleting(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/users/${deleteModalUser.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.status || data.success) {
                toast.success(data.message || "Client account soft-deleted successfully");
                setUsers(prev => prev.filter(u => u.id !== deleteModalUser.id));
                setDeleteModalUser(null);
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

    const nonDeletedUsers = users.filter((u) => (u.status || '').toLowerCase() !== 'deleted');

    const filtered = nonDeletedUsers.filter((u) => {
        const query = search.toLowerCase().trim();
        const fullName = `${u.first_name || ''} ${u.last_name || ''} ${u.name || ''}`.toLowerCase();
        const matchSearch =
            !query ||
            fullName.includes(query) ||
            (u.email && u.email.toLowerCase().includes(query)) ||
            (u.company_name && u.company_name.toLowerCase().includes(query)) ||
            (u.phone_number && u.phone_number.toLowerCase().includes(query)) ||
            ((u as any).mobile && (u as any).mobile.toLowerCase().includes(query)) ||
            ((u as any).phone && (u as any).phone.toLowerCase().includes(query));

        const userStatus = (u.status || 'Active').toLowerCase();

        let matchStatus = false;
        if (statusFilter === "All") {
            matchStatus = userStatus !== "deleted";
        } else {
            matchStatus = userStatus === statusFilter.toLowerCase();
        }

        return matchSearch && matchStatus;
    });

    const totalPages = Math.ceil(filtered.length / pageSize) || 1;
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const headerActions = (
        <div className="flex items-center gap-2">
            <Link
                href="/clients/merge"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 border border-indigo-500/30 transition-all shadow-xs cursor-pointer whitespace-nowrap"
            >
                <GitMerge className="w-4 h-4" />
                Merge Clients
            </Link>
            <Link
                href="/clients/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-600 text-black transition-all shadow-xs cursor-pointer whitespace-nowrap"
            >
                <Plus className="w-4 h-4" />
                Create New Client
            </Link>
        </div>
    );

    return (
        <DashboardLayout
            title="Client Management"
            subtitle="Manage registered client accounts, order limits, credit balances and permissions."
            action={headerActions}
        >
            {loading ? (
                <TableSkeleton rows={8} />
            ) : (
                <div className="space-y-6">
                    {/* Metrics Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Clients</p>
                                <h3 className="text-2xl font-black text-foreground mt-0.5">{nonDeletedUsers.length}</h3>
                            </div>
                        </div>

                        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Clients</p>
                                <h3 className="text-2xl font-black text-emerald-500 mt-0.5">
                                    {nonDeletedUsers.filter((u) => (u.status || 'active').toLowerCase() === "active").length}
                                </h3>
                            </div>
                        </div>

                        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                                <XCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Inactive</p>
                                <h3 className="text-2xl font-black text-red-500 mt-0.5">
                                    {nonDeletedUsers.filter((u) => (u.status || 'active').toLowerCase() !== "active" && (u.status || '').toLowerCase() !== "deleted").length}
                                </h3>
                            </div>
                        </div>

                        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                                <ShoppingBag className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Orders</p>
                                <h3 className="text-2xl font-black text-foreground mt-0.5">
                                    {nonDeletedUsers.reduce((s, u) => s + (Number(u.orders_count) || 0), 0)}
                                </h3>
                            </div>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative w-full md:w-80">
                            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                            <input
                                type="text"
                                placeholder="Search clients by name, email, company..."
                                value={search}
                                onChange={(e) => updateParams({ search: e.target.value })}
                                className="w-full pl-9 pr-4 py-2 bg-muted/30 border border-border/80 rounded-xl text-xs text-foreground focus:outline-hidden focus:border-emerald-500 font-medium"
                            />
                        </div>

                        <div className="w-full md:w-auto">
                            <select
                                value={statusFilter}
                                onChange={(e) => updateParams({ status: e.target.value })}
                                className="w-full md:w-auto px-3.5 py-2 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/80 text-xs font-semibold text-foreground focus:outline-none focus:border-emerald-500 cursor-pointer shadow-xs"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                                <option value="Pending">Pending</option>
                                <option value="Suspended">Suspended</option>
                                <option value="On Hold">On Hold</option>
                            </select>
                        </div>
                    </div>

                    {/* Clients Table */}
                    <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead>
                                    <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                                        <th className="py-3.5 px-5">Client Name & Email</th>
                                        <th className="py-3.5 px-5">Company & Phone</th>
                                        <th className="py-3.5 px-5">Orders</th>
                                        <th className="py-3.5 px-5">Total Spent</th>
                                        <th className="py-3.5 px-5">Joined Date</th>
                                        <th className="py-3.5 px-5">Status</th>
                                        <th className="py-3.5 px-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40 font-medium">
                                    {paginated.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12 text-muted-foreground">
                                                No clients found matching your search.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginated.map((user) => {
                                            const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || `Client #${user.id}`;
                                            const isDeleted = (user.status || '').toLowerCase() === 'deleted';
                                            const userStatus = (user.status || 'Active');

                                            return (
                                                <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                                                    <td className="py-3.5 px-5">
                                                        <div className="font-extrabold text-foreground">
                                                            <Link href={`/clients/${user.id}`} className="hover:text-emerald-500 transition-colors">
                                                                {displayName}
                                                            </Link>
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                                            <Mail className="w-3 h-3" />
                                                            <span>{user.email || 'N/A'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-5">
                                                        <div className="text-foreground font-semibold flex items-center gap-1.5">
                                                            <Building className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                            <span>{user.company_name || 'Individual'}</span>
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                                            <Phone className="w-3 h-3" />
                                                            <span>{user.phone_number || (user as any).mobile || (user as any).phone || 'N/A'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-5">
                                                        <span className="font-bold text-foreground">{user.orders_count || 0}</span>
                                                    </td>
                                                    <td className="py-3.5 px-5">
                                                        <span className="font-bold text-emerald-500">
                                                            ₹{(user.total_spent || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-5 text-muted-foreground font-medium">
                                                        {formatDate(user.created_at)}
                                                    </td>
                                                    <td className="py-3.5 px-5">
                                                        <button
                                                            onClick={() => openStatusModal(user)}
                                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all hover:opacity-80 ${
                                                                userStatus.toLowerCase() === 'active'
                                                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                                    : userStatus.toLowerCase() === 'pending'
                                                                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                                                    : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                                            }`}
                                                        >
                                                            <span>{userStatus}</span>
                                                        </button>
                                                    </td>
                                                    <td className="py-3.5 px-5 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {hasImpersonatePermission && (
                                                                <button
                                                                    onClick={() => openImpersonateModal(user)}
                                                                    className="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors"
                                                                    title="Impersonate Client"
                                                                >
                                                                    <LogIn className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            <Link
                                                                href={`/clients/${user.id}`}
                                                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                                                title="View Details"
                                                            >
                                                                <ExternalLink className="w-4 h-4" />
                                                            </Link>
                                                            <Link
                                                                href={`/clients/${user.id}/edit`}
                                                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                                                title="Edit Profile"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </Link>
                                                            <button
                                                                onClick={() => openDeleteModal(user)}
                                                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                                                                title="Soft Delete"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        {filtered.length > 0 && (
                            <div className="p-4 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/20">
                                <p className="text-xs text-muted-foreground font-medium">
                                    Showing <span className="font-bold text-foreground">{(page - 1) * pageSize + 1}</span> to{" "}
                                    <span className="font-bold text-foreground">{Math.min(page * pageSize, filtered.length)}</span> of{" "}
                                    <span className="font-bold text-foreground">{filtered.length}</span> clients
                                </p>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => updateParams({ page: Math.max(1, page - 1) })}
                                        disabled={page === 1}
                                        className="p-2 rounded-xl border border-border/80 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-foreground transition-all"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>

                                    <span className="text-xs font-bold text-foreground px-2">
                                        Page {page} of {totalPages}
                                    </span>

                                    <button
                                        onClick={() => updateParams({ page: Math.min(totalPages, page + 1) })}
                                        disabled={page >= totalPages}
                                        className="p-2 rounded-xl border border-border/80 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-foreground transition-all"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Status Change Modal */}
                    {statusModalUser && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
                            <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                                <h3 className="font-extrabold text-foreground text-lg">Change Client Status</h3>
                                <p className="text-xs text-muted-foreground">
                                    Update access status for <span className="font-bold text-foreground">{statusModalUser.name || statusModalUser.email}</span>.
                                </p>

                                <form onSubmit={handleSaveStatus} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase">Status</label>
                                        <select
                                            value={selectedStatus}
                                            onChange={(e) => setSelectedStatus(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-border text-xs text-foreground focus:outline-hidden focus:border-emerald-500 font-semibold"
                                        >
                                            {POSSIBLE_STATUSES.map(st => (
                                                <option key={st} value={st}>{st}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center justify-end gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setStatusModalUser(null)}
                                            className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={updatingStatus}
                                            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-black shadow-xs transition-all disabled:opacity-50"
                                        >
                                            {updatingStatus ? "Saving..." : "Save Status"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Delete Confirmation Modal */}
                    {deleteModalUser && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
                            <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                                <div className="flex items-center gap-3 text-rose-500">
                                    <AlertTriangle className="w-6 h-6" />
                                    <h3 className="font-extrabold text-foreground text-lg">Confirm Soft Delete</h3>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Are you sure you want to soft delete client <span className="font-bold text-foreground">{deleteModalUser.name || deleteModalUser.email}</span>?
                                </p>

                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setDeleteModalUser(null)}
                                        className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDeleteUser}
                                        disabled={deleting}
                                        className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-xs transition-all disabled:opacity-50"
                                    >
                                        {deleting ? "Deleting..." : "Delete Account"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Impersonation Confirmation Modal */}
                    {impersonateModalUser && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
                            <div className="bg-card border border-border/90 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
                                <div className="p-5 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border-b border-border/80 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                                        <ShieldAlert className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-foreground text-base">Client Impersonation</h3>
                                        <p className="text-[11px] text-muted-foreground font-medium">Log in to Client Portal as this user</p>
                                    </div>
                                </div>

                                <div className="p-5 space-y-4">
                                    <div className="p-3 rounded-xl bg-muted/40 border border-border/80 space-y-1">
                                        <p className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground">Target Client</p>
                                        <p className="text-xs font-black text-foreground">{impersonateModalUser.name || 'Unnamed Client'}</p>
                                        <p className="text-xs font-medium text-indigo-400">{impersonateModalUser.email}</p>
                                    </div>

                                    <div className="text-xs text-muted-foreground leading-relaxed">
                                        You will be logged into the client-side application as this client. Your original Admin session will remain available and you can return to Admin at any time.
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-extrabold uppercase text-muted-foreground tracking-wider">
                                            Reason for Impersonation (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Verification of order #1024"
                                            value={impersonateReason}
                                            onChange={(e) => setImpersonateReason(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-border text-xs text-foreground focus:outline-hidden focus:border-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-muted/20 border-t border-border/80 flex items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setImpersonateModalUser(null)}
                                        disabled={impersonating}
                                        className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted/60 transition-all cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleConfirmImpersonation}
                                        disabled={impersonating}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                                    >
                                        {impersonating ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                Starting Session...
                                            </>
                                        ) : (
                                            <>
                                                <LogIn className="w-4 h-4" />
                                                Login as Client
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

export default function ClientsPage() {
    return (
        <Suspense fallback={
            <DashboardLayout
                title="Client Management"
                subtitle="Manage registered client accounts, order limits, credit balances and permissions."
            >
                <TableSkeleton rows={8} />
            </DashboardLayout>
        }>
            <ClientsContent />
        </Suspense>
    );
}
