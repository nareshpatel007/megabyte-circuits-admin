"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Eye, EyeOff, Save, AlertTriangle, Plus, Trash2, Edit2, Check, X, MoveVertical, Loader2, RefreshCw, Calculator } from "lucide-react";
import { toast } from "sonner";
import LoadingSpinner from "@/components/ui/loading-spinner";

function MaskedInput({
    label,
    placeholder,
    value,
    onChange,
}: {
    label: string;
    placeholder?: string;
    value: string;
    onChange: (val: string) => void;
}) {
    const [show, setShow] = useState(false);
    return (
        <div className="space-y-1.5">
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider">{label}</label>
            <div className="relative">
                <input
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
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
    value,
    onChange,
    type = "text",
}: {
    label: string;
    placeholder?: string;
    value: string;
    onChange: (val: string) => void;
    type?: string;
}) {
    return (
        <div className="space-y-1.5">
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
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
    const [loadingCredentials, setLoadingCredentials] = useState(true);
    const [savingGroup, setSavingGroup] = useState<string | null>(null);

    const [creds, setCreds] = useState<Record<string, string>>({
        // Razorpay
        RAZORPAY_MODE: "sandbox",
        RAZORPAY_TEST_KEY_ID: "",
        RAZORPAY_TEST_KEY_SECRET: "",
        RAZORPAY_LIVE_KEY_ID: "",
        RAZORPAY_LIVE_KEY_SECRET: "",
        RAZORPAY_WEBHOOK_SECRET: "",
        RAZORPAY_WEBHOOK_URL: "",
        // JLC PCB
        JLCPCB_APP_ID: "",
        JLCPCB_ACCESS_KEY: "",
        JLCPCB_BASE_URL: "",
        // SMTP
        MAIL_MAILER: "",
        MAIL_HOST: "",
        MAIL_PORT: "",
        MAIL_USERNAME: "",
        MAIL_PASSWORD: "",
        MAIL_ENCRYPTION: "",
        MAIL_FROM_ADDRESS: "",
        MAIL_FROM_NAME: "",
        MAIL_BCC_ADDRESS: "",
        // DigiKey
        DIGIKEY_MODE: "live",
        DIGIKEY_TEST_CLIENT_ID: "",
        DIGIKEY_TEST_CLIENT_SECRET: "",
        DIGIKEY_LIVE_CLIENT_ID: "",
        DIGIKEY_LIVE_CLIENT_SECRET: "",
        DIGIKEY_CLIENT_ID: "",
        DIGIKEY_CLIENT_SECRET: "",
        // ImageKit
        IMAGEKIT_PUBLIC_KEY: "",
        IMAGEKIT_PRIVATE_KEY: "",
        IMAGEKIT_URL_ENDPOINT: "",
        IMAGEKIT_STORAGE_PATH: "",
        // Google OAuth
        GOOGLE_CLIENT_ID: "",
        GOOGLE_CLIENT_SECRET: "",
        GOOGLE_REDIRECT_URI: "",
    });

    const fetchCredentials = async () => {
        setLoadingCredentials(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/credentials", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.data) {
                const newCreds: Record<string, string> = { ...creds };
                Object.keys(data.data).forEach((group) => {
                    const groupItems = data.data[group];
                    Object.keys(groupItems).forEach((key) => {
                        newCreds[key] = groupItems[key].masked || "";
                    });
                });
                setCreds(newCreds);
            }
        } catch (err) {
            toast.error("Failed to load credentials.");
        } finally {
            setLoadingCredentials(false);
        }
    };

    useEffect(() => {
        fetchCredentials();
    }, []);

    const handleChange = (key: string, value: string) => {
        setCreds(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveGroup = async (group: string, keys: string[]) => {
        setSavingGroup(group);
        try {
            const token = localStorage.getItem("admin_token");
            const payloadGroup: Record<string, string> = {};
            keys.forEach((key) => {
                payloadGroup[key] = creds[key] || "";
            });

            const res = await fetch("/api/admin/credentials", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    [group]: payloadGroup
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`${group.toUpperCase()} settings saved successfully!`);
                await fetchCredentials();
            } else {
                toast.error(data.message || "Failed to update credentials.");
            }
        } catch (err) {
            toast.error("Error saving credentials.");
        } finally {
            setSavingGroup(null);
        }
    };

    if (loadingCredentials) {
        return (
            <DashboardLayout title="General Settings" subtitle="Configure system credentials, integrations, and server settings">
                <div className="flex items-center justify-center min-h-[400px]">
                    <LoadingSpinner />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="General Settings" subtitle="Configure PCB price calculations, integrations, payment credentials, and notification rules">
            <div className="w-full space-y-6">
                <div className="space-y-5 animate-in fade-in duration-150">
                    <SettingsSection
                        title="Razorpay / Payment Gateway"
                        isSaving={savingGroup === "razorpay"}
                        onSave={() => handleSaveGroup("razorpay", [
                            "RAZORPAY_MODE",
                            "RAZORPAY_TEST_KEY_ID",
                            "RAZORPAY_TEST_KEY_SECRET",
                            "RAZORPAY_LIVE_KEY_ID",
                            "RAZORPAY_LIVE_KEY_SECRET",
                            "RAZORPAY_WEBHOOK_SECRET",
                            "RAZORPAY_WEBHOOK_URL"
                        ])}
                    >
                        <div className="space-y-4">
                            {/* Environment Mode Switch */}
                            <div className="flex items-center justify-between p-3.5 bg-muted/30 border border-border/60 rounded-xl">
                                <div>
                                    <p className="text-xs font-bold text-foreground uppercase tracking-wider">Gateway Environment Mode</p>
                                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">Select active payment mode (Sandbox for testing, Live for real transactions)</p>
                                </div>
                                <div className="flex items-center bg-background border border-border/80 rounded-lg p-1">
                                    <button
                                        type="button"
                                        onClick={() => handleChange("RAZORPAY_MODE", "sandbox")}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${(creds.RAZORPAY_MODE || "sandbox") === "sandbox"
                                            ? "bg-amber-500 text-white shadow-xs"
                                            : "text-muted-foreground hover:text-foreground"
                                            }`}
                                    >
                                        Sandbox (Test)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleChange("RAZORPAY_MODE", "live")}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${creds.RAZORPAY_MODE === "live"
                                            ? "bg-emerald-500 text-white shadow-xs"
                                            : "text-muted-foreground hover:text-foreground"
                                            }`}
                                    >
                                        Live (Production)
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {(creds.RAZORPAY_MODE || "sandbox") === "sandbox" ? (
                                    <>
                                        <MaskedInput
                                            label="SANDBOX API KEY ID"
                                            placeholder="rzp_test_..."
                                            value={creds.RAZORPAY_TEST_KEY_ID || ""}
                                            onChange={(val) => handleChange("RAZORPAY_TEST_KEY_ID", val)}
                                        />
                                        <MaskedInput
                                            label="SANDBOX API KEY SECRET"
                                            placeholder="Your Sandbox API secret"
                                            value={creds.RAZORPAY_TEST_KEY_SECRET || ""}
                                            onChange={(val) => handleChange("RAZORPAY_TEST_KEY_SECRET", val)}
                                        />
                                    </>
                                ) : (
                                    <>
                                        <MaskedInput
                                            label="LIVE API KEY ID"
                                            placeholder="rzp_live_..."
                                            value={creds.RAZORPAY_LIVE_KEY_ID || ""}
                                            onChange={(val) => handleChange("RAZORPAY_LIVE_KEY_ID", val)}
                                        />
                                        <MaskedInput
                                            label="LIVE API KEY SECRET"
                                            placeholder="Your Live API secret"
                                            value={creds.RAZORPAY_LIVE_KEY_SECRET || ""}
                                            onChange={(val) => handleChange("RAZORPAY_LIVE_KEY_SECRET", val)}
                                        />
                                    </>
                                )}
                                <MaskedInput
                                    label="WEBHOOK SECRET"
                                    placeholder="Webhook signing secret"
                                    value={creds.RAZORPAY_WEBHOOK_SECRET || ""}
                                    onChange={(val) => handleChange("RAZORPAY_WEBHOOK_SECRET", val)}
                                />
                                <PlainInput
                                    label="WEBHOOK URL"
                                    placeholder="https://api.pcbmfg.in/webhooks/razorpay"
                                    value={creds.RAZORPAY_WEBHOOK_URL || ""}
                                    onChange={(val) => handleChange("RAZORPAY_WEBHOOK_URL", val)}
                                />
                            </div>
                        </div>
                    </SettingsSection>

                    <SettingsSection
                        title="JLC PCB Developer API"
                        isSaving={savingGroup === "jlcpcb"}
                        onSave={() => handleSaveGroup("jlcpcb", [
                            "JLCPCB_APP_ID",
                            "JLCPCB_ACCESS_KEY",
                            "JLCPCB_BASE_URL"
                        ])}
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <MaskedInput
                                label="JLCPCB APP ID"
                                placeholder="JLCPCB App ID"
                                value={creds.JLCPCB_APP_ID || ""}
                                onChange={(val) => handleChange("JLCPCB_APP_ID", val)}
                            />
                            <MaskedInput
                                label="JLCPCB ACCESS KEY"
                                placeholder="JLCPCB Access Key"
                                value={creds.JLCPCB_ACCESS_KEY || ""}
                                onChange={(val) => handleChange("JLCPCB_ACCESS_KEY", val)}
                            />
                            <PlainInput
                                label="JLCPCB BASE URL"
                                placeholder="https://open.jlcpcb.com"
                                value={creds.JLCPCB_BASE_URL || ""}
                                onChange={(val) => handleChange("JLCPCB_BASE_URL", val)}
                            />
                        </div>
                    </SettingsSection>

                    <SettingsSection
                        title="SMTP / Email Server"
                        isSaving={savingGroup === "smtp"}
                        onSave={() => handleSaveGroup("smtp", [
                            "MAIL_MAILER",
                            "MAIL_HOST",
                            "MAIL_PORT",
                            "MAIL_USERNAME",
                            "MAIL_PASSWORD",
                            "MAIL_ENCRYPTION",
                            "MAIL_FROM_ADDRESS",
                            "MAIL_FROM_NAME",
                            "MAIL_BCC_ADDRESS"
                        ])}
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <PlainInput
                                label="MAILER"
                                placeholder="smtp"
                                value={creds.MAIL_MAILER || ""}
                                onChange={(val) => handleChange("MAIL_MAILER", val)}
                            />
                            <PlainInput
                                label="SMTP HOST"
                                placeholder="smtp.gmail.com"
                                value={creds.MAIL_HOST || ""}
                                onChange={(val) => handleChange("MAIL_HOST", val)}
                            />
                            <PlainInput
                                label="PORT"
                                placeholder="587"
                                type="number"
                                value={creds.MAIL_PORT || ""}
                                onChange={(val) => handleChange("MAIL_PORT", val)}
                            />
                            <PlainInput
                                label="USERNAME"
                                placeholder="username@gmail.com"
                                value={creds.MAIL_USERNAME || ""}
                                onChange={(val) => handleChange("MAIL_USERNAME", val)}
                            />
                            <MaskedInput
                                label="SMTP PASSWORD"
                                placeholder="SMTP password or App Key"
                                value={creds.MAIL_PASSWORD || ""}
                                onChange={(val) => handleChange("MAIL_PASSWORD", val)}
                            />
                            <PlainInput
                                label="ENCRYPTION"
                                placeholder="tls"
                                value={creds.MAIL_ENCRYPTION || ""}
                                onChange={(val) => handleChange("MAIL_ENCRYPTION", val)}
                            />
                            <PlainInput
                                label="FROM EMAIL"
                                placeholder="quote@megabytecircuit.com"
                                type="email"
                                value={creds.MAIL_FROM_ADDRESS || ""}
                                onChange={(val) => handleChange("MAIL_FROM_ADDRESS", val)}
                            />
                            <PlainInput
                                label="FROM NAME"
                                placeholder="megabytecircuit.com"
                                value={creds.MAIL_FROM_NAME || ""}
                                onChange={(val) => handleChange("MAIL_FROM_NAME", val)}
                            />
                            <PlainInput
                                label="BCC EMAIL"
                                placeholder="pcb@megabytecircuit.com"
                                type="email"
                                value={creds.MAIL_BCC_ADDRESS || ""}
                                onChange={(val) => handleChange("MAIL_BCC_ADDRESS", val)}
                            />
                        </div>
                    </SettingsSection>

                    <SettingsSection
                        title="DigiKey API Configuration"
                        isSaving={savingGroup === "digikey"}
                        onSave={() => handleSaveGroup("digikey", [
                            "DIGIKEY_MODE",
                            "DIGIKEY_TEST_CLIENT_ID",
                            "DIGIKEY_TEST_CLIENT_SECRET",
                            "DIGIKEY_LIVE_CLIENT_ID",
                            "DIGIKEY_LIVE_CLIENT_SECRET",
                            "DIGIKEY_CLIENT_ID",
                            "DIGIKEY_CLIENT_SECRET"
                        ])}
                    >
                        <div className="space-y-4">
                            {/* Environment Mode Switch */}
                            <div className="flex items-center justify-between p-3.5 bg-muted/30 border border-border/60 rounded-xl">
                                <div>
                                    <p className="text-xs font-bold text-foreground uppercase tracking-wider">DigiKey Environment Mode</p>
                                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">Select active environment mode (Sandbox for testing, Live for production API)</p>
                                </div>
                                <div className="flex items-center bg-background border border-border/80 rounded-lg p-1">
                                    <button
                                        type="button"
                                        onClick={() => handleChange("DIGIKEY_MODE", "sandbox")}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                                            (creds.DIGIKEY_MODE || "sandbox") === "sandbox"
                                                ? "bg-amber-500 text-white shadow-xs"
                                                : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        Sandbox (Test)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleChange("DIGIKEY_MODE", "live")}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                                            creds.DIGIKEY_MODE === "live"
                                                ? "bg-emerald-500 text-white shadow-xs"
                                                : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        Live (Production)
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {(creds.DIGIKEY_MODE || "sandbox") === "sandbox" ? (
                                    <>
                                        <MaskedInput
                                            label="SANDBOX CLIENT ID"
                                            placeholder="DigiKey Sandbox Client ID"
                                            value={creds.DIGIKEY_TEST_CLIENT_ID || creds.DIGIKEY_CLIENT_ID || ""}
                                            onChange={(val) => {
                                                handleChange("DIGIKEY_TEST_CLIENT_ID", val);
                                                handleChange("DIGIKEY_CLIENT_ID", val);
                                            }}
                                        />
                                        <MaskedInput
                                            label="SANDBOX CLIENT SECRET"
                                            placeholder="DigiKey Sandbox Client Secret"
                                            value={creds.DIGIKEY_TEST_CLIENT_SECRET || creds.DIGIKEY_CLIENT_SECRET || ""}
                                            onChange={(val) => {
                                                handleChange("DIGIKEY_TEST_CLIENT_SECRET", val);
                                                handleChange("DIGIKEY_CLIENT_SECRET", val);
                                            }}
                                        />
                                    </>
                                ) : (
                                    <>
                                        <MaskedInput
                                            label="LIVE CLIENT ID"
                                            placeholder="DigiKey Live Client ID"
                                            value={creds.DIGIKEY_LIVE_CLIENT_ID || creds.DIGIKEY_CLIENT_ID || ""}
                                            onChange={(val) => {
                                                handleChange("DIGIKEY_LIVE_CLIENT_ID", val);
                                                handleChange("DIGIKEY_CLIENT_ID", val);
                                            }}
                                        />
                                        <MaskedInput
                                            label="LIVE CLIENT SECRET"
                                            placeholder="DigiKey Live Client Secret"
                                            value={creds.DIGIKEY_LIVE_CLIENT_SECRET || creds.DIGIKEY_CLIENT_SECRET || ""}
                                            onChange={(val) => {
                                                handleChange("DIGIKEY_LIVE_CLIENT_SECRET", val);
                                                handleChange("DIGIKEY_CLIENT_SECRET", val);
                                            }}
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </SettingsSection>

                    <SettingsSection
                        title="ImageKit CDN Storage"
                        isSaving={savingGroup === "imagekit"}
                        onSave={() => handleSaveGroup("imagekit", [
                            "IMAGEKIT_PUBLIC_KEY",
                            "IMAGEKIT_PRIVATE_KEY",
                            "IMAGEKIT_URL_ENDPOINT",
                            "IMAGEKIT_STORAGE_PATH"
                        ])}
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <MaskedInput
                                label="IMAGEKIT PUBLIC KEY"
                                placeholder="public_..."
                                value={creds.IMAGEKIT_PUBLIC_KEY || ""}
                                onChange={(val) => handleChange("IMAGEKIT_PUBLIC_KEY", val)}
                            />
                            <MaskedInput
                                label="IMAGEKIT PRIVATE KEY"
                                placeholder="private_..."
                                value={creds.IMAGEKIT_PRIVATE_KEY || ""}
                                onChange={(val) => handleChange("IMAGEKIT_PRIVATE_KEY", val)}
                            />
                            <PlainInput
                                label="IMAGEKIT URL ENDPOINT"
                                placeholder="https://ik.imagekit.io/..."
                                value={creds.IMAGEKIT_URL_ENDPOINT || ""}
                                onChange={(val) => handleChange("IMAGEKIT_URL_ENDPOINT", val)}
                            />
                            <PlainInput
                                label="IMAGEKIT STORAGE PATH"
                                placeholder="/Megabyte"
                                value={creds.IMAGEKIT_STORAGE_PATH || "/Megabyte"}
                                onChange={(val) => handleChange("IMAGEKIT_STORAGE_PATH", val)}
                            />
                        </div>
                    </SettingsSection>

                    <SettingsSection
                        title="Google OAuth Authentication"
                        isSaving={savingGroup === "google"}
                        onSave={() => handleSaveGroup("google", [
                            "GOOGLE_CLIENT_ID",
                            "GOOGLE_CLIENT_SECRET",
                            "GOOGLE_REDIRECT_URI"
                        ])}
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <MaskedInput
                                label="GOOGLE CLIENT ID"
                                placeholder="819338859898-..."
                                value={creds.GOOGLE_CLIENT_ID || ""}
                                onChange={(val) => handleChange("GOOGLE_CLIENT_ID", val)}
                            />
                            <MaskedInput
                                label="GOOGLE CLIENT SECRET"
                                placeholder="GOCSPX-..."
                                value={creds.GOOGLE_CLIENT_SECRET || ""}
                                onChange={(val) => handleChange("GOOGLE_CLIENT_SECRET", val)}
                            />
                            <PlainInput
                                label="GOOGLE REDIRECT URI"
                                placeholder="https://api.pcbmfg.in/api/auth/google/callback"
                                value={creds.GOOGLE_REDIRECT_URI || ""}
                                onChange={(val) => handleChange("GOOGLE_REDIRECT_URI", val)}
                            />
                        </div>
                    </SettingsSection>
                </div>
            </div>
        </DashboardLayout>
    );
}

