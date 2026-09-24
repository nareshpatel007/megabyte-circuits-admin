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
    Sparkles,
    Eye,
    Code,
    FileText,
    ExternalLink
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

interface EmailLogItem {
    id: number;
    to: string;
    from_email: string;
    from_name: string | null;
    recipient_email?: string;
    recipient_name?: string | null;
    subject: string;
    template_key: string | null;
    email_type: string | null;
    body?: string | null;
    text_body?: string | null;
    status: string; // sent, failed, queued, processing, skipped
    provider?: string | null;
    provider_message_id?: string | null;
    error_message?: string | null;
    retry_count?: number;
    is_test?: boolean;
    sent_at?: string | null;
    failed_at?: string | null;
    created_at: string;
    metadata?: any;
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
    const [detailLoading, setDetailLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"html" | "text" | "details" | "error">("html");

    // Settings Modal
    const [showSettings, setShowSettings] = useState(false);
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [loggingEnabled, setLoggingEnabled] = useState(true);
    const [retentionDays, setRetentionDays] = useState("90");

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
            if (data.success || data.status) {
                const rawLogs = Array.isArray(data.data) ? data.data : (data.data?.data || []);
                setLogs(rawLogs);

                if (data.meta) {
                    setTotalItems(data.meta.total ?? rawLogs.length);
                    setTotalPages(data.meta.last_page ?? 1);
                } else if (data.data?.total) {
                    setTotalItems(data.data.total);
                    setTotalPages(data.data.last_page ?? 1);
                } else {
                    setTotalItems(rawLogs.length);
                    setTotalPages(1);
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
            if (data.success || data.status) {
                const s = data.data || data.stats || {};
                setStats({
                    total: s.total_emails ?? s.total ?? 0,
                    sent: s.sent ?? 0,
                    failed: s.failed ?? 0,
                    queued: s.queued ?? 0,
                    processing: s.processing ?? 0,
                    sent_today: s.today_count ?? s.sent_today ?? 0,
                    failed_today: s.today_failed ?? s.failed_today ?? 0
                });
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
            if (data.success || data.status) {
                const s = data.data || data.settings || {};
                setLoggingEnabled(s.logging_enabled ?? true);
                setRetentionDays(String(s.retention_days ?? "90"));
            }
        } catch (err) {
            console.error("Fetch settings error:", err);
        }
    }, []);

    const fetchLogDetail = async (logItem: EmailLogItem) => {
        setSelectedLog(logItem);
        setActiveTab("html");
        setDetailLoading(true);
        try {
            const res = await fetch(`/api/admin/email-logs/${logItem.id}`, {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success || data.status) {
                const fullLog = data.data || data.log;
                if (fullLog) {
                    setSelectedLog(fullLog);
                }
            }
        } catch (err) {
            console.error("Fetch email log detail error:", err);
        } finally {
            setDetailLoading(false);
        }
    };

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
            if (data.success || data.status) {
                toast.success("Email log deleted successfully");
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
            if (data.success || data.status) {
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
                    retention_days: retentionDays,
                    auto_cleanup: true
                })
            });
            const data = await res.json();
            if (data.success || data.status) {
                toast.success("Email log retention settings updated");
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
            if (data.success || data.status) {
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
        const s = (status || "").toLowerCase();
        if (s === "sent") {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    Sent
                </span>
            );
        }
        if (s === "failed") {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-red-50 dark:bg-rose-500/10 text-red-700 dark:text-rose-400 border border-red-200 dark:border-rose-500/20">
                    <AlertCircle className="w-3 h-3 text-red-600 dark:text-rose-400" />
                    Failed
                </span>
            );
        }
        if (s === "queued") {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                    <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    Queued
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                <RefreshCw className="w-3 h-3 text-blue-600 dark:text-blue-400 animate-spin" />
                {status}
            </span>
        );
    };

    return (
        <DashboardLayout
            title="Email Logs & Audit Trail"
            subtitle="Monitor email deliveries, inspect sent messages, debug failures, and configure retention policies."
        >
            <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
                {/* Header Title & Action Buttons Banner */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#0b0f19] p-5 rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-2xs">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2.5">
                            <Mail className="w-6 h-6 text-emerald-500" />
                            Email Logs & Audit Trail
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium mt-0.5">
                            Track email dispatches, preview body contents, inspect errors, and manage log archives.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            onClick={handleExport}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 border border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-all cursor-pointer shadow-2xs"
                        >
                            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            Export CSV
                        </button>

                        <button
                            onClick={() => {
                                fetchSettings();
                                setShowSettings(true);
                            }}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 border border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-all cursor-pointer shadow-2xs"
                        >
                            <Settings className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            Retention Settings
                        </button>

                        <button
                            onClick={() => setShowCleanupModal(true)}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-red-50 dark:bg-rose-500/10 hover:bg-red-100 dark:hover:bg-rose-500/20 text-red-700 dark:text-rose-400 border border-red-200 dark:border-rose-500/30 transition-all cursor-pointer shadow-2xs"
                        >
                            <Trash2 className="w-4 h-4" />
                            Purge Old Logs
                        </button>
                    </div>
                </div>

                {/* Statistics Overview KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="p-4 rounded-2xl bg-white dark:bg-[#0b0f19] border border-gray-200/80 dark:border-white/10 shadow-2xs space-y-1">
                        <span className="text-xs font-bold text-gray-500 dark:text-zinc-400">Total Logged Emails</span>
                        <div className="flex items-baseline justify-between pt-1">
                            <span className="text-2xl font-black text-gray-900 dark:text-white">{stats.total.toLocaleString()}</span>
                            <Mail className="w-5 h-5 text-gray-400 dark:text-zinc-500" />
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-500/20 shadow-2xs space-y-1">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Sent Successfully</span>
                        <div className="flex items-baseline justify-between pt-1">
                            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{stats.sent.toLocaleString()}</span>
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-600/90 dark:text-emerald-400/80 block pt-0.5">{stats.sent_today} sent today</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-red-50/50 dark:bg-rose-950/20 border border-red-200/80 dark:border-rose-500/20 shadow-2xs space-y-1">
                        <span className="text-xs font-bold text-red-700 dark:text-rose-400">Failed Deliveries</span>
                        <div className="flex items-baseline justify-between pt-1">
                            <span className="text-2xl font-black text-red-700 dark:text-rose-400">{stats.failed.toLocaleString()}</span>
                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-rose-400" />
                        </div>
                        <span className="text-[11px] font-semibold text-red-600/90 dark:text-rose-400/80 block pt-0.5">{stats.failed_today} failed today</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-500/20 shadow-2xs space-y-1">
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Queued / Processing</span>
                        <div className="flex items-baseline justify-between pt-1">
                            <span className="text-2xl font-black text-amber-700 dark:text-amber-400">{(stats.queued + stats.processing).toLocaleString()}</span>
                            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-[#0b0f19] border border-gray-200/80 dark:border-white/10 shadow-2xs space-y-1">
                        <span className="text-xs font-bold text-gray-500 dark:text-zinc-400">Retention Policy</span>
                        <div className="flex items-baseline justify-between pt-1">
                            <span className="text-lg font-extrabold text-gray-900 dark:text-zinc-100">{retentionDays === "0" ? "Infinite" : `${retentionDays} Days`}</span>
                            <Sparkles className="w-5 h-5 text-emerald-500" />
                        </div>
                        <span className="text-[11px] font-medium text-gray-500 dark:text-zinc-400 block pt-0.5">
                            {loggingEnabled ? "Logging Active" : "Logging Disabled"}
                        </span>
                    </div>
                </div>

                {/* Filter & Search Toolbar */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#0b0f19] border border-gray-200/80 dark:border-white/10 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[280px]">
                        <Search className="w-4 h-4 text-gray-400 dark:text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search recipient, subject, or template..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="w-full pl-10 pr-9 py-2 rounded-xl bg-gray-50 dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-700/80 text-xs font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                        {search && (
                            <button
                                onClick={() => {
                                    setSearch("");
                                    setPage(1);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
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
                            className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-700/80 text-xs font-semibold text-gray-700 dark:text-zinc-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
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
                            className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-700/80 text-xs font-semibold text-gray-700 dark:text-zinc-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
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
                                <button className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-700/80 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer">
                                    <CalendarIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span>{startDate ? format(startDate, "MMM dd, yyyy") : "Start Date"}</span>
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-white" align="start">
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
                                <button className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-700/80 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer">
                                    <CalendarIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span>{endDate ? format(endDate, "MMM dd, yyyy") : "End Date"}</span>
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-white" align="start">
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
                                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300 transition-colors cursor-pointer"
                                title="Reset all filters"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Bulk Actions Bar */}
                {selectedIds.length > 0 && (
                    <div className="p-3 px-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-between text-xs font-semibold">
                        <span className="text-emerald-800 dark:text-emerald-400">
                            {selectedIds.length} email log item{selectedIds.length > 1 ? "s" : ""} selected
                        </span>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleBulkDelete}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 text-red-700 dark:text-rose-400 border border-red-200 dark:border-rose-500/30 transition-all cursor-pointer"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete Selected
                            </button>
                        </div>
                    </div>
                )}

                {/* Data Table / Skeleton Loader */}
                <div className="rounded-2xl bg-white dark:bg-[#0b0f19] border border-gray-200/80 dark:border-white/10 shadow-2xs overflow-hidden">
                    {loading ? (
                        <TableSkeleton rows={8} />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50/80 dark:bg-zinc-900/60 text-gray-500 dark:text-zinc-400 uppercase tracking-wider font-extrabold border-b border-gray-200 dark:border-zinc-800">
                                    <tr>
                                        <th className="p-4 w-10 text-center">
                                            <input
                                                type="checkbox"
                                                checked={logs.length > 0 && selectedIds.length === logs.length}
                                                onChange={handleSelectAll}
                                                className="rounded border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-emerald-600 focus:ring-emerald-500/30"
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
                                <tbody className="divide-y divide-gray-200/70 dark:divide-zinc-800/60 text-gray-700 dark:text-zinc-300">
                                    {logs.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-12 text-center text-gray-500 dark:text-zinc-500 space-y-3">
                                                <Mail className="w-10 h-10 mx-auto text-gray-400 dark:text-zinc-600 opacity-60" />
                                                <p className="font-bold text-gray-700 dark:text-zinc-300">No email logs found</p>
                                                <p className="text-xs text-gray-500 dark:text-zinc-500">Try adjusting your filters or search terms.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.map((log) => {
                                            const isSelected = selectedIds.includes(log.id);
                                            const recipientEmail = log.to || log.recipient_email || "N/A";
                                            const recipientName = log.recipient_name || log.customer?.name || null;

                                            return (
                                                <tr
                                                    key={log.id}
                                                    className={`hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors ${
                                                        isSelected ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""
                                                    }`}
                                                >
                                                    <td className="p-4 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleSelectOne(log.id)}
                                                            className="rounded border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-emerald-600 focus:ring-emerald-500/30"
                                                        />
                                                    </td>

                                                    <td className="p-4 font-mono text-[11px]">
                                                        <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">#{log.id}</span>
                                                        <div className="text-gray-500 dark:text-zinc-400 text-[11px] font-sans mt-0.5">
                                                            {formatDate(log.sent_at || log.created_at)}
                                                        </div>
                                                    </td>

                                                    <td className="p-4">
                                                        <div className="font-bold text-gray-900 dark:text-white text-xs">
                                                            {recipientName || recipientEmail}
                                                        </div>
                                                        {recipientName && (
                                                            <div className="text-gray-500 dark:text-zinc-400 text-[11px] font-mono">
                                                                {recipientEmail}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="p-4 max-w-[280px]">
                                                        <span className="font-semibold text-gray-800 dark:text-zinc-200 line-clamp-1" title={log.subject}>
                                                            {log.subject || "No Subject"}
                                                        </span>
                                                        {log.order && (
                                                            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-mono text-[10px] border border-blue-200 dark:border-blue-500/20">
                                                                Order #{log.order.order_number}
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="p-4">
                                                        <span className="inline-block px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-mono text-[11px] border border-gray-200 dark:border-zinc-700">
                                                            {log.template_key || log.email_type || "General"}
                                                        </span>
                                                    </td>

                                                    <td className="p-4">
                                                        {renderStatusBadge(log.status)}
                                                    </td>

                                                    <td className="p-4 text-right space-x-2">
                                                        <button
                                                            onClick={() => fetchLogDetail(log)}
                                                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-emerald-700 dark:text-emerald-400 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                                            title="View Email & Details"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>

                                                        <button
                                                            onClick={() => handleDeleteSingle(log.id)}
                                                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-rose-900/40 text-gray-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
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
                    )}

                    {/* Pagination Footer */}
                    <div className="p-4 border-t border-gray-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 dark:text-zinc-400">
                        <div className="flex items-center gap-3">
                            <span>Showing {logs.length} of {totalItems} logs</span>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setPage(1);
                                }}
                                className="px-2 py-1 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-xs focus:outline-none"
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
                                className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 disabled:opacity-40 text-gray-700 dark:text-zinc-300 transition-colors cursor-pointer"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="font-extrabold text-gray-900 dark:text-white">
                                Page {page} of {totalPages || 1}
                            </span>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 disabled:opacity-40 text-gray-700 dark:text-zinc-300 transition-colors cursor-pointer"
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
                    <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 animate-fade-in" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-4xl max-h-[90vh] bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl z-50 flex flex-col space-y-4 focus:outline-none overflow-hidden">
                        {selectedLog && (
                            <>
                                {/* Modal Header */}
                                <div className="flex items-start justify-between border-b border-gray-200 dark:border-zinc-800 pb-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">Log #{selectedLog.id}</span>
                                            {renderStatusBadge(selectedLog.status)}
                                            {selectedLog.is_test && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                                                    Test Mail
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="text-lg font-extrabold text-gray-900 dark:text-white line-clamp-1">{selectedLog.subject || "No Subject"}</h2>
                                        <p className="text-xs text-gray-500 dark:text-zinc-400">
                                            To: <span className="font-mono font-bold text-gray-800 dark:text-zinc-200">{selectedLog.to || selectedLog.recipient_email}</span> | Sent: {formatDate(selectedLog.sent_at || selectedLog.created_at)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedLog(null)}
                                        className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-500 dark:text-zinc-400 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Modal Tabs */}
                                <div className="flex items-center gap-2 border-b border-gray-200 dark:border-zinc-800 pb-2">
                                    <button
                                        onClick={() => setActiveTab("html")}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                            activeTab === "html"
                                                ? "bg-emerald-600 text-white shadow-xs"
                                                : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
                                        }`}
                                    >
                                        HTML Preview
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("text")}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                            activeTab === "text"
                                                ? "bg-emerald-600 text-white shadow-xs"
                                                : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
                                        }`}
                                    >
                                        Text Content
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("details")}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                            activeTab === "details"
                                                ? "bg-emerald-600 text-white shadow-xs"
                                                : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
                                        }`}
                                    >
                                        Metadata & Headers
                                    </button>
                                    {selectedLog.error_message && (
                                        <button
                                            onClick={() => setActiveTab("error")}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                activeTab === "error"
                                                    ? "bg-red-600 text-white shadow-xs"
                                                    : "bg-red-50 dark:bg-rose-500/10 text-red-600 dark:text-rose-400 hover:bg-red-100 dark:hover:bg-rose-500/20"
                                            }`}
                                        >
                                            Error Log
                                        </button>
                                    )}
                                </div>

                                {/* Modal Body Content */}
                                <div className="flex-1 min-h-[300px] overflow-y-auto pr-1 space-y-4">
                                    {detailLoading ? (
                                        <div className="p-8 text-center space-y-3">
                                            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
                                            <p className="text-xs font-bold text-gray-500 dark:text-zinc-400">Loading email content...</p>
                                        </div>
                                    ) : activeTab === "html" ? (
                                        selectedLog.body ? (
                                            <iframe
                                                srcDoc={selectedLog.body}
                                                className="w-full h-[450px] rounded-xl border border-gray-200 dark:border-zinc-800 bg-white"
                                                title="Email Body Preview"
                                            />
                                        ) : (
                                            <div className="p-8 text-center text-gray-500 dark:text-zinc-400 text-xs">
                                                No HTML body content recorded for this log.
                                            </div>
                                        )
                                    ) : activeTab === "text" ? (
                                        <pre className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 font-mono text-xs text-gray-800 dark:text-zinc-300 whitespace-pre-wrap">
                                            {selectedLog.text_body || selectedLog.body || "No text body content available."}
                                        </pre>
                                    ) : activeTab === "details" ? (
                                        <div className="space-y-4 text-xs">
                                            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800">
                                                <div>
                                                    <span className="font-bold text-gray-500 dark:text-zinc-500 block">From:</span>
                                                    <span className="font-mono text-gray-900 dark:text-white">{selectedLog.from_name ? `${selectedLog.from_name} <${selectedLog.from_email}>` : selectedLog.from_email}</span>
                                                </div>
                                                <div>
                                                    <span className="font-bold text-gray-500 dark:text-zinc-500 block">To:</span>
                                                    <span className="font-mono text-gray-900 dark:text-white">{selectedLog.to || selectedLog.recipient_email}</span>
                                                </div>
                                                <div>
                                                    <span className="font-bold text-gray-500 dark:text-zinc-500 block">Template Key:</span>
                                                    <span className="font-mono text-emerald-600 dark:text-emerald-400">{selectedLog.template_key || "N/A"}</span>
                                                </div>
                                                <div>
                                                    <span className="font-bold text-gray-500 dark:text-zinc-500 block">Provider:</span>
                                                    <span className="font-mono text-gray-900 dark:text-white">{selectedLog.provider || "SMTP / Default"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-xl bg-red-50 dark:bg-rose-950/20 border border-red-200 dark:border-rose-500/20 text-red-700 dark:text-rose-400 font-mono text-xs whitespace-pre-wrap">
                                            {selectedLog.error_message}
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
                    <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl z-50 space-y-4 focus:outline-none">
                        <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 pb-3">
                            <h3 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                                <Settings className="w-5 h-5 text-emerald-500" />
                                Retention & Logging Settings
                            </h3>
                            <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4 text-xs">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700">
                                <div>
                                    <span className="font-bold text-gray-900 dark:text-white block">Enable Email Logging</span>
                                    <span className="text-[11px] text-gray-500 dark:text-zinc-400">Save dispatches to audit database</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={loggingEnabled}
                                    onChange={(e) => setLoggingEnabled(e.target.checked)}
                                    className="h-5 w-5 rounded border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-emerald-600 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="font-bold text-gray-700 dark:text-zinc-300">Retention Period (Days)</label>
                                <select
                                    value={retentionDays}
                                    onChange={(e) => setRetentionDays(e.target.value)}
                                    className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
                                >
                                    <option value="7">7 Days</option>
                                    <option value="15">15 Days</option>
                                    <option value="30">30 Days</option>
                                    <option value="60">60 Days</option>
                                    <option value="90">90 Days</option>
                                    <option value="180">180 Days</option>
                                    <option value="365">365 Days</option>
                                    <option value="0">Keep Indefinitely (Never)</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-zinc-800">
                            <button
                                onClick={() => setShowSettings(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveSettings}
                                disabled={settingsLoading}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
                            >
                                {settingsLoading ? "Saving..." : "Save Settings"}
                            </button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Manual Purge Modal */}
            <Dialog.Root open={showCleanupModal} onOpenChange={setShowCleanupModal}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl z-50 space-y-4 focus:outline-none">
                        <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 pb-3">
                            <h3 className="text-base font-extrabold text-red-600 dark:text-rose-400 flex items-center gap-2">
                                <Trash2 className="w-5 h-5" />
                                Purge Historical Logs
                            </h3>
                            <button onClick={() => setShowCleanupModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs text-gray-600 dark:text-zinc-300">
                            <p>
                                Purging removes read or historical email logs created older than the specified number of days from the database.
                            </p>
                            <div className="space-y-1.5 pt-2">
                                <label className="font-bold text-gray-700 dark:text-zinc-200">Purge logs older than:</label>
                                <select
                                    value={cleanupDays}
                                    onChange={(e) => setCleanupDays(Number(e.target.value))}
                                    className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-red-500"
                                >
                                    <option value={7}>7 Days</option>
                                    <option value={15}>15 Days</option>
                                    <option value={30}>30 Days</option>
                                    <option value={60}>60 Days</option>
                                    <option value={90}>90 Days</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-zinc-800">
                            <button
                                onClick={() => setShowCleanupModal(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRunCleanup}
                                disabled={cleaning}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
                            >
                                {cleaning ? "Purging..." : "Purge Logs Now"}
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
        <Suspense fallback={<TableSkeleton rows={8} />}>
            <EmailLogsContent />
        </Suspense>
    );
}
