"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
    FileSpreadsheet, 
    CheckCircle2, 
    AlertTriangle, 
    RefreshCw, 
    ArrowRight, 
    User, 
    Search,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    CheckCircle,
    Info,
    ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function ImportReviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: importId } = use(params);
    const router = useRouter();

    const [importSession, setImportSession] = useState<any>(null);
    const [stagedRows, setStagedRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<"all" | "invalid" | "valid">("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRowsCount, setTotalRowsCount] = useState(0);

    const [duplicateAction, setDuplicateAction] = useState<"skip" | "update" | "create_new">("skip");
    const [savingCellId, setSavingCellId] = useState<string | null>(null);
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [startingImport, setStartingImport] = useState(false);

    const fetchStagedData = async (page: number = 1, statusFilter: string = filterStatus, search: string = searchQuery) => {
        setLoading(true);
        try {
            const token = localStorage.getItem("admin_token");
            const queryParams = new URLSearchParams({
                page: page.toString(),
                per_page: "50",
            });
            if (statusFilter !== "all") queryParams.set("validation_status", statusFilter);
            if (search.trim()) queryParams.set("search", search.trim());

            const res = await fetch(`/api/admin/orders/import/${importId}/rows?${queryParams.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            if (res.ok && json.success) {
                setImportSession(json.import);
                setStagedRows(json.data || []);
                setCurrentPage(json.current_page || 1);
                setTotalPages(json.last_page || 1);
                setTotalRowsCount(json.total || 0);
            } else {
                toast.error(json.message || "Failed to load staged rows.");
            }
        } catch (e) {
            console.error("Error loading staged rows:", e);
            toast.error("Failed to connect to server.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStagedData(1, filterStatus, searchQuery);
    }, [importId, filterStatus]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchStagedData(1, filterStatus, searchQuery);
    };

    const handleCellChange = async (rowId: number, fieldKey: string, newValue: any) => {
        const cellKey = `${rowId}-${fieldKey}`;
        setSavingCellId(cellKey);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/import/${importId}/rows/${rowId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    field_key: fieldKey,
                    value: newValue,
                }),
            });
            const json = await res.json();
            if (res.ok && json.success) {
                // Update specific row locally in state
                setStagedRows((prev) =>
                    prev.map((r) => (r.id === rowId ? json.row : r))
                );
                // Update session totals
                if (json.import) {
                    setImportSession(json.import);
                }
            } else {
                toast.error(json.message || "Failed to update cell.");
            }
        } catch (e) {
            console.error("Error updating cell:", e);
            toast.error("Failed to save cell edit.");
        } finally {
            setSavingCellId(null);
        }
    };

    const handleStartFinalImport = async () => {
        setStartingImport(true);
        const toastId = toast.loading("Finalizing validation & queueing background import...");
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/import/${importId}/start`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    duplicate_action: duplicateAction,
                }),
            });

            const json = await res.json();
            if (res.ok && json.success) {
                toast.success("Import successfully queued for background processing!", { id: toastId });
                setConfirmModalOpen(false);
                router.push(`/orders/import/${importId}`);
            } else {
                throw new Error(json.message || "Failed to start import.");
            }
        } catch (err: any) {
            toast.error(err.message || "Could not start import job.", { id: toastId });
        } finally {
            setStartingImport(false);
        }
    };

    const invalidRowsCount = importSession?.invalid_rows ?? 0;
    const validRowsCount = importSession?.valid_rows ?? 0;
    const isImportDisabled = invalidRowsCount > 0;

    return (
        <div className="max-w-7xl mx-auto space-y-6 p-6 pb-24">
            {/* Top Header & Breadcrumb */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
                <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-1">
                        <Link href="/orders/import" className="hover:text-foreground transition-colors flex items-center gap-1">
                            <ArrowLeft className="w-3.5 h-3.5" /> Step 1: Upload
                        </Link>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span className="text-foreground">Step 2: Review & Fix Staged Data</span>
                    </div>
                    <h1 className="text-2xl font-black flex items-center gap-2 text-foreground tracking-tight">
                        <FileSpreadsheet className="w-7 h-7 text-emerald-500" />
                        Review & Edit Staged Import #{importId}
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        File: <strong className="text-foreground">{importSession?.original_file_name || "Spreadsheet"}</strong> — Edit data directly in the table below. Invalid cells are highlighted in red and revalidate automatically on change.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        type="button"
                        onClick={() => {
                            if (isImportDisabled) {
                                toast.error(`Cannot start import: ${invalidRowsCount} invalid rows need attention.`);
                            } else {
                                setConfirmModalOpen(true);
                            }
                        }}
                        disabled={isImportDisabled}
                        className={`font-bold text-xs rounded-2xl shadow-lg h-11 px-6 gap-2 cursor-pointer transition-all ${
                            isImportDisabled
                                ? "bg-muted text-muted-foreground cursor-not-allowed opacity-70"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                        }`}
                    >
                        {isImportDisabled ? (
                            <>
                                <ShieldAlert className="w-4 h-4 text-rose-500" />
                                Fix {invalidRowsCount} Error{invalidRowsCount > 1 ? "s" : ""} Before Import
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                Start Background Import
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Stepper Header */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-muted/40 border border-border/80 p-3.5 rounded-2xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-xs flex items-center justify-center shrink-0">✓</div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Step 1 — Upload & Stage</h4>
                        <p className="text-[11px] text-muted-foreground font-medium">Excel parsed into staging table</p>
                    </div>
                </div>

                <div className="bg-emerald-500/10 border-2 border-emerald-500 p-3.5 rounded-2xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white font-black text-xs flex items-center justify-center shrink-0">2</div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Step 2 — Review & Fix</h4>
                        <p className="text-[11px] text-muted-foreground font-medium">Edit cells & fix red error fields</p>
                    </div>
                </div>

                <div className="bg-muted/30 border border-border/80 p-3.5 rounded-2xl flex items-center gap-3 opacity-60">
                    <div className="w-8 h-8 rounded-xl bg-muted text-muted-foreground font-black text-xs flex items-center justify-center shrink-0">3</div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Step 3 — Queue & Process</h4>
                        <p className="text-[11px] text-muted-foreground font-medium">Background creation & progress</p>
                    </div>
                </div>
            </div>

            {/* Staging Summary Statistics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
                <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-2xl">
                    <div className="text-[10px] font-extrabold text-blue-500 uppercase tracking-wider">Total Rows</div>
                    <div className="text-base font-black text-foreground">{importSession?.total_rows ?? 0}</div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl">
                    <div className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wider">✓ Valid Rows</div>
                    <div className="text-base font-black text-emerald-600 dark:text-emerald-400">{validRowsCount}</div>
                </div>
                <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl">
                    <div className="text-[10px] font-extrabold text-rose-500 uppercase tracking-wider">⚠ Invalid Rows</div>
                    <div className="text-base font-black text-rose-500">{invalidRowsCount}</div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl">
                    <div className="text-[10px] font-extrabold text-amber-500 uppercase tracking-wider">Duplicates</div>
                    <div className="text-base font-black text-amber-500">{importSession?.duplicate_rows ?? 0}</div>
                </div>
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-2xl">
                    <div className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-wider">Existing Cust.</div>
                    <div className="text-base font-black text-indigo-600 dark:text-indigo-400">{importSession?.existing_customers ?? 0}</div>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-2xl">
                    <div className="text-[10px] font-extrabold text-purple-500 uppercase tracking-wider">New Cust.</div>
                    <div className="text-base font-black text-purple-600 dark:text-purple-400">{importSession?.new_customers ?? 0}</div>
                </div>
            </div>

            {/* Filter Tabs, Search & Duplicate Strategy Selector Bar */}
            <div className="bg-card border border-border/80 p-4 rounded-3xl space-y-4 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-2xl border border-border/60 shrink-0">
                        <button
                            type="button"
                            onClick={() => setFilterStatus("all")}
                            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                filterStatus === "all"
                                    ? "bg-card text-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            All Rows ({importSession?.total_rows ?? 0})
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterStatus("invalid")}
                            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                filterStatus === "invalid"
                                    ? "bg-rose-500 text-white shadow-xs"
                                    : "text-rose-500 hover:bg-rose-500/10"
                            }`}
                        >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Invalid Only ({invalidRowsCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterStatus("valid")}
                            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                filterStatus === "valid"
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                            }`}
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Valid Only ({validRowsCount})
                        </button>
                    </div>

                    {/* Search Bar */}
                    <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-sm">
                        <div className="relative w-full">
                            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                            <Input
                                type="text"
                                placeholder="Search Customer / P/N / Quote #"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-xs rounded-xl border-border/80 bg-card"
                            />
                        </div>
                        <Button type="submit" variant="outline" size="sm" className="h-9 px-3 text-xs font-bold rounded-xl">
                            Search
                        </Button>
                    </form>
                </div>

                {/* Duplicate Record Handling Radio Option */}
                <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="font-extrabold text-foreground uppercase tracking-wider text-[10px]">
                        Duplicate Record Behavior:
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-foreground">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                                type="radio"
                                name="dupAction"
                                value="skip"
                                checked={duplicateAction === "skip"}
                                onChange={() => setDuplicateAction("skip")}
                                className="accent-emerald-500"
                            />
                            Skip existing duplicates
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                                type="radio"
                                name="dupAction"
                                value="update"
                                checked={duplicateAction === "update"}
                                onChange={() => setDuplicateAction("update")}
                                className="accent-emerald-500"
                            />
                            Update existing records
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                                type="radio"
                                name="dupAction"
                                value="create_new"
                                checked={duplicateAction === "create_new"}
                                onChange={() => setDuplicateAction("create_new")}
                                className="accent-emerald-500"
                            />
                            Import all as new orders
                        </label>
                    </div>
                </div>
            </div>

            {/* Editable Preview Data Table */}
            <div className="border border-border/80 rounded-3xl overflow-hidden bg-card text-xs shadow-xs space-y-0">
                {loading ? (
                    <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2 font-bold">
                        <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
                        Loading staged rows...
                    </div>
                ) : stagedRows.length > 0 ? (
                    <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-muted/80 backdrop-blur-xs text-[10px] font-extrabold uppercase text-muted-foreground border-b border-border/80 sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 pl-4">Row</th>
                                    <th className="p-3 min-w-[140px]">Order Date</th>
                                    <th className="p-3 min-w-[200px]">Customer Name</th>
                                    <th className="p-3 min-w-[150px]">Customer Action</th>
                                    <th className="p-3 min-w-[160px]">P/N (Part Name)</th>
                                    <th className="p-3 min-w-[90px] text-center">Qty</th>
                                    <th className="p-3 min-w-[90px] text-center">Launch Qty</th>
                                    <th className="p-3 min-w-[90px] text-center">Panel Qty</th>
                                    <th className="p-3 min-w-[90px] text-center">Final Qty</th>
                                    <th className="p-3 min-w-[110px]">Status</th>
                                    <th className="p-3 min-w-[110px]">Bill #</th>
                                    <th className="p-3 pr-4 text-center min-w-[100px]">Validation</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60 font-medium">
                                {stagedRows.map((row: any) => {
                                    const data = row.row_data || {};
                                    const errors = row.validation_errors || {};
                                    const isRowValid = row.validation_status === "valid";

                                    return (
                                        <tr key={row.id} className={`transition-all ${isRowValid ? "hover:bg-muted/30" : "bg-rose-500/5 hover:bg-rose-500/10"}`}>
                                            {/* Row # */}
                                            <td className="p-3 pl-4 font-mono font-bold text-muted-foreground">
                                                #{row.row_number}
                                            </td>

                                            {/* Order Date */}
                                            <td className="p-2">
                                                <div className="space-y-0.5">
                                                    <Input
                                                        type="date"
                                                        defaultValue={data.order_date || ""}
                                                        onBlur={(e) => handleCellChange(row.id, "order_date", e.target.value)}
                                                        className={`h-8 text-xs font-mono rounded-lg border bg-card ${
                                                            errors["Order Date"]
                                                                ? "border-rose-500 ring-1 ring-rose-500 bg-rose-500/10 font-bold text-rose-600 dark:text-rose-400"
                                                                : "border-border/80"
                                                        }`}
                                                    />
                                                    {errors["Order Date"] && (
                                                        <div className="text-[10px] text-rose-500 font-bold flex items-center gap-1">
                                                            <AlertTriangle className="w-3 h-3 shrink-0" />
                                                            {errors["Order Date"]}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Customer Name */}
                                            <td className="p-2">
                                                <div className="space-y-0.5">
                                                    <Input
                                                        type="text"
                                                        defaultValue={data.customer_name || ""}
                                                        onBlur={(e) => handleCellChange(row.id, "customer_name", e.target.value)}
                                                        placeholder="Customer Name"
                                                        className={`h-8 text-xs font-bold rounded-lg border bg-card ${
                                                            errors["Customer name"]
                                                                ? "border-rose-500 ring-1 ring-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                                                : "border-border/80"
                                                        }`}
                                                    />
                                                    {errors["Customer name"] && (
                                                        <div className="text-[10px] text-rose-500 font-bold flex items-center gap-1">
                                                            <AlertTriangle className="w-3 h-3 shrink-0" />
                                                            {errors["Customer name"]}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Customer Action Badge */}
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold whitespace-nowrap ${
                                                    row.is_new_customer
                                                        ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                                                        : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                                                }`}>
                                                    {row.customer_action || "Existing Customer"}
                                                </span>
                                            </td>

                                            {/* P/N */}
                                            <td className="p-2">
                                                <div className="space-y-0.5">
                                                    <Input
                                                        type="text"
                                                        defaultValue={data.p_n || ""}
                                                        onBlur={(e) => handleCellChange(row.id, "p_n", e.target.value)}
                                                        placeholder="Part Number"
                                                        className={`h-8 text-xs font-mono font-bold rounded-lg border bg-card ${
                                                            errors["P/N"]
                                                                ? "border-rose-500 ring-1 ring-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                                                : "border-border/80"
                                                        }`}
                                                    />
                                                    {errors["P/N"] && (
                                                        <div className="text-[10px] text-rose-500 font-bold flex items-center gap-1">
                                                            <AlertTriangle className="w-3 h-3 shrink-0" />
                                                            {errors["P/N"]}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Qty */}
                                            <td className="p-2 text-center">
                                                <div className="space-y-0.5">
                                                    <Input
                                                        type="text"
                                                        defaultValue={data.qty ?? ""}
                                                        onBlur={(e) => handleCellChange(row.id, "qty", e.target.value)}
                                                        placeholder="Qty"
                                                        className={`h-8 text-xs font-mono text-center font-bold rounded-lg border bg-card ${
                                                            errors["Qty"]
                                                                ? "border-rose-500 ring-1 ring-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                                                : "border-border/80"
                                                        }`}
                                                    />
                                                    {errors["Qty"] && (
                                                        <div className="text-[10px] text-rose-500 font-bold flex items-center gap-1">
                                                            <AlertTriangle className="w-3 h-3 shrink-0" />
                                                            {errors["Qty"]}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Launch Qty */}
                                            <td className="p-2 text-center">
                                                <Input
                                                    type="text"
                                                    defaultValue={data.launch_qty ?? ""}
                                                    onBlur={(e) => handleCellChange(row.id, "launch_qty", e.target.value)}
                                                    className="h-8 text-xs font-mono text-center rounded-lg border border-border/80 bg-card"
                                                />
                                            </td>

                                            {/* Panel Qty */}
                                            <td className="p-2 text-center">
                                                <Input
                                                    type="text"
                                                    defaultValue={data.panel_qty ?? ""}
                                                    onBlur={(e) => handleCellChange(row.id, "panel_qty", e.target.value)}
                                                    className="h-8 text-xs font-mono text-center rounded-lg border border-border/80 bg-card"
                                                />
                                            </td>

                                            {/* Final Qty */}
                                            <td className="p-2 text-center">
                                                <Input
                                                    type="text"
                                                    defaultValue={data.final_qty ?? ""}
                                                    onBlur={(e) => handleCellChange(row.id, "final_qty", e.target.value)}
                                                    className="h-8 text-xs font-mono text-center text-emerald-600 font-bold rounded-lg border border-border/80 bg-card"
                                                />
                                            </td>

                                            {/* Status */}
                                            <td className="p-2">
                                                <Input
                                                    type="text"
                                                    defaultValue={data.status || "move"}
                                                    onBlur={(e) => handleCellChange(row.id, "status", e.target.value)}
                                                    className="h-8 text-xs font-semibold rounded-lg border border-border/80 bg-card"
                                                />
                                            </td>

                                            {/* Bill # */}
                                            <td className="p-2">
                                                <Input
                                                    type="text"
                                                    defaultValue={data.bill_number || ""}
                                                    onBlur={(e) => handleCellChange(row.id, "bill_number", e.target.value)}
                                                    className="h-8 text-xs font-mono rounded-lg border border-border/80 bg-card"
                                                />
                                            </td>

                                            {/* Validation Status Badge */}
                                            <td className="p-3 pr-4 text-center font-bold">
                                                {isRowValid ? (
                                                    <span className="text-emerald-500 flex items-center justify-center gap-1 text-[11px] font-extrabold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                                        <CheckCircle className="w-3.5 h-3.5" /> Valid
                                                    </span>
                                                ) : (
                                                    <span className="text-rose-500 flex items-center justify-center gap-1 text-[11px] font-extrabold bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full animate-pulse">
                                                        <AlertTriangle className="w-3.5 h-3.5" /> Invalid
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-12 text-center text-muted-foreground space-y-1">
                        <Info className="w-6 h-6 text-muted-foreground mx-auto mb-1 opacity-50" />
                        <p className="font-bold text-xs">No staged rows found matching your current filter.</p>
                        <p className="text-[11px]">Select "All Rows" or adjust search criteria to view records.</p>
                    </div>
                )}

                {/* Table Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-border/80 flex items-center justify-between text-xs bg-muted/20">
                        <span className="text-muted-foreground font-semibold">
                            Showing page {currentPage} of {totalPages} ({totalRowsCount} total rows)
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={currentPage <= 1}
                                onClick={() => fetchStagedData(currentPage - 1)}
                                className="h-8 rounded-xl gap-1 text-xs font-bold"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" /> Previous
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={currentPage >= totalPages}
                                onClick={() => fetchStagedData(currentPage + 1)}
                                className="h-8 rounded-xl gap-1 text-xs font-bold"
                            >
                                Next <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Invalid Rows Resolution Accordion / Panel */}
            {invalidRowsCount > 0 && (
                <div className="bg-rose-500/10 border-2 border-rose-500/30 rounded-3xl p-5 space-y-3">
                    <div className="flex items-center gap-2 text-rose-500 font-extrabold text-xs uppercase tracking-wider">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        Attention Required — {invalidRowsCount} Invalid Rows Require Correction
                    </div>
                    <p className="text-xs text-muted-foreground">
                        The fields highlighted with <span className="text-rose-500 font-bold">red borders</span> above contain formatting or missing data errors. Correct the values in the table cells above — red error states will automatically clear as soon as the data becomes valid.
                    </p>
                </div>
            )}

            {/* Confirmation Dialog before queueing background import */}
            <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
                <DialogContent className="sm:max-w-md bg-card border-border/80 rounded-3xl shadow-2xl p-6 text-foreground">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black flex items-center gap-2">
                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                            Confirm Background Import
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            All {validRowsCount} staged records have passed validation checks and are ready for background database creation.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2 text-xs">
                        <div className="bg-muted/40 p-4 rounded-2xl space-y-2 border border-border/60">
                            <div className="flex justify-between font-bold">
                                <span>Total Orders to Import:</span>
                                <span className="font-mono">{validRowsCount}</span>
                            </div>
                            <div className="flex justify-between font-bold text-indigo-600 dark:text-indigo-400">
                                <span>Existing Customers Reused:</span>
                                <span className="font-mono">{importSession?.existing_customers ?? 0}</span>
                            </div>
                            <div className="flex justify-between font-bold text-purple-600 dark:text-purple-400">
                                <span>New Customers to Create:</span>
                                <span className="font-mono">{importSession?.new_customers ?? 0}</span>
                            </div>
                            <div className="flex justify-between font-bold text-amber-500">
                                <span>Duplicate Action Strategy:</span>
                                <span className="font-mono uppercase">{duplicateAction}</span>
                            </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground font-medium">
                            Clicking "Start Import" will queue a background worker job (`ProcessPcbImportJob`). You will be redirected to the real-time progress tracking dashboard.
                        </p>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setConfirmModalOpen(false)}
                            className="rounded-xl text-xs font-bold"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            disabled={startingImport}
                            onClick={handleStartFinalImport}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 gap-2 cursor-pointer"
                        >
                            {startingImport ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Dispatching Queue Job...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    Confirm & Start Import
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
