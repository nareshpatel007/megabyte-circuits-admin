"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import {
    ArrowLeft,
    Save,
    Eye,
    Code,
    Send,
    Copy,
    Check,
    Loader2,
    Mail,
    Sparkles,
    AlertCircle,
    Info,
    CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import LoadingSpinner from "@/components/ui/loading-spinner";

interface VariableInfo {
    var: string;
    desc: string;
}

export default function EditEmailTemplatePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const templateId = resolvedParams.id;
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copiedVar, setCopiedVar] = useState<string | null>(null);

    // Form fields
    const [name, setName] = useState("");
    const [key, setKey] = useState("");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [cc, setCc] = useState("");
    const [bcc, setBcc] = useState("");
    const [isActive, setIsActive] = useState(true);

    const [availableVariables, setAvailableVariables] = useState<VariableInfo[]>([]);

    // Mode: "editor" | "preview"
    const [viewMode, setViewMode] = useState<"editor" | "preview">("editor");
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewData, setPreviewData] = useState<{
        rendered_subject: string;
        rendered_body: string;
        to: string;
        cc: string[];
        bcc: string[];
    } | null>(null);

    // Test Email Modal
    const [testModalOpen, setTestModalOpen] = useState(false);
    const [testEmailAddress, setTestEmailAddress] = useState("");
    const [sendingTest, setSendingTest] = useState(false);

    const fetchTemplateDetails = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/email-templates/${templateId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await res.json();
            if (data.success && data.data) {
                const tpl = data.data;
                setName(tpl.name || "");
                setKey(tpl.key || "");
                setSubject(tpl.subject || "");
                setBody(tpl.body || "");
                setCc(tpl.cc || "");
                setBcc(tpl.bcc || "");
                setIsActive(!!tpl.is_active);

                if (Array.isArray(data.available_variables)) {
                    setAvailableVariables(data.available_variables);
                }
            } else {
                toast.error(data.message || "Failed to load template details.");
            }
        } catch (err) {
            toast.error("Error connecting to backend API.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplateDetails();
    }, [templateId]);

    const handleCopyVar = (v: string) => {
        navigator.clipboard.writeText(v);
        setCopiedVar(v);
        toast.success(`Copied ${v} to clipboard`);
        setTimeout(() => setCopiedVar(null), 2000);
    };

    const handleInsertVarToBody = (v: string) => {
        setBody((prev) => prev + " " + v);
        toast.success(`Inserted ${v} to body`);
    };

    const fetchPreview = async () => {
        setPreviewLoading(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/email-templates/${templateId}/preview`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    subject,
                    body,
                    cc,
                    bcc,
                    is_active: isActive,
                }),
            });

            const data = await res.json();
            if (data.success && data.data) {
                setPreviewData(data.data);
            } else {
                toast.error(data.message || "Failed to render preview.");
            }
        } catch (err) {
            toast.error("Error loading preview.");
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleTogglePreviewMode = (mode: "editor" | "preview") => {
        setViewMode(mode);
        if (mode === "preview") {
            fetchPreview();
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/email-templates/${templateId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name,
                    subject,
                    body,
                    cc,
                    bcc,
                    is_active: isActive,
                }),
            });

            const data = await res.json();
            if (data.success) {
                toast.success("Email template updated successfully!");
                if (viewMode === "preview") {
                    fetchPreview();
                }
            } else {
                toast.error(data.message || "Failed to save template.");
            }
        } catch (err) {
            toast.error("An error occurred while saving.");
        } finally {
            setSaving(false);
        }
    };

    const handleSendTestEmail = async () => {
        if (!testEmailAddress || !testEmailAddress.includes("@")) {
            toast.error("Please enter a valid recipient email address.");
            return;
        }

        setSendingTest(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/email-templates/${templateId}/test`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    recipient_email: testEmailAddress,
                    subject,
                    body,
                    cc,
                    bcc,
                }),
            });

            const data = await res.json();
            if (data.success) {
                toast.success(data.message || "Test email sent successfully!");
                setTestModalOpen(false);
            } else {
                toast.error(data.message || "Failed to send test email.");
            }
        } catch (err) {
            toast.error("Error sending test email.");
        } finally {
            setSendingTest(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout title="Edit Email Template">
                <div className="py-24 text-center">
                    <LoadingSpinner />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title={name || "Edit Email Template"}>
            <div className="space-y-6 max-w-7xl mx-auto pb-16">
                {/* Header Navigation */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-5 rounded-2xl border border-border/80 shadow-xs">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/settings/email-templates"
                            className="p-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors cursor-pointer border border-border/60"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-foreground tracking-tight">{name || "Edit Template"}</h1>
                                <code className="px-2 py-0.5 rounded bg-muted text-emerald-500 text-xs font-mono font-semibold">
                                    {key}
                                </code>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Customize template subject, body HTML, CC/BCC recipients, and activation status.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Editor / Live Preview Tabs */}
                        <div className="bg-muted p-1 rounded-xl flex items-center gap-1 border border-border/60">
                            <button
                                onClick={() => handleTogglePreviewMode("editor")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    viewMode === "editor" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <Code className="w-3.5 h-3.5" />
                                HTML Editor
                            </button>

                            <button
                                onClick={() => handleTogglePreviewMode("preview")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    viewMode === "preview" ? "bg-card text-emerald-500 shadow-xs" : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <Eye className="w-3.5 h-3.5" />
                                Live Preview
                            </button>
                        </div>

                        <button
                            onClick={() => setTestModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-bold transition-all border border-border/60 cursor-pointer"
                        >
                            <Send className="w-3.5 h-3.5 text-emerald-500" />
                            Test Email
                        </button>

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Save Changes
                        </button>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left & Middle Column: Form / Editor */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Status & Name Card */}
                        <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-border/60">
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Template Information</h3>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-semibold text-muted-foreground">Template Active:</span>
                                    <button
                                        type="button"
                                        onClick={() => setIsActive(!isActive)}
                                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                                            isActive ? "bg-emerald-500" : "bg-muted"
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-4.5 w-4.5 rounded-full bg-white shadow transition-transform ${
                                                isActive ? "translate-x-5.5" : "translate-x-1"
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                                        Template Name
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Order Placed"
                                        className="w-full px-3.5 py-2.5 text-sm bg-background/50 border border-border/80 rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                                        Unique Key Identifier <span className="text-xs text-muted-foreground font-normal">(Read-only)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={key}
                                        disabled
                                        className="w-full px-3.5 py-2.5 text-sm bg-muted/60 border border-border/60 rounded-xl text-muted-foreground font-mono font-semibold cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            {/* Subject Line */}
                            <div>
                                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                                    Email Subject Line
                                </label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="e.g. Order {{order_number}} has been placed successfully"
                                    className="w-full px-3.5 py-2.5 text-sm bg-background/50 border border-border/80 rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                                />
                            </div>

                            {/* CC & BCC */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                                        CC Recipients <span className="text-xs text-muted-foreground font-normal">(Comma separated)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={cc}
                                        onChange={(e) => setCc(e.target.value)}
                                        placeholder="support@example.com, admin@example.com"
                                        className="w-full px-3.5 py-2.5 text-sm bg-background/50 border border-border/80 rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                                        BCC Recipients <span className="text-xs text-muted-foreground font-normal">(Comma separated)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={bcc}
                                        onChange={(e) => setBcc(e.target.value)}
                                        placeholder="audit@example.com, orders@example.com"
                                        className="w-full px-3.5 py-2.5 text-sm bg-background/50 border border-border/80 rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Body Editor or Live Preview View */}
                        <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-border/60">
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                                    {viewMode === "editor" ? (
                                        <>
                                            <Code className="w-4 h-4 text-emerald-500" />
                                            HTML Email Body Code
                                        </>
                                    ) : (
                                        <>
                                            <Eye className="w-4 h-4 text-emerald-500" />
                                            Rendered Live Preview
                                        </>
                                    )}
                                </h3>
                                <span className="text-xs text-muted-foreground">
                                    {viewMode === "editor" ? "Supports HTML & inline CSS" : "Sample values populated"}
                                </span>
                            </div>

                            {viewMode === "editor" ? (
                                <div>
                                    <textarea
                                        rows={18}
                                        value={body}
                                        onChange={(e) => setBody(e.target.value)}
                                        placeholder="Enter responsive HTML template..."
                                        className="w-full p-4 font-mono text-xs bg-background/80 border border-border/80 rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {previewLoading ? (
                                        <div className="py-16 text-center">
                                            <LoadingSpinner />
                                        </div>
                                    ) : previewData ? (
                                        <>
                                            <div className="bg-background/80 border border-border/70 p-4 rounded-xl space-y-2 text-xs">
                                                <div className="flex">
                                                    <span className="w-24 font-bold text-muted-foreground uppercase tracking-wider">Subject:</span>
                                                    <span className="font-semibold text-foreground">{previewData.rendered_subject}</span>
                                                </div>
                                                <div className="flex">
                                                    <span className="w-24 font-bold text-muted-foreground uppercase tracking-wider">To:</span>
                                                    <span className="font-medium text-foreground">{previewData.to}</span>
                                                </div>
                                                {previewData.cc && previewData.cc.length > 0 && (
                                                    <div className="flex">
                                                        <span className="w-24 font-bold text-muted-foreground uppercase tracking-wider">CC:</span>
                                                        <span className="font-medium text-muted-foreground">{previewData.cc.join(", ")}</span>
                                                    </div>
                                                )}
                                                {previewData.bcc && previewData.bcc.length > 0 && (
                                                    <div className="flex">
                                                        <span className="w-24 font-bold text-muted-foreground uppercase tracking-wider">BCC:</span>
                                                        <span className="font-medium text-muted-foreground">{previewData.bcc.join(", ")}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="border border-border/80 rounded-xl p-6 bg-white text-black min-h-[350px]">
                                                <div dangerouslySetInnerHTML={{ __html: previewData.rendered_body }} />
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-center text-muted-foreground text-sm py-12">Failed to render live preview.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Available Variables Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs sticky top-6">
                            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-border/60">
                                <Sparkles className="w-4 h-4 text-emerald-500" />
                                <h3 className="text-sm font-bold text-foreground tracking-tight">Available Variables</h3>
                            </div>

                            <p className="text-xs text-muted-foreground mb-4">
                                Click any variable tag to copy to clipboard or insert directly into the template body.
                            </p>

                            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                                {availableVariables.map((item) => (
                                    <div
                                        key={item.var}
                                        className="p-3 bg-muted/40 hover:bg-muted/70 rounded-xl border border-border/50 transition-colors group"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <code className="text-xs font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                                {item.var}
                                            </code>
                                            <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleCopyVar(item.var)}
                                                    title="Copy Variable"
                                                    className="p-1 rounded text-muted-foreground hover:text-emerald-500 hover:bg-background transition-colors cursor-pointer"
                                                >
                                                    {copiedVar === item.var ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                                </button>
                                                {viewMode === "editor" && (
                                                    <button
                                                        onClick={() => handleInsertVarToBody(item.var)}
                                                        title="Insert to Body"
                                                        className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500 text-white hover:bg-emerald-600 transition-colors cursor-pointer"
                                                    >
                                                        Insert
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground font-medium">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Send Test Email Modal */}
                {testModalOpen && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-card border border-border/80 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
                            <div className="flex items-center justify-between border-b border-border/60 pb-3">
                                <div className="flex items-center gap-2">
                                    <Send className="w-4 h-4 text-emerald-500" />
                                    <h3 className="text-base font-bold text-foreground">Send Test Email</h3>
                                </div>
                                <button
                                    onClick={() => setTestModalOpen(false)}
                                    className="text-muted-foreground hover:text-foreground text-sm cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>

                            <p className="text-xs text-muted-foreground">
                                Enter the recipient email address to send a live test message using current template variables and sample order data.
                            </p>

                            <div>
                                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                                    Recipient Email Address
                                </label>
                                <input
                                    type="email"
                                    value={testEmailAddress}
                                    onChange={(e) => setTestEmailAddress(e.target.value)}
                                    placeholder="admin@example.com"
                                    className="w-full px-3.5 py-2.5 text-sm bg-background/50 border border-border/80 rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    onClick={() => setTestModalOpen(false)}
                                    className="px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSendTestEmail}
                                    disabled={sendingTest}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                                >
                                    {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                    Send Email
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
