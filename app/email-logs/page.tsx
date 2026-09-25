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
    Check,
    RotateCcw
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

const formatRetentionDisplay = (days: string) => {
    if (!days) return "N/A";
    const d = String(days).toLowerCase().trim();
    if (d === "0" || d === "never" || d === "infinite") return "Infinite";
    return `${days} Days`;
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
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [emailTypeFilter, setEmailTypeFilter] = useState("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [tempStartDate, setTempStartDate] = useState("");
    const [tempEndDate, setTempEndDate] = useState("");
    const [activePreset, setActivePreset] = useState<string | null>(null);
    const [popoverOpen, setPopoverOpen] = useState(false);

    // Debounce search input to call API after user stops typing
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    const getLast5MonthsOptions = () => {
        const options: { label: string; start: string; end: string; key: string }[] = [];
        const now = new Date();
        for (let i = 0; i < 5; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const start = `${yyyy}-${mm}-01`;
            const lastDay = new Date(yyyy, d.getMonth() + 1, 0).getDate();
            const end = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;
            options.push({ label, start, end, key: `month_${i}` });
        }
        return options;
    };

    const MONTH_OPTIONS = getLast5MonthsOptions();

    const formatDateShort = (dStr: string) => {
        if (!dStr) return "";
        try {
            const parts = dStr.split('-');
            if (parts.length === 3) {
                const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            }
            return dStr;
        } catch {
            return dStr;
        }
    };

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
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

            if (debouncedSearch.trim()) params.append("search", debouncedSearch.trim());
            if (statusFilter !== "all") params.append("status", statusFilter);
            if (emailTypeFilter !== "all") params.append("email_type", emailTypeFilter);
            if (startDate) params.append("start_date", startDate);
            if (endDate) params.append("end_date", endDate);

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
    }, [page, pageSize, debouncedSearch, statusFilter, emailTypeFilter, startDate, endDate]);

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
                if (s.retention_days !== undefined && s.retention_days !== null) {
                    setRetentionDays(String(s.retention_days));
                }
                if (s.logging_enabled !== undefined && s.logging_enabled !== null) {
                    setLoggingEnabled(Boolean(s.logging_enabled));
                }
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

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

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
            if (startDate) params.append("start_date", startDate);
            if (endDate) params.append("end_date", endDate);

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
                fetchSettings();
                fetchStats();
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
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Sent
                </span>
            );
        }
        if (s === "failed") {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-red-500/10 text-red-600 border border-red-500/20 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    Failed
                </span>
            );
        }
        if (s === "queued") {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Queued
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 border border-blue-500/20 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                {status}
            </span>
        );
    };

    const actionHeaderButtons = (
        <div className="flex flex-wrap items-center gap-2.5">
            <button
                onClick={handleExport}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500 hover:text-black transition-all text-xs font-extrabold uppercase tracking-wider cursor-pointer shadow-2xs"
            >
                <Download className="w-4 h-4" />
                Export CSV
            </button>

            <button
                onClick={() => {
                    fetchSettings();
                    setShowSettings(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-muted/40 text-foreground border border-border/80 rounded-xl hover:bg-muted transition-all text-xs font-extrabold uppercase tracking-wider cursor-pointer shadow-2xs"
            >
                <Settings className="w-4 h-4 text-emerald-500" />
                Retention Settings
            </button>

            <button
                onClick={() => setShowCleanupModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white transition-all text-xs font-extrabold uppercase tracking-wider cursor-pointer shadow-2xs"
            >
                <Trash2 className="w-4 h-4" />
                Purge Old Logs
            </button>
        </div>
    );

    return (
        <DashboardLayout
            title="Email Logs & Audit Trail"
            subtitle="Monitor email deliveries, inspect sent messages, debug failures, and configure retention policies."
            action={actionHeaderButtons}
        >
            {loading ? (
                <TableSkeleton rows={8} />
            ) : (
                <div className="space-y-5 animate-in fade-in duration-300">
                    {/* KPI Stats Cards Row matching Inventory Page */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                <Mail className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Logged Emails</p>
                                <h3 className="text-2xl font-black text-foreground mt-0.5">{stats.total.toLocaleString()}</h3>
                            </div>
                        </div>

                        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sent Successfully</p>
                                <h3 className="text-2xl font-black text-emerald-500 mt-0.5">{stats.sent.toLocaleString()}</h3>
                                <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.sent_today} sent today</p>
                            </div>
                        </div>

                        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Failed Deliveries</p>
                                <h3 className="text-2xl font-black text-rose-500 mt-0.5">{stats.failed.toLocaleString()}</h3>
                                <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-0.5">{stats.failed_today} failed today</p>
                            </div>
                        </div>

                        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Queued / Processing</p>
                                <h3 className="text-2xl font-black text-amber-500 mt-0.5">{(stats.queued + stats.processing).toLocaleString()}</h3>
                            </div>
                        </div>

                        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Retention Policy</p>
                                <h3 className="text-lg font-black text-foreground mt-0.5">{formatRetentionDisplay(retentionDays)}</h3>
                                <p className="text-[11px] font-medium text-muted-foreground mt-0.5">{loggingEnabled ? "Logging Active" : "Disabled"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Filter Bar Card matching Inventory Page */}
                    <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative w-full md:w-80">
                            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                            <input
                                type="search"
                                placeholder="Search recipient, subject, or template..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full pl-9 pr-8 py-2 bg-muted/30 border border-border/80 rounded-xl text-xs text-foreground focus:outline-hidden focus:border-emerald-500 font-medium"
                            />
                            {search && (
                                <button
                                    onClick={() => {
                                        setSearch("");
                                        setPage(1);
                                    }}
                                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="px-3.5 py-2 bg-muted/40 border border-border/80 rounded-xl text-foreground font-bold text-xs focus:outline-hidden focus:border-emerald-500 cursor-pointer shadow-xs"
                            >
                                <option value="all">All Statuses</option>
                                <option value="sent">Sent</option>
                                <option value="failed">Failed</option>
                                <option value="queued">Queued</option>
                                <option value="processing">Processing</option>
                            </select>

                            <select
                                value={emailTypeFilter}
                                onChange={(e) => {
                                    setEmailTypeFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="px-3.5 py-2 bg-muted/40 border border-border/80 rounded-xl text-foreground font-bold text-xs focus:outline-hidden focus:border-emerald-500 cursor-pointer shadow-xs"
                            >
                                <option value="all">All Email Types</option>
                                <option value="order">Order Notifications</option>
                                <option value="inventory">Inventory Alerts</option>
                                <option value="customer">Customer Mail</option>
                                <option value="system">System Mail</option>
                            </select>

                            {/* Popover Date Range & Presets Selector */}
                            <Popover open={popoverOpen} onOpenChange={(open) => {
                                setPopoverOpen(open);
                                if (open) {
                                    setTempStartDate(startDate);
                                    setTempEndDate(endDate);
                                }
                            }}>
                                <PopoverTrigger asChild>
                                    <button className="h-9 inline-flex items-center justify-between gap-2 px-3.5 bg-muted/40 border border-border/80 rounded-xl text-xs font-bold text-foreground hover:bg-muted focus:outline-none transition-colors cursor-pointer shadow-2xs shrink-0 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <CalendarIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                            <span>
                                                {activePreset
                                                    ? MONTH_OPTIONS.find(m => m.key === activePreset)?.label || "Date Filter"
                                                    : startDate && endDate
                                                        ? `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`
                                                        : startDate
                                                            ? `From ${formatDateShort(startDate)}`
                                                            : endDate
                                                                ? `Until ${formatDateShort(endDate)}`
                                                                : "Date Filter"}
                                            </span>
                                        </div>
                                        {(startDate || endDate) && (
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setStartDate("");
                                                    setEndDate("");
                                                    setTempStartDate("");
                                                    setTempEndDate("");
                                                    setActivePreset(null);
                                                    setPage(1);
                                                }}
                                                className="p-1 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors ml-1"
                                                title="Clear date filter"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </span>
                                        )}
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="z-50 w-80 sm:w-[360px] p-4 bg-card border border-border/80 rounded-2xl shadow-xl space-y-4 text-foreground"
                                    align="end"
                                    sideOffset={8}
                                >
                                    <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
                                        <span className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                            <CalendarIcon className="w-4 h-4 text-emerald-500" /> Select Date Range
                                        </span>
                                    </div>

                                    {/* Side by Side Start & End Date Inputs */}
                                    <div>
                                        <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block mb-1.5">Custom Date Range</span>
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <div>
                                                <label className="text-[10px] font-bold text-muted-foreground block mb-1">Start Date</label>
                                                <input
                                                    type="date"
                                                    value={tempStartDate}
                                                    onChange={(e) => {
                                                        setTempStartDate(e.target.value);
                                                        setActivePreset(null);
                                                    }}
                                                    className="w-full bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs h-9"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-muted-foreground block mb-1">End Date</label>
                                                <input
                                                    type="date"
                                                    value={tempEndDate}
                                                    onChange={(e) => {
                                                        setTempEndDate(e.target.value);
                                                        setActivePreset(null);
                                                    }}
                                                    className="w-full bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs h-9"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Last 5 Months Quick Options */}
                                    <div className="pt-2 border-t border-border/60">
                                        <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block mb-2">Last 5 Months</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {MONTH_OPTIONS.map((m) => {
                                                const isActive = activePreset === m.key;
                                                return (
                                                    <button
                                                        key={m.key}
                                                        type="button"
                                                        onClick={() => {
                                                            setActivePreset(m.key);
                                                            setTempStartDate(m.start);
                                                            setTempEndDate(m.end);
                                                        }}
                                                        className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all h-auto cursor-pointer ${isActive
                                                            ? "bg-emerald-600 text-white border border-emerald-600 shadow-xs"
                                                            : "bg-muted/40 hover:bg-muted text-foreground border border-border/60"
                                                            }`}
                                                    >
                                                        {m.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Action Buttons: Reset & Apply */}
                                    <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setTempStartDate("");
                                                setTempEndDate("");
                                                setStartDate("");
                                                setEndDate("");
                                                setActivePreset(null);
                                                setPage(1);
                                                setPopoverOpen(false);
                                            }}
                                            className="px-3.5 py-1.5 text-xs font-bold rounded-xl border border-border/80 text-foreground hover:bg-muted h-auto cursor-pointer"
                                        >
                                            Reset
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setStartDate(tempStartDate);
                                                setEndDate(tempEndDate);
                                                setPage(1);
                                                setPopoverOpen(false);
                                            }}
                                            className="px-4 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs h-auto cursor-pointer"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            {(startDate || endDate || statusFilter !== "all" || emailTypeFilter !== "all" || search) && (
                                <button
                                    onClick={() => {
                                        setSearch("");
                                        setStatusFilter("all");
                                        setEmailTypeFilter("all");
                                        setStartDate("");
                                        setEndDate("");
                                        setTempStartDate("");
                                        setTempEndDate("");
                                        setActivePreset(null);
                                        setPage(1);
                                    }}
                                    className="p-2 bg-muted/40 border border-border/80 rounded-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                    title="Reset all filters"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Bulk Selection Notice */}
                    {selectedIds.length > 0 && (
                        <div className="p-3.5 px-5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            <span>{selectedIds.length} email log item{selectedIds.length > 1 ? "s" : ""} selected</span>
                            <button
                                onClick={handleBulkDelete}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer transition-all"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete Selected
                            </button>
                        </div>
                    )}

                    {/* Data Table Component */}
                    <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead>
                                    <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                                        <th className="py-3.5 px-5 w-10 text-center">
                                            <input
                                                type="checkbox"
                                                checked={logs.length > 0 && selectedIds.length === logs.length}
                                                onChange={handleSelectAll}
                                                className="rounded border-border bg-card text-emerald-500 focus:ring-emerald-500/30"
                                            />
                                        </th>
                                        <th className="py-3.5 px-5">Date & Time</th>
                                        <th className="py-3.5 px-5">Recipient</th>
                                        <th className="py-3.5 px-5">Subject</th>
                                        <th className="py-3.5 px-5">Template / Type</th>
                                        <th className="py-3.5 px-5">Status</th>
                                        <th className="py-3.5 px-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {logs.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12 text-muted-foreground font-medium">
                                                No email logs found matching your search.
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.map((log) => {
                                            const isSelected = selectedIds.includes(log.id);
                                            const recipientEmail = log.to || log.recipient_email || "N/A";
                                            const recipientName = log.recipient_name || log.customer?.name || null;

                                            return (
                                                <tr key={log.id} className={`hover:bg-muted/20 transition-colors ${isSelected ? "bg-emerald-500/10" : ""}`}>
                                                    <td className="py-4 px-5 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleSelectOne(log.id)}
                                                            className="rounded border-border bg-card text-emerald-500 focus:ring-emerald-500/30"
                                                        />
                                                    </td>

                                                    <td className="py-4 px-5 text-xs whitespace-nowrap">
                                                        <p className="font-bold text-foreground text-xs">
                                                            {formatDate(log.sent_at || log.created_at)}
                                                        </p>
                                                    </td>

                                                    <td className="py-4 px-5 whitespace-nowrap">
                                                        <p className="font-bold text-foreground text-sm">{recipientName || recipientEmail}</p>
                                                        {recipientName && (
                                                            <p className="text-xs font-mono text-muted-foreground">{recipientEmail}</p>
                                                        )}
                                                    </td>

                                                    <td className="py-4 px-5 max-w-xs">
                                                        <p className="font-bold text-foreground text-xs truncate" title={log.subject}>
                                                            {log.subject || "No Subject"}
                                                        </p>
                                                        {log.order && (
                                                            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-[10px] font-bold border border-blue-500/20">
                                                                Order #{log.order.order_number}
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="py-4 px-5 whitespace-nowrap">
                                                        <span className="inline-block px-2.5 py-1 rounded-md bg-muted text-foreground font-mono text-xs font-bold border border-border/80">
                                                            {log.template_key || log.email_type || "General"}
                                                        </span>
                                                    </td>

                                                    <td className="py-4 px-5 whitespace-nowrap">
                                                        {renderStatusBadge(log.status)}
                                                    </td>

                                                    <td className="py-4 px-5 text-right whitespace-nowrap">
                                                        <div className="inline-flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => fetchLogDetail(log)}
                                                                title="View Email & Details"
                                                                className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500 hover:text-black transition-all cursor-pointer shadow-2xs"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>

                                                            <button
                                                                onClick={() => handleDeleteSingle(log.id)}
                                                                title="Delete Email Log"
                                                                className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white transition-all cursor-pointer shadow-2xs"
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

                        {/* Pagination Footer matching Inventory Page */}
                        <div className="px-5 py-4 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground font-medium">
                            <div>
                                Showing <span className="font-bold text-foreground">{logs.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to <span className="font-bold text-foreground">{Math.min(page * pageSize, totalItems)}</span> of <span className="font-bold text-foreground">{totalItems}</span> email logs
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border/80 bg-muted/30 hover:bg-muted text-foreground font-bold text-xs disabled:opacity-40 transition-colors cursor-pointer"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                                </button>

                                <span className="font-bold text-foreground text-xs">
                                    Page {page} of {totalPages || 1}
                                </span>

                                <button
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border/80 bg-muted/30 hover:bg-muted text-foreground font-bold text-xs disabled:opacity-40 transition-colors cursor-pointer"
                                >
                                    Next <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Email Detail & HTML Preview Modal */}
            <Dialog.Root open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 animate-fade-in" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-4xl max-h-[90vh] bg-card border border-border rounded-3xl p-6 shadow-2xl z-50 flex flex-col space-y-4 focus:outline-none overflow-hidden">
                        {selectedLog && (
                            <>
                                {/* Modal Header */}
                                <div className="flex items-start justify-between border-b border-border/80 pb-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">Log #{selectedLog.id}</span>
                                            {renderStatusBadge(selectedLog.status)}
                                            {selectedLog.is_test && (
                                                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                                    Test Mail
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="text-lg font-black text-foreground truncate">{selectedLog.subject || "No Subject"}</h2>
                                        <p className="text-xs text-muted-foreground font-medium">
                                            To: <span className="font-mono font-bold text-foreground">{selectedLog.to || selectedLog.recipient_email}</span> | Sent: {formatDate(selectedLog.sent_at || selectedLog.created_at)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedLog(null)}
                                        className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Modal Tabs */}
                                <div className="flex items-center gap-2 border-b border-border/80 pb-2">
                                    <button
                                        onClick={() => setActiveTab("html")}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                            activeTab === "html"
                                                ? "bg-emerald-500 text-black shadow-xs"
                                                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                                        }`}
                                    >
                                        HTML Preview
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("text")}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                            activeTab === "text"
                                                ? "bg-emerald-500 text-black shadow-xs"
                                                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                                        }`}
                                    >
                                        Text Content
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("details")}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                            activeTab === "details"
                                                ? "bg-emerald-500 text-black shadow-xs"
                                                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                                        }`}
                                    >
                                        Metadata
                                    </button>
                                    {selectedLog.error_message && (
                                        <button
                                            onClick={() => setActiveTab("error")}
                                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                activeTab === "error"
                                                    ? "bg-rose-500 text-white shadow-xs"
                                                    : "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
                                            }`}
                                        >
                                            Error Log
                                        </button>
                                    )}
                                </div>

                                {/* Modal Body Content */}
                                <div className="flex-1 min-h-[300px] overflow-y-auto space-y-4">
                                    {detailLoading ? (
                                        <div className="p-8 text-center space-y-3">
                                            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
                                            <p className="text-xs font-bold text-muted-foreground">Loading email content...</p>
                                        </div>
                                    ) : activeTab === "html" ? (
                                        selectedLog.body ? (
                                            <iframe
                                                srcDoc={selectedLog.body}
                                                className="w-full h-[450px] rounded-xl border border-border/80 bg-white"
                                                title="Email Body Preview"
                                            />
                                        ) : (
                                            <div className="p-8 text-center text-muted-foreground text-xs font-medium">
                                                No HTML body content recorded for this log.
                                            </div>
                                        )
                                    ) : activeTab === "text" ? (
                                        <pre className="p-4 rounded-xl bg-muted/40 border border-border/80 font-mono text-xs text-foreground whitespace-pre-wrap">
                                            {selectedLog.text_body || selectedLog.body || "No text body content available."}
                                        </pre>
                                    ) : activeTab === "details" ? (
                                        <div className="space-y-4 text-xs">
                                            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-muted/30 border border-border/80">
                                                <div>
                                                    <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider block">From:</span>
                                                    <span className="font-mono text-foreground font-bold">{selectedLog.from_name ? `${selectedLog.from_name} <${selectedLog.from_email}>` : selectedLog.from_email}</span>
                                                </div>
                                                <div>
                                                    <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider block">To:</span>
                                                    <span className="font-mono text-foreground font-bold">{selectedLog.to || selectedLog.recipient_email}</span>
                                                </div>
                                                <div>
                                                    <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider block">Template Key:</span>
                                                    <span className="font-mono text-emerald-600 font-bold">{selectedLog.template_key || "N/A"}</span>
                                                </div>
                                                <div>
                                                    <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider block">Provider:</span>
                                                    <span className="font-mono text-foreground font-bold">{selectedLog.provider || "SMTP / Default"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 font-mono text-xs whitespace-pre-wrap">
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
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl z-50 space-y-4 focus:outline-none">
                        <div className="flex items-center justify-between border-b border-border/80 pb-3">
                            <h3 className="text-base font-black text-foreground flex items-center gap-2">
                                <Settings className="w-5 h-5 text-emerald-500" />
                                Retention & Logging Settings
                            </h3>
                            <button onClick={() => setShowSettings(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4 text-xs">
                            <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border/80">
                                <div>
                                    <span className="font-bold text-foreground block">Enable Email Logging</span>
                                    <span className="text-[11px] text-muted-foreground">Save dispatches to audit database</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={loggingEnabled}
                                    onChange={(e) => setLoggingEnabled(e.target.checked)}
                                    className="h-5 w-5 rounded border-border bg-card text-emerald-500 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="font-bold text-foreground">Retention Period (Days)</label>
                                <select
                                    value={retentionDays}
                                    onChange={(e) => setRetentionDays(e.target.value)}
                                    className="w-full p-2.5 rounded-xl bg-muted/40 border border-border/80 text-xs font-bold text-foreground focus:outline-none focus:border-emerald-500"
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

                        <div className="flex justify-end gap-2 pt-2 border-t border-border/80">
                            <button
                                onClick={() => setShowSettings(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveSettings}
                                disabled={settingsLoading}
                                className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-black transition-colors disabled:opacity-50"
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
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl z-50 space-y-4 focus:outline-none">
                        <div className="flex items-center justify-between border-b border-border/80 pb-3">
                            <h3 className="text-base font-black text-rose-500 flex items-center gap-2">
                                <Trash2 className="w-5 h-5" />
                                Purge Historical Logs
                            </h3>
                            <button onClick={() => setShowCleanupModal(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs text-muted-foreground">
                            <p>
                                Purging removes read or historical email logs created older than the specified number of days from the database.
                            </p>
                            <div className="space-y-1.5 pt-2">
                                <label className="font-bold text-foreground">Purge logs older than:</label>
                                <select
                                    value={cleanupDays}
                                    onChange={(e) => setCleanupDays(Number(e.target.value))}
                                    className="w-full p-2.5 rounded-xl bg-muted/40 border border-border/80 text-xs font-bold text-foreground focus:outline-none focus:border-rose-500"
                                >
                                    <option value={7}>7 Days</option>
                                    <option value={15}>15 Days</option>
                                    <option value={30}>30 Days</option>
                                    <option value={60}>60 Days</option>
                                    <option value={90}>90 Days</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-border/80">
                            <button
                                onClick={() => setShowCleanupModal(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRunCleanup}
                                disabled={cleaning}
                                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-500 hover:bg-rose-600 text-white transition-colors disabled:opacity-50"
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
