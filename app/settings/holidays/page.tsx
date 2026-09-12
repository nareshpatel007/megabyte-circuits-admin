"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Plus, Trash2, Edit2, Loader2, Search, RefreshCw, ChevronLeft, ChevronRight, Calendar as CalendarIcon, ToggleLeft, ToggleRight, Check, X, Filter } from "lucide-react";
import { toast } from "sonner";

interface HolidayItem {
    id: number;
    name: string;
    date: string;
    formatted_date: string;
    day_of_week: string;
    description: string | null;
    is_active: boolean;
    created_at: string | null;
}

export default function HolidayManagementPage() {
    const [holidays, setHolidays] = useState<HolidayItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter & Search states
    const [search, setSearch] = useState("");
    const [selectedYear, setSelectedYear] = useState<string>("all");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedHoliday, setSelectedHoliday] = useState<HolidayItem | null>(null);

    // Form fields
    const [name, setName] = useState("");
    const [date, setDate] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [actionId, setActionId] = useState<number | null>(null);

    const fetchHolidays = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("admin_token");
            const queryParams = new URLSearchParams();
            queryParams.append("page", page.toString());
            queryParams.append("per_page", "15");
            if (search.trim()) queryParams.append("search", search.trim());
            if (selectedYear !== "all") queryParams.append("year", selectedYear);
            if (selectedStatus !== "all") queryParams.append("is_active", selectedStatus === "active" ? "1" : "0");

            const res = await fetch(`/api/admin/settings/holidays?${queryParams.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setHolidays(data.data || []);
                setTotalPages(data.meta?.last_page || 1);
                setTotalCount(data.meta?.total || 0);
            } else {
                toast.error(data.message || "Failed to load holidays");
            }
        } catch (err) {
            console.error(err);
            toast.error("Network error while fetching holidays");
        } finally {
            setLoading(false);
        }
    }, [page, search, selectedYear, selectedStatus]);

    useEffect(() => {
        fetchHolidays();
    }, [fetchHolidays]);

    const resetForm = () => {
        setName("");
        setDate("");
        setIsActive(true);
        setDescription("");
        setSelectedHoliday(null);
    };

    const handleOpenAdd = () => {
        resetForm();
        setShowAddModal(true);
    };

    const handleOpenEdit = (item: HolidayItem) => {
        setSelectedHoliday(item);
        setName(item.name);
        setDate(item.date);
        setIsActive(item.is_active);
        setDescription(item.description || "");
        setShowEditModal(true);
    };

    const handleOpenDelete = (item: HolidayItem) => {
        setSelectedHoliday(item);
        setShowDeleteModal(true);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !date) {
            toast.error("Please enter holiday name and date");
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/settings/holidays", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: name.trim(),
                    date,
                    is_active: isActive,
                    description: description.trim() || null
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Holiday added successfully");
                setShowAddModal(false);
                resetForm();
                fetchHolidays();
            } else {
                toast.error(data.message || "Failed to create holiday");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error creating holiday");
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedHoliday || !name.trim() || !date) {
            toast.error("Please enter holiday name and date");
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/settings/holidays/${selectedHoliday.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: name.trim(),
                    date,
                    is_active: isActive,
                    description: description.trim() || null
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Holiday updated successfully");
                setShowEditModal(false);
                resetForm();
                fetchHolidays();
            } else {
                toast.error(data.message || "Failed to update holiday");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error updating holiday");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedHoliday) return;

        setSubmitting(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/settings/holidays/${selectedHoliday.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Holiday deleted successfully");
                setShowDeleteModal(false);
                resetForm();
                fetchHolidays();
            } else {
                toast.error(data.message || "Failed to delete holiday");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error deleting holiday");
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleStatus = async (item: HolidayItem) => {
        setActionId(item.id);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/settings/holidays/${item.id}/status`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`Holiday ${data.is_active ? "activated" : "deactivated"}`);
                setHolidays(prev => prev.map(h => h.id === item.id ? { ...h, is_active: data.is_active } : h));
            } else {
                toast.error(data.message || "Failed to toggle status");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error toggling status");
        } finally {
            setActionId(null);
        }
    };

    const currentYear = new Date().getFullYear();
    const yearsOptions = [
        currentYear - 1,
        currentYear,
        currentYear + 1,
        currentYear + 2
    ];

    return (
        <DashboardLayout
            title="Holiday Management"
            subtitle="Configure national and company holidays to automatically exclude non-delivery days from PCB delivery calculations."
        >
            <div className="space-y-6">
                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-xs">
                    {/* Filters & Search */}
                    <div className="flex flex-wrap items-center gap-3 flex-1">
                        {/* Search Input */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search holiday name..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        {/* Year Filter */}
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
                            <select
                                value={selectedYear}
                                onChange={(e) => {
                                    setSelectedYear(e.target.value);
                                    setPage(1);
                                }}
                                className="bg-background border border-input rounded-lg text-sm px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="all">All Years</option>
                                {yearsOptions.map(y => (
                                    <option key={y} value={y.toString()}>{y}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status Filter */}
                        <select
                            value={selectedStatus}
                            onChange={(e) => {
                                setSelectedStatus(e.target.value);
                                setPage(1);
                            }}
                            className="bg-background border border-input rounded-lg text-sm px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>
                    </div>

                    {/* Add Holiday Button */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchHolidays}
                            title="Refresh List"
                            className="p-2.5 text-muted-foreground hover:text-foreground border border-input rounded-lg bg-background hover:bg-accent transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        </button>
                        <button
                            onClick={handleOpenAdd}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors shadow-xs"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Holiday</span>
                        </button>
                    </div>
                </div>

                {/* Table / List View */}
                <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xs">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 text-muted-foreground">
                            <Loader2 className="w-6 h-6 animate-spin mr-2" />
                            <span>Loading holidays...</span>
                        </div>
                    ) : holidays.length === 0 ? (
                        <div className="text-center py-16 px-4">
                            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-3">
                                <CalendarIcon className="w-6 h-6" />
                            </div>
                            <h3 className="text-base font-semibold text-foreground">No holidays found</h3>
                            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                                {search || selectedYear !== "all" || selectedStatus !== "all"
                                    ? "No holidays match your search and filter parameters."
                                    : "Add national or company holidays to automatically exclude them from PCB delivery calculations."}
                            </p>
                            <button
                                onClick={handleOpenAdd}
                                className="mt-4 inline-flex items-center gap-2 bg-emerald-600 text-white font-medium text-xs px-3.5 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add First Holiday
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-muted/50 border-b border-border text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                                        <th className="py-3 px-4">Holiday Name</th>
                                        <th className="py-3 px-4">Date</th>
                                        <th className="py-3 px-4">Day</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4">Description</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border text-sm">
                                    {holidays.map((item) => (
                                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-3.5 px-4 font-semibold text-foreground">
                                                <div className="flex items-center gap-2">
                                                    {item.name}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 font-mono font-medium text-foreground whitespace-nowrap">
                                                {item.formatted_date}
                                            </td>
                                            <td className="py-3.5 px-4 text-muted-foreground">
                                                <span className="inline-block px-2 py-0.5 rounded bg-muted text-xs font-medium">
                                                    {item.day_of_week}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <button
                                                    onClick={() => handleToggleStatus(item)}
                                                    disabled={actionId === item.id}
                                                    className="flex items-center gap-1.5 focus:outline-hidden group"
                                                >
                                                    {actionId === item.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                                    ) : item.is_active ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                                                            <Check className="w-3 h-3" /> Active
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-500 border border-slate-500/20 group-hover:bg-slate-500/20 transition-colors">
                                                            <X className="w-3 h-3" /> Inactive
                                                        </span>
                                                    )}
                                                </button>
                                            </td>
                                            <td className="py-3.5 px-4 text-muted-foreground max-w-xs truncate">
                                                {item.description || "-"}
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleOpenEdit(item)}
                                                        className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
                                                        title="Edit Holiday"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenDelete(item)}
                                                        className="p-1.5 text-red-500 hover:text-red-600 rounded-md hover:bg-red-500/10 transition-colors"
                                                        title="Delete Holiday"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
                            <div>
                                Showing <span className="font-semibold text-foreground">{holidays.length}</span> of <span className="font-semibold text-foreground">{totalCount}</span> holidays
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                                    disabled={page === 1}
                                    className="p-1.5 border border-input rounded-md hover:bg-accent disabled:opacity-50 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span>Page {page} of {totalPages}</span>
                                <button
                                    onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                                    disabled={page === totalPages}
                                    className="p-1.5 border border-input rounded-md hover:bg-accent disabled:opacity-50 transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Add Holiday Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                                <h3 className="font-semibold text-foreground flex items-center gap-2">
                                    <CalendarIcon className="w-4 h-4 text-emerald-600" />
                                    Add New Holiday
                                </h3>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="p-1 text-muted-foreground hover:text-foreground rounded-md"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <form onSubmit={handleCreate} className="p-5 space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1">
                                        Holiday Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Diwali, Independence Day"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1">
                                        Holiday Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <div className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-lg">
                                    <div>
                                        <div className="text-xs font-semibold text-foreground">Active Status</div>
                                        <div className="text-[11px] text-muted-foreground">Active holidays block PCB delivery dates</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsActive(!isActive)}
                                        className={`text-2xl transition-colors ${isActive ? "text-emerald-600" : "text-slate-400"}`}
                                    >
                                        {isActive ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                                    </button>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1">
                                        Description / Notes (Optional)
                                    </label>
                                    <textarea
                                        rows={3}
                                        placeholder="Additional notes about this holiday..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 resize-none"
                                    />
                                </div>
                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="px-4 py-2 border border-input rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50"
                                    >
                                        {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                        Save Holiday
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Holiday Modal */}
                {showEditModal && selectedHoliday && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                                <h3 className="font-semibold text-foreground flex items-center gap-2">
                                    <Edit2 className="w-4 h-4 text-emerald-600" />
                                    Edit Holiday
                                </h3>
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="p-1 text-muted-foreground hover:text-foreground rounded-md"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <form onSubmit={handleUpdate} className="p-5 space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1">
                                        Holiday Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1">
                                        Holiday Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <div className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-lg">
                                    <div>
                                        <div className="text-xs font-semibold text-foreground">Active Status</div>
                                        <div className="text-[11px] text-muted-foreground">Active holidays block PCB delivery dates</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsActive(!isActive)}
                                        className={`text-2xl transition-colors ${isActive ? "text-emerald-600" : "text-slate-400"}`}
                                    >
                                        {isActive ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                                    </button>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1">
                                        Description / Notes (Optional)
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 resize-none"
                                    />
                                </div>
                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className="px-4 py-2 border border-input rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50"
                                    >
                                        {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                        Update Holiday
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteModal && selectedHoliday && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-5 text-center space-y-3">
                                <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center mx-auto">
                                    <Trash2 className="w-6 h-6" />
                                </div>
                                <h3 className="font-semibold text-foreground text-base">Delete Holiday?</h3>
                                <p className="text-xs text-muted-foreground">
                                    Are you sure you want to delete <span className="font-bold text-foreground">&quot;{selectedHoliday.name}&quot;</span> ({selectedHoliday.formatted_date})?
                                    This date will become available for delivery unless restricted by other rules.
                                </p>
                                <div className="flex items-center justify-center gap-2 pt-2">
                                    <button
                                        onClick={() => setShowDeleteModal(false)}
                                        className="px-4 py-2 border border-input rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={submitting}
                                        className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50"
                                    >
                                        {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
