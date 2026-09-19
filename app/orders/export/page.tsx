"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
    Download, 
    FileSpreadsheet, 
    Filter, 
    RefreshCw, 
    ArrowLeft, 
    ChevronRight, 
    Search, 
    Calendar as CalendarIcon, 
    CheckCircle2, 
    X, 
    RotateCcw, 
    FileText,
    Layers,
    User,
    Tag,
    Clock,
    AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/dashboard-layout";

interface StatusItem {
    id: number;
    name: string;
    slug: string;
    color: string;
}

interface PreviewRow {
    id: number;
    order_number: string;
    order_date: string;
    quote_number: string;
    customer_name: string;
    board_name: string;
    layer: string;
    mask: string;
    qty: number;
    completed_qty: number;
    status: string;
    bill_number: string;
}

export default function ExportOrdersPage() {
    // Filter States
    const [dateField, setDateField] = useState<string>("order_date");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [customerName, setCustomerName] = useState<string>("");
    const [layerFilter, setLayerFilter] = useState<string>("all");
    const [maskFilter, setMaskFilter] = useState<string>("all");
    const [cgFilter, setCgFilter] = useState<string>("all");
    const [toolFilter, setToolFilter] = useState<string>("");
    const [comboFilter, setComboFilter] = useState<string>("");
    const [quoteNumber, setQuoteNumber] = useState<string>("");
    const [pnFilter, setPnFilter] = useState<string>("");
    const [billNumber, setBillNumber] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState<string>("");

    // Export Format State
    const [exportFormat, setExportFormat] = useState<"xlsx" | "csv">("xlsx");
    const [downloading, setDownloading] = useState<boolean>(false);

    // Dynamic Options Data
    const [statusesList, setStatusesList] = useState<StatusItem[]>([]);
    const [loadingStatuses, setLoadingStatuses] = useState<boolean>(true);

    // Preview Data State
    const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [perPage, setPerPage] = useState<number>(25);
    const [loadingPreview, setLoadingPreview] = useState<boolean>(true);
    const [previewError, setPreviewError] = useState<string | null>(null);

    // Fetch dynamic statuses from API
    useEffect(() => {
        const fetchStatuses = async () => {
            try {
                const token = localStorage.getItem("admin_token");
                const res = await fetch("/api/admin/statuses", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const json = await res.json();
                if (res.ok && json.status && Array.isArray(json.data)) {
                    setStatusesList(json.data);
                }
            } catch (err) {
                console.error("Failed to load pipeline statuses:", err);
            } finally {
                setLoadingStatuses(false);
            }
        };

        fetchStatuses();
    }, []);

    // Construct filter params payload
    const getFilterParams = useCallback((page: number = 1) => {
        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("per_page", perPage.toString());

        if (dateField) params.set("date_field", dateField);
        if (startDate) params.set("start_date", startDate);
        if (endDate) params.set("end_date", endDate);
        if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
        if (customerName.trim()) params.set("customer_name", customerName.trim());
        if (layerFilter && layerFilter !== "all") params.set("layer", layerFilter);
        if (maskFilter && maskFilter !== "all") params.set("mask", maskFilter);
        if (cgFilter && cgFilter !== "all") params.set("c_g", cgFilter);
        if (toolFilter.trim()) params.set("tool", toolFilter.trim());
        if (comboFilter.trim()) params.set("combo", comboFilter.trim());
        if (quoteNumber.trim()) params.set("quote_number", quoteNumber.trim());
        if (pnFilter.trim()) params.set("p_n", pnFilter.trim());
        if (billNumber.trim()) params.set("bill_number", billNumber.trim());
        if (searchQuery.trim()) params.set("search", searchQuery.trim());

        return params;
    }, [
        dateField, startDate, endDate, statusFilter, customerName, layerFilter,
        maskFilter, cgFilter, toolFilter, comboFilter, quoteNumber, pnFilter,
        billNumber, searchQuery, perPage
    ]);

    // Fetch live export preview rows
    const fetchPreview = useCallback(async (page: number = 1) => {
        setLoadingPreview(true);
        setPreviewError(null);
        try {
            const token = localStorage.getItem("admin_token");
            const params = getFilterParams(page);
            const res = await fetch(`/api/admin/orders/export-preview?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const json = await res.json();
            if (res.ok && json.success) {
                setPreviewRows(json.data || []);
                setTotalCount(json.total || json.total_count || 0);
                setCurrentPage(json.current_page || json.page || page);
                setTotalPages(json.last_page || json.total_pages || 1);
            } else {
                throw new Error(json.message || "Failed to load export preview");
            }
        } catch (err: any) {
            setPreviewError(err.message || "An error occurred while loading preview data.");
            toast.error(err.message || "Could not fetch export preview.");
        } finally {
            setLoadingPreview(false);
        }
    }, [getFilterParams]);

    useEffect(() => {
        fetchPreview(1);
    }, [fetchPreview]);

    const handleApplyFilters = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setCurrentPage(1);
        fetchPreview(1);
        toast.info("Applied filters to export query.");
    };

    const handleResetFilters = () => {
        setDateField("order_date");
        setStartDate("");
        setEndDate("");
        setStatusFilter("all");
        setCustomerName("");
        setLayerFilter("all");
        setMaskFilter("all");
        setCgFilter("all");
        setToolFilter("");
        setComboFilter("");
        setQuoteNumber("");
        setPnFilter("");
        setBillNumber("");
        setSearchQuery("");
        setCurrentPage(1);
        toast.success("All export filters reset to default.");
    };

    // Execute File Export Download
    const handleExecuteExport = async (formatOverride?: "xlsx" | "csv") => {
        const targetFormat = formatOverride || exportFormat;
        setDownloading(true);
        const toastId = toast.loading(`Generating filtered ${targetFormat.toUpperCase()} export file...`);

        try {
            const token = localStorage.getItem("admin_token");
            const params = getFilterParams(1);
            params.set("format", targetFormat);

            const res = await fetch(`/api/admin/orders/export?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) {
                const errorJson = await res.json().catch(() => null);
                throw new Error(errorJson?.message || `Failed to download ${targetFormat.toUpperCase()} export`);
            }

            const blob = await res.blob();
            const fileName = `pcb-manufacturing-export-${new Date().toISOString().split('T')[0]}.${targetFormat}`;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success(`Successfully downloaded ${totalCount} records in ${targetFormat.toUpperCase()} format!`, { id: toastId });
        } catch (err: any) {
            toast.error(err.message || `Failed to generate ${targetFormat.toUpperCase()} export.`, { id: toastId });
        } finally {
            setDownloading(false);
        }
    };

    // Count active filters
    const activeFiltersCount = [
        startDate, endDate, statusFilter !== "all", customerName, layerFilter !== "all",
        maskFilter !== "all", cgFilter !== "all", toolFilter, comboFilter, quoteNumber,
        pnFilter, billNumber, searchQuery
    ].filter(Boolean).length;

    const backButton = (
        <Link href="/orders">
            <Button variant="outline" className="font-bold text-xs rounded-xl h-10 gap-2 bg-card hover:bg-muted border-border/80">
                <ArrowLeft className="w-4 h-4" />
                Back to PCB Orders
            </Button>
        </Link>
    );

    return (
        <DashboardLayout
            title="Export PCB Data"
            subtitle="Filter, preview, and download complete PCB manufacturing records in standard XLSX or CSV format."
            action={backButton}
        >
            <div className="w-full space-y-6 pb-20">

                {/* 1. Export Filters Card */}
                <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-xs space-y-5">
                    <div className="flex items-center justify-between border-b border-border/60 pb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
                                <Filter className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Export Filters</h3>
                                <p className="text-xs text-muted-foreground">Select date ranges, pipeline statuses, and PCB specs to filter export records.</p>
                            </div>
                        </div>

                        {activeFiltersCount > 0 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleResetFilters}
                                className="text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1.5 h-8 rounded-xl"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Reset ({activeFiltersCount})
                            </Button>
                        )}
                    </div>

                    <form onSubmit={handleApplyFilters} className="space-y-5">
                        {/* Date Range Section */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-2xl border border-border/60">
                            <div>
                                <label className="text-[11px] font-extrabold uppercase text-muted-foreground mb-1.5 block">
                                    Date Field Target
                                </label>
                                <Select value={dateField} onValueChange={setDateField}>
                                    <SelectTrigger className="bg-card border-border/80 text-xs font-bold h-10 rounded-xl">
                                        <SelectValue placeholder="Select Date Field" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="order_date">Order Date</SelectItem>
                                        <SelectItem value="launch_date">Launch Date</SelectItem>
                                        <SelectItem value="delivery_date">Delivery Date</SelectItem>
                                        <SelectItem value="created_at">Date Created</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-[11px] font-extrabold uppercase text-muted-foreground mb-1.5 block">
                                    From Date
                                </label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="bg-card border-border/80 text-xs font-bold h-10 rounded-xl"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-extrabold uppercase text-muted-foreground mb-1.5 block">
                                    To Date
                                </label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="bg-card border-border/80 text-xs font-bold h-10 rounded-xl"
                                />
                            </div>
                        </div>

                        {/* Specifications & Status Filter Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="text-[11px] font-extrabold uppercase text-muted-foreground mb-1.5 block">
                                    Pipeline Status
                                </label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="bg-card border-border/80 text-xs font-bold h-10 rounded-xl">
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="move">Move</SelectItem>
                                        <SelectItem value="Traveler">Traveler</SelectItem>
                                        <SelectItem value="Drilling">Drilling</SelectItem>
                                        <SelectItem value="Etching">Etching</SelectItem>
                                        <SelectItem value="Ready to ship">Ready to Ship</SelectItem>
                                        <SelectItem value="In Production">In Production</SelectItem>
                                        {statusesList.map((st) => (
                                            <SelectItem key={st.id} value={st.name}>
                                                {st.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-[11px] font-extrabold uppercase text-muted-foreground mb-1.5 block">
                                    Customer Name
                                </label>
                                <Input
                                    type="text"
                                    placeholder="Search Customer..."
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="bg-card border-border/80 text-xs font-bold h-10 rounded-xl"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-extrabold uppercase text-muted-foreground mb-1.5 block">
                                    Layer Count
                                </label>
                                <Select value={layerFilter} onValueChange={setLayerFilter}>
                                    <SelectTrigger className="bg-card border-border/80 text-xs font-bold h-10 rounded-xl">
                                        <SelectValue placeholder="All Layers" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Layers</SelectItem>
                                        <SelectItem value="1">Single Layer (1)</SelectItem>
                                        <SelectItem value="2">Double Layer (2)</SelectItem>
                                        <SelectItem value="4">4 Layers</SelectItem>
                                        <SelectItem value="6">6 Layers</SelectItem>
                                        <SelectItem value="8">8 Layers</SelectItem>
                                        <SelectItem value="10">10 Layers</SelectItem>
                                        <SelectItem value="12">12+ Layers</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-[11px] font-extrabold uppercase text-muted-foreground mb-1.5 block">
                                    Mask Color
                                </label>
                                <Select value={maskFilter} onValueChange={setMaskFilter}>
                                    <SelectTrigger className="bg-card border-border/80 text-xs font-bold h-10 rounded-xl">
                                        <SelectValue placeholder="All Mask Colors" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Mask Colors</SelectItem>
                                        <SelectItem value="Green">Green</SelectItem>
                                        <SelectItem value="White">White</SelectItem>
                                        <SelectItem value="Black">Black</SelectItem>
                                        <SelectItem value="Red">Red</SelectItem>
                                        <SelectItem value="Blue">Blue</SelectItem>
                                        <SelectItem value="Yellow">Yellow</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-[11px] font-extrabold uppercase text-muted-foreground mb-1.5 block">
                                    C/G (GST / CG)
                                </label>
                                <Select value={cgFilter} onValueChange={setCgFilter}>
                                    <SelectTrigger className="bg-card border-border/80 text-xs font-bold h-10 rounded-xl">
                                        <SelectValue placeholder="All C/G" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All C/G</SelectItem>
                                        <SelectItem value="GST">GST</SelectItem>
                                        <SelectItem value="CG">CG</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-[11px] font-extrabold uppercase text-muted-foreground mb-1.5 block">
                                    Tool Number
                                </label>
                                <Input
                                    type="text"
                                    placeholder="Search Tool..."
                                    value={toolFilter}
                                    onChange={(e) => setToolFilter(e.target.value)}
                                    className="bg-card border-border/80 text-xs font-bold h-10 rounded-xl"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-extrabold uppercase text-muted-foreground mb-1.5 block">
                                    Combo
                                </label>
                                <Input
                                    type="text"
                                    placeholder="Search Combo..."
                                    value={comboFilter}
                                    onChange={(e) => setComboFilter(e.target.value)}
                                    className="bg-card border-border/80 text-xs font-bold h-10 rounded-xl"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-extrabold uppercase text-muted-foreground mb-1.5 block">
                                    Q# (Quote No.)
                                </label>
                                <Input
                                    type="text"
                                    placeholder="Search Quote #..."
                                    value={quoteNumber}
                                    onChange={(e) => setQuoteNumber(e.target.value)}
                                    className="bg-card border-border/80 text-xs font-bold h-10 rounded-xl"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-extrabold uppercase text-muted-foreground mb-1.5 block">
                                    P/N (Part Number / Board)
                                </label>
                                <Input
                                    type="text"
                                    placeholder="Search P/N..."
                                    value={pnFilter}
                                    onChange={(e) => setPnFilter(e.target.value)}
                                    className="bg-card border-border/80 text-xs font-bold h-10 rounded-xl"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-extrabold uppercase text-muted-foreground mb-1.5 block">
                                    Bill Number
                                </label>
                                <Input
                                    type="text"
                                    placeholder="Search Bill #..."
                                    value={billNumber}
                                    onChange={(e) => setBillNumber(e.target.value)}
                                    className="bg-card border-border/80 text-xs font-bold h-10 rounded-xl"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="text-[11px] font-extrabold uppercase text-muted-foreground mb-1.5 block">
                                    Global Search
                                </label>
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Search across all fields..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="bg-card border-border/80 text-xs font-bold h-10 pl-9 rounded-xl"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Filter Action Buttons */}
                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/60">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleResetFilters}
                                className="font-bold text-xs rounded-xl h-10 px-5 gap-1.5"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Reset Filters
                            </Button>

                            <Button
                                type="submit"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 h-10 px-6 gap-2 cursor-pointer"
                            >
                                <Filter className="w-4 h-4" />
                                Apply Filters
                            </Button>
                        </div>
                    </form>
                </div>

                {/* 2. Export Preview Card */}
                <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Export Preview</h3>
                                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-black px-2.5 py-0.5 rounded-full">
                                    {totalCount} record{totalCount === 1 ? "" : "s"} found
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Live preview of PCB orders matching your applied filter criteria.
                            </p>
                        </div>

                        {/* Active Filter Chips */}
                        {activeFiltersCount > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                <span className="text-[11px] font-bold text-muted-foreground mr-1">Active:</span>
                                {startDate && <span className="bg-muted px-2.5 py-0.5 rounded-md font-mono text-[11px]">From: {startDate}</span>}
                                {endDate && <span className="bg-muted px-2.5 py-0.5 rounded-md font-mono text-[11px]">To: {endDate}</span>}
                                {statusFilter !== "all" && <span className="bg-muted px-2.5 py-0.5 rounded-md font-bold text-[11px]">Status: {statusFilter}</span>}
                                {customerName && <span className="bg-muted px-2.5 py-0.5 rounded-md font-bold text-[11px]">Cust: {customerName}</span>}
                                {layerFilter !== "all" && <span className="bg-muted px-2.5 py-0.5 rounded-md font-mono text-[11px]">Layer: {layerFilter}</span>}
                                {maskFilter !== "all" && <span className="bg-muted px-2.5 py-0.5 rounded-md font-bold text-[11px]">Mask: {maskFilter}</span>}
                            </div>
                        )}
                    </div>

                    {/* Preview Table */}
                    <div className="border border-border/80 rounded-2xl overflow-hidden text-xs shadow-xs">
                        {loadingPreview ? (
                            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                                <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                                <span className="font-bold">Loading export preview records...</span>
                            </div>
                        ) : previewError ? (
                            <div className="p-10 text-center text-rose-500 space-y-3">
                                <AlertCircle className="w-8 h-8 mx-auto" />
                                <div className="font-bold text-sm">{previewError}</div>
                                <Button type="button" onClick={() => fetchPreview(currentPage)} variant="outline" size="sm" className="rounded-xl">
                                    Retry
                                </Button>
                            </div>
                        ) : previewRows.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-muted/60 text-[10px] font-extrabold uppercase text-muted-foreground border-b border-border/80">
                                        <tr>
                                            <th className="p-3 pl-4">Order Date</th>
                                            <th className="p-3">Tool / Order #</th>
                                            <th className="p-3">Q# No.</th>
                                            <th className="p-3">Customer Name</th>
                                            <th className="p-3">P/N (Board)</th>
                                            <th className="p-3 text-center">Layer</th>
                                            <th className="p-3 text-center">Mask</th>
                                            <th className="p-3 text-center">Qty</th>
                                            <th className="p-3 text-center">Final Qty</th>
                                            <th className="p-3 text-center">Status</th>
                                            <th className="p-3 pr-4 text-center">Bill #</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60 font-medium">
                                        {previewRows.map((row) => (
                                            <tr key={row.id} className="hover:bg-muted/30 transition-all">
                                                <td className="p-3 pl-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                                                    {row.order_date}
                                                </td>
                                                <td className="p-3 font-bold text-foreground">
                                                    {row.order_number}
                                                </td>
                                                <td className="p-3 font-mono text-muted-foreground">
                                                    {row.quote_number || "-"}
                                                </td>
                                                <td className="p-3 font-semibold text-foreground">
                                                    {row.customer_name || "N/A"}
                                                </td>
                                                <td className="p-3 font-semibold text-foreground">
                                                    {row.board_name || "-"}
                                                </td>
                                                <td className="p-3 text-center font-mono font-bold">
                                                    {row.layer}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-muted border border-border/60">
                                                        {row.mask}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center font-mono font-bold">
                                                    {row.qty}
                                                </td>
                                                <td className="p-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                    {row.completed_qty}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 capitalize">
                                                        {row.status}
                                                    </span>
                                                </td>
                                                <td className="p-3 pr-4 text-center font-mono text-muted-foreground">
                                                    {row.bill_number || "-"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-12 text-center text-muted-foreground space-y-2">
                                <FileSpreadsheet className="w-8 h-8 text-muted-foreground mx-auto opacity-40" />
                                <h4 className="font-bold text-sm text-foreground">No records found</h4>
                                <p className="text-xs max-w-sm mx-auto">
                                    No PCB manufacturing records match your selected filter criteria. Try adjusting or resetting filters.
                                </p>
                                <Button type="button" onClick={handleResetFilters} variant="outline" size="sm" className="mt-2 rounded-xl text-xs font-bold">
                                    Reset Filters
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Pagination Controls */}
                    {totalCount > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/60 text-xs">
                            <div className="flex flex-wrap items-center gap-4 text-muted-foreground font-medium">
                                <span>
                                    Showing Page <strong className="text-foreground">{currentPage}</strong> of <strong className="text-foreground">{totalPages}</strong> ({totalCount} total matching records)
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground font-bold whitespace-nowrap">Per page:</span>
                                    <Select value={perPage.toString()} onValueChange={(val) => setPerPage(parseInt(val, 10) || 25)}>
                                        <SelectTrigger className="w-28 h-8 text-xs font-bold rounded-xl border-border bg-card">
                                            <SelectValue placeholder="25" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="15">15 per page</SelectItem>
                                            <SelectItem value="25">25 per page</SelectItem>
                                            <SelectItem value="50">50 per page</SelectItem>
                                            <SelectItem value="100">100 per page</SelectItem>
                                            <SelectItem value="250">250 per page</SelectItem>
                                            <SelectItem value="500">500 per page (All)</SelectItem>
                                            <SelectItem value="1000">1000 per page</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage <= 1 || loadingPreview}
                                    onClick={() => fetchPreview(currentPage - 1)}
                                    className="rounded-xl font-bold h-8 text-xs"
                                >
                                    Previous
                                </Button>

                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    const pageNum = i + 1;
                                    return (
                                        <Button
                                            key={pageNum}
                                            type="button"
                                            variant={currentPage === pageNum ? "default" : "outline"}
                                            size="sm"
                                            disabled={loadingPreview}
                                            onClick={() => fetchPreview(pageNum)}
                                            className={`rounded-xl font-bold h-8 w-8 p-0 text-xs ${
                                                currentPage === pageNum ? "bg-emerald-600 text-white" : ""
                                            }`}
                                        >
                                            {pageNum}
                                        </Button>
                                    );
                                })}

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage >= totalPages || loadingPreview}
                                    onClick={() => fetchPreview(currentPage + 1)}
                                    className="rounded-xl font-bold h-8 text-xs"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Download Export Card */}
                <div className="bg-card border-2 border-emerald-500/30 rounded-3xl p-6 shadow-md space-y-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
                        <div className="space-y-1">
                            <h3 className="text-base font-black text-foreground flex items-center gap-2">
                                <Download className="w-5 h-5 text-emerald-500" />
                                Download Filtered Export
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Export exactly <strong className="text-foreground font-mono">{totalCount}</strong> matching records in the official 19-column manufacturer layout.
                            </p>
                        </div>

                        {/* Format Radio Selection */}
                        <div className="flex items-center gap-3 bg-muted/50 p-1.5 rounded-2xl border border-border/80">
                            <button
                                type="button"
                                onClick={() => setExportFormat("xlsx")}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                    exportFormat === "xlsx"
                                        ? "bg-emerald-600 text-white shadow-md"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <FileSpreadsheet className="w-4 h-4" />
                                XLSX (Excel)
                            </button>

                            <button
                                type="button"
                                onClick={() => setExportFormat("csv")}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                    exportFormat === "csv"
                                        ? "bg-emerald-600 text-white shadow-md"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <FileText className="w-4 h-4" />
                                CSV (Standard)
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
                        <div className="text-xs text-muted-foreground font-medium">
                            📁 <strong className="text-foreground">Manufacturer Layout:</strong> Order Date, Launch Date, Delivery Date, Q# No., C/G, Tool, Combo, Customer Name, Layer, Mask, P/N, Production Noted, Qty, Launch, Panel, Ups, Final Qty, Status, Bill Number.
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={downloading || totalCount === 0}
                                onClick={() => handleExecuteExport("csv")}
                                className="font-bold text-xs rounded-2xl h-11 px-5 gap-2 border-border/80"
                            >
                                <FileText className="w-4 h-4 text-amber-500" />
                                Download CSV
                            </Button>

                            <Button
                                type="button"
                                disabled={downloading || totalCount === 0}
                                onClick={() => handleExecuteExport("xlsx")}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-600/20 h-11 px-7 gap-2 cursor-pointer"
                            >
                                {downloading ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Generating File...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4" />
                                        Download XLSX ({totalCount} Records)
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
