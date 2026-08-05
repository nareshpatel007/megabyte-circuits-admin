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

const PAGE_SIZE = 11; // 1 Create Box + 11 Status Boxes = 12 Grid Items (Clean 3 or 4-column layout)

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
                {/* Search & Refresh Bar */}
                <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="relative w-full md:w-80">
                        <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
                        <input
                            type="text"
                            placeholder="Search status cards..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-muted/30 dark:bg-muted/20 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:border-emerald-500 font-medium"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground text-xs font-semibold"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        <button
                            onClick={fetchStatuses}
                            className="flex items-center gap-2 px-3.5 py-2 bg-muted/30 dark:bg-muted/20 border border-border/80 hover:border-border text-foreground rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                            Refresh Cards
                        </button>
                    </div>
                </div>

                {/* Grid Box Layout */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                            <div key={n} className="h-36 rounded-2xl bg-muted/40 animate-pulse border border-border/60" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {/* 1st Box: Create New Status */}
                        {!isAdding ? (
                            <button
                                onClick={() => setIsAdding(true)}
                                className="h-40 rounded-2xl border-2 border-dashed border-emerald-500/40 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all duration-200 flex flex-col items-center justify-center p-5 group cursor-pointer shadow-xs text-center"
                            >
                                <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <span className="text-sm font-black text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                                    Create New Status
                                </span>
                                <span className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                                    Add stage to manufacturing pipeline
                                </span>
                            </button>
                        ) : (
                            <div className="h-40 rounded-2xl border-2 border-emerald-500 bg-card p-4 shadow-md flex flex-col justify-between animate-in fade-in duration-200">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                            New Status
                                        </span>
                                        <input
                                            type="color"
                                            value={newColor}
                                            onChange={(e) => setNewColor(e.target.value)}
                                            className="w-7 h-7 p-0.5 rounded-lg bg-background border border-border cursor-pointer"
                                            title="Pick badge color"
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Status Name (e.g. Drilling QC)"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        autoFocus
                                        className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-emerald-500 font-medium"
                                    />
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                                    <button
                                        onClick={handleCreate}
                                        disabled={actionLoading}
                                        className="flex-1 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                                    >
                                        {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                                    </button>
                                    <button
                                        onClick={() => setIsAdding(false)}
                                        disabled={actionLoading}
                                        className="px-3 py-1.5 bg-muted text-muted-foreground hover:text-foreground text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                                    >
                                        <X className="w-3.5 h-3.5" /> Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Status Cards */}
                        {paginatedStatuses.map((item) => {
                            const isEditing = editingId === item.id;
                            const statusColor = isEditing ? editColor : (item.color || "#10b981");

                            return (
                                <div
                                    key={item.id}
                                    className={`h-40 rounded-2xl border bg-card p-4 shadow-xs transition-all duration-200 flex flex-col justify-between group hover:shadow-md relative overflow-hidden ${
                                        isEditing ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-border/80 hover:border-border"
                                    }`}
                                >
                                    {/* Top Color Accent Line */}
                                    <div
                                        className="absolute top-0 left-0 right-0 h-1.5"
                                        style={{ backgroundColor: statusColor }}
                                    />

                                    {isEditing ? (
                                        <>
                                            <div className="pt-1">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                        Edit Status
                                                    </span>
                                                    <input
                                                        type="color"
                                                        value={editColor}
                                                        onChange={(e) => setEditColor(e.target.value)}
                                                        className="w-7 h-7 p-0.5 rounded-lg bg-background border border-border cursor-pointer"
                                                        title="Pick badge color"
                                                    />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    autoFocus
                                                    className="w-full px-3 py-1.5 text-xs bg-background border border-emerald-500 rounded-xl text-foreground font-medium focus:outline-none"
                                                />
                                            </div>

                                            <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                                                <button
                                                    onClick={() => handleUpdate(item.id)}
                                                    disabled={actionLoading}
                                                    className="flex-1 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                                                >
                                                    {actionLoading && actionId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                                                </button>
                                                <button
                                                    onClick={() => setEditingId(null)}
                                                    disabled={actionLoading}
                                                    className="px-3 py-1.5 bg-muted text-muted-foreground hover:text-foreground text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                                                >
                                                    <X className="w-3.5 h-3.5" /> Cancel
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="pt-2">
                                                <div className="flex items-center justify-between gap-2 mb-2">
                                                    <span
                                                        className="text-[11px] px-3 py-1 rounded-full border font-extrabold truncate max-w-[170px]"
                                                        style={{
                                                            backgroundColor: `${statusColor}15`,
                                                            color: statusColor,
                                                            borderColor: `${statusColor}35`
                                                        }}
                                                    >
                                                        {item.name}
                                                    </span>
                                                    <span className="w-3 h-3 rounded-full shrink-0 border border-black/10 dark:border-white/20" style={{ backgroundColor: statusColor }} />
                                                </div>

                                                <h4 className="text-sm font-bold text-foreground truncate mt-1">
                                                    {item.name}
                                                </h4>
                                                <p className="text-[11px] font-mono text-muted-foreground truncate">
                                                    slug: {item.slug}
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-border/40">
                                                <span className="text-[10px] font-mono font-semibold text-muted-foreground">
                                                    Sort Order: {item.sort_order}
                                                </span>

                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => {
                                                            setEditingId(item.id);
                                                            setEditName(item.name);
                                                            setEditColor(item.color || "#10b981");
                                                        }}
                                                        disabled={actionLoading}
                                                        className="p-1.5 text-foreground/70 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                                                        title="Edit Status"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        disabled={actionLoading}
                                                        className="p-1.5 text-foreground/70 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                                                        title="Delete Status"
                                                    >
                                                        {actionLoading && actionId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
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
