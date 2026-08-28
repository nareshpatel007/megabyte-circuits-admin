"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Eye, EyeOff, Save, AlertTriangle, Plus, Trash2, Edit2, Check, X, MoveVertical, Loader2, RefreshCw, Calculator } from "lucide-react";
import { toast } from "sonner";
import LoadingSpinner from "@/components/ui/loading-spinner";

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
    isSaving = false,
}: {
    title: string;
    children: React.ReactNode;
    onSave: () => void;
    isSaving?: boolean;
}) {
    return (
        <div className="bg-card border border-border/80 rounded-xl p-5 md:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/60">
                <h3 className="text-sm font-bold text-foreground tracking-tight">{title}</h3>
                <button
                    disabled={isSaving}
                    onClick={onSave}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Changes
                </button>
            </div>
            {children}
        </div>
    );
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<"pricing" | "integrations" | "notifications">("pricing");
    const [loadingPricing, setLoadingPricing] = useState(true);
    const [savingPricing, setSavingPricing] = useState(false);
    const [fixedCosts, setFixedCosts] = useState<Record<string, Record<string, number>>>({});
    const [priceTiersJson, setPriceTiersJson] = useState<string>("");
    const [minPartsOrderAmount, setMinPartsOrderAmount] = useState<number>(3000);

    const tabs = [
        { id: "pricing", label: "PCB Calculation & Pricing" },
        { id: "integrations", label: "Payment & API Integrations" },
        { id: "notifications", label: "Notifications" },
    ];

    const fetchPricing = async () => {
        setLoadingPricing(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/pcb-pricing", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.data) {
                setFixedCosts(data.data.fixedCosts || {});
                setPriceTiersJson(JSON.stringify(data.data.priceTiers || {}, null, 2));
                if (data.data.minPartsOrderAmount !== undefined) {
                    setMinPartsOrderAmount(Number(data.data.minPartsOrderAmount));
                }
            }
        } catch (err) {
            toast.error("Failed to load PCB pricing settings.");
        } finally {
            setLoadingPricing(false);
        }
    };

    useEffect(() => {
        if (activeTab === "pricing") {
            fetchPricing();
        }
    }, [activeTab]);

    const handleFixedCostChange = (layer: string, day: string, value: string) => {
        const num = parseFloat(value) || 0;
        setFixedCosts(prev => ({
            ...prev,
            [layer]: {
                ...(prev[layer] || {}),
                [day]: num
            }
        }));
    };

    const handleSavePricing = async () => {
        let parsedPriceTiers = null;
        try {
            parsedPriceTiers = JSON.parse(priceTiersJson);
        } catch (e) {
            toast.error("Invalid JSON format in Price Tier Matrix!");
            return;
        }

        setSavingPricing(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/pcb-pricing", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    fixedCosts,
                    priceTiers: parsedPriceTiers,
                    minPartsOrderAmount
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success("PCB Pricing Calculations updated successfully!");
            } else {
                toast.error(data.message || "Failed to update PCB pricing settings.");
            }
        } catch (err) {
            toast.error("Error saving pricing settings.");
        } finally {
            setSavingPricing(false);
        }
    };

    return (
        <DashboardLayout title="General Settings" subtitle="Configure PCB price calculations, integrations, payment credentials, and notification rules">
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

                {/* Tab 1: PCB Calculation & Pricing */}
                {activeTab === "pricing" && (
                    <div className="space-y-6 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-xl px-5 py-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <Calculator className="w-5 h-5 shrink-0 text-emerald-500" />
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider">Dynamic Calculation Engine</h4>
                                    <p className="text-xs font-medium opacity-90 mt-0.5">
                                        All PCB calculations edited here are updated live on the Quote page upon save.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={fetchPricing}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-background border border-border rounded-lg hover:bg-muted transition-colors cursor-pointer"
                            >
                                <RefreshCw className="w-3.5 h-3.5" /> Refresh
                            </button>
                        </div>

                        {loadingPricing ? (
                            <div className="py-12 text-center">
                                <LoadingSpinner />
                                <p className="text-xs font-medium text-muted-foreground mt-3">Loading pricing matrices...</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Section 1: Lead Time Fixed Costs */}
                                <SettingsSection
                                    title="Layer & Lead Time Base Fixed Costs (₹)"
                                    onSave={handleSavePricing}
                                    isSaving={savingPricing}
                                >
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse min-w-[600px]">
                                            <thead>
                                                <tr className="border-b border-border/60 bg-muted/30 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                                    <th className="py-3 px-4">Layer Count</th>
                                                    <th className="py-3 px-4">1 Day</th>
                                                    <th className="py-3 px-4">3 Days</th>
                                                    <th className="py-3 px-4">5 Days</th>
                                                    <th className="py-3 px-4">7 Days</th>
                                                    <th className="py-3 px-4">10 Days</th>
                                                    <th className="py-3 px-4">20 Days</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/40 text-xs">
                                                {["1", "2", "4", "6", "8", "10"].map((layer) => (
                                                    <tr key={layer} className="hover:bg-muted/20 transition-colors">
                                                        <td className="py-3 px-4 font-bold text-foreground">
                                                            {layer} {layer === "1" ? "Layer" : "Layers"}
                                                        </td>
                                                        {[1, 3, 5, 7, 10, 20].map((day) => {
                                                            const val = fixedCosts[layer]?.[day.toString()];
                                                            return (
                                                                <td key={day} className="py-2 px-3">
                                                                    <input
                                                                        type="number"
                                                                        value={val !== undefined ? val : ""}
                                                                        placeholder="N/A"
                                                                        onChange={(e) => handleFixedCostChange(layer, day.toString(), e.target.value)}
                                                                        className="w-24 px-2.5 py-1.5 text-xs font-semibold bg-background border border-border/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                                    />
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </SettingsSection>

                                {/* Section 2: Variable Tier Pricing Matrices */}
                                <SettingsSection
                                    title="Area & Material Variable Price Tier Matrix (JSON Configuration)"
                                    onSave={handleSavePricing}
                                    isSaving={savingPricing}
                                >
                                    <div className="space-y-3">
                                        <p className="text-xs text-muted-foreground font-medium">
                                            Configure area-based cost factors per cm² across Solder Mask (Green / Other), Copper Weight (1oz / 2oz), Thickness (1.6mm / Other), and Layer counts.
                                        </p>
                                        <textarea
                                            value={priceTiersJson}
                                            onChange={(e) => setPriceTiersJson(e.target.value)}
                                            rows={18}
                                            className="w-full font-mono text-xs p-4 bg-slate-950 text-emerald-400 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed shadow-inner"
                                            placeholder="Paste or edit Price Tiers JSON matrix structure..."
                                        />
                                    </div>
                                </SettingsSection>

                                {/* Section 3: Minimum Parts Order Amount */}
                                <SettingsSection
                                    title="Minimum Order Amount (Parts)"
                                    onSave={handleSavePricing}
                                    isSaving={savingPricing}
                                >
                                    <div className="space-y-3">
                                        <p className="text-xs text-muted-foreground font-medium">
                                            Specify the minimum cart order amount (in ₹) required to enable the Secure Checkout button for Parts orders.
                                        </p>
                                        <div className="max-w-xs">
                                            <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                                                Minimum Order Amount (₹)
                                            </label>
                                            <input
                                                type="number"
                                                value={minPartsOrderAmount}
                                                onChange={(e) => setMinPartsOrderAmount(parseFloat(e.target.value) || 0)}
                                                className="w-full px-3.5 py-2.5 text-sm font-semibold bg-background border border-border/85 rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                                                placeholder="3000"
                                            />
                                        </div>
                                    </div>
                                </SettingsSection>
                            </div>
                        )}
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
