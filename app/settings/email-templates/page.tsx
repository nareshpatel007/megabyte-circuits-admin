"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Mail, Edit2, Eye, CheckCircle2, XCircle, RefreshCw, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import LoadingSpinner from "@/components/ui/loading-spinner";

interface EmailTemplate {
    id: number;
    name: string;
    key: string;
    subject: string;
    body: string;
    cc: string | null;
    bcc: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export default function EmailTemplatesPage() {
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal state for quick preview
    const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
    const [previewData, setPreviewData] = useState<{
        rendered_subject: string;
        rendered_body: string;
        to: string;
        cc: string[];
        bcc: string[];
    } | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    const fetchTemplates = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/email-templates", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                setTemplates(data.data);
            } else {
                toast.error(data.message || "Failed to load email templates.");
            }
        } catch (error) {
            toast.error("Error connecting to server.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleQuickPreview = async (template: EmailTemplate) => {
        setPreviewTemplate(template);
        setPreviewLoading(true);

        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/email-templates/${template.id}/preview`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({}),
            });

            const data = await res.json();
            if (data.success && data.data) {
                setPreviewData(data.data);
            } else {
                toast.error(data.message || "Failed to render preview.");
            }
        } catch (err) {
            toast.error("Failed to load template preview.");
        } finally {
            setPreviewLoading(false);
        }
    };

    return (
        <DashboardLayout title="Email Templates">
            <div className="space-y-6 max-w-7xl mx-auto pb-12">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border/80 shadow-xs">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-foreground tracking-tight">Email Templates</h1>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Manage, customize, and automate order notification emails sent to customers.
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => fetchTemplates(true)}
                        disabled={refreshing}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-semibold rounded-xl transition-all cursor-pointer border border-border/60 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>

                {/* Listing Table */}
                <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs">
                    {loading ? (
                        <div className="p-12 text-center">
                            <LoadingSpinner />
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground text-sm">
                            No email templates found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-border/60 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                                        <th className="py-3.5 px-5">Template Name</th>
                                        <th className="py-3.5 px-5">Key Identifier</th>
                                        <th className="py-3.5 px-5">Subject Line</th>
                                        <th className="py-3.5 px-5">Status</th>
                                        <th className="py-3.5 px-5">Last Updated</th>
                                        <th className="py-3.5 px-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40 font-medium">
                                    {templates.map((tpl) => (
                                        <tr key={tpl.id} className="hover:bg-muted/20 transition-colors">
                                            <td className="py-4 px-5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs">
                                                        {tpl.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-foreground block">{tpl.name}</span>
                                                        <span className="text-xs text-muted-foreground">System Notification</span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-4 px-5">
                                                <code className="px-2.5 py-1 rounded-md bg-muted text-emerald-500 text-xs font-mono font-semibold border border-border/50">
                                                    {tpl.key}
                                                </code>
                                            </td>

                                            <td className="py-4 px-5 max-w-xs truncate text-muted-foreground">
                                                {tpl.subject}
                                            </td>

                                            <td className="py-4 px-5">
                                                {tpl.is_active ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs font-bold">
                                                        <XCircle className="w-3.5 h-3.5" />
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>

                                            <td className="py-4 px-5 text-xs text-muted-foreground">
                                                {new Date(tpl.updated_at).toLocaleDateString("en-IN", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </td>

                                            <td className="py-4 px-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleQuickPreview(tpl)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors cursor-pointer border border-border/60"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        Preview
                                                    </button>

                                                    <Link
                                                        href={`/settings/email-templates/${tpl.id}`}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors cursor-pointer shadow-xs"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                        Edit
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Quick Preview Modal */}
                {previewTemplate && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-card border border-border/80 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-5 border-b border-border/60 bg-muted/30">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-emerald-500" />
                                    <h3 className="text-base font-bold text-foreground">
                                        Email Preview: {previewTemplate.name}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => {
                                        setPreviewTemplate(null);
                                        setPreviewData(null);
                                    }}
                                    className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 overflow-y-auto flex-1 space-y-4">
                                {previewLoading ? (
                                    <div className="py-12 text-center">
                                        <LoadingSpinner />
                                    </div>
                                ) : previewData ? (
                                    <>
                                        <div className="bg-background/80 border border-border/70 p-4 rounded-xl space-y-2 text-xs">
                                            <div className="flex">
                                                <span className="w-20 font-bold text-muted-foreground uppercase tracking-wider">Subject:</span>
                                                <span className="font-semibold text-foreground">{previewData.rendered_subject}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="w-20 font-bold text-muted-foreground uppercase tracking-wider">To:</span>
                                                <span className="font-medium text-foreground">{previewData.to}</span>
                                            </div>
                                            {previewData.cc && previewData.cc.length > 0 && (
                                                <div className="flex">
                                                    <span className="w-20 font-bold text-muted-foreground uppercase tracking-wider">CC:</span>
                                                    <span className="font-medium text-muted-foreground">{previewData.cc.join(", ")}</span>
                                                </div>
                                            )}
                                            {previewData.bcc && previewData.bcc.length > 0 && (
                                                <div className="flex">
                                                    <span className="w-20 font-bold text-muted-foreground uppercase tracking-wider">BCC:</span>
                                                    <span className="font-medium text-muted-foreground">{previewData.bcc.join(", ")}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="border border-border/80 rounded-xl p-4 bg-white text-black min-h-[250px]">
                                            <div dangerouslySetInnerHTML={{ __html: previewData.rendered_body }} />
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-center text-sm text-muted-foreground py-8">Failed to generate preview.</p>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-between p-4 border-t border-border/60 bg-muted/20">
                                <Link
                                    href={`/settings/email-templates/${previewTemplate.id}`}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    Edit This Template
                                </Link>

                                <button
                                    onClick={() => {
                                        setPreviewTemplate(null);
                                        setPreviewData(null);
                                    }}
                                    className="px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
