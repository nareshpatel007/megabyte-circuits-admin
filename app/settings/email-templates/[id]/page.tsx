"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Editor } from "@tinymce/tinymce-react";
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
    X,
    FileText,
} from "lucide-react";
import { toast } from "sonner";

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
    const [toRecipient, setToRecipient] = useState("");
    const [fromEmail, setFromEmail] = useState("");
    const [fromName, setFromName] = useState("");
    const [cc, setCc] = useState("");
    const [bcc, setBcc] = useState("");
    const [isActive, setIsActive] = useState(true);

    const [availableVariables, setAvailableVariables] = useState<VariableInfo[]>([]);

    // Mode: "tinymce" | "code" | "preview"
    const [viewMode, setViewMode] = useState<"tinymce" | "code" | "preview">("tinymce");
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewData, setPreviewData] = useState<{
        rendered_subject: string;
        rendered_body: string;
        from_email?: string;
        from_name?: string;
        to: string;
        cc: string[];
        bcc: string[];
    } | null>(null);

    // Test Email Modal
    const [testModalOpen, setTestModalOpen] = useState(false);
    const [testEmailAddress, setTestEmailAddress] = useState("");
    const [useConfiguredCcBcc, setUseConfiguredCcBcc] = useState(false);
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
                setToRecipient(tpl.to || "");
                setFromEmail(tpl.from_email || "");
                setFromName(tpl.from_name || "");
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
                    to: toRecipient,
                    from_email: fromEmail,
                    from_name: fromName,
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

    const handleTogglePreviewMode = (mode: "tinymce" | "code" | "preview") => {
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
                    to: toRecipient,
                    from_email: fromEmail,
                    from_name: fromName,
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
            toast.error("Please enter a valid email address.");
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
                    use_configured_cc_bcc: useConfiguredCcBcc,
                    subject,
                    body,
                    to: toRecipient,
                    from_email: fromEmail,
                    from_name: fromName,
                    cc,
                    bcc,
                }),
            });

            const data = await res.json();
            if (data.success) {
                toast.success(data.message || `Test email sent successfully to ${testEmailAddress}.`);
                setTestModalOpen(false);
            } else {
                toast.error(data.message || "Unable to send test email. Please check the email configuration and try again.");
            }
        } catch (err) {
            toast.error("Unable to send test email. Please check the email configuration and try again.");
        } finally {
            setSendingTest(false);
        }
    };

    const headerActions = (
        <div className="flex flex-wrap items-center gap-2">
            <Link
                href="/settings/email-templates"
                className="p-2 text-muted-foreground hover:text-foreground border border-input rounded-lg bg-background hover:bg-accent transition-colors"
                title="Back to Email Templates"
            >
                <ArrowLeft className="w-4 h-4" />
            </Link>

            {/* Editor / Live Preview Tabs */}
            <div className="bg-muted p-1 rounded-lg flex items-center gap-1 border border-border">
                <button
                    onClick={() => handleTogglePreviewMode("tinymce")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        viewMode === "tinymce" ? "bg-background text-emerald-600 shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <FileText className="w-3.5 h-3.5" />
                    Visual Editor
                </button>

                <button
                    onClick={() => handleTogglePreviewMode("code")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        viewMode === "code" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <Code className="w-3.5 h-3.5" />
                    HTML Code
                </button>

                <button
                    onClick={() => handleTogglePreviewMode("preview")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        viewMode === "preview" ? "bg-background text-emerald-600 shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <Eye className="w-3.5 h-3.5" />
                    Live Preview
                </button>
            </div>

            <button
                onClick={() => setTestModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-input bg-background hover:bg-accent text-foreground text-xs font-semibold transition-colors cursor-pointer"
            >
                <Send className="w-3.5 h-3.5 text-emerald-600" />
                Test Email
            </button>

            <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Changes
            </button>
        </div>
    );

    return (
        <DashboardLayout
            title={name ? name : "Edit Email Template"}
            subtitle={key ? `Key: ${key} — Customize subject, body HTML, CC/BCC recipients, and activation status.` : "Customize template subject, body HTML, CC/BCC recipients, and activation status."}
            action={headerActions}
        >
            <div className="space-y-6 pb-12">
                {loading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
                        <div className="lg:col-span-2 space-y-6">
                            {/* Form Header Skeleton */}
                            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                                <div className="h-4 bg-muted rounded-md w-1/4 mb-4" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <div className="h-3 bg-muted/70 rounded-md w-24" />
                                        <div className="h-10 bg-muted/50 rounded-lg w-full" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="h-3 bg-muted/70 rounded-md w-20" />
                                        <div className="h-10 bg-muted/40 rounded-lg w-full" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-3 bg-muted/70 rounded-md w-28" />
                                    <div className="h-10 bg-muted/50 rounded-lg w-full" />
                                </div>
                            </div>

                            {/* Editor Skeleton */}
                            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                                <div className="h-4 bg-muted rounded-md w-1/3" />
                                <div className="h-[420px] bg-muted/40 rounded-lg w-full" />
                            </div>
                        </div>

                        {/* Sidebar Skeleton */}
                        <div className="space-y-6">
                            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                                <div className="h-4 bg-muted rounded-md w-1/2 mb-2" />
                                <div className="h-3 bg-muted/60 rounded-md w-3/4 mb-4" />
                                <div className="space-y-3">
                                    {[1, 2, 3, 4, 5, 6].map((i) => (
                                        <div key={i} className="h-16 bg-muted/30 border border-border/40 rounded-lg" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Main Content Grid */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Form & Editor */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Settings Box */}
                            <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-border">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Template Configuration</h3>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-medium text-muted-foreground">Active:</span>
                                        <button
                                            type="button"
                                            onClick={() => setIsActive(!isActive)}
                                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                                                isActive ? "bg-emerald-600" : "bg-muted"
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                                                    isActive ? "translate-x-4.5" : "translate-x-0.5"
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
                                            className="w-full px-3.5 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                                            Key <span className="text-xs text-muted-foreground font-normal">(Read-only)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={key}
                                            disabled
                                            className="w-full px-3.5 py-2 bg-muted/60 border border-input rounded-lg text-sm text-muted-foreground font-mono font-semibold cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                {/* Subject Line */}
                                <div>
                                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                                        Subject Line
                                    </label>
                                    <input
                                        type="text"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        placeholder="e.g. Order {{order_number}} has been placed successfully"
                                        className="w-full px-3.5 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 font-medium"
                                    />
                                </div>

                                {/* From Email & From Name */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                    <div>
                                        <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                                            From Email <span className="text-xs text-muted-foreground font-normal">(Optional override)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={fromEmail}
                                            onChange={(e) => setFromEmail(e.target.value)}
                                            placeholder="notifications@megabytecircuit.com"
                                            className="w-full px-3.5 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                                            From Name <span className="text-xs text-muted-foreground font-normal">(Optional variable e.g. {"{{company_name}}"})</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={fromName}
                                            onChange={(e) => setFromName(e.target.value)}
                                            placeholder="{{company_name}}"
                                            className="w-full px-3.5 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                </div>

                                {/* TO, CC & BCC */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                                    <div>
                                        <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                                            TO Recipient <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={toRecipient}
                                            onChange={(e) => setToRecipient(e.target.value)}
                                            placeholder="inventory@example.com"
                                            className="w-full px-3.5 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                                            CC <span className="text-xs text-muted-foreground font-normal">(Comma separated)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={cc}
                                            onChange={(e) => setCc(e.target.value)}
                                            placeholder="support@example.com, admin@example.com"
                                            className="w-full px-3.5 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                                            BCC <span className="text-xs text-muted-foreground font-normal">(Comma separated)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={bcc}
                                            onChange={(e) => setBcc(e.target.value)}
                                            placeholder="audit@example.com, orders@example.com"
                                            className="w-full px-3.5 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Body Editor / Live Preview Container */}
                            <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-border">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                        {viewMode === "tinymce" ? (
                                            <>
                                                <FileText className="w-4 h-4 text-emerald-600" />
                                                TinyMCE Visual HTML Editor
                                            </>
                                        ) : viewMode === "code" ? (
                                            <>
                                                <Code className="w-4 h-4 text-emerald-600" />
                                                HTML Source Code Editor
                                            </>
                                        ) : (
                                            <>
                                                <Eye className="w-4 h-4 text-emerald-600" />
                                                Rendered Live Preview
                                            </>
                                        )}
                                    </h3>
                                </div>

                                {viewMode === "tinymce" ? (
                                    <div className="min-h-[480px]">
                                        <Editor
                                            apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY || "no-api-key"}
                                            value={body}
                                            onEditorChange={(newContent) => setBody(newContent)}
                                            init={{
                                                height: 480,
                                                menubar: true,
                                                plugins: [
                                                    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                                                    'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                                                    'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                                                ],
                                                toolbar: 'undo redo | blocks | ' +
                                                    'bold italic forecolor backcolor | alignleft aligncenter ' +
                                                    'alignright alignjustify | bullist numlist outdent indent | ' +
                                                    'removeformat | code fullscreen | help',
                                                content_style: 'body { font-family:Arial,sans-serif; font-size:14px; line-height:1.5 }',
                                                skin: 'oxide',
                                                content_css: 'default',
                                                entity_encoding: 'raw',
                                            }}
                                        />
                                    </div>
                                ) : viewMode === "code" ? (
                                    <div>
                                        <textarea
                                            rows={18}
                                            value={body}
                                            onChange={(e) => setBody(e.target.value)}
                                            placeholder="Enter responsive HTML template..."
                                            className="w-full p-4 font-mono text-xs bg-background border border-input rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 leading-relaxed"
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {previewLoading ? (
                                            <div className="space-y-4 animate-pulse">
                                                <div className="bg-background border border-border p-3.5 rounded-lg space-y-2.5">
                                                    <div className="h-4 bg-muted rounded-md w-3/4" />
                                                    <div className="h-3 bg-muted/70 rounded-md w-1/2" />
                                                </div>
                                                <div className="border border-border rounded-lg p-6 bg-white min-h-[350px] flex flex-col items-center justify-center space-y-4">
                                                    <div className="h-8 bg-slate-200 rounded-md w-48" />
                                                    <div className="w-full space-y-2 max-w-md pt-4">
                                                        <div className="h-4 bg-slate-200 rounded-md w-full" />
                                                        <div className="h-4 bg-slate-200 rounded-md w-5/6" />
                                                        <div className="h-4 bg-slate-200 rounded-md w-4/6" />
                                                    </div>
                                                    <div className="h-32 bg-slate-100 border border-slate-200 rounded-lg w-full max-w-md mt-4" />
                                                </div>
                                            </div>
                                        ) : previewData ? (
                                            <>
                                                <div className="bg-background border border-border p-3.5 rounded-lg space-y-1.5 text-xs">
                                                    <div className="flex">
                                                        <span className="w-20 font-bold text-muted-foreground uppercase">Subject:</span>
                                                        <span className="font-semibold text-foreground">{previewData.rendered_subject}</span>
                                                    </div>
                                                    <div className="flex">
                                                        <span className="w-20 font-bold text-muted-foreground uppercase">From:</span>
                                                        <span className="font-medium text-foreground">
                                                            {previewData.from_name ? `${previewData.from_name} <${previewData.from_email}>` : previewData.from_email}
                                                        </span>
                                                    </div>
                                                    <div className="flex">
                                                        <span className="w-20 font-bold text-muted-foreground uppercase">To:</span>
                                                        <span className="font-medium text-foreground">{previewData.to}</span>
                                                    </div>
                                                    {previewData.cc && previewData.cc.length > 0 && (
                                                        <div className="flex">
                                                            <span className="w-20 font-bold text-muted-foreground uppercase">CC:</span>
                                                            <span className="font-medium text-muted-foreground">{previewData.cc.join(", ")}</span>
                                                        </div>
                                                    )}
                                                    {previewData.bcc && previewData.bcc.length > 0 && (
                                                        <div className="flex">
                                                            <span className="w-20 font-bold text-muted-foreground uppercase">BCC:</span>
                                                            <span className="font-medium text-muted-foreground">{previewData.bcc.join(", ")}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="border border-border rounded-lg p-5 bg-white text-black min-h-[350px]">
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

                        {/* Available Variables Sidebar */}
                        <div className="space-y-6">
                            <div className="bg-card border border-border rounded-xl p-5 shadow-xs sticky top-6">
                                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-border">
                                    <Sparkles className="w-4 h-4 text-emerald-600" />
                                    <h3 className="text-sm font-bold text-foreground">Available Variables</h3>
                                </div>

                                <p className="text-xs text-muted-foreground mb-4">
                                    Click any variable tag to copy to clipboard or insert directly into the template body.
                                </p>

                                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                                    {availableVariables.map((item) => (
                                        <div
                                            key={item.var}
                                            className="p-3 bg-muted/40 hover:bg-muted/70 rounded-lg border border-border transition-colors group"
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <code className="text-xs font-mono font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                                    {item.var}
                                                </code>
                                                <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleCopyVar(item.var)}
                                                        title="Copy Variable"
                                                        className="p-1 rounded text-muted-foreground hover:text-emerald-600 hover:bg-background transition-colors cursor-pointer"
                                                    >
                                                        {copiedVar === item.var ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                    </button>
                                                    {viewMode !== "preview" && (
                                                        <button
                                                            onClick={() => handleInsertVarToBody(item.var)}
                                                            title="Insert to Body"
                                                            className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
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
                )}

                {/* Send Test Email Modal */}
                {testModalOpen && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-card border border-border rounded-xl w-full max-w-md p-5 shadow-xl space-y-4">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <div className="flex items-center gap-2">
                                    <Send className="w-4 h-4 text-emerald-600" />
                                    <h3 className="text-sm font-bold text-foreground">Send Test Email</h3>
                                </div>
                                <button
                                    onClick={() => setTestModalOpen(false)}
                                    className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={testEmailAddress}
                                    onChange={(e) => setTestEmailAddress(e.target.value)}
                                    placeholder="test@example.com"
                                    className="w-full px-3.5 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="use_configured_cc_bcc"
                                    checked={useConfiguredCcBcc}
                                    onChange={(e) => setUseConfiguredCcBcc(e.target.checked)}
                                    className="w-4 h-4 rounded border-input text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                />
                                <label htmlFor="use_configured_cc_bcc" className="text-xs font-medium text-foreground cursor-pointer select-none">
                                    Use configured CC/BCC
                                </label>
                            </div>

                            <p className="text-[11px] text-muted-foreground pt-1">
                                The email will be sent using dummy order/customer data.
                            </p>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    onClick={() => setTestModalOpen(false)}
                                    className="px-4 py-2 border border-input bg-background hover:bg-accent text-foreground text-xs font-medium rounded-lg transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSendTestEmail}
                                    disabled={sendingTest}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
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
