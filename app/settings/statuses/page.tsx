"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Plus, Trash2, Edit2, Check, X, Loader2, Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface StatusItem {
    id: number;
    name: string;
    slug: string;
    sort_order: number;
    color: string;
    is_active: boolean;
}

const PAGE_SIZE = 15;

export default function OrderStatusesPage() {
    const [statuses, setStatuses] = useState<StatusItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [newColor, setNewColor] = useState("#10b981");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editColor, setEditColor] = useState("");

    // Search and Pagination states
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    // Action loading states
    const [actionLoading, setActionLoading] = useState(false);
    const [actionId, setActionId] = useState<number | null>(null);

    const fetchStatuses = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/statuses", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status) {
                setStatuses(data.data || []);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to load statuses");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatuses();
    }, []);

    const handleCreate = async () => {
        if (!newName.trim()) {
            toast.error("Status name is required");
            return;
        }
        setActionLoading(true);
        const toastId = toast.loading("Creating new status...");
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/statuses", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ name: newName, color: newColor })
            });
            const data = await res.json();
            if (data.status) {
                toast.success("Status created successfully", { id: toastId });
                setNewName("");
                setNewColor("#10b981");
                setIsAdding(false);
                fetchStatuses();
            } else {
                toast.error(data.message || "Failed to create status", { id: toastId });
            }
        } catch (err) {
            toast.error("Error creating status", { id: toastId });
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdate = async (id: number) => {
        if (!editName.trim()) {
            toast.error("Status name is required");
            return;
        }
        setActionLoading(true);
        setActionId(id);
        const toastId = toast.loading("Updating status...");
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/statuses/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ name: editName, color: editColor })
            });
            const data = await res.json();
            if (data.status) {
                toast.success("Status updated successfully", { id: toastId });
                setEditingId(null);
                fetchStatuses();
            } else {
                toast.error(data.message || "Failed to update status", { id: toastId });
            }
        } catch (err) {
            toast.error("Error updating status", { id: toastId });
        } finally {
            setActionLoading(false);
            setActionId(null);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this status?")) return;
        setActionLoading(true);
        setActionId(id);
        const toastId = toast.loading("Deleting status...");
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/statuses/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status) {
                toast.success("Status deleted successfully", { id: toastId });
                fetchStatuses();
            } else {
                toast.error(data.message || "Failed to delete status", { id: toastId });
            }
        } catch (err) {
            toast.error("Error deleting status", { id: toastId });
        } finally {
            setActionLoading(false);
            setActionId(null);
        }
    };

    // Filtering & Pagination
    const filteredStatuses = statuses.filter((item) => {
        const term = search.toLowerCase().trim();
        return !term || item.name.toLowerCase().includes(term);
    });

    const totalPages = Math.ceil(filteredStatuses.length / PAGE_SIZE) || 1;
    const paginatedStatuses = filteredStatuses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    useEffect(() => {
        setPage(1);
    }, [search]);

    return (
        <DashboardLayout
            title="Order Statuses"
            subtitle="Manage PCB manufacturing pipeline statuses & workflow stages"
        >
            <div className="space-y-6">
                {/* Search, Action & Refresh Bar */}
                <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
                    <div className="relative w-full md:w-80">
                        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                        <input
                            type="text"
                            placeholder="Search order statuses..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-1.5 bg-muted/30 dark:bg-muted/20 border border-border/80 rounded-lg text-xs text-foreground focus:outline-none focus:border-emerald-500 font-medium"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute right-3 top-2 text-muted-foreground hover:text-foreground text-xs font-semibold"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
                        {!isAdding && (
                            <button
                                onClick={() => setIsAdding(true)}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                Add New Status
                            </button>
                        )}
                        <button
                            onClick={fetchStatuses}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/30 dark:bg-muted/20 border border-border/80 hover:border-border text-foreground rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Table Data Layout */}
                {loading ? (
                    <div className="bg-card border border-border/80 rounded-xl p-6 shadow-xs">
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5, 6].map((n) => (
                                <div key={n} className="h-10 rounded-lg bg-muted/40 animate-pulse" />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-muted/40 border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider">
                                        <th className="px-4 py-3 w-16">Color</th>
                                        <th className="px-4 py-3">Status Name</th>
                                        <th className="px-4 py-3">Slug</th>
                                        <th className="px-4 py-3">Sort Order</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60 font-medium text-foreground">
                                    {isAdding && (
                                        <tr className="bg-emerald-500/5">
                                            <td className="px-4 py-2.5">
                                                <input
                                                    type="color"
                                                    value={newColor}
                                                    onChange={(e) => setNewColor(e.target.value)}
                                                    className="w-6 h-6 p-0.5 rounded bg-background border border-border cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <input
                                                    type="text"
                                                    placeholder="Status Name (e.g. Drilling QC)"
                                                    value={newName}
                                                    onChange={(e) => setNewName(e.target.value)}
                                                    autoFocus
                                                    className="w-full max-w-sm px-3 py-1 bg-background border border-emerald-500 rounded-lg text-xs font-medium focus:outline-none"
                                                />
                                            </td>
                                            <td className="px-4 py-2.5 font-mono text-muted-foreground text-[11px]">Auto generated</td>
                                            <td className="px-4 py-2.5 font-mono text-muted-foreground">Auto</td>
                                            <td className="px-4 py-2.5 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={handleCreate}
                                                        disabled={actionLoading}
                                                        className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 flex items-center gap-1 shadow-xs cursor-pointer"
                                                    >
                                                        {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                                                    </button>
                                                    <button
                                                        onClick={() => setIsAdding(false)}
                                                        className="px-3 py-1 bg-muted text-muted-foreground rounded-lg text-xs font-bold hover:text-foreground cursor-pointer"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}

                                    {paginatedStatuses.map((item) => {
                                        const isEditing = editingId === item.id;
                                        const statusColor = isEditing ? editColor : (item.color || "#10b981");

                                        return (
                                            <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-4 py-3">
                                                    {isEditing ? (
                                                        <input
                                                            type="color"
                                                            value={editColor}
                                                            onChange={(e) => setEditColor(e.target.value)}
                                                            className="w-6 h-6 p-0.5 rounded bg-background border border-border cursor-pointer"
                                                        />
                                                    ) : (
                                                        <div className="flex items-center">
                                                            <span className="w-4 h-4 rounded-full border border-black/10 dark:border-white/20 shadow-xs" style={{ backgroundColor: statusColor }} />
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 font-bold">
                                                    {isEditing ? (
                                                        <input
                                                            type="text"
                                                            value={editName}
                                                            onChange={(e) => setEditName(e.target.value)}
                                                            autoFocus
                                                            className="w-full max-w-sm px-3 py-1 bg-background border border-emerald-500 rounded-lg text-xs font-medium focus:outline-none"
                                                        />
                                                    ) : (
                                                        <span
                                                            className="px-3 py-1 rounded-full border font-extrabold text-xs inline-block"
                                                            style={{
                                                                backgroundColor: `${statusColor}15`,
                                                                color: statusColor,
                                                                borderColor: `${statusColor}35`
                                                            }}
                                                        >
                                                            {item.name}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-muted-foreground text-[11px]">{item.slug}</td>
                                                <td className="px-4 py-3 font-mono text-muted-foreground font-semibold">{item.sort_order}</td>
                                                <td className="px-4 py-3 text-right">
                                                    {isEditing ? (
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => handleUpdate(item.id)}
                                                                disabled={actionLoading}
                                                                className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 flex items-center gap-1 shadow-xs cursor-pointer"
                                                            >
                                                                {actionLoading && actionId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingId(null)}
                                                                className="px-3 py-1 bg-muted text-muted-foreground rounded-lg text-xs font-bold hover:text-foreground cursor-pointer"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingId(item.id);
                                                                    setEditName(item.name);
                                                                    setEditColor(item.color || "#10b981");
                                                                }}
                                                                disabled={actionLoading}
                                                                className="p-1.5 text-foreground/70 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-md transition-all cursor-pointer"
                                                                title="Edit Status"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(item.id)}
                                                                disabled={actionLoading}
                                                                className="p-1.5 text-foreground/70 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all cursor-pointer"
                                                                title="Delete Status"
                                                            >
                                                                {actionLoading && actionId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Pagination Footer */}
                {filteredStatuses.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-3.5 bg-card border border-border/80 rounded-xl text-xs text-muted-foreground shadow-xs">
                        <div className="font-medium">
                            Showing <span className="font-bold text-foreground">{(page - 1) * PAGE_SIZE + 1}</span> to{" "}
                            <span className="font-bold text-foreground">{Math.min(page * PAGE_SIZE, filteredStatuses.length)}</span> of{" "}
                            <span className="font-bold text-foreground">{filteredStatuses.length}</span> statuses
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1.5 rounded-lg bg-card border border-border/80 hover:bg-muted disabled:opacity-40 disabled:hover:bg-card transition-colors text-foreground cursor-pointer"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="px-3 py-1 bg-card border border-border/80 rounded-lg text-foreground font-bold">
                                {page} / {totalPages}
                            </span>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-1.5 rounded-lg bg-card border border-border/80 hover:bg-muted disabled:opacity-40 disabled:hover:bg-card transition-colors text-foreground cursor-pointer"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
