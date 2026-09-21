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
    Play,
    AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/layout/dashboard-layout";

export default function ImportProgressPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: importId } = use(params);

    const [importSession, setImportSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [resuming, setResuming] = useState(false);
    const [isProcessingChunk, setIsProcessingChunk] = useState(false);
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const [completedSummary, setCompletedSummary] = useState<any>(null);

    const processNextChunk = async () => {
        if (isProcessingChunk || completedSummary) return;

        setIsProcessingChunk(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/import/${importId}/process-chunk`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ batch_size: 100 }),
            });

            const contentType = res.headers.get("content-type") || "";
            if (!res.ok || !contentType.includes("application/json")) {
                const text = await res.text();
                // If 404, import session finished and was auto-purged
                if (res.status === 404 && importSession) {
                    setCompletedSummary({
                        total_rows: importSession.total_rows || importSession.processed_rows,
                        successful_rows: importSession.valid_rows || importSession.successful_rows,
                        existing_customers: importSession.existing_customers || 0,
                        new_customers: importSession.new_customers || 0
                    });
                    setImportSession((prev: any) => ({
                        ...prev,
                        status: "completed",
                        processed_rows: prev?.total_rows || prev?.processed_rows || 0,
                        successful_rows: prev?.valid_rows || prev?.successful_rows || 0,
                    }));
                }
                return;
            }

            const json = await res.json();
            if (res.ok && json.status && json.data) {
                const chunkResult = json.data;
                if (chunkResult.is_completed || chunkResult.status === "completed") {
                    setCompletedSummary({
                        total_rows: chunkResult.total_rows || importSession?.total_rows,
                        successful_rows: chunkResult.successful_rows || importSession?.valid_rows,
                        existing_customers: chunkResult.import?.existing_customers || importSession?.existing_customers || 0,
                        new_customers: chunkResult.import?.new_customers || importSession?.new_customers || 0,
                    });
                    setImportSession({
                        status: "completed",
                        total_rows: chunkResult.total_rows || importSession?.total_rows,
                        processed_rows: chunkResult.total_rows || importSession?.total_rows,
                        successful_rows: chunkResult.successful_rows || importSession?.valid_rows,
                        failed_rows: chunkResult.failed_rows || 0,
                    });
                } else if (chunkResult.import) {
                    setImportSession(chunkResult.import);
                }
            }
        } catch (e) {
            console.error("Error processing chunk:", e);
        } finally {
            setIsProcessingChunk(false);
        }
    };

    const fetchImportStatus = async () => {
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/imports/${importId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            if (res.ok && json.status && json.data) {
                setImportSession(json.data);
            } else if (res.status === 404 && importSession) {
                // Import completed & cleaned up from server
                setCompletedSummary({
                    total_rows: importSession.total_rows || importSession.processed_rows,
                    successful_rows: importSession.valid_rows || importSession.successful_rows,
                    existing_customers: importSession.existing_customers || 0,
                    new_customers: importSession.new_customers || 0
                });
                setImportSession((prev: any) => ({
                    ...prev,
                    status: "completed",
                    processed_rows: prev?.total_rows || prev?.processed_rows || 0,
                    successful_rows: prev?.valid_rows || prev?.successful_rows || 0,
                }));
            }
        } catch (e) {
            console.error("Error fetching import status:", e);
        } finally {
            setLoading(false);
        }
    };

    const currentStatus = importSession?.status ?? "queued";
    const isCompleted = currentStatus === "completed" || Boolean(completedSummary);

    // Prompt warning if user tries to close page before completion
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (!isCompleted && currentStatus !== "failed" && currentStatus !== "cancelled") {
                e.preventDefault();
                e.returnValue = "Import is in progress! Closing this page will pause the import execution. Please do not close or refresh until complete.";
                return e.returnValue;
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isCompleted, currentStatus]);

    useEffect(() => {
        fetchImportStatus();
    }, [importId]);

    // Active Chunk Processing Loop
    useEffect(() => {
        if (isCompleted || currentStatus === "failed" || currentStatus === "cancelled" || isProcessingChunk) {
            return;
        }

        const timer = setTimeout(() => {
            processNextChunk();
        }, 100);

        return () => clearTimeout(timer);
    }, [importId, currentStatus, isProcessingChunk, isCompleted]);

    const handleContinueImport = async () => {
        setResuming(true);
        setActionMessage(null);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/imports/${importId}/retry`, {
                method: "POST",
                headers: { 
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });
            const json = await res.json();
            if (res.ok && json.status) {
                setActionMessage("Import resumed! Processing remaining 100-record batches...");
                fetchImportStatus();
            } else {
                setActionMessage(json.message || "Failed to resume import execution.");
            }
        } catch (e: any) {
            setActionMessage("Network error trying to resume import.");
        } finally {
            setResuming(false);
        }
    };

    const totalRows = importSession?.total_rows ?? 0;
    const processedRows = importSession?.processed_rows ?? 0;
    const successfulRows = importSession?.successful_rows ?? 0;
    const failedRows = importSession?.failed_rows ?? 0;
    const progressPercent = totalRows > 0 ? Math.min(100, Math.round((processedRows / totalRows) * 100)) : 0;
    const status = currentStatus;

    const isFailed = status === "failed" || (status !== "processing" && status !== "queued" && status !== "completed" && processedRows < totalRows);
    const canResume = isFailed || (status === "failed" && processedRows < totalRows);

    const getStatusBadge = (st: string) => {
        switch (st) {
            case "queued":
                return <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing Orders...</span>;
            case "processing":
                return <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing Orders...</span>;
            case "completed":
                return <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Completed Successfully</span>;
            case "failed":
                return <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Failed</span>;
            case "cancelled":
                return <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Cancelled</span>;
            default:
                return <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-muted text-muted-foreground uppercase">{st}</span>;
        }
    };

    const headerAction = (
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
    );

    return (
        <DashboardLayout
            title={`Import Progress — Session #${importId}`}
            subtitle={`File: ${importSession?.original_file_name || "Jobs.xlsx"} — Background queue execution status and live metrics.`}
            action={headerAction}
        >
            <div className="w-full space-y-6 pb-24">
                {/* Stepper Header */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-muted/40 border border-border/80 p-3.5 rounded-2xl flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-xs flex items-center justify-center shrink-0">✓</div>
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-foreground">STEP 1 — UPLOAD & STAGE</h4>
                            <p className="text-[11px] text-muted-foreground font-medium">Excel parsed into staging</p>
                        </div>
                    </div>

                    <div className="bg-muted/40 border border-border/80 p-3.5 rounded-2xl flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-xs flex items-center justify-center shrink-0">✓</div>
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-foreground">STEP 2 — REVIEW & FIX</h4>
                            <p className="text-[11px] text-muted-foreground font-medium">Staged data validated & confirmed</p>
                        </div>
                    </div>

                    <div className="bg-emerald-500/10 border-2 border-emerald-500 p-3.5 rounded-2xl flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-black text-xs flex items-center justify-center shrink-0">3</div>
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">STEP 3 — QUEUE & PROCESS</h4>
                            <p className="text-[11px] text-muted-foreground font-medium">Background creation active</p>
                        </div>
                    </div>
                </div>

                {/* DO NOT CLOSE PAGE WARNING BANNER */}
                {!isCompleted && currentStatus !== "failed" && currentStatus !== "cancelled" && (
                    <div className="bg-amber-500/10 border-2 border-amber-500/40 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Import Processing in Progress — DO NOT CLOSE THIS PAGE</h4>
                            <p className="text-[11px] text-amber-700 dark:text-amber-300 font-bold">
                                Records are being created in real-time chunks (100 rows per batch). Please keep this page open until 100% complete.
                            </p>
                        </div>
                    </div>
                )}

                {/* Real-time Progress Bar Card */}
                <div className="bg-card border border-border/80 p-6 rounded-3xl space-y-6 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
                        <div className="space-y-1">
                            <div className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">EXECUTION STATUS</div>
                            <div className="flex items-center gap-3">
                                {getStatusBadge(status)}
                                {isProcessingChunk && (
                                    <span className="text-[11px] font-bold text-amber-500 animate-pulse flex items-center gap-1">
                                        <RefreshCw className="w-3 h-3 animate-spin" /> Processing Chunk...
                                    </span>
                                )}
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
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>

                    {/* Metrics Breakdown Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
                            <div className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">SUCCESSFUL</div>
                            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{successfulRows}</div>
                        </div>
                        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl">
                            <div className="text-[10px] font-extrabold text-rose-500 uppercase tracking-wider">FAILED</div>
                            <div className="text-2xl font-black text-rose-500 mt-1">{failedRows}</div>
                        </div>
                        <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl">
                            <div className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-wider">EXISTING CUSTOMERS</div>
                            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{importSession?.existing_customers ?? 0}</div>
                        </div>
                        <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-2xl">
                            <div className="text-[10px] font-extrabold text-purple-500 uppercase tracking-wider">NEW CUSTOMERS</div>
                            <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{importSession?.new_customers ?? 0}</div>
                        </div>
                    </div>
                </div>

                {/* Continue / Resume Process Card (If Process Failed or Interrupted) */}
                {(status === "failed" || (status !== "processing" && status !== "queued" && status !== "completed" && processedRows < totalRows)) && (
                    <div className="bg-rose-500/10 border-2 border-rose-500/30 p-6 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-foreground">Import Execution Interrupted / Failed</h4>
                                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                                    {importSession?.error_message 
                                        ? `Error: ${importSession.error_message}` 
                                        : `Processed ${processedRows} of ${totalRows} records. Click below to continue processing remaining batches.`}
                                </p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            onClick={handleContinueImport}
                            disabled={resuming}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-2xl h-11 px-6 shadow-lg shadow-rose-600/20 gap-2 shrink-0"
                        >
                            {resuming ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Resuming Batch...
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 fill-current" />
                                    Continue Import
                                </>
                            )}
                        </Button>
                    </div>
                )}

                {actionMessage && (
                    <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                        {actionMessage}
                    </div>
                )}

                {/* Temporary Storage File Cleanup Notice */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-medium">
                        <Trash2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>
                            <strong className="text-foreground">Automatic Cleanup Policy:</strong> Upon 100% completion of the import, all temporary data (uploaded file, staged rows, errors, and import session entry) are automatically removed from disk and database.
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

                        <div className="border border-border/80 rounded-2xl overflow-hidden bg-card text-xs shadow-sm">
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
        </DashboardLayout>
    );
}
