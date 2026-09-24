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
    Eye,
    Package,
    CreditCard,
    Cpu,
    CheckCircle2
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

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
                {/* Header Title Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                            <Bell className="w-7 h-7 text-emerald-400" />
                            Notification System Settings
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Configure real-time event alerts, recipient rules, in-app delivery toggles, and notification retention policies.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={() => setShowCleanupModal(true)}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
                        >
                            <Trash2 className="w-4 h-4" />
                            Purge Old Notifications
                        </button>

                        <button
                            disabled={saving}
                            onClick={handleSaveSettings}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition-all cursor-pointer disabled:opacity-50"
                        >
                            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            <span>Save Configuration</span>
                        </button>
                    </div>
                </div>

                {/* Event Matrix Configuration Table & Live Preview Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Matrix Table */}
                    <div className="lg:col-span-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm overflow-hidden shadow-xl">
                        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                <Sliders className="w-4 h-4 text-emerald-400" />
                                Event Notification Control Matrix
                            </h2>
                            <span className="text-xs text-slate-400">{settings.length} Registered System Events</span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800/80">
                                    <tr>
                                        <th className="p-4">Event Name & Description</th>
                                        <th className="p-3 text-center">Client In-App</th>
                                        <th className="p-3 text-center">Admin In-App</th>
                                        <th className="p-3 text-center">Real-Time SSE</th>
                                        <th className="p-3 text-center">Toast Alert</th>
                                        <th className="p-3 text-center">Priority</th>
                                        <th className="p-3 text-center">Preview</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                                    {loading ? (
                                        Array.from({ length: 6 }).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td className="p-4"><Skeleton className="h-4 w-48" /></td>
                                                <td className="p-3 text-center"><Skeleton className="h-4 w-6 mx-auto" /></td>
                                                <td className="p-3 text-center"><Skeleton className="h-4 w-6 mx-auto" /></td>
                                                <td className="p-3 text-center"><Skeleton className="h-4 w-6 mx-auto" /></td>
                                                <td className="p-3 text-center"><Skeleton className="h-4 w-6 mx-auto" /></td>
                                                <td className="p-3 text-center"><Skeleton className="h-4 w-16 mx-auto" /></td>
                                                <td className="p-3 text-center"><Skeleton className="h-4 w-6 mx-auto" /></td>
                                            </tr>
                                        ))
                                    ) : (
                                        settings.map((item) => (
                                            <tr key={item.event_key} className="hover:bg-slate-800/40 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-bold text-white text-xs">{item.event_name}</div>
                                                    <div className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">{item.description}</div>
                                                    <span className="inline-block mt-1 font-mono text-[10px] text-emerald-400/80 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                                        {item.event_key}
                                                    </span>
                                                </td>

                                                {/* Client In-App */}
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.client_enabled}
                                                        onChange={() => handleToggle(item.event_key, "client_enabled")}
                                                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/30 cursor-pointer"
                                                    />
                                                </td>

                                                {/* Admin In-App */}
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.admin_enabled}
                                                        onChange={() => handleToggle(item.event_key, "admin_enabled")}
                                                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/30 cursor-pointer"
                                                    />
                                                </td>

                                                {/* Realtime SSE */}
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.realtime_enabled}
                                                        onChange={() => handleToggle(item.event_key, "realtime_enabled")}
                                                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/30 cursor-pointer"
                                                    />
                                                </td>

                                                {/* Toast Alert */}
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.toast_enabled}
                                                        onChange={() => handleToggle(item.event_key, "toast_enabled")}
                                                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/30 cursor-pointer"
                                                    />
                                                </td>

                                                {/* Priority */}
                                                <td className="p-3 text-center">
                                                    <select
                                                        value={item.priority}
                                                        onChange={(e) => handlePriorityChange(item.event_key, e.target.value)}
                                                        className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] font-semibold text-slate-300 focus:outline-none"
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
                                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 transition-colors"
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

                    {/* Live Preview Panel */}
                    <div className="space-y-4">
                        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-4 shadow-xl">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-emerald-400" />
                                Live UI Notification Preview
                            </h3>

                            {previewEvent ? (
                                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                                            <Bell className="w-5 h-5" />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] uppercase font-bold">
                                                {previewEvent.priority} Priority
                                            </span>
                                            <h4 className="text-xs font-bold text-white">{previewEvent.event_name}</h4>
                                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                                {previewEvent.description || "Notification message content preview."}
                                            </p>
                                            <span className="text-[10px] text-slate-500 font-mono block pt-1">Just now</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 text-center text-slate-500 text-xs">
                                    Click an event preview icon to inspect layout.
                                </div>
                            )}

                            <div className="space-y-2 text-xs text-slate-400">
                                <strong className="text-slate-200 block">Notification Behavior Rules:</strong>
                                <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
                                    <li>Real-time SSE updates unread bell badges instantly without page refresh.</li>
                                    <li>Toast popups auto-dismiss after 4 seconds.</li>
                                    <li>Clicking a notification marks it as read and redirects to entity.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Manual Cleanup Modal */}
            <Dialog.Root open={showCleanupModal} onOpenChange={setShowCleanupModal}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 animate-fade-in" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl z-50 space-y-5 focus:outline-none">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5 text-rose-400" />
                                Purge Old Notifications
                            </h3>
                            <Dialog.Close className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                            </Dialog.Close>
                        </div>

                        <div className="space-y-3 text-xs">
                            <p className="text-slate-300 leading-relaxed">
                                Permanently delete read notifications older than the selected retention period.
                            </p>

                            <div className="space-y-1.5">
                                <label className="text-slate-300 font-semibold block">Delete notifications older than:</label>
                                <select
                                    value={cleanupDays}
                                    onChange={(e) => setCleanupDays(Number(e.target.value))}
                                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
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
