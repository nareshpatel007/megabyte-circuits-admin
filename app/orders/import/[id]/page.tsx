"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { 
    FileSpreadsheet, 
    CheckCircle2, 
    AlertTriangle, 
    RefreshCw, 
    ArrowLeft, 
    CheckCircle, 
    XCircle, 
    Clock, 
    Trash2,
    PlusCircle,
    ChevronRight,
    ListFilter
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ImportProgressPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: importId } = use(params);

    const [importSession, setImportSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchImportStatus = async () => {
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/imports/${importId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            if (res.ok && json.status && json.data) {
                setImportSession(json.data);
            }
        } catch (e) {
            console.error("Error polling import status:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchImportStatus();
        const interval = setInterval(() => {
            fetchImportStatus();
        }, 3000);

        return () => clearInterval(interval);
    }, [importId]);

    const totalRows = importSession?.total_rows ?? 0;
    const processedRows = importSession?.processed_rows ?? 0;
    const successfulRows = importSession?.successful_rows ?? 0;
    const failedRows = importSession?.failed_rows ?? 0;
    const progressPercent = totalRows > 0 ? Math.min(100, Math.round((processedRows / totalRows) * 100)) : 0;
    const status = importSession?.status ?? "queued";

    const getStatusBadge = (st: string) => {
        switch (st) {
            case "queued":
                return <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Queued for Worker</span>;
            case "processing":
                return <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing Orders...</span>;
            case "completed":
                return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Completed Successfully</span>;
            case "failed":
                return <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Failed</span>;
            case "cancelled":
                return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Cancelled</span>;
            default:
                return <span className="px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground uppercase">{st}</span>;
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 p-6 pb-24">
            {/* Top Navigation Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
                <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-1">
                        <Link href="/orders/import" className="hover:text-foreground transition-colors flex items-center gap-1">
                            <ArrowLeft className="w-3.5 h-3.5" /> Import Home
                        </Link>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span className="text-foreground">Step 3: Background Processing</span>
                    </div>
                    <h1 className="text-2xl font-black flex items-center gap-2 text-foreground tracking-tight">
                        <FileSpreadsheet className="w-7 h-7 text-emerald-500" />
                        Import Progress — Session #{importId}
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        File: <strong className="text-foreground">{importSession?.original_file_name || "Spreadsheet"}</strong> — Background queue execution status and live metrics.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Link href="/orders">
                        <Button type="button" variant="outline" className="font-bold text-xs rounded-2xl h-10 px-4">
                            Back to PCB Orders
                        </Button>
                    </Link>
                    <Link href="/orders/import">
                        <Button type="button" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-600/20 h-10 px-4 gap-1.5">
                            <PlusCircle className="w-4 h-4" />
                            Import Another File
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stepper Header */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-muted/40 border border-border/80 p-3.5 rounded-2xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-xs flex items-center justify-center shrink-0">✓</div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Step 1 — Upload & Stage</h4>
                        <p className="text-[11px] text-muted-foreground font-medium">Excel parsed into staging</p>
                    </div>
                </div>

                <div className="bg-muted/40 border border-border/80 p-3.5 rounded-2xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-xs flex items-center justify-center shrink-0">✓</div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Step 2 — Review & Fix</h4>
                        <p className="text-[11px] text-muted-foreground font-medium">Staged data validated & confirmed</p>
                    </div>
                </div>

                <div className="bg-emerald-500/10 border-2 border-emerald-500 p-3.5 rounded-2xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white font-black text-xs flex items-center justify-center shrink-0">3</div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Step 3 — Queue & Process</h4>
                        <p className="text-[11px] text-muted-foreground font-medium">Background creation active</p>
                    </div>
                </div>
            </div>

            {/* Real-time Progress Bar Card */}
            <div className="bg-card border border-border/80 p-6 rounded-3xl space-y-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
                    <div className="space-y-1">
                        <div className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">Execution Status</div>
                        <div className="flex items-center gap-3">
                            {getStatusBadge(status)}
                            <span className="text-xs font-bold text-muted-foreground">
                                Started: {importSession?.started_at ? new Date(importSession.started_at).toLocaleTimeString() : "Pending"}
                            </span>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="text-2xl font-black text-foreground font-mono">{progressPercent}%</div>
                        <div className="text-[11px] font-bold text-muted-foreground">
                            {processedRows} of {totalRows} records processed
                        </div>
                    </div>
                </div>

                {/* Animated Progress Bar */}
                <div className="space-y-2">
                    <div className="w-full h-4 bg-muted/60 rounded-full overflow-hidden p-0.5 border border-border/80">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl">
                        <div className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Successful</div>
                        <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{successfulRows}</div>
                    </div>
                    <div className="bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-2xl">
                        <div className="text-[10px] font-extrabold text-rose-500 uppercase tracking-wider">Failed</div>
                        <div className="text-xl font-black text-rose-500">{failedRows}</div>
                    </div>
                    <div className="bg-indigo-500/10 border border-indigo-500/20 p-3.5 rounded-2xl">
                        <div className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-wider">Existing Customers</div>
                        <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">{importSession?.existing_customers ?? 0}</div>
                    </div>
                    <div className="bg-purple-500/10 border border-purple-500/20 p-3.5 rounded-2xl">
                        <div className="text-[10px] font-extrabold text-purple-500 uppercase tracking-wider">New Customers</div>
                        <div className="text-xl font-black text-purple-600 dark:text-purple-400">{importSession?.new_customers ?? 0}</div>
                    </div>
                </div>
            </div>

            {/* Temporary Storage File Cleanup Notice */}
            <div className="bg-muted/30 border border-border/80 p-4 rounded-2xl flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2.5 text-muted-foreground font-medium">
                    <Trash2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>
                        <strong className="text-foreground">Temporary File Lifecycle:</strong> Physical uploaded file is automatically removed from local disk after background completion, while session history and row logs remain safely archived.
                    </span>
                </div>
            </div>

            {/* Error Audit Log Table (if any failures occurred) */}
            {importSession?.errors && importSession.errors.length > 0 && (
                <div className="space-y-3">
                    <div className="text-xs font-black uppercase tracking-wider text-rose-500 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Row Error Audit Log ({importSession.errors.length} Errors)
                    </div>

                    <div className="border border-border/80 rounded-2xl overflow-hidden bg-card text-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-muted/60 text-[10px] font-extrabold uppercase text-muted-foreground border-b border-border/80">
                                    <tr>
                                        <th className="p-3 pl-4">Row</th>
                                        <th className="p-3">Column</th>
                                        <th className="p-3">Value</th>
                                        <th className="p-3 pr-4">Error Message</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60 font-medium text-rose-600 dark:text-rose-400">
                                    {importSession.errors.map((err: any) => (
                                        <tr key={err.id} className="hover:bg-rose-500/5">
                                            <td className="p-3 pl-4 font-mono font-bold">#{err.row_number}</td>
                                            <td className="p-3 font-semibold">{err.column_name || "General"}</td>
                                            <td className="p-3 font-mono">{err.value || "-"}</td>
                                            <td className="p-3 pr-4 font-bold">{err.error_message}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
