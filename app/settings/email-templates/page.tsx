"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Mail, Edit2, Eye, CheckCircle2, XCircle, RefreshCw, Search, Filter, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

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

    // Search and Status filters
    const [search, setSearch] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");

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

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
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
        }
    }, []);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

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

    const filteredTemplates = templates.filter((t) => {
        const matchesSearch =
            !search.trim() ||
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.key.toLowerCase().includes(search.toLowerCase()) ||
            t.subject.toLowerCase().includes(search.toLowerCase());

        const matchesStatus =
            selectedStatus === "all" ||
            (selectedStatus === "active" && t.is_active) ||
            (selectedStatus === "inactive" && !t.is_active);

        return matchesSearch && matchesStatus;
    });

    return (
        <DashboardLayout
            title="Email Templates"
            subtitle="Manage, customize, and automate order notification emails sent to customers."
        >
            <div className="space-y-6">
                {/* Action / Filter Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-xs">
                    {/* Search & Status Filters */}
                    <div className="flex flex-wrap items-center gap-3 flex-1">
                        <div className="relative flex-1 min-w-[240px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search template name, key, subject..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="bg-background border border-input rounded-lg text-sm px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Active Only</option>
                                <option value="inactive">Inactive Only</option>
                            </select>
                        </div>
                    </div>

                    {/* Refresh Button */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchTemplates}
                            title="Refresh List"
                            className="p-2.5 text-muted-foreground hover:text-foreground border border-input rounded-lg bg-background hover:bg-accent transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        </button>
                    </div>
                </div>

                {/* Table View */}
                <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xs">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 text-muted-foreground">
                            <Loader2 className="w-6 h-6 animate-spin mr-2" />
                            <span>Loading email templates...</span>
                        </div>
                    ) : filteredTemplates.length === 0 ? (
                        <div className="text-center py-16 px-4">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                                <Mail className="w-6 h-6" />
                            </div>
                            <h3 className="text-base font-semibold text-foreground">No email templates found</h3>
                            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                                {search || selectedStatus !== "all"
                                    ? "No templates match your search parameters."
                                    : "No email templates exist."}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-muted/50 border-b border-border text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                                        <th className="py-3 px-4">Template Name</th>
                                        <th className="py-3 px-4">Key Identifier</th>
                                        <th className="py-3 px-4">Subject Line</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4">Last Updated</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60 font-medium text-sm">
                                    {filteredTemplates.map((tpl) => (
                                        <tr key={tpl.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold text-xs flex items-center justify-center border border-emerald-500/20">
                                                        {tpl.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-foreground block">{tpl.name}</span>
                                                        <span className="text-xs text-muted-foreground">System Notification</span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-4">
                                                <code className="px-2.5 py-1 rounded bg-muted text-emerald-600 text-xs font-mono font-semibold border border-border">
                                                    {tpl.key}
                                                </code>
                                            </td>

                                            <td className="py-3.5 px-4 max-w-xs truncate text-muted-foreground">
                                                {tpl.subject}
                                            </td>

                                            <td className="py-3.5 px-4">
                                                {tpl.is_active ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-semibold">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border text-xs font-semibold">
                                                        <XCircle className="w-3.5 h-3.5" />
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>

                                            <td className="py-3.5 px-4 text-xs text-muted-foreground">
                                                {new Date(tpl.updated_at).toLocaleDateString("en-IN", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </td>

                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleQuickPreview(tpl)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-input bg-background hover:bg-accent text-foreground transition-colors cursor-pointer"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        Preview
                                                    </button>

                                                    <Link
                                                        href={`/settings/email-templates/${tpl.id}`}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs"
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
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-card border border-border rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-xl overflow-hidden">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/40">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-emerald-600" />
                                    <h3 className="text-sm font-bold text-foreground">
                                        Email Preview: {previewTemplate.name}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => {
                                        setPreviewTemplate(null);
                                        setPreviewData(null);
                                    }}
                                    className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-5 overflow-y-auto flex-1 space-y-4">
                                {previewLoading ? (
                                    <div className="py-12 text-center text-muted-foreground flex items-center justify-center">
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        <span>Rendering template preview...</span>
                                    </div>
                                ) : previewData ? (
                                    <>
                                        <div className="bg-background border border-border p-3.5 rounded-lg space-y-1.5 text-xs">
                                            <div className="flex">
                                                <span className="w-20 font-bold text-muted-foreground uppercase">Subject:</span>
                                                <span className="font-semibold text-foreground">{previewData.rendered_subject}</span>
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

                                        <div className="border border-border rounded-lg p-5 bg-white text-black min-h-[250px]">
                                            <div dangerouslySetInnerHTML={{ __html: previewData.rendered_body }} />
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-center text-sm text-muted-foreground py-8">Failed to generate preview.</p>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-between p-4 border-t border-border bg-muted/20">
                                <Link
                                    href={`/settings/email-templates/${previewTemplate.id}`}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    Edit This Template
                                </Link>

                                <button
                                    onClick={() => {
                                        setPreviewTemplate(null);
                                        setPreviewData(null);
                                    }}
                                    className="px-4 py-2 border border-input bg-background hover:bg-accent text-foreground text-xs font-medium rounded-lg transition-colors cursor-pointer"
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
