"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
    Upload, 
    FileSpreadsheet, 
    Download, 
    CheckCircle2, 
    AlertTriangle, 
    RefreshCw, 
    ArrowRight, 
    Clock, 
    CheckCircle, 
    XCircle, 
    FileText,
    ChevronRight,
    ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ImportPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [recentImports, setRecentImports] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    const fetchRecentImports = async () => {
        setLoadingHistory(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/orders/imports?per_page=10", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            if (res.ok && json.status) {
                setRecentImports(json.data.data || []);
            }
        } catch (e) {
            console.error("Failed to fetch import history:", e);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        fetchRecentImports();
    }, []);

    const handleDownloadSampleSheet = async () => {
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/orders/import-sample", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed to download sample sheet");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "sample_pcb_manufacturing_orders.xlsx";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success("Sample template downloaded successfully!");
        } catch (err: any) {
            toast.error(err.message || "Could not download sample sheet");
        }
    };

    const handleUploadAndStage = async () => {
        if (!file) {
            toast.error("Please select an Excel file (.xlsx or .xls) to continue.");
            return;
        }

        setUploading(true);
        const toastId = toast.loading("Uploading & staging spreadsheet rows for review...");
        try {
            const token = localStorage.getItem("admin_token");
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/admin/orders/import/upload", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            const json = await res.json();
            if (res.ok && json.status && json.data?.id) {
                toast.success("File uploaded & staged successfully!", { id: toastId });
                router.push(`/orders/import/${json.data.id}/review`);
            } else {
                throw new Error(json.message || "Failed to stage import file.");
            }
        } catch (err: any) {
            toast.error(err.message || "An error occurred while uploading file.", { id: toastId });
        } finally {
            setUploading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "reviewing":
            case "uploaded":
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1"><Clock className="w-3 h-3" /> Reviewing</span>;
            case "ready":
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ready to Import</span>;
            case "queued":
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Queued</span>;
            case "processing":
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Processing</span>;
            case "completed":
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Completed</span>;
            case "failed":
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center gap-1"><XCircle className="w-3 h-3" /> Failed</span>;
            default:
                return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground uppercase">{status}</span>;
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 p-6 pb-20">
            {/* Top Navigation & Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
                <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-1">
                        <Link href="/orders" className="hover:text-foreground transition-colors flex items-center gap-1">
                            <ArrowLeft className="w-3.5 h-3.5" /> Orders
                        </Link>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span className="text-foreground">Import Workbench</span>
                    </div>
                    <h1 className="text-2xl font-black flex items-center gap-2 text-foreground tracking-tight">
                        <FileSpreadsheet className="w-7 h-7 text-emerald-500" />
                        PCB Manufacturing Import
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Upload manufacturer Excel files, preview staged data, fix cell validation errors, and execute background imports safely.
                    </p>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownloadSampleSheet}
                    className="shrink-0 bg-card hover:bg-muted text-foreground font-bold text-xs rounded-xl shadow-xs gap-2 border-border/80 h-10"
                >
                    <Download className="w-4 h-4 text-emerald-500" />
                    Download Sample Sheet
                </Button>
            </div>

            {/* Workflow Stepper Header */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-emerald-500/10 border-2 border-emerald-500 p-4 rounded-2xl flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white font-black text-sm flex items-center justify-center shrink-0">1</div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Step 1 — Upload & Stage</h4>
                        <p className="text-[11px] text-muted-foreground font-medium">Select Excel file & parse into staging</p>
                    </div>
                </div>

                <div className="bg-muted/30 border border-border/80 p-4 rounded-2xl flex items-center gap-3 opacity-60">
                    <div className="w-9 h-9 rounded-xl bg-muted text-muted-foreground font-black text-sm flex items-center justify-center shrink-0">2</div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Step 2 — Review & Fix</h4>
                        <p className="text-[11px] text-muted-foreground font-medium">Edit cells, fix red errors & validate</p>
                    </div>
                </div>

                <div className="bg-muted/30 border border-border/80 p-4 rounded-2xl flex items-center gap-3 opacity-60">
                    <div className="w-9 h-9 rounded-xl bg-muted text-muted-foreground font-black text-sm flex items-center justify-center shrink-0">3</div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Step 3 — Queue & Process</h4>
                        <p className="text-[11px] text-muted-foreground font-medium">Background creation & progress tracking</p>
                    </div>
                </div>
            </div>

            {/* File Upload Zone */}
            <div className="bg-card border-2 border-dashed border-border/80 hover:border-emerald-500/60 rounded-3xl p-8 text-center transition-all shadow-sm space-y-6">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                    <Upload className="w-8 h-8" />
                </div>

                <div className="space-y-1 max-w-md mx-auto">
                    <h3 className="text-base font-black text-foreground">Upload Manufacturer Excel Spreadsheet</h3>
                    <p className="text-xs text-muted-foreground">
                        Supports standard 19-column layout (.xlsx, .xls max 50MB). Data is stored in staging for review before affecting production records.
                    </p>
                </div>

                <input
                    type="file"
                    id="import-file-input"
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={(e) => {
                        const selected = e.target.files?.[0];
                        if (selected) setFile(selected);
                    }}
                />

                <div className="flex flex-col items-center gap-3">
                    <label
                        htmlFor="import-file-input"
                        className="px-6 py-3 rounded-2xl bg-muted/50 hover:bg-muted border border-border/80 font-bold text-xs text-foreground cursor-pointer transition-all flex items-center gap-2"
                    >
                        <FileText className="w-4 h-4 text-emerald-500" />
                        {file ? file.name : "Choose Manufacturer Excel File"}
                    </label>

                    {file && (
                        <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                            Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                        </div>
                    )}
                </div>

                <div className="pt-2">
                    <Button
                        type="button"
                        disabled={!file || uploading}
                        onClick={handleUploadAndStage}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-600/20 h-11 px-8 gap-2 cursor-pointer"
                    >
                        {uploading ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Staging Data Rows...
                            </>
                        ) : (
                            <>
                                Upload & Continue to Review
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Recent Import Sessions History */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Import Sessions History</h3>
                        <p className="text-xs text-muted-foreground">Resume reviewing staged imports or inspect past background execution logs.</p>
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={fetchRecentImports}
                        className="text-xs font-bold text-muted-foreground hover:text-foreground gap-1.5 h-8"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Refresh
                    </Button>
                </div>

                <div className="border border-border/80 rounded-2xl overflow-hidden bg-card text-xs">
                    {loadingHistory ? (
                        <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                            Loading import history...
                        </div>
                    ) : recentImports.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-muted/50 text-[10px] font-extrabold uppercase text-muted-foreground border-b border-border/80">
                                    <tr>
                                        <th className="p-3 pl-4">Import Session</th>
                                        <th className="p-3">Uploaded Date</th>
                                        <th className="p-3 text-center">Total Rows</th>
                                        <th className="p-3 text-center">Valid / Invalid</th>
                                        <th className="p-3 text-center">Status</th>
                                        <th className="p-3 pr-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60 font-medium">
                                    {recentImports.map((imp: any) => (
                                        <tr key={imp.id} className="hover:bg-muted/30 transition-all">
                                            <td className="p-3 pl-4 font-bold text-foreground">
                                                <div className="flex items-center gap-2">
                                                    <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                                                    <div>
                                                        <div className="font-bold text-xs">{imp.original_file_name || imp.file_name}</div>
                                                        <div className="text-[10px] font-mono text-muted-foreground">Session #{imp.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3 text-muted-foreground text-[11px] whitespace-nowrap">
                                                {new Date(imp.created_at).toLocaleString()}
                                            </td>
                                            <td className="p-3 text-center font-mono font-bold text-xs">
                                                {imp.total_rows || 0}
                                            </td>
                                            <td className="p-3 text-center text-[11px] font-mono">
                                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{imp.valid_rows ?? imp.successful_rows ?? 0}</span>
                                                <span className="text-muted-foreground mx-1">/</span>
                                                <span className="text-rose-500 font-bold">{imp.invalid_rows ?? imp.failed_rows ?? 0}</span>
                                            </td>
                                            <td className="p-3 text-center">
                                                {getStatusBadge(imp.status)}
                                            </td>
                                            <td className="p-3 pr-4 text-right">
                                                {imp.status === "reviewing" || imp.status === "ready" ? (
                                                    <Link href={`/orders/import/${imp.id}/review`}>
                                                        <Button type="button" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-8 px-3 gap-1">
                                                            Review & Fix
                                                            <ArrowRight className="w-3 h-3" />
                                                        </Button>
                                                    </Link>
                                                ) : (
                                                    <Link href={`/orders/import/${imp.id}`}>
                                                        <Button type="button" variant="outline" size="sm" className="font-bold text-xs rounded-xl h-8 px-3 gap-1">
                                                            View Progress
                                                            <ChevronRight className="w-3 h-3" />
                                                        </Button>
                                                    </Link>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-muted-foreground space-y-1">
                            <Clock className="w-6 h-6 text-muted-foreground mx-auto mb-1 opacity-50" />
                            <p className="font-bold text-xs">No recent import sessions found.</p>
                            <p className="text-[11px]">Upload an Excel file above to begin your first staged import.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
