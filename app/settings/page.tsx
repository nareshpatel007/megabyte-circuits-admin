"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Eye, EyeOff, Save, AlertTriangle, Plus, Trash2, Edit2, Check, X, MoveVertical } from "lucide-react";
import { toast } from "sonner";

interface StatusItem {
    id: number;
    name: string;
    slug: string;
    sort_order: number;
    color: string;
    is_active: boolean;
}

function OrderStatusManager() {
    const [statuses, setStatuses] = useState<StatusItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [newColor, setNewColor] = useState("#10b981");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editColor, setEditColor] = useState("");

    const fetchStatuses = async () => {
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
                toast.success("Status created successfully");
                setNewName("");
                setIsAdding(false);
                fetchStatuses();
            } else {
                toast.error(data.message || "Failed to create status");
            }
        } catch (err) {
            toast.error("Error creating status");
        }
    };

    const handleUpdate = async (id: number) => {
        if (!editName.trim()) {
            toast.error("Status name is required");
            return;
        }
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
                toast.success("Status updated successfully");
                setEditingId(null);
                fetchStatuses();
            } else {
                toast.error(data.message || "Failed to update status");
            }
        } catch (err) {
            toast.error("Error updating status");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this status?")) return;
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/statuses/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status) {
                toast.success("Status deleted successfully");
                fetchStatuses();
            } else {
                toast.error(data.message || "Failed to delete status");
            }
        } catch (err) {
            toast.error("Error deleting status");
        }
    };

    return (
        <div className="bg-card border border-border/80 rounded-xl p-5 md:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/60">
                <div>
                    <h3 className="text-sm font-bold text-foreground tracking-tight">Manage Order Statuses</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">Add, update, or remove manufacturing pipeline statuses</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-all cursor-pointer"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Add New Status
                </button>
            </div>

            {isAdding && (
                <div className="mb-6 p-4 rounded-xl bg-muted/40 border border-emerald-500/30 flex flex-wrap items-center gap-3">
                    <input
                        type="text"
                        placeholder="Status Name (e.g. Drilling QC)"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="flex-1 min-w-[200px] px-3.5 py-2 text-sm bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-emerald-500 font-medium"
                    />
                    <input
                        type="color"
                        value={newColor}
                        onChange={(e) => setNewColor(e.target.value)}
                        className="w-9 h-9 p-1 rounded-xl bg-background border border-border cursor-pointer"
                    />
                    <button
                        onClick={handleCreate}
                        className="px-3.5 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition-all cursor-pointer flex items-center gap-1"
                    >
                        <Check className="w-4 h-4" /> Save
                    </button>
                    <button
                        onClick={() => setIsAdding(false)}
                        className="px-3.5 py-2 bg-muted text-muted-foreground hover:text-foreground text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                    >
                        <X className="w-4 h-4" /> Cancel
                    </button>
                </div>
            )}

            {loading ? (
                <div className="py-8 text-center text-xs text-muted-foreground">Loading statuses...</div>
            ) : (
                <div className="divide-y divide-border/40 max-h-[420px] overflow-y-auto pr-1">
                    {statuses.map((item) => (
                        <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                            {editingId === item.id ? (
                                <div className="flex-1 flex items-center gap-3">
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="flex-1 px-3 py-1.5 text-sm bg-background border border-emerald-500 rounded-xl text-foreground font-medium"
                                    />
                                    <input
                                        type="color"
                                        value={editColor}
                                        onChange={(e) => setEditColor(e.target.value)}
                                        className="w-8 h-8 p-0.5 rounded-xl bg-background border border-border cursor-pointer"
                                    />
                                    <button
                                        onClick={() => handleUpdate(item.id)}
                                        className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setEditingId(null)}
                                        className="p-1.5 bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3">
                                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color || "#10b981" }} />
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">{item.name}</p>
                                            <p className="text-[10px] text-muted-foreground font-mono">slug: {item.slug}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => {
                                                setEditingId(item.id);
                                                setEditName(item.name);
                                                setEditColor(item.color || "#10b981");
                                            }}
                                            className="p-2 text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all cursor-pointer"
                                            title="Edit"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function MaskedInput({
    label,
    placeholder,
    defaultValue,
}: {
    label: string;
    placeholder?: string;
    defaultValue?: string;
}) {
    const [show, setShow] = useState(false);
    const [val, setVal] = useState(defaultValue || "");
    return (
        <div className="space-y-1.5">
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider">{label}</label>
            <div className="relative">
                <input
                    type={show ? "text" : "password"}
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-3.5 py-3 pr-10 text-sm bg-background/50 border border-border/85 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium"
                />
                <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
}

function PlainInput({
    label,
    placeholder,
    defaultValue,
    type = "text",
}: {
    label: string;
    placeholder?: string;
    defaultValue?: string;
    type?: string;
}) {
    return (
        <div className="space-y-1.5">
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider">{label}</label>
            <input
                type={type}
                defaultValue={defaultValue}
                placeholder={placeholder}
                className="w-full px-3.5 py-3 text-sm bg-background/50 border border-border/85 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium"
            />
        </div>
    );
}

function ToggleRow({ label, description, defaultOn = false }: { label: string; description: string; defaultOn?: boolean }) {
    const [on, setOn] = useState(defaultOn);
    return (
        <div className="flex items-start justify-between py-4 border-b border-border/40 last:border-0">
            <div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{description}</p>
            </div>
            <button
                onClick={() => setOn(!on)}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ml-4 cursor-pointer ${on ? "bg-emerald-500" : "bg-muted"
                    }`}
            >
                <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-4.5" : "translate-x-0.5"
                        }`}
                />
            </button>
        </div>
    );
}

function SettingsSection({
    title,
    children,
    onSave,
}: {
    title: string;
    children: React.ReactNode;
    onSave: () => void;
}) {
    return (
        <div className="bg-card border border-border/80 rounded-xl p-5 md:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/60">
                <h3 className="text-sm font-bold text-foreground tracking-tight">{title}</h3>
                <button
                    onClick={onSave}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-lg hover:bg-emerald-500 hover:text-white transition-all cursor-pointer"
                >
                    <Save className="w-3.5 h-3.5" />
                    Save Changes
                </button>
            </div>
            {children}
        </div>
    );
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<"statuses" | "integrations" | "notifications">("statuses");

    const tabs = [
        { id: "statuses", label: "Order Statuses" },
        { id: "integrations", label: "Payment & API Integrations" },
        { id: "notifications", label: "Notifications" },
    ];

    return (
        <DashboardLayout title="Settings & Management" subtitle="Configure order pipeline statuses, integrations, and notification rules">
            <div className="max-w-4xl space-y-6">
                {/* Navigation Tabs */}
                <div className="flex border-b border-border/80 gap-2 overflow-x-auto pb-px">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${activeTab === tab.id
                                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-bold"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30 font-semibold"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab 1: Order Statuses */}
                {activeTab === "statuses" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                        <OrderStatusManager />
                    </div>
                )}

                {/* Tab 2: Payment & API Integrations */}
                {activeTab === "integrations" && (
                    <div className="space-y-5 animate-in fade-in duration-150">
                        <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-xl px-4 py-3.5 shadow-sm">
                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                            <p className="text-xs font-semibold">
                                API keys are sensitive. Changes take effect immediately across all production services. Please store them securely.
                            </p>
                        </div>

                        <SettingsSection
                            title="Razorpay / Payment Gateway"
                            onSave={() => toast.success("Razorpay settings saved.")}
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <MaskedInput label="API Key ID" placeholder="rzp_live_..." defaultValue="rzp_live_xXxXxXxX" />
                                <MaskedInput label="API Key Secret" placeholder="Your API secret" defaultValue="secret_key_here" />
                                <MaskedInput label="Webhook Secret" placeholder="Webhook signing secret" defaultValue="wh_secret_here" />
                                <PlainInput label="Webhook URL" defaultValue="https://api.pcbmfg.in/webhooks/razorpay" />
                            </div>
                        </SettingsSection>

                        <SettingsSection
                            title="JLC PCB Developer API"
                            onSave={() => toast.success("JLC PCB settings saved.")}
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <MaskedInput label="Developer API Key" placeholder="jlcpcb_api_..." defaultValue="jlc_dev_apikey_prod" />
                                <PlainInput label="Account Email" defaultValue="api@pcbmfg.in" type="email" />
                                <PlainInput label="API Base URL" defaultValue="https://api.jlcpcb.com/v2" />
                                <MaskedInput label="Client Secret" placeholder="OAuth client secret" defaultValue="oauth_secret_xxx" />
                            </div>
                        </SettingsSection>

                        <SettingsSection
                            title="SMTP / Email Server"
                            onSave={() => toast.success("SMTP settings saved.")}
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <PlainInput label="SMTP Host" defaultValue="smtp.sendgrid.net" />
                                <PlainInput label="Port" defaultValue="587" type="number" />
                                <PlainInput label="From Email" defaultValue="noreply@pcbmfg.in" type="email" />
                                <MaskedInput label="SMTP Password" placeholder="SMTP password or API key" defaultValue="smtp_pass_here" />
                            </div>
                        </SettingsSection>

                        <SettingsSection
                            title="Stripe (International Payments)"
                            onSave={() => toast.success("Stripe settings saved.")}
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <MaskedInput label="Publishable Key" placeholder="pk_live_..." defaultValue="pk_live_xxxxxxxxxxxxxxxx" />
                                <MaskedInput label="Secret Key" placeholder="sk_live_..." defaultValue="sk_live_xxxxxxxxxxxxxxxx" />
                                <MaskedInput label="Webhook Signing Secret" placeholder="whsec_..." defaultValue="whsec_xxxxxxxxxx" />
                                <PlainInput label="Webhook Endpoint" defaultValue="https://api.pcbmfg.in/webhooks/stripe" />
                            </div>
                        </SettingsSection>
                    </div>
                )}

                {/* Tab 3: Notifications */}
                {activeTab === "notifications" && (
                    <div className="space-y-5 animate-in fade-in duration-150">
                        <SettingsSection
                            title="Notification Settings"
                            onSave={() => toast.success("Notification preferences saved.")}
                        >
                            <div>
                                <ToggleRow
                                    label="Email Alerts"
                                    description="Receive email notifications for critical events"
                                    defaultOn
                                />
                                <ToggleRow
                                    label="New Order Notifications"
                                    description="Get notified when a new order is placed"
                                    defaultOn
                                />
                                <ToggleRow
                                    label="Low Stock Alerts"
                                    description="Alert when component inventory drops below threshold"
                                    defaultOn
                                />
                                <ToggleRow
                                    label="API Health Alerts"
                                    description="Notify when JLCPCB or payment API becomes unavailable"
                                    defaultOn
                                />
                                <ToggleRow
                                    label="Daily Summary Report"
                                    description="Receive a daily summary of orders and revenue"
                                />
                            </div>
                        </SettingsSection>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
