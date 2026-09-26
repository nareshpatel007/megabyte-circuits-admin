"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import {
    Activity,
    RefreshCw,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    HelpCircle,
    Server,
    Database,
    HardDrive,
    Clock,
    Zap,
    Cpu,
    Mail,
    Terminal,
    Shield,
    FileText,
    ListFilter,
    Search,
    RotateCcw,
    Trash2,
    Play,
    Send,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    Sparkles,
    Check,
    Layers,
    Sliders,
    Globe
} from "lucide-react";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";

interface SystemHealthData {
    overall_status: 'healthy' | 'warning' | 'critical' | 'unknown';
    timestamp: string;
    subsystem_statuses: Record<string, 'healthy' | 'warning' | 'critical' | 'unknown'>;
    potential_issues: {
        type: 'warning' | 'critical';
        category: string;
        title: string;
        description: string;
    }[];
    application: {
        status: string;
        laravel_version: string;
        php_version: string;
        environment: string;
        debug_mode: boolean;
        app_url: string;
        app_key_configured: boolean;
        server_hostname: string;
        current_time: string;
        uptime: string | null;
        warnings: string[];
    };
    database: {
        status: string;
        connection: string;
        database_name: string;
        response_time_ms: number;
        server_version: string;
        error: string | null;
    };
    cache: {
        status: string;
        driver: string;
        response_time_ms: number;
        test_passed: boolean;
        error: string | null;
        caches_status: {
            config_cached: boolean;
            routes_cached: boolean;
            events_cached: boolean;
            views_cached: boolean;
        };
    };
    queue: {
        status: string;
        driver: string;
        pending_jobs: number;
        failed_jobs: number;
        last_failed_job_at: string | null;
        oldest_pending_age_sec: number | null;
    };
    scheduler: {
        status: string;
        last_heartbeat_at: string | null;
        minutes_since_last_heartbeat: number | null;
        scheduled_tasks_count: number;
    };
    storage: {
        status: string;
        is_writable: boolean;
        disk_total_gb: number | null;
        disk_free_gb: number | null;
        used_percentage: number | null;
        directories: Record<string, boolean>;
    };
    php: {
        status: string;
        version: string;
        memory_limit: string;
        max_execution_time: string;
        upload_max_filesize: string;
        post_max_size: string;
        timezone: string;
        opcache_enabled: boolean;
        opcache_stats: {
            hit_rate: number;
            hits: number;
            misses: number;
        } | null;
    };
    logs: {
        status: string;
        channel: string;
        log_size_mb: number;
        recent_errors_count: number;
        recent_warnings_count: number;
        latest_error_at: string | null;
        latest_error_summary: string | null;
    };
    services: {
        status: string;
        services: Record<string, {
            name: string;
            status: string;
            url?: string;
            response_time_ms?: number;
            configured?: boolean;
            mailer?: string;
        }>;
    };
}

interface MaintenanceAction {
    key: string;
    label: string;
    system: string;
    description: string;
}

interface MaintenanceResult {
    success: boolean;
    action: string;
    label: string;
    status: string;
    duration_ms: number;
    started_at: string;
    completed_at: string;
    output: string;
    error_message: string | null;
}

interface LogEntry {
    timestamp: string;
    environment: string;
    level: string;
    message: string;
    trace: string;
}

interface AuditLogItem {
    id: number;
    admin_id: number | null;
    admin_name: string | null;
    action: string;
    target_system: string | null;
    status: string;
    started_at: string;
    completed_at: string;
    duration_ms: number;
    ip_address: string | null;
    error_message: string | null;
    metadata: string | null;
    created_at: string;
}

interface FailedJob {
    id: number;
    uuid: string;
    connection: string;
    queue: string;
    payload: string;
    exception: string;
    exception_summary: string;
    failed_at: string;
}

export default function SystemHealthPage() {
    const [health, setHealth] = useState<SystemHealthData | null>(null);
    const [actions, setActions] = useState<MaintenanceAction[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

    const [activeTab, setActiveTab] = useState<'overview' | 'maintenance' | 'failed-jobs' | 'logs' | 'audit' | 'tests'>('overview');

    // Maintenance Execution State
    const [selectedAction, setSelectedAction] = useState<MaintenanceAction | null>(null);
    const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
    const [executing, setExecuting] = useState<boolean>(false);
    const [executionResult, setExecutionResult] = useState<MaintenanceResult | null>(null);

    // Logs State
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [logLevel, setLogLevel] = useState<string>('all');
    const [logSearch, setLogSearch] = useState<string>('');
    const [loadingLogs, setLoadingLogs] = useState<boolean>(false);

    // Audit State
    const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
    const [loadingAudit, setLoadingAudit] = useState<boolean>(false);

    // Failed Jobs State
    const [failedJobs, setFailedJobs] = useState<FailedJob[]>([]);
    const [loadingJobs, setLoadingJobs] = useState<boolean>(false);

    // Diagnostics / Mail Test State
    const [recipientEmail, setRecipientEmail] = useState<string>('');
    const [sendingMail, setSendingMail] = useState<boolean>(false);
    const [testingService, setTestingService] = useState<string | null>(null);

    // Fetch Health Summary
    const fetchHealth = useCallback(async (isManual: boolean = false) => {
        if (isManual) setRefreshing(true);
        try {
            const url = isManual ? "/api/admin/system-health?refresh=1" : "/api/admin/system-health";
            const res = await fetch(url);
            const data = await res.json();
            if (data.success && data.data) {
                setHealth(data.data);
                if (data.available_maintenance_actions) {
                    setActions(data.available_maintenance_actions);
                }
                if (isManual) {
                    toast.success("System health metrics updated");
                }
            } else {
                toast.error(data.message || "Failed to fetch health status");
            }
        } catch (err: any) {
            toast.error("Error fetching system health: " + err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchHealth();
    }, [fetchHealth]);

    // Auto-refresh interval (30 seconds)
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => {
            fetchHealth(false);
        }, 30000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchHealth]);

    // Fetch Application Logs
    const fetchLogs = useCallback(async () => {
        setLoadingLogs(true);
        try {
            const query = new URLSearchParams({
                level: logLevel,
                search: logSearch,
                limit: "150"
            });
            const res = await fetch(`/api/admin/system-health/logs?${query.toString()}`);
            const data = await res.json();
            if (data.success) {
                setLogs(data.data || []);
            } else {
                toast.error(data.message || "Failed to load logs");
            }
        } catch (err: any) {
            toast.error("Error fetching logs: " + err.message);
        } finally {
            setLoadingLogs(false);
        }
    }, [logLevel, logSearch]);

    // Fetch Audit Logs
    const fetchAudit = useCallback(async () => {
        setLoadingAudit(true);
        try {
            const res = await fetch("/api/admin/system-health/audit");
            const data = await res.json();
            if (data.success) {
                setAuditLogs(data.data || []);
            }
        } catch (err: any) {
            toast.error("Error fetching audit logs: " + err.message);
        } finally {
            setLoadingAudit(false);
        }
    }, []);

    // Fetch Failed Jobs
    const fetchFailedJobs = useCallback(async () => {
        setLoadingJobs(true);
        try {
            const res = await fetch("/api/admin/system-health/failed-jobs");
            const data = await res.json();
            if (data.success) {
                setFailedJobs(data.data || []);
            }
        } catch (err: any) {
            toast.error("Error fetching failed jobs: " + err.message);
        } finally {
            setLoadingJobs(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'logs') fetchLogs();
        if (activeTab === 'audit') fetchAudit();
        if (activeTab === 'failed-jobs') fetchFailedJobs();
    }, [activeTab, fetchLogs, fetchAudit, fetchFailedJobs]);

    // Handle Maintenance Execution
    const executeAction = async (actionKey: string) => {
        setExecuting(true);
        setExecutionResult(null);
        try {
            const res = await fetch("/api/admin/system-health/maintenance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: actionKey }),
            });
            const data = await res.json();
            if (data.success && data.data) {
                setExecutionResult(data.data);
                toast.success(data.message || "Maintenance executed successfully");
                fetchHealth(true);
                if (activeTab === 'audit') fetchAudit();
            } else {
                toast.error(data.message || "Maintenance operation failed");
                if (data.data) setExecutionResult(data.data);
            }
        } catch (err: any) {
            toast.error("Execution error: " + err.message);
        } finally {
            setExecuting(false);
            setConfirmModalOpen(false);
        }
    };

    // Handle Failed Job Action
    const handleJobAction = async (operation: string, id?: number) => {
        try {
            const res = await fetch("/api/admin/system-health/failed-jobs/action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ operation, id }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message);
                fetchFailedJobs();
                fetchHealth(false);
            } else {
                toast.error(data.message || "Failed job operation failed");
            }
        } catch (err: any) {
            toast.error("Error performing job action: " + err.message);
        }
    };

    // Handle Test Email
    const handleSendTestMail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recipientEmail) {
            toast.error("Please enter a recipient email address");
            return;
        }
        setSendingMail(true);
        try {
            const res = await fetch("/api/admin/system-health/test-mail", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ recipient_email: recipientEmail }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message);
            } else {
                toast.error(data.message || "Mail test failed");
            }
        } catch (err: any) {
            toast.error("Error sending test mail: " + err.message);
        } finally {
            setSendingMail(false);
        }
    };

    // Handle Test External Service
    const handleTestService = async (serviceKey: string) => {
        setTestingService(serviceKey);
        try {
            const res = await fetch("/api/admin/system-health/test-service", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ service: serviceKey }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`${serviceKey.toUpperCase()}: ${data.message}`);
            } else {
                toast.error(`${serviceKey.toUpperCase()}: ${data.message}`);
            }
        } catch (err: any) {
            toast.error("Service test error: " + err.message);
        } finally {
            setTestingService(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'healthy':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Healthy
                    </span>
                );
            case 'warning':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <AlertTriangle className="w-3.5 h-3.5" /> Warning
                    </span>
                );
            case 'critical':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        <XCircle className="w-3.5 h-3.5" /> Critical
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                        <HelpCircle className="w-3.5 h-3.5" /> Unknown
                    </span>
                );
        }
    };

    return (
        <DashboardLayout title="System Health">
            <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
                {/* Header Title & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 text-primary rounded-xl">
                            <Activity className="w-7 h-7" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                    System Health & Admin Recovery Center
                                </h1>
                                {health && getStatusBadge(health.overall_status)}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Real-time monitoring, diagnostic metrics, and safe Laravel administrative recovery operations.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                        <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none bg-muted/50 px-3 py-2 rounded-xl border border-border">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                            />
                            Auto-refresh (30s)
                        </label>

                        <button
                            onClick={() => fetchHealth(true)}
                            disabled={refreshing || loading}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 shadow-sm"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                            Refresh Now
                        </button>
                    </div>
                </div>

                {/* Potential Issues Alert Banner */}
                {health && health.potential_issues && health.potential_issues.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-sm">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                            Potential System Degradations / Attention Required ({health.potential_issues.length})
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {health.potential_issues.map((issue, idx) => (
                                <div key={idx} className="bg-background/80 p-3.5 rounded-xl border border-amber-500/20 text-xs space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                                            <span className={`w-2 h-2 rounded-full ${issue.type === 'critical' ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
                                            [{issue.category}] {issue.title}
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${issue.type === 'critical' ? 'bg-rose-500/20 text-rose-600' : 'bg-amber-500/20 text-amber-600'}`}>
                                            {issue.type}
                                        </span>
                                    </div>
                                    <p className="text-muted-foreground">{issue.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Navigation Tabs */}
                <div className="flex border-b border-border space-x-2 sm:space-x-4 overflow-x-auto pb-1 scrollbar-none">
                    {[
                        { id: 'overview', label: 'System Dashboard', icon: Server },
                        { id: 'maintenance', label: 'Maintenance & Recovery', icon: Zap },
                        { id: 'failed-jobs', label: `Failed Queue Jobs (${health?.queue?.failed_jobs || 0})`, icon: RotateCcw },
                        { id: 'logs', label: 'Application Logs', icon: FileText },
                        { id: 'audit', label: 'Maintenance Audit Log', icon: Shield },
                        { id: 'tests', label: 'Diagnostics & Connectivity', icon: Terminal },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
                                    active
                                        ? "border-primary text-primary font-semibold"
                                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* TAB 1: OVERVIEW DASHBOARD CARDS */}
                {activeTab === 'overview' && (
                    loading || !health ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="h-44 bg-card rounded-2xl border border-border"></div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                                {/* Card 1: Application */}
                                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-4 hover:border-primary/40 transition-all">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                                                <Server className="w-5 h-5" />
                                            </div>
                                            <h3 className="font-semibold text-foreground">Application</h3>
                                        </div>
                                        {getStatusBadge(health.application.status)}
                                    </div>
                                    <div className="space-y-2 text-xs text-muted-foreground border-t border-border pt-3">
                                        <div className="flex justify-between">
                                            <span>Laravel Version:</span>
                                            <span className="font-semibold text-foreground">v{health.application.laravel_version}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>PHP Version:</span>
                                            <span className="font-semibold text-foreground">v{health.application.php_version}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Environment:</span>
                                            <span className="font-semibold text-foreground capitalize">{health.application.environment}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Debug Mode:</span>
                                            <span className={`font-semibold ${health.application.debug_mode ? "text-amber-600" : "text-emerald-600"}`}>
                                                {health.application.debug_mode ? "ON (Warning)" : "OFF (Safe)"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Server Host:</span>
                                            <span className="font-mono text-foreground">{health.application.server_hostname}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Card 2: Database Health */}
                                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-4 hover:border-primary/40 transition-all">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                                                <Database className="w-5 h-5" />
                                            </div>
                                            <h3 className="font-semibold text-foreground">Database Health</h3>
                                        </div>
                                        {getStatusBadge(health.database.status)}
                                    </div>
                                    <div className="space-y-2 text-xs text-muted-foreground border-t border-border pt-3">
                                        <div className="flex justify-between">
                                            <span>Connection Driver:</span>
                                            <span className="font-semibold text-foreground uppercase">{health.database.connection}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Database Name:</span>
                                            <span className="font-mono text-foreground">{health.database.database_name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Ping Latency:</span>
                                            <span className="font-semibold text-emerald-600">{health.database.response_time_ms} ms</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>DB Server Version:</span>
                                            <span className="font-mono text-foreground truncate max-w-[150px]">{health.database.server_version}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Card 3: Cache Health */}
                                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-4 hover:border-primary/40 transition-all">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg">
                                                <Zap className="w-5 h-5" />
                                            </div>
                                            <h3 className="font-semibold text-foreground">Cache Health</h3>
                                        </div>
                                        {getStatusBadge(health.cache.status)}
                                    </div>
                                    <div className="space-y-2 text-xs text-muted-foreground border-t border-border pt-3">
                                        <div className="flex justify-between">
                                            <span>Cache Driver:</span>
                                            <span className="font-semibold text-foreground uppercase">{health.cache.driver}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Test Read/Write:</span>
                                            <span className={`font-semibold ${health.cache.test_passed ? "text-emerald-600" : "text-rose-600"}`}>
                                                {health.cache.test_passed ? "Passed" : "Failed"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Config / Routes Cached:</span>
                                            <span className="font-medium text-foreground">
                                                {health.cache.caches_status.config_cached ? "Config ✓ " : ""}{health.cache.caches_status.routes_cached ? "Routes ✓" : "Uncached"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Test Latency:</span>
                                            <span className="font-semibold text-purple-600">{health.cache.response_time_ms} ms</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Card 4: Queue Health */}
                                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-4 hover:border-primary/40 transition-all">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
                                                <RotateCcw className="w-5 h-5" />
                                            </div>
                                            <h3 className="font-semibold text-foreground">Queue & Workers</h3>
                                        </div>
                                        {getStatusBadge(health.queue.status)}
                                    </div>
                                    <div className="space-y-2 text-xs text-muted-foreground border-t border-border pt-3">
                                        <div className="flex justify-between">
                                            <span>Queue Connection:</span>
                                            <span className="font-semibold text-foreground uppercase">{health.queue.driver}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Pending Jobs:</span>
                                            <span className="font-semibold text-foreground">{health.queue.pending_jobs}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Failed Jobs Count:</span>
                                            <span className={`font-semibold ${health.queue.failed_jobs > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                                {health.queue.failed_jobs}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Last Failed:</span>
                                            <span className="text-foreground">{health.queue.last_failed_job_at || "None"}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Card 5: Scheduler Health */}
                                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-4 hover:border-primary/40 transition-all">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-lg">
                                                <Clock className="w-5 h-5" />
                                            </div>
                                            <h3 className="font-semibold text-foreground">Cron Scheduler</h3>
                                        </div>
                                        {getStatusBadge(health.scheduler.status)}
                                    </div>
                                    <div className="space-y-2 text-xs text-muted-foreground border-t border-border pt-3">
                                        <div className="flex justify-between">
                                            <span>Heartbeat Status:</span>
                                            <span className="font-semibold text-foreground capitalize">{health.scheduler.status}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Last Heartbeat Pulse:</span>
                                            <span className="font-medium text-foreground">
                                                {health.scheduler.minutes_since_last_heartbeat !== null
                                                    ? `${health.scheduler.minutes_since_last_heartbeat} mins ago`
                                                    : "No Pulse Recorded"}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Active Scheduled Tasks:</span>
                                            <span className="font-semibold text-indigo-600">{health.scheduler.scheduled_tasks_count} tasks</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Card 6: Storage & Disk Space */}
                                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-4 hover:border-primary/40 transition-all">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 bg-rose-500/10 text-rose-600 rounded-lg">
                                                <HardDrive className="w-5 h-5" />
                                            </div>
                                            <h3 className="font-semibold text-foreground">Disk & Storage</h3>
                                        </div>
                                        {getStatusBadge(health.storage.status)}
                                    </div>
                                    <div className="space-y-2.5 text-xs text-muted-foreground border-t border-border pt-3">
                                        <div className="flex justify-between items-center">
                                            <span>Storage Writable:</span>
                                            <span className={`font-semibold ${health.storage.is_writable ? "text-emerald-600" : "text-rose-600"}`}>
                                                {health.storage.is_writable ? "Writable ✓" : "Read Only ✕"}
                                            </span>
                                        </div>
                                        {health.storage.used_percentage !== null && (
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-[11px]">
                                                    <span>Used Disk Space:</span>
                                                    <span className="font-semibold text-foreground">{health.storage.used_percentage}% ({health.storage.disk_free_gb} GB Free)</span>
                                                </div>
                                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all ${
                                                            health.storage.used_percentage > 90 ? "bg-rose-500" : health.storage.used_percentage > 75 ? "bg-amber-500" : "bg-emerald-500"
                                                        }`}
                                                        style={{ width: `${health.storage.used_percentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Card 7: PHP Runtime & OPcache */}
                                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-4 hover:border-primary/40 transition-all">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 bg-cyan-500/10 text-cyan-600 rounded-lg">
                                                <Cpu className="w-5 h-5" />
                                            </div>
                                            <h3 className="font-semibold text-foreground">PHP Runtime</h3>
                                        </div>
                                        {getStatusBadge(health.php.status)}
                                    </div>
                                    <div className="space-y-2 text-xs text-muted-foreground border-t border-border pt-3">
                                        <div className="flex justify-between">
                                            <span>Memory Limit:</span>
                                            <span className="font-semibold text-foreground">{health.php.memory_limit}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Max Execution Time:</span>
                                            <span className="font-semibold text-foreground">{health.php.max_execution_time}s</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Upload Max Filesize:</span>
                                            <span className="font-semibold text-foreground">{health.php.upload_max_filesize}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>OPcache Status:</span>
                                            <span className={`font-semibold ${health.php.opcache_enabled ? "text-emerald-600" : "text-muted-foreground"}`}>
                                                {health.php.opcache_enabled ? `Enabled (${health.php.opcache_stats?.hit_rate}% hit rate)` : "Disabled"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Card 8: Log Monitoring */}
                                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-4 hover:border-primary/40 transition-all">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 bg-orange-500/10 text-orange-600 rounded-lg">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <h3 className="font-semibold text-foreground">Log Health</h3>
                                        </div>
                                        {getStatusBadge(health.logs.status)}
                                    </div>
                                    <div className="space-y-2 text-xs text-muted-foreground border-t border-border pt-3">
                                        <div className="flex justify-between">
                                            <span>Log Channel:</span>
                                            <span className="font-semibold text-foreground uppercase">{health.logs.channel}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Log File Size:</span>
                                            <span className="font-semibold text-foreground">{health.logs.log_size_mb} MB</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Recent Errors Count:</span>
                                            <span className={`font-semibold ${health.logs.recent_errors_count > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                                                {health.logs.recent_errors_count}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Card 9: External Services */}
                                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-4 hover:border-primary/40 transition-all">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                                                <Globe className="w-5 h-5" />
                                            </div>
                                            <h3 className="font-semibold text-foreground">External Services</h3>
                                        </div>
                                        {getStatusBadge(health.services.status)}
                                    </div>
                                    <div className="space-y-2 text-xs text-muted-foreground border-t border-border pt-3">
                                        {Object.entries(health.services.services).map(([key, svc]) => (
                                            <div key={key} className="flex justify-between items-center">
                                                <span>{svc.name}:</span>
                                                <span className={`font-semibold capitalize ${svc.status === 'healthy' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                    {svc.status} {svc.response_time_ms ? `(${svc.response_time_ms}ms)` : ''}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        </div>
                    )
                )}

                {/* TAB 2: MAINTENANCE & RECOVERY OPERATIONS */}
                {activeTab === 'maintenance' && (
                    <div className="space-y-6">
                        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
                            <div>
                                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-primary" /> Controlled Administrative Recovery Operations
                                </h2>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Safely clear caches and trigger framework optimization commands. Every action is rate-limited and logged into the audit record.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-border pt-4">
                                {actions.map((act) => (
                                    <div key={act.key} className="p-4 bg-muted/40 rounded-xl border border-border hover:border-primary/50 transition-all space-y-3 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-primary uppercase tracking-wide px-2 py-0.5 rounded bg-primary/10">
                                                    {act.system}
                                                </span>
                                            </div>
                                            <h4 className="font-semibold text-sm text-foreground mt-2">{act.label}</h4>
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{act.description}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedAction(act);
                                                setConfirmModalOpen(true);
                                            }}
                                            className="w-full py-2 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground text-xs font-semibold rounded-lg transition-all border border-primary/20"
                                        >
                                            Execute Operation
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Execution Result Display */}
                        {executionResult && (
                            <div className={`p-6 rounded-2xl border space-y-3 ${executionResult.success ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-sm flex items-center gap-2 text-foreground">
                                        {executionResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-rose-600" />}
                                        Operation Result: {executionResult.label}
                                    </h3>
                                    <span className="text-xs font-mono text-muted-foreground">
                                        Duration: {executionResult.duration_ms} ms
                                    </span>
                                </div>
                                {executionResult.output && (
                                    <div className="bg-black/90 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto whitespace-pre-wrap max-h-60 border border-emerald-500/20">
                                        {executionResult.output}
                                    </div>
                                )}
                                {executionResult.error_message && (
                                    <p className="text-xs text-rose-600 font-semibold">{executionResult.error_message}</p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: FAILED QUEUE JOBS */}
                {activeTab === 'failed-jobs' && (
                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <RotateCcw className="w-5 h-5 text-amber-500" /> Failed Queue Jobs ({failedJobs.length})
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Inspect, retry, or clear failed queue worker jobs safely.
                                </p>
                            </div>
                            {failedJobs.length > 0 && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleJobAction('retry_all')}
                                        className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white text-xs font-semibold rounded-lg transition-all border border-emerald-500/20"
                                    >
                                        Retry All Jobs
                                    </button>
                                    <button
                                        onClick={() => handleJobAction('flush')}
                                        className="px-3 py-1.5 bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white text-xs font-semibold rounded-lg transition-all border border-rose-500/20"
                                    >
                                        Flush All Failed Jobs
                                    </button>
                                </div>
                            )}
                        </div>

                        {loadingJobs ? (
                            <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading failed jobs...</div>
                        ) : failedJobs.length === 0 ? (
                            <div className="p-8 text-center bg-muted/20 rounded-xl border border-border space-y-2">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                                <p className="text-sm font-semibold text-foreground">No Failed Queue Jobs</p>
                                <p className="text-xs text-muted-foreground">All queued asynchronous background jobs are processing normally.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto border border-border rounded-xl">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] font-semibold">
                                        <tr>
                                            <th className="p-3">ID</th>
                                            <th className="p-3">Connection / Queue</th>
                                            <th className="p-3">Exception Summary</th>
                                            <th className="p-3">Failed At</th>
                                            <th className="p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {failedJobs.map((job) => (
                                            <tr key={job.id} className="hover:bg-muted/30">
                                                <td className="p-3 font-bold text-foreground">#{job.id}</td>
                                                <td className="p-3 font-mono">{job.connection} / {job.queue}</td>
                                                <td className="p-3 text-rose-600 font-mono text-[11px] max-w-md truncate">
                                                    {job.exception_summary}
                                                </td>
                                                <td className="p-3 text-muted-foreground whitespace-nowrap">{job.failed_at}</td>
                                                <td className="p-3 text-right space-x-2 whitespace-nowrap">
                                                    <button
                                                        onClick={() => handleJobAction('retry', job.id)}
                                                        className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-600 hover:text-white font-semibold rounded text-[11px]"
                                                    >
                                                        Retry
                                                    </button>
                                                    <button
                                                        onClick={() => handleJobAction('delete', job.id)}
                                                        className="px-2.5 py-1 bg-rose-500/10 text-rose-600 hover:bg-rose-600 hover:text-white font-semibold rounded text-[11px]"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 4: APPLICATION LOGS */}
                {activeTab === 'logs' && (
                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-orange-500" /> Recent Application Errors & Logs
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Inspecting storage/logs/laravel.log entries (sensitive credentials masked).
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={logLevel}
                                    onChange={(e) => setLogLevel(e.target.value)}
                                    className="px-3 py-1.5 bg-background border border-border rounded-xl text-xs font-medium"
                                >
                                    <option value="all">All Log Levels</option>
                                    <option value="error">ERROR Only</option>
                                    <option value="warning">WARNING Only</option>
                                    <option value="info">INFO Only</option>
                                </select>
                                <input
                                    type="text"
                                    placeholder="Search log messages..."
                                    value={logSearch}
                                    onChange={(e) => setLogSearch(e.target.value)}
                                    className="px-3 py-1.5 bg-background border border-border rounded-xl text-xs w-48"
                                />
                                <button
                                    onClick={fetchLogs}
                                    disabled={loadingLogs}
                                    className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-xl transition-all"
                                >
                                    <RefreshCw className={`w-4 h-4 ${loadingLogs ? "animate-spin" : ""}`} />
                                </button>
                            </div>
                        </div>

                        {loadingLogs ? (
                            <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Parsing log entries...</div>
                        ) : logs.length === 0 ? (
                            <div className="p-8 text-center bg-muted/20 rounded-xl border border-border">
                                <p className="text-xs text-muted-foreground">No recent log entries matching the selected filters.</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                                {logs.map((log, idx) => (
                                    <div key={idx} className="p-4 bg-black/90 text-slate-200 rounded-xl border border-border font-mono text-xs space-y-2">
                                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                            <span className="text-slate-400 text-[11px]">{log.timestamp}</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                log.level === 'ERROR' || log.level === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                                                log.level === 'WARNING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-blue-500/20 text-blue-400'
                                            }`}>
                                                {log.level}
                                            </span>
                                        </div>
                                        <p className="text-emerald-400 font-semibold whitespace-pre-wrap">{log.message}</p>
                                        {log.trace && (
                                            <details className="mt-2 text-[11px] text-slate-400">
                                                <summary className="cursor-pointer text-slate-500 hover:text-slate-300">View Stack Trace</summary>
                                                <pre className="mt-2 p-2 bg-slate-950 rounded text-[10px] overflow-x-auto whitespace-pre-wrap text-slate-400">{log.trace}</pre>
                                            </details>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 5: MAINTENANCE AUDIT LOG */}
                {activeTab === 'audit' && (
                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-indigo-500" /> Administrative Maintenance History
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Complete audit trail of all cache clears, resets, and optimization commands.
                                </p>
                            </div>
                            <button onClick={fetchAudit} className="p-2 bg-primary/10 text-primary rounded-xl">
                                <RefreshCw className={`w-4 h-4 ${loadingAudit ? "animate-spin" : ""}`} />
                            </button>
                        </div>

                        {loadingAudit ? (
                            <div className="p-8 text-center text-xs text-muted-foreground">Loading audit records...</div>
                        ) : auditLogs.length === 0 ? (
                            <div className="p-8 text-center bg-muted/20 rounded-xl border border-border text-xs text-muted-foreground">
                                No maintenance audit logs recorded yet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto border border-border rounded-xl">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] font-semibold">
                                        <tr>
                                            <th className="p-3">Timestamp</th>
                                            <th className="p-3">Admin</th>
                                            <th className="p-3">Action</th>
                                            <th className="p-3">System</th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3">Duration</th>
                                            <th className="p-3">IP Address</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {auditLogs.map((item) => (
                                            <tr key={item.id} className="hover:bg-muted/30">
                                                <td className="p-3 text-muted-foreground whitespace-nowrap">{item.created_at}</td>
                                                <td className="p-3 font-semibold text-foreground">{item.admin_name || "Admin"}</td>
                                                <td className="p-3 font-mono text-primary font-medium">{item.action}</td>
                                                <td className="p-3">{item.target_system || "System"}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.status === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td className="p-3 font-mono">{item.duration_ms} ms</td>
                                                <td className="p-3 font-mono text-muted-foreground">{item.ip_address || "Local"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 6: DIAGNOSTICS & CONNECTIVITY TESTS */}
                {activeTab === 'tests' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Test Mail Form */}
                        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
                            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                                <Mail className="w-5 h-5 text-blue-500" /> Send Test Email (SMTP Diagnostic)
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Verify outgoing mail server configuration and latency by sending a test email.
                            </p>
                            <form onSubmit={handleSendTestMail} className="space-y-3 pt-2">
                                <div>
                                    <label className="text-xs font-medium text-foreground">Recipient Email Address:</label>
                                    <input
                                        type="email"
                                        value={recipientEmail}
                                        onChange={(e) => setRecipientEmail(e.target.value)}
                                        placeholder="admin@example.com"
                                        required
                                        className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-xl text-xs"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={sendingMail}
                                    className="w-full py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    {sendingMail ? "Sending Test Mail..." : "Send Test Email"}
                                </button>
                            </form>
                        </div>

                        {/* Test External Microservices */}
                        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4">
                            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                                <Globe className="w-5 h-5 text-purple-500" /> External Service Connectivity
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Manually trigger lightweight health checks for integrated third-party services.
                            </p>

                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border">
                                    <div>
                                        <h4 className="text-xs font-semibold text-foreground">Gerber Python Analysis API</h4>
                                        <p className="text-[11px] text-muted-foreground">Pings /health endpoint</p>
                                    </div>
                                    <button
                                        onClick={() => handleTestService('gerber')}
                                        disabled={testingService === 'gerber'}
                                        className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-lg hover:bg-primary hover:text-primary-foreground transition-all"
                                    >
                                        {testingService === 'gerber' ? "Testing..." : "Test Connection"}
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border">
                                    <div>
                                        <h4 className="text-xs font-semibold text-foreground">Razorpay Payment Gateway</h4>
                                        <p className="text-[11px] text-muted-foreground">Checks credentials configuration</p>
                                    </div>
                                    <button
                                        onClick={() => handleTestService('razorpay')}
                                        disabled={testingService === 'razorpay'}
                                        className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-lg hover:bg-primary hover:text-primary-foreground transition-all"
                                    >
                                        {testingService === 'razorpay' ? "Testing..." : "Verify Config"}
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border">
                                    <div>
                                        <h4 className="text-xs font-semibold text-foreground">DigiKey Component API</h4>
                                        <p className="text-[11px] text-muted-foreground">Checks client ID configuration</p>
                                    </div>
                                    <button
                                        onClick={() => handleTestService('digikey')}
                                        disabled={testingService === 'digikey'}
                                        className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-lg hover:bg-primary hover:text-primary-foreground transition-all"
                                    >
                                        {testingService === 'digikey' ? "Testing..." : "Verify Config"}
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                {/* CONFIRMATION DIALOG FOR MAINTENANCE OPERATIONS */}
                <Dialog.Root open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
                    <Dialog.Portal>
                        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in" />
                        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border p-6 rounded-2xl shadow-xl w-full max-w-md z-50 space-y-4">
                            <Dialog.Title className="text-lg font-bold text-foreground flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-500" /> Confirm Maintenance Operation
                            </Dialog.Title>
                            <Dialog.Description className="text-xs text-muted-foreground space-y-2">
                                <p>Are you sure you want to execute <strong className="text-foreground">{selectedAction?.label}</strong>?</p>
                                <p className="bg-muted p-2 rounded text-foreground font-mono">{selectedAction?.description}</p>
                                <p className="text-[11px] text-amber-600">This action will be logged in the administrator maintenance audit trail.</p>
                            </Dialog.Description>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setConfirmModalOpen(false)}
                                    disabled={executing}
                                    className="px-4 py-2 bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => selectedAction && executeAction(selectedAction.key)}
                                    disabled={executing}
                                    className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/90 flex items-center gap-2"
                                >
                                    {executing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                                    {executing ? "Executing..." : "Confirm & Run"}
                                </button>
                            </div>
                        </Dialog.Content>
                    </Dialog.Portal>
                </Dialog.Root>

            </div>
        </DashboardLayout>
    );
}
