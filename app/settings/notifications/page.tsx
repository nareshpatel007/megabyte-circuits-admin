"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import {
    Bell,
    Settings,
    Check,
    RefreshCw,
    Save,
    Trash2,
    Sliders,
    Sparkles,
    ShieldAlert,
    X,
    Eye
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { showBrowserNotification } from "@/lib/browser-notifications";

interface NotificationEventConfig {
    id: number;
    event_key: string;
    event_name: string;
    category: string;
    description: string | null;
    client_enabled: boolean;
    admin_enabled: boolean;
    realtime_enabled: boolean;
    toast_enabled: boolean;
    email_enabled: boolean;
    priority: string;
}

export default function NotificationSettingsPage() {
    const [settings, setSettings] = useState<NotificationEventConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Selected event for live preview
    const [previewEvent, setPreviewEvent] = useState<NotificationEventConfig | null>(null);

    // Cleanup Modal
    const [showCleanupModal, setShowCleanupModal] = useState(false);
    const [cleanupDays, setCleanupDays] = useState(30);
    const [cleaning, setCleaning] = useState(false);

    const getAuthHeaders = useCallback(() => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("admin_token") : null;
        return {
            "Content-Type": "application/json",
            "Accept": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        };
    }, []);

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/notifications/settings", {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.status && Array.isArray(data.settings)) {
                setSettings(data.settings);
                if (data.settings.length > 0 && !previewEvent) {
                    setPreviewEvent(data.settings[0]);
                }
            }
        } catch (e) {
            toast.error("Failed to load notification settings");
        } finally {
            setLoading(false);
        }
    }, [getAuthHeaders, previewEvent]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const handleToggle = (eventKey: string, field: keyof NotificationEventConfig) => {
        setSettings((prev) =>
            prev.map((item) => {
                if (item.event_key === eventKey) {
                    return { ...item, [field]: !item[field] };
                }
                return item;
            })
        );
    };

    const handlePriorityChange = (eventKey: string, priority: string) => {
        setSettings((prev) =>
            prev.map((item) => {
                if (item.event_key === eventKey) {
                    return { ...item, priority };
                }
                return item;
            })
        );
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/admin/notifications/settings", {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ settings })
            });
            const data = await res.json();
            if (data.status) {
                toast.success("Notification configurations saved successfully!");
                if (Array.isArray(data.settings)) {
                    setSettings(data.settings);
                }
            } else {
                toast.error(data.message || "Failed to save settings");
            }
        } catch (e) {
            toast.error("Error saving notification settings");
        } finally {
            setSaving(false);
        }
    };

    const handleRunCleanup = async () => {
        setCleaning(true);
        try {
            const res = await fetch("/api/admin/notifications/cleanup", {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ days: cleanupDays })
            });
            const data = await res.json();
            if (data.status) {
                toast.success(data.message || "Notifications purged successfully");
                setShowCleanupModal(false);
            } else {
                toast.error(data.message || "Failed to purge notifications");
            }
        } catch (e) {
            toast.error("Error purging notifications");
        } finally {
            setCleaning(false);
        }
    };

    return (
        <DashboardLayout
            title="Notification Settings"
            subtitle="Configure real-time event alerts, recipient rules, in-app delivery toggles, and notification retention policies."
        >
            <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
                {/* Top Action Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
                    <div>
                        <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
                            <Bell className="w-6 h-6 md:w-7 md:h-7 text-emerald-500" />
                            Notification System Settings
                        </h1>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">
                            Configure real-time event alerts, recipient rules, in-app delivery toggles, and notification retention policies.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                        <button
                            onClick={() => setShowCleanupModal(true)}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30 transition-all cursor-pointer shadow-2xs"
                        >
                            <Trash2 className="w-4 h-4 text-rose-500" />
                            <span>Purge Old Notifications</span>
                        </button>

                        <button
                            disabled={saving}
                            onClick={handleSaveSettings}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white dark:text-slate-950 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                        >
                            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            <span>Save Configuration</span>
                        </button>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Matrix Table Card */}
                    <div className="lg:col-span-3 rounded-2xl bg-card border border-border/80 overflow-hidden shadow-xs">
                        <div className="p-4 px-5 border-b border-border/80 flex items-center justify-between bg-slate-50/70 dark:bg-muted/20">
                            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Sliders className="w-4 h-4 text-emerald-500" />
                                Event Notification Control Matrix
                            </h2>
                            <span className="text-xs font-semibold text-muted-foreground">
                                {settings.length} Registered System Events
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-muted/40 text-slate-700 dark:text-muted-foreground uppercase tracking-wider font-bold text-[11px] border-b border-border/80">
                                    <tr>
                                        <th className="p-4">EVENT NAME & DESCRIPTION</th>
                                        <th className="p-3 text-center">CLIENT IN-APP</th>
                                        <th className="p-3 text-center">ADMIN IN-APP</th>
                                        <th className="p-3 text-center">REAL-TIME SSE</th>
                                        <th className="p-3 text-center">TOAST ALERT</th>
                                        <th className="p-3 text-center">PRIORITY</th>
                                        <th className="p-3 text-center">PREVIEW</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60 text-foreground">
                                    {loading ? (
                                        Array.from({ length: 6 }).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td className="p-4"><Skeleton className="h-4 w-48 bg-muted" /></td>
                                                <td className="p-3 text-center"><Skeleton className="h-4 w-6 mx-auto bg-muted" /></td>
                                                <td className="p-3 text-center"><Skeleton className="h-4 w-6 mx-auto bg-muted" /></td>
                                                <td className="p-3 text-center"><Skeleton className="h-4 w-6 mx-auto bg-muted" /></td>
                                                <td className="p-3 text-center"><Skeleton className="h-4 w-6 mx-auto bg-muted" /></td>
                                                <td className="p-3 text-center"><Skeleton className="h-4 w-16 mx-auto bg-muted" /></td>
                                                <td className="p-3 text-center"><Skeleton className="h-4 w-6 mx-auto bg-muted" /></td>
                                            </tr>
                                        ))
                                    ) : (
                                        settings.map((item) => (
                                            <tr key={item.event_key} className="hover:bg-slate-50/60 dark:hover:bg-muted/30 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-bold text-foreground text-xs">{item.event_name}</div>
                                                    <div className="text-muted-foreground text-[11px] mt-0.5 leading-relaxed font-medium">
                                                        {item.description}
                                                    </div>
                                                    <span className="inline-block mt-1.5 font-mono text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20 font-semibold">
                                                        {item.event_key}
                                                    </span>
                                                </td>

                                                {/* Client In-App */}
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.client_enabled}
                                                        onChange={() => handleToggle(item.event_key, "client_enabled")}
                                                        className="w-4 h-4 rounded border-slate-300 dark:border-border bg-background text-emerald-500 focus:ring-emerald-500/30 cursor-pointer accent-emerald-500"
                                                    />
                                                </td>

                                                {/* Admin In-App */}
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.admin_enabled}
                                                        onChange={() => handleToggle(item.event_key, "admin_enabled")}
                                                        className="w-4 h-4 rounded border-slate-300 dark:border-border bg-background text-emerald-500 focus:ring-emerald-500/30 cursor-pointer accent-emerald-500"
                                                    />
                                                </td>

                                                {/* Realtime SSE */}
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.realtime_enabled}
                                                        onChange={() => handleToggle(item.event_key, "realtime_enabled")}
                                                        className="w-4 h-4 rounded border-slate-300 dark:border-border bg-background text-emerald-500 focus:ring-emerald-500/30 cursor-pointer accent-emerald-500"
                                                    />
                                                </td>

                                                {/* Toast Alert */}
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.toast_enabled}
                                                        onChange={() => handleToggle(item.event_key, "toast_enabled")}
                                                        className="w-4 h-4 rounded border-slate-300 dark:border-border bg-background text-emerald-500 focus:ring-emerald-500/30 cursor-pointer accent-emerald-500"
                                                    />
                                                </td>

                                                {/* Priority */}
                                                <td className="p-3 text-center">
                                                    <select
                                                        value={item.priority}
                                                        onChange={(e) => handlePriorityChange(item.event_key, e.target.value)}
                                                        className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-background border border-slate-200 dark:border-border text-[11px] font-bold text-foreground focus:outline-none focus:border-emerald-500 cursor-pointer"
                                                    >
                                                        <option value="low">Low</option>
                                                        <option value="normal">Normal</option>
                                                        <option value="high">High</option>
                                                        <option value="critical">Critical</option>
                                                    </select>
                                                </td>

                                                {/* Preview Button */}
                                                <td className="p-3 text-center">
                                                    <button
                                                        onClick={() => setPreviewEvent(item)}
                                                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-emerald-600 dark:bg-muted dark:hover:bg-muted/80 dark:text-emerald-400 transition-colors cursor-pointer border border-slate-200 dark:border-transparent"
                                                        title="Preview notification appearance"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Live Preview Panel Card */}
                    <div className="space-y-4">
                        <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-4 shadow-xs">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-emerald-500" />
                                Live UI Notification Preview
                            </h3>

                            {previewEvent ? (
                                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-muted/30 border border-slate-200 dark:border-border/80 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2.5 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 shrink-0">
                                            <Bell className="w-5 h-5" />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 font-mono text-[10px] uppercase font-bold tracking-wider inline-block">
                                                {previewEvent.priority} Priority
                                            </span>
                                            <h4 className="text-xs font-bold text-foreground">{previewEvent.event_name}</h4>
                                            <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                                                {previewEvent.description || "Notification message content preview."}
                                            </p>
                                            <span className="text-[10px] text-muted-foreground font-mono block pt-1">Just now</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 text-center text-muted-foreground text-xs font-medium">
                                    Click an event preview icon to inspect layout.
                                </div>
                            )}

                            <div className="space-y-2 text-xs text-muted-foreground pt-3 border-t border-border/60">
                                <strong className="text-foreground block font-bold">Notification Behavior Rules:</strong>
                                <ul className="list-disc list-inside space-y-1.5 text-[11px] leading-relaxed font-medium">
                                    <li>Real-time SSE updates unread bell badges instantly without page refresh.</li>
                                    <li>Native Browser Notifications request permission & pop up when enabled.</li>
                                    <li>Clicking a notification marks it as read and redirects to entity.</li>
                                </ul>

                                <button
                                    onClick={async () => {
                                        const success = await showBrowserNotification({
                                            title: previewEvent ? previewEvent.event_name : "Test Admin Notification",
                                            message: previewEvent ? (previewEvent.description || "This is a test notification.") : "This is a test notification from Megabyte Circuits Admin.",
                                            action_url: "/settings/notifications"
                                        });
                                        if (success) {
                                            toast.success("Test browser notification displayed!");
                                        } else {
                                            toast.info("Browser notification requested or not allowed by browser permissions.");
                                        }
                                    }}
                                    className="w-full mt-3 py-2.5 px-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-200 dark:border-emerald-500/20 shadow-2xs"
                                >
                                    <Bell className="w-4 h-4" />
                                    <span>Test Browser Notification</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Manual Cleanup Modal */}
            <Dialog.Root open={showCleanupModal} onOpenChange={setShowCleanupModal}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl z-50 space-y-5 focus:outline-none">
                        <div className="flex items-center justify-between border-b border-border/80 pb-3">
                            <h3 className="text-base font-bold text-rose-500 flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5 text-rose-500" />
                                Purge Old Notifications
                            </h3>
                            <Dialog.Close className="p-1.5 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                                <X className="w-4 h-4" />
                            </Dialog.Close>
                        </div>

                        <div className="space-y-3 text-xs">
                            <p className="text-muted-foreground leading-relaxed font-medium">
                                Permanently delete read notifications older than the selected retention period.
                            </p>

                            <div className="space-y-1.5">
                                <label className="text-foreground font-bold block">Delete notifications older than:</label>
                                <select
                                    value={cleanupDays}
                                    onChange={(e) => setCleanupDays(Number(e.target.value))}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-xs font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
                                >
                                    <option value={7}>7 Days</option>
                                    <option value={15}>15 Days</option>
                                    <option value={30}>30 Days</option>
                                    <option value={60}>60 Days</option>
                                    <option value={90}>90 Days</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-border/80">
                            <button
                                onClick={() => setShowCleanupModal(false)}
                                className="px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={cleaning}
                                onClick={handleRunCleanup}
                                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-black text-xs transition-colors cursor-pointer shadow-xs"
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
