"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import {
    Search,
    Download,
    Mail,
    ChevronLeft,
    ChevronRight,
    X,
    Calendar as CalendarIcon,
    RefreshCw,
    CheckCircle2,
    Clock,
    AlertCircle,
    Trash2,
    Settings,
    ShieldAlert,
    Sparkles,
    Eye
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

interface EmailLogItem {
    id: number;
    recipient_email: string;
    recipient_name: string | null;
    subject: string;
    template_key: string | null;
    email_type: string | null;
    body: string | null;
    text_body: string | null;
    status: string; // sent, failed, queued, processing
    provider: string | null;
    provider_message_id: string | null;
    error_message: string | null;
    retry_count: number;
    sent_at: string | null;
    failed_at: string | null;
    created_at: string;
    metadata: any;
    order?: { id: number; order_number: string } | null;
    customer?: { id: number; name: string; email: string } | null;
}

interface StatsData {
    total: number;
    sent: number;
    failed: number;
    queued: number;
    processing: number;
    sent_today: number;
    failed_today: number;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });
    } catch {
        return dateString || "N/A";
    }
};

function EmailLogsContent() {
    const searchParams = useSearchParams();

    const [logs, setLogs] = useState<EmailLogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<StatsData>({
        total: 0,
        sent: 0,
        failed: 0,
        queued: 0,
        processing: 0,
        sent_today: 0,
        failed_today: 0
    });

    // Filters
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [emailTypeFilter, setEmailTypeFilter] = useState("all");
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Selection
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Detail & Preview Modal
    const [selectedLog, setSelectedLog] = useState<EmailLogItem | null>(null);
    const [activeTab, setActiveTab] = useState<"html" | "text" | "details" | "error">("html");

    // Settings Modal
    const [showSettings, setShowSettings] = useState(false);
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [loggingEnabled, setLoggingEnabled] = useState(true);
    const [retentionDays, setRetentionDays] = useState("30");

    // Cleanup Modal
    const [showCleanupModal, setShowCleanupModal] = useState(false);
    const [cleanupDays, setCleanupDays] = useState(30);
    const [cleaning, setCleaning] = useState(false);

    const getAuthHeaders = () => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("admin_token") : null;
        return {
            "Content-Type": "application/json",
            "Accept": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        };
    };

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append("page", page.toString());
            params.append("per_page", pageSize.toString());

            if (search.trim()) params.append("search", search.trim());
            if (statusFilter !== "all") params.append("status", statusFilter);
            if (emailTypeFilter !== "all") params.append("email_type", emailTypeFilter);
            if (startDate) params.append("start_date", format(startDate, "yyyy-MM-dd"));
            if (endDate) params.append("end_date", format(endDate, "yyyy-MM-dd"));

            const res = await fetch(`/api/admin/email-logs?${params.toString()}`, {
                headers: getAuthHeaders()
            });

            if (!res.ok) {
                throw new Error("Failed to fetch email logs");
            }

            const data = await res.json();
            if (data.status && data.data) {
                setLogs(data.data);
                if (data.meta) {
                    setTotalItems(data.meta.total || 0);
                    setTotalPages(data.meta.last_page || 1);
                }
            }
        } catch (err: any) {
            console.error("Fetch email logs error:", err);
            toast.error(err.message || "Failed to load email logs");
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search, statusFilter, emailTypeFilter, startDate, endDate]);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/email-logs/statistics", {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.status && data.stats) {
                setStats(data.stats);
            }
        } catch (err) {
            console.error("Fetch email log stats error:", err);
        }
    }, []);

    const fetchSettings = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/email-logs/settings", {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.status && data.settings) {
                setLoggingEnabled(data.settings.logging_enabled);
                setRetentionDays(String(data.settings.retention_days));
            }
        } catch (err) {
            console.error("Fetch settings error:", err);
        }
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(logs.map((l) => l.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const handleDeleteSingle = async (id: number) => {
        if (!confirm("Are you sure you want to delete this email log entry?")) return;
        try {
            const res = await fetch(`/api/admin/email-logs/${id}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.status) {
                toast.success("Email log deleted");
                fetchLogs();
                fetchStats();
                if (selectedLog?.id === id) setSelectedLog(null);
            } else {
                toast.error(data.message || "Failed to delete log");
            }
        } catch (err: any) {
            toast.error("Error deleting log");
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedIds.length} email logs?`)) return;
        try {
            const res = await fetch("/api/admin/email-logs/bulk-delete", {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ ids: selectedIds })
            });
            const data = await res.json();
            if (data.status) {
                toast.success(data.message || "Selected email logs deleted");
                setSelectedIds([]);
                fetchLogs();
                fetchStats();
            } else {
                toast.error(data.message || "Failed to delete logs");
            }
        } catch (err) {
            toast.error("Error performing bulk deletion");
        }
    };

    const handleExport = async () => {
        try {
            toast.info("Preparing CSV export...");
            const params = new URLSearchParams();
            if (search.trim()) params.append("search", search.trim());
            if (statusFilter !== "all") params.append("status", statusFilter);
            if (emailTypeFilter !== "all") params.append("email_type", emailTypeFilter);
            if (startDate) params.append("start_date", format(startDate, "yyyy-MM-dd"));
            if (endDate) params.append("end_date", format(endDate, "yyyy-MM-dd"));

            const token = localStorage.getItem("token") || localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/email-logs/export?${params.toString()}`, {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            });

            if (!res.ok) throw new Error("Export request failed");

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `email_logs_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            toast.success("CSV export downloaded");
        } catch (err) {
            toast.error("Failed to export email logs CSV");
        }
    };

    const handleSaveSettings = async () => {
        setSettingsLoading(true);
        try {
            const res = await fetch("/api/admin/email-logs/settings", {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    logging_enabled: loggingEnabled,
                    retention_days: parseInt(retentionDays, 10)
                })
            });
            const data = await res.json();
            if (data.status) {
                toast.success("Email log settings updated");
                setShowSettings(false);
            } else {
                toast.error(data.message || "Failed to save settings");
            }
        } catch (err) {
            toast.error("Error updating settings");
        } finally {
            setSettingsLoading(false);
        }
    };

    const handleRunCleanup = async () => {
        setCleaning(true);
        try {
            const res = await fetch("/api/admin/email-logs/cleanup", {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ days: cleanupDays })
            });
            const data = await res.json();
            if (data.status) {
                toast.success(data.message || "Logs cleanup completed");
                setShowCleanupModal(false);
                fetchLogs();
                fetchStats();
            } else {
                toast.error(data.message || "Failed to perform cleanup");
            }
        } catch (err) {
            toast.error("Error running log cleanup");
        } finally {
            setCleaning(false);
        }
    };

    const renderStatusBadge = (status: string) => {
        const s = status.toLowerCase();
        if (s === "sent") {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    Sent
                </span>
            );
        }
        if (s === "failed") {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <AlertCircle className="w-3 h-3" />
                    Failed
                </span>
            );
        }
        if (s === "queued") {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Clock className="w-3 h-3" />
                    Queued
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <RefreshCw className="w-3 h-3 animate-spin" />
                {status}
            </span>
        );
    };

    return (
        <DashboardLayout
            title="Email Logs & Audit Trail"
            subtitle="Monitor email deliveries, inspect sent messages, debug failures, and configure retention policies."
        >
            <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
                {/* Header Title Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                            <Mail className="w-7 h-7 text-emerald-400" />
                            Email Logs & Audit Trail
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Monitor email deliveries, inspect sent messages, debug failures, and configure retention policies.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={handleExport}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
                        >
                            <Download className="w-4 h-4 text-emerald-400" />
                            Export CSV
                        </button>

                        <button
                            onClick={() => {
                                fetchSettings();
                                setShowSettings(true);
                            }}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
                        >
                            <Settings className="w-4 h-4 text-emerald-400" />
                            Retention Settings
                        </button>

                        <button
                            onClick={() => setShowCleanupModal(true)}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
                        >
                            <Trash2 className="w-4 h-4" />
                            Purge Old Logs
                        </button>
                    </div>
                </div>

                {/* Statistics Overview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-1">
                        <span className="text-xs text-slate-400 font-medium">Total Logged Emails</span>
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-black text-white">{stats.total.toLocaleString()}</span>
                            <Mail className="w-5 h-5 text-slate-500" />
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 backdrop-blur-sm space-y-1">
                        <span className="text-xs text-emerald-400 font-medium">Sent Successfully</span>
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-black text-emerald-400">{stats.sent.toLocaleString()}</span>
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <span className="text-[11px] text-emerald-400/80 block pt-0.5">{stats.sent_today} sent today</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/20 backdrop-blur-sm space-y-1">
                        <span className="text-xs text-rose-400 font-medium">Failed Deliveries</span>
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-black text-rose-400">{stats.failed.toLocaleString()}</span>
                            <AlertCircle className="w-5 h-5 text-rose-400" />
                        </div>
                        <span className="text-[11px] text-rose-400/80 block pt-0.5">{stats.failed_today} failed today</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/20 backdrop-blur-sm space-y-1">
                        <span className="text-xs text-amber-400 font-medium">Queued / Processing</span>
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-black text-amber-400">{(stats.queued + stats.processing).toLocaleString()}</span>
                            <Clock className="w-5 h-5 text-amber-400" />
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-1">
                        <span className="text-xs text-slate-400 font-medium">Retention Policy</span>
                        <div className="flex items-baseline justify-between">
                            <span className="text-lg font-bold text-slate-200">{retentionDays === "0" ? "Infinite" : `${retentionDays} Days`}</span>
                            <Sparkles className="w-5 h-5 text-emerald-400" />
                        </div>
                        <span className="text-[11px] text-slate-400 block pt-0.5">
                            {loggingEnabled ? "Logging Enabled" : "Logging Disabled"}
                        </span>
                    </div>
                </div>

                {/* Filter & Search Toolbar */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[280px]">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search recipient, subject, or message ID..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                        />
                        {search && (
                            <button
                                onClick={() => {
                                    setSearch("");
                                    setPage(1);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Filters Row */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Status Select */}
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                            className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-semibold text-slate-300 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                        >
                            <option value="all">All Statuses</option>
                            <option value="sent">Sent</option>
                            <option value="failed">Failed</option>
                            <option value="queued">Queued</option>
                            <option value="processing">Processing</option>
                        </select>

                        {/* Email Type Filter */}
                        <select
                            value={emailTypeFilter}
                            onChange={(e) => {
                                setEmailTypeFilter(e.target.value);
                                setPage(1);
                            }}
                            className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-semibold text-slate-300 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                        >
                            <option value="all">All Email Types</option>
                            <option value="order">Order Notifications</option>
                            <option value="inventory">Inventory Alerts</option>
                            <option value="customer">Customer Mail</option>
                            <option value="system">System Mail</option>
                        </select>

                        {/* Date Range Popovers */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer">
                                    <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>{startDate ? format(startDate, "MMM dd, yyyy") : "Start Date"}</span>
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-800 text-white" align="start">
                                <Calendar
                                    mode="single"
                                    selected={startDate}
                                    onSelect={(d) => {
                                        setStartDate(d);
                                        setPage(1);
                                    }}
                                />
                            </PopoverContent>
                        </Popover>

                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer">
                                    <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>{endDate ? format(endDate, "MMM dd, yyyy") : "End Date"}</span>
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-800 text-white" align="start">
                                <Calendar
                                    mode="single"
                                    selected={endDate}
                                    onSelect={(d) => {
                                        setEndDate(d);
                                        setPage(1);
                                    }}
                                />
                            </PopoverContent>
                        </Popover>

                        {(startDate || endDate || statusFilter !== "all" || emailTypeFilter !== "all" || search) && (
                            <button
                                onClick={() => {
                                    setSearch("");
                                    setStatusFilter("all");
                                    setEmailTypeFilter("all");
                                    setStartDate(undefined);
                                    setEndDate(undefined);
                                    setPage(1);
                                }}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                title="Reset all filters"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Bulk Actions Bar */}
                {selectedIds.length > 0 && (
                    <div className="p-3 px-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs font-semibold">
                        <span className="text-emerald-400">
                            {selectedIds.length} email log item{selectedIds.length > 1 ? "s" : ""} selected
                        </span>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleBulkDelete}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete Selected
                            </button>
                        </div>
                    </div>
                )}

                {/* Data Table */}
                <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800/80">
                                <tr>
                                    <th className="p-4 w-10 text-center">
                                        <input
                                            type="checkbox"
                                            checked={logs.length > 0 && selectedIds.length === logs.length}
                                            onChange={handleSelectAll}
                                            className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/30"
                                        />
                                    </th>
                                    <th className="p-4">ID / Date</th>
                                    <th className="p-4">Recipient</th>
                                    <th className="p-4">Subject</th>
                                    <th className="p-4">Template / Type</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 text-slate-300">
                                {loading ? (
                                    Array.from({ length: 8 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="p-4 text-center"><Skeleton className="h-4 w-4 rounded mx-auto" /></td>
                                            <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                                            <td className="p-4"><Skeleton className="h-4 w-36" /></td>
                                            <td className="p-4"><Skeleton className="h-4 w-48" /></td>
                                            <td className="p-4"><Skeleton className="h-4 w-28" /></td>
                                            <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                                            <td className="p-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                                        </tr>
                                    ))
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center text-slate-500 space-y-3">
                                            <Mail className="w-10 h-10 mx-auto text-slate-600 opacity-60" />
                                            <p className="font-semibold text-slate-400">No email logs found</p>
                                            <p className="text-xs text-slate-500">Try adjusting your filters or search terms.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => {
                                        const isSelected = selectedIds.includes(log.id);
                                        return (
                                            <tr
                                                key={log.id}
                                                className={`hover:bg-slate-800/40 transition-colors ${
                                                    isSelected ? "bg-emerald-950/20" : ""
                                                }`}
                                            >
                                                <td className="p-4 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleSelectOne(log.id)}
                                                        className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/30"
                                                    />
                                                </td>

                                                <td className="p-4 font-mono text-[11px]">
                                                    <span className="text-emerald-400 font-bold">#{log.id}</span>
                                                    <div className="text-slate-400 text-[11px] font-sans mt-0.5">
                                                        {formatDate(log.sent_at || log.created_at)}
                                                    </div>
                                                </td>

                                                <td className="p-4">
                                                    <div className="font-bold text-white text-xs">
                                                        {log.recipient_name || log.recipient_email}
                                                    </div>
                                                    {log.recipient_name && (
                                                        <div className="text-slate-400 text-[11px] font-mono">
                                                            {log.recipient_email}
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="p-4 max-w-[280px]">
                                                    <span className="font-semibold text-slate-200 line-clamp-1" title={log.subject}>
                                                        {log.subject}
                                                    </span>
                                                    {log.order && (
                                                        <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono text-[10px]">
                                                            Order #{log.order.order_number}
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="p-4">
                                                    <span className="inline-block px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 font-mono text-[11px]">
                                                        {log.template_key || log.email_type || "General Mail"}
                                                    </span>
                                                </td>

                                                <td className="p-4">
                                                    {renderStatusBadge(log.status)}
                                                </td>

                                                <td className="p-4 text-right space-x-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedLog(log);
                                                            setActiveTab("html");
                                                        }}
                                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                                        title="View Email & Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>

                                                    <button
                                                        onClick={() => handleDeleteSingle(log.id)}
                                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                                        title="Delete Log"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="p-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
                        <div className="flex items-center gap-3">
                            <span>Showing {logs.length} of {totalItems} logs</span>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setPage(1);
                                }}
                                className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none"
                            >
                                {PAGE_SIZE_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt} / page
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors cursor-pointer"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="font-semibold text-slate-200">
                                Page {page} of {totalPages || 1}
                            </span>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors cursor-pointer"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Email Detail & HTML Preview Modal */}
            <Dialog.Root open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 animate-fade-in" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl z-50 flex flex-col space-y-4 focus:outline-none overflow-hidden">
                        {selectedLog && (
                            <>
                                {/* Modal Header */}
                                <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono text-emerald-400 font-bold">#{selectedLog.id}</span>
                                            {renderStatusBadge(selectedLog.status)}
                                            <span className="text-xs text-slate-500 font-mono">
                                                {formatDate(selectedLog.sent_at || selectedLog.created_at)}
                                            </span>
                                        </div>
                                        <Dialog.Title className="text-lg font-bold text-white mt-1">
                                            {selectedLog.subject}
                                        </Dialog.Title>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            To: <strong className="text-slate-200">{selectedLog.recipient_name || selectedLog.recipient_email}</strong> &lt;{selectedLog.recipient_email}&gt;
                                        </p>
                                    </div>
                                    <Dialog.Close className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                                        <X className="w-5 h-5" />
                                    </Dialog.Close>
                                </div>

                                {/* Tabs Navigation */}
                                <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-semibold">
                                    <button
                                        onClick={() => setActiveTab("html")}
                                        className={`px-3 py-1.5 rounded-xl transition-all ${
                                            activeTab === "html"
                                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                : "text-slate-400 hover:text-white"
                                        }`}
                                    >
                                        HTML Preview
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("text")}
                                        className={`px-3 py-1.5 rounded-xl transition-all ${
                                            activeTab === "text"
                                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                : "text-slate-400 hover:text-white"
                                        }`}
                                    >
                                        Plain Text Body
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("details")}
                                        className={`px-3 py-1.5 rounded-xl transition-all ${
                                            activeTab === "details"
                                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                : "text-slate-400 hover:text-white"
                                        }`}
                                    >
                                        Technical Details
                                    </button>
                                    {selectedLog.error_message && (
                                        <button
                                            onClick={() => setActiveTab("error")}
                                            className={`px-3 py-1.5 rounded-xl transition-all ${
                                                activeTab === "error"
                                                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                                    : "text-rose-400/70 hover:text-rose-400"
                                            }`}
                                        >
                                            Error Log
                                        </button>
                                    )}
                                </div>

                                {/* Modal Content Area */}
                                <div className="flex-1 overflow-y-auto min-h-[350px]">
                                    {activeTab === "html" && (
                                        <div className="w-full h-[450px] bg-white rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
                                            {selectedLog.body ? (
                                                <iframe
                                                    title="Email Body Preview"
                                                    srcDoc={selectedLog.body}
                                                    className="w-full h-full border-0"
                                                    sandbox="allow-same-origin"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                                                    No HTML content logged for this email.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === "text" && (
                                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[450px] overflow-y-auto">
                                            {selectedLog.text_body || selectedLog.body?.replace(/<[^>]+>/g, "") || "No plain text content available."}
                                        </div>
                                    )}

                                    {activeTab === "details" && (
                                        <div className="space-y-4 text-xs">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                                                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Delivery Info</span>
                                                    <div><strong>Provider:</strong> <span className="font-mono text-emerald-400">{selectedLog.provider || "SMTP / Mailer"}</span></div>
                                                    <div><strong>Provider Msg ID:</strong> <span className="font-mono text-slate-300">{selectedLog.provider_message_id || "N/A"}</span></div>
                                                    <div><strong>Retry Count:</strong> <span className="font-mono text-slate-300">{selectedLog.retry_count || 0}</span></div>
                                                    <div><strong>Template Key:</strong> <span className="font-mono text-slate-300">{selectedLog.template_key || "N/A"}</span></div>
                                                </div>

                                                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                                                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Associated Entities</span>
                                                    <div><strong>Order:</strong> {selectedLog.order ? `#${selectedLog.order.order_number}` : "None"}</div>
                                                    <div><strong>Customer:</strong> {selectedLog.customer ? `${selectedLog.customer.name} (${selectedLog.customer.email})` : "None"}</div>
                                                    <div><strong>Email Type:</strong> {selectedLog.email_type || "General"}</div>
                                                </div>
                                            </div>

                                            {selectedLog.metadata && (
                                                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                                                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Raw Context / Metadata</span>
                                                    <pre className="font-mono text-[11px] text-slate-300 overflow-x-auto p-2 bg-slate-900 rounded-xl">
                                                        {JSON.stringify(selectedLog.metadata, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === "error" && selectedLog.error_message && (
                                        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-xs space-y-2">
                                            <span className="font-extrabold text-rose-400 block uppercase">Exception Stack Trace / Diagnostic Output</span>
                                            <pre className="font-mono text-[11px] text-rose-200 whitespace-pre-wrap leading-relaxed overflow-x-auto p-3 bg-slate-950 rounded-xl border border-rose-900/50">
                                                {selectedLog.error_message}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Retention Settings Modal */}
            <Dialog.Root open={showSettings} onOpenChange={setShowSettings}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 animate-fade-in" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl z-50 space-y-5 focus:outline-none">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Settings className="w-5 h-5 text-emerald-400" />
                                Email Log Retention Settings
                            </h3>
                            <Dialog.Close className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                            </Dialog.Close>
                        </div>

                        <div className="space-y-4 text-xs">
                            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
                                <div>
                                    <strong className="text-white block">Enable Email Logging</strong>
                                    <span className="text-slate-400 text-[11px]">Record HTML body and delivery status for sent mails.</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={loggingEnabled}
                                    onChange={(e) => setLoggingEnabled(e.target.checked)}
                                    className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/30 cursor-pointer"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-slate-300 font-semibold block">Automatic Retention Policy</label>
                                <select
                                    value={retentionDays}
                                    onChange={(e) => setRetentionDays(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                                >
                                    <option value="7">Keep logs for 7 Days</option>
                                    <option value="15">Keep logs for 15 Days</option>
                                    <option value="30">Keep logs for 30 Days (Recommended)</option>
                                    <option value="60">Keep logs for 60 Days</option>
                                    <option value="90">Keep logs for 90 Days</option>
                                    <option value="180">Keep logs for 180 Days</option>
                                    <option value="365">Keep logs for 1 Year</option>
                                    <option value="0">Never delete (Keep indefinitely)</option>
                                </select>
                                <p className="text-[11px] text-slate-500">
                                    Logs older than the selected retention period will be automatically purged daily via scheduled task.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                            <button
                                onClick={() => setShowSettings(false)}
                                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={settingsLoading}
                                onClick={handleSaveSettings}
                                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-extrabold text-xs transition-colors cursor-pointer"
                            >
                                {settingsLoading ? "Saving..." : "Save Settings"}
                            </button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Manual Cleanup Modal */}
            <Dialog.Root open={showCleanupModal} onOpenChange={setShowCleanupModal}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 animate-fade-in" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl z-50 space-y-5 focus:outline-none">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5 text-rose-400" />
                                Manual Log Retention Cleanup
                            </h3>
                            <Dialog.Close className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                            </Dialog.Close>
                        </div>

                        <div className="space-y-3 text-xs">
                            <p className="text-slate-300 leading-relaxed">
                                Purge old email log records permanently from the database. This action cannot be undone.
                            </p>

                            <div className="space-y-1.5">
                                <label className="text-slate-300 font-semibold block">Delete logs older than:</label>
                                <select
                                    value={cleanupDays}
                                    onChange={(e) => setCleanupDays(Number(e.target.value))}
                                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold focus:outline-none focus:border-rose-500/50 cursor-pointer"
                                >
                                    <option value={7}>7 Days</option>
                                    <option value={15}>15 Days</option>
                                    <option value={30}>30 Days</option>
                                    <option value={60}>60 Days</option>
                                    <option value={90}>90 Days</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                            <button
                                onClick={() => setShowCleanupModal(false)}
                                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={cleaning}
                                onClick={handleRunCleanup}
                                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-extrabold text-xs transition-colors cursor-pointer"
                            >
                                {cleaning ? "Purging..." : "Purge Now"}
                            </button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </DashboardLayout>
    );
}

export default function EmailLogsPage() {
    return (
        <Suspense fallback={
            <DashboardLayout title="Email Logs & Audit Trail">
                <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
                    <Skeleton className="h-8 w-64 rounded-xl bg-slate-800" />
                    <div className="grid grid-cols-5 gap-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-24 rounded-2xl bg-slate-800" />
                        ))}
                    </div>
                </div>
            </DashboardLayout>
        }>
            <EmailLogsContent />
        </Suspense>
    );
}
