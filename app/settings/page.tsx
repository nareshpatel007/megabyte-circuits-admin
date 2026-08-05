"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Eye, EyeOff, Save, AlertTriangle, Plus, Trash2, Edit2, Check, X, MoveVertical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { TableSkeleton } from "@/components/ui/skeleton";

interface StatusItem {
    id: number;
    name: string;
    slug: string;
    sort_order: number;
    color: string;
    is_active: boolean;
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
    const [activeTab, setActiveTab] = useState<"integrations" | "notifications">("integrations");

    const tabs = [
        { id: "integrations", label: "Payment & API Integrations" },
        { id: "notifications", label: "Notifications" },
    ];

    return (
        <DashboardLayout title="General Settings" subtitle="Configure integrations, payment credentials, and notification rules">
            <div className="w-full space-y-6">
                {/* Navigation Tabs */}
                <div className="flex border-b border-border/80 gap-2 overflow-x-auto pb-px">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${activeTab === tab.id
                                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-bold"
                                : "border-transparent text-foreground/70 hover:text-foreground hover:bg-muted/50 font-semibold"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

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
