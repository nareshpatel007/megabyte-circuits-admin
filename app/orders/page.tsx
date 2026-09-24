"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Search, Download, Eye, ChevronLeft, ChevronRight, X, ExternalLink, User, Mail, Phone, FileText, Clock, History, Calendar as CalendarIcon, RefreshCw, Plus, ShoppingBag, CheckCircle2, Package, Film, Printer, Copy, Upload, FileSpreadsheet, AlertTriangle, AlertCircle, CheckCircle, Info, Layers, Rocket, ChevronDown, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { OrdersSkeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

interface StatusItem {
    id: number;
    name: string;
    slug: string;
    color: string;
}

interface OrderMeta {
    id: number;
    pcb_order_id: number;
    meta_key: string;
    meta_value: string;
}

interface StatusHistory {
    id: number;
    pcb_order_id: number;
    admin_name: string;
    status_name: string;
    remark: string | null;
    created_at: string;
}

interface CustomerUser {
    id: number;
    name: string | null;
    company_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    mobile?: string | null;
}

interface ApiOrder {
    id: number;
    user_id: number | null;
    user?: CustomerUser | null;
    status_id: number | null;
    order_number: string;
    order_type?: string | null;
    quotation_source?: string | null;
    jlcpcb_file_key?: string | null;
    q_no?: string | number | null;
    c_g?: string | null;
    combo?: string | null;
    bill_number?: string | null;
    board_name: string;
    customer_name: string | null;
    user_email: string;
    user_mobile: string;
    status: string;
    completed_qty?: number;
    order_qty?: number;
    launch_qty?: number;
    panel_qty?: number;
    ups_qty?: number;
    final_qty?: number;
    failed_qty?: number;
    unit_price: string | number;
    order_value: string | number;
    launch_date?: string | null;
    delivery_date: string | null;
    created_at: string;
    metas?: OrderMeta[];
    status_details?: StatusItem;
    status_histories?: StatusHistory[];
}

const PAGE_SIZE = 10;

const getPcbColorCode = (col: string) => {
    const lower = (col || "").toLowerCase().trim();
    if (lower.includes("red")) return "#ef4444";
    if (lower.includes("blue")) return "#3b82f6";
    if (lower.includes("black")) return "#3f3f46";
    if (lower.includes("yellow")) return "#d97706";
    if (lower.includes("white")) return "#0284c7";
    if (lower.includes("purple")) return "#9333ea";
    return "#10b981";
};

const getPcbLightBg = (colorHex: string) => {
    return `color-mix(in srgb, ${colorHex} 7%, #ffffff 93%)`;
};

export default function OrdersPage() {
    const { user } = useAuth();
    const isSuperAdmin = user?.role?.toLowerCase() === "super admin";
    const hasPaymentPermission = isSuperAdmin || (user?.permissions ? user.permissions.includes("payments.view") : true);
    const hasStatisticsPermission = isSuperAdmin || (user?.permissions ? user.permissions.includes("orders.statistics") : false);
    const hasCreateOrderPermission = isSuperAdmin || (user?.permissions ? user.permissions.includes("orders.create") : false);
    const hasChangeStatusPermission = isSuperAdmin || (user?.permissions ? user.permissions.includes("orders.change_status") : false);
    const hasViewLogsPermission = isSuperAdmin || (user?.permissions ? user.permissions.includes("orders.view_logs") : false);
    const hasReorderPermission = isSuperAdmin || (user?.permissions ? user.permissions.includes("orders.reorder") : false);
    const hasGenerateJobCardPermission = isSuperAdmin || (user?.permissions ? user.permissions.includes("orders.generate_job_card") : false);
    const hasAddFilmPermission = isSuperAdmin || (user?.permissions ? user.permissions.includes("orders.add_film") : false);

    const [orders, setOrders] = useState<ApiOrder[]>([]);
    const [statuses, setStatuses] = useState<StatusItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("In Production");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    // Temporary dates for Popover drafting before clicking Apply
    const [tempStartDate, setTempStartDate] = useState("");
    const [tempEndDate, setTempEndDate] = useState("");
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState<number>(10);

    // Quick preview modal state
    const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);

    // Reorder modal state
    const [reorderModalOrder, setReorderModalOrder] = useState<ApiOrder | null>(null);
    const [reorderQty, setReorderQty] = useState<number>(1);
    const [reorderDeliveryDate, setReorderDeliveryDate] = useState<string>("");
    const [reordering, setReordering] = useState(false);

    const handleOpenReorderModal = (order: ApiOrder) => {
        setReorderModalOrder(order);
        const origQty = order.order_qty || parseInt(getMetaValue(order, 'quantity', '1')) || 1;
        const origDelivery = order.delivery_date || getMetaValue(order, 'delivery_date', '');
        setReorderQty(origQty);
        setReorderDeliveryDate(origDelivery ? String(origDelivery).split('T')[0] : '');
    };

    // Import & Export Modal state
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importingPreview, setImportingPreview] = useState(false);
    const [importPreviewData, setImportPreviewData] = useState<any | null>(null);
    const [importDuplicateAction, setImportDuplicateAction] = useState<"skip" | "update" | "create_new">("skip");
    const [executingImport, setExecutingImport] = useState(false);

    // Import Queue & History Tracking state
    const [importHistory, setImportHistory] = useState<any[]>([]);
    const [importHistoryLoading, setImportHistoryLoading] = useState(false);
    const [selectedImportDetail, setSelectedImportDetail] = useState<any | null>(null);
    const [importDetailOpen, setImportDetailOpen] = useState(false);

    const fetchImportHistory = async () => {
        setImportHistoryLoading(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/orders/imports", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            if (res.ok && json.status && json.data) {
                setImportHistory(json.data.data || json.data || []);
            }
        } catch (err) {
            console.error("Error fetching import history:", err);
        } finally {
            setImportHistoryLoading(false);
        }
    };

    const fetchImportDetail = async (id: number) => {
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/imports/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            if (res.ok && json.status && json.data) {
                setSelectedImportDetail(json.data);
                setImportDetailOpen(true);
            } else {
                toast.error(json.message || "Failed to fetch import details");
            }
        } catch (err: any) {
            toast.error(err?.message || "Error fetching import details");
        }
    };

    const handleRetryImport = async (id: number) => {
        const toastId = toast.loading("Re-queueing import...");
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/imports/${id}/retry`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            if (res.ok && json.status) {
                toast.success("Import re-queued successfully!", { id: toastId });
                fetchImportHistory();
            } else {
                toast.error(json.message || "Failed to retry import", { id: toastId });
            }
        } catch (err: any) {
            toast.error(err?.message || "Error retrying import", { id: toastId });
        }
    };

    const handleCancelImport = async (id: number) => {
        const toastId = toast.loading("Cancelling import...");
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/imports/${id}/cancel`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            if (res.ok && json.status) {
                toast.success("Import cancelled.", { id: toastId });
                fetchImportHistory();
            } else {
                toast.error(json.message || "Failed to cancel import", { id: toastId });
            }
        } catch (err: any) {
            toast.error(err?.message || "Error cancelling import", { id: toastId });
        }
    };

    // Fetch import history on mount
    useEffect(() => {
        fetchImportHistory();
    }, []);

    // Poll import history only if modal is open and has active background jobs
    useEffect(() => {
        if (!importModalOpen) return;
        const hasActive = importHistory.some(imp => imp.status === "queued" || imp.status === "processing");
        if (!hasActive) return;

        const interval = setInterval(() => {
            fetchImportHistory();
        }, 5000);

        return () => clearInterval(interval);
    }, [importModalOpen]);

    // Export Modal & Filter Preview state
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportStartDate, setExportStartDate] = useState("");
    const [exportEndDate, setExportEndDate] = useState("");
    const [exportDateField, setExportDateField] = useState("created_at");
    const [exportStatus, setExportStatus] = useState("All");
    const [exportCustomer, setExportCustomer] = useState("");
    const [exportLayer, setExportLayer] = useState("All");
    const [exportMask, setExportMask] = useState("All");
    const [exportCg, setExportCg] = useState("All");
    const [exportTool, setExportTool] = useState("");
    const [exportCombo, setExportCombo] = useState("");
    const [exportPn, setExportPn] = useState("");
    const [exportQuoteNo, setExportQuoteNo] = useState("");
    const [exportBillNo, setExportBillNo] = useState("");
    const [exportFormat, setExportFormat] = useState<"xlsx" | "csv">("xlsx");
    const [exportPreviewLoading, setExportPreviewLoading] = useState(false);
    const [exportPreviewData, setExportPreviewData] = useState<{ total: number; total_count?: number; data: any[]; current_page: number; last_page: number; total_pages?: number } | null>(null);
    const [exportPreviewPage, setExportPreviewPage] = useState(1);

    const handleDownloadSampleSheet = async () => {
        const toastId = toast.loading("Downloading sample Excel template...");
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
            toast.success("Sample template downloaded!", { id: toastId });
        } catch (err: any) {
            toast.error(err?.message || "Error downloading sample sheet", { id: toastId });
        }
    };

    const fetchExportPreview = async (pageToFetch: number = 1) => {
        setExportPreviewLoading(true);
        try {
            const token = localStorage.getItem("admin_token");
            const params = new URLSearchParams();
            if (exportStartDate) params.set("start_date", exportStartDate);
            if (exportEndDate) params.set("end_date", exportEndDate);
            if (exportDateField) params.set("date_field", exportDateField);
            if (exportStatus && exportStatus !== "All") params.set("status", exportStatus);
            if (exportCustomer) {
                params.set("customer", exportCustomer);
                params.set("customer_name", exportCustomer);
            }
            if (exportLayer && exportLayer !== "All") params.set("layer", exportLayer);
            if (exportMask && exportMask !== "All") params.set("mask", exportMask);
            if (exportCg && exportCg !== "All") {
                params.set("cg", exportCg);
                params.set("c_g", exportCg);
            }
            if (exportTool) params.set("tool", exportTool);
            if (exportCombo) params.set("combo", exportCombo);
            if (exportPn) {
                params.set("pn", exportPn);
                params.set("p_n", exportPn);
            }
            if (exportQuoteNo) {
                params.set("quote_no", exportQuoteNo);
                params.set("quote_number", exportQuoteNo);
            }
            if (exportBillNo) {
                params.set("bill_no", exportBillNo);
                params.set("bill_number", exportBillNo);
            }
            params.set("page", pageToFetch.toString());
            params.set("per_page", "10");

            const res = await fetch(`/api/admin/orders/export-preview?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            if (res.ok && json.success) {
                const totalCount = json.total_count ?? json.total ?? (json.data ? json.data.length : 0);
                const lastPage = json.last_page ?? json.total_pages ?? 1;
                const currentPage = json.current_page ?? json.page ?? pageToFetch;

                setExportPreviewData({
                    ...json,
                    total: totalCount,
                    total_count: totalCount,
                    last_page: lastPage,
                    total_pages: lastPage,
                    current_page: currentPage,
                    page: currentPage,
                });
                setExportPreviewPage(currentPage);
            } else {
                setExportPreviewData(null);
            }
        } catch (e) {
            console.error("Export preview fetch error:", e);
        } finally {
            setExportPreviewLoading(false);
        }
    };

    const handleResetExportFilters = () => {
        setExportStartDate("");
        setExportEndDate("");
        setExportDateField("created_at");
        setExportStatus("All");
        setExportCustomer("");
        setExportLayer("All");
        setExportMask("All");
        setExportCg("All");
        setExportTool("");
        setExportCombo("");
        setExportPn("");
        setExportQuoteNo("");
        setExportBillNo("");
        setExportPreviewPage(1);
    };

    const handleDownloadFilteredExport = async () => {
        setExporting(true);
        const toastId = toast.loading(`Generating ${exportFormat.toUpperCase()} file...`);
        try {
            const token = localStorage.getItem("admin_token");
            const params = new URLSearchParams();
            params.set("format", exportFormat);
            if (exportStartDate) params.set("start_date", exportStartDate);
            if (exportEndDate) params.set("end_date", exportEndDate);
            if (exportDateField) params.set("date_field", exportDateField);
            if (exportStatus && exportStatus !== "All") params.set("status", exportStatus);
            if (exportCustomer) {
                params.set("customer", exportCustomer);
                params.set("customer_name", exportCustomer);
            }
            if (exportLayer && exportLayer !== "All") params.set("layer", exportLayer);
            if (exportMask && exportMask !== "All") params.set("mask", exportMask);
            if (exportCg && exportCg !== "All") {
                params.set("cg", exportCg);
                params.set("c_g", exportCg);
            }
            if (exportTool) params.set("tool", exportTool);
            if (exportCombo) params.set("combo", exportCombo);
            if (exportPn) {
                params.set("pn", exportPn);
                params.set("p_n", exportPn);
            }
            if (exportQuoteNo) {
                params.set("quote_no", exportQuoteNo);
                params.set("quote_number", exportQuoteNo);
            }
            if (exportBillNo) {
                params.set("bill_no", exportBillNo);
                params.set("bill_number", exportBillNo);
            }

            const res = await fetch(`/api/admin/orders/export?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Failed to generate export file");

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const filenameDate = new Date().toISOString().slice(0, 10);
            a.download = `pcb-manufacturing-export-${filenameDate}.${exportFormat}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success(`Export file (${exportFormat.toUpperCase()}) downloaded successfully!`, { id: toastId });
            setExportModalOpen(false);
        } catch (err: any) {
            toast.error(err?.message || "Failed to download export", { id: toastId });
        } finally {
            setExporting(false);
        }
    };


    const handlePreviewImport = async (file: File) => {
        setImportingPreview(true);
        setImportPreviewData(null);
        const toastId = toast.loading("Analyzing spreadsheet format and rows...");
        try {
            const token = localStorage.getItem("admin_token");
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/admin/orders/import-preview", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            const json = await res.json();
            if (res.ok && json.success) {
                setImportPreviewData(json);
                toast.success(`Spreadsheet parsed: ${json.summary?.valid_rows || 0} valid rows found`, { id: toastId });
            } else {
                toast.error(json.message || "Failed to preview import file", { id: toastId });
            }
        } catch (err: any) {
            toast.error(err?.message || "Error parsing spreadsheet file", { id: toastId });
        } finally {
            setImportingPreview(false);
        }
    };

    const handleExecuteImport = async () => {
        if (!importFile) return;
        setExecutingImport(true);
        const toastId = toast.loading("Uploading and queueing import file...");
        try {
            const token = localStorage.getItem("admin_token");
            const formData = new FormData();
            formData.append("file", importFile);
            formData.append("duplicate_action", importDuplicateAction);

            const res = await fetch("/api/admin/orders/import-upload", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            const json = await res.json();
            if (res.ok && (json.success || json.status)) {
                toast.success(
                    `Import Queued! Processing file in background.`,
                    { id: toastId, duration: 5000 }
                );
                setImportModalOpen(false);
                setImportFile(null);
                setImportPreviewData(null);
                fetchImportHistory();
                fetchData(debouncedSearch);
            } else {
                toast.error(json.message || "Failed to queue import file", { id: toastId });
            }
        } catch (err: any) {
            toast.error(err?.message || "Error queueing order import", { id: toastId });
        } finally {
            setExecutingImport(false);
        }
    };

    const handleReorderSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!reorderModalOrder) return;

        if (!reorderQty || reorderQty <= 0) {
            toast.error("Please enter a valid order quantity");
            return;
        }

        setReordering(true);
        const toastId = toast.loading(`Creating reorder for #${reorderModalOrder.order_number}...`);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/${reorderModalOrder.id}/reorder`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    order_qty: reorderQty,
                    quantity: reorderQty,
                    delivery_date: reorderDeliveryDate
                })
            });
            const data = await res.json();
            if (res.ok && (data.status || data.success)) {
                toast.success(data.message || `Order reordered successfully!`, { id: toastId });
                setReorderModalOrder(null);
                fetchData(debouncedSearch);
            } else {
                toast.error(data.message || "Failed to reorder", { id: toastId });
            }
        } catch (err: any) {
            console.error("Reorder error:", err);
            toast.error(err?.message || "Error processing reorder", { id: toastId });
        } finally {
            setReordering(false);
        }
    };

    // Change status modal state
    const [statusModalOrder, setStatusModalOrder] = useState<ApiOrder | null>(null);
    const [modalNewStatus, setModalNewStatus] = useState("");
    const [modalCustomerName, setModalCustomerName] = useState("");
    const [modalUserId, setModalUserId] = useState<string>("");
    const [customerList, setCustomerList] = useState<any[]>([]);
    const [customerSearch, setCustomerSearch] = useState<string>("");
    const [loadingCustomers, setLoadingCustomers] = useState<boolean>(false);
    const [customerDropdownOpen, setCustomerDropdownOpen] = useState<boolean>(false);

    const fetchCustomersList = async (searchQuery: string = "") => {
        setLoadingCustomers(true);
        try {
            const token = localStorage.getItem("admin_token");
            let url = "/api/admin/users";
            if (searchQuery.trim()) {
                url += `?search=${encodeURIComponent(searchQuery.trim())}&q=${encodeURIComponent(searchQuery.trim())}`;
            }
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status || data.success) {
                const list = data.data || data.users || [];
                setCustomerList(list);
                if (modalUserId) {
                    const found = list.find((u: any) => String(u.id) === String(modalUserId));
                    if (found) {
                        const name = found.company_name || found.name || `${found.first_name || ''} ${found.last_name || ''}`.trim();
                        if (name) {
                            setModalCustomerName(name);
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Failed to load customer list:", err);
        } finally {
            setLoadingCustomers(false);
        }
    };
    const [modalCompletedQty, setModalCompletedQty] = useState<number>(0);
    const [modalFailedQty, setModalFailedQty] = useState<number>(0);
    const [modalQNo, setModalQNo] = useState("");
    const [modalCombo, setModalCombo] = useState("");
    const [modalLaunchQty, setModalLaunchQty] = useState<number>(0);
    const [modalPanelQty, setModalPanelQty] = useState<number>(0);
    const [modalUpsQty, setModalUpsQty] = useState<number>(0);
    const [modalFinalQty, setModalFinalQty] = useState<number>(0);
    const [modalBillNumber, setModalBillNumber] = useState("");
    const [modalDeliveryDate, setModalDeliveryDate] = useState("");
    const [modalRemark, setModalRemark] = useState("");
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // Order logs modal state
    const [logsModalOrder, setLogsModalOrder] = useState<ApiOrder | null>(null);
    const [logsData, setLogsData] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Add / Edit Film modal state
    const [filmModalOrder, setFilmModalOrder] = useState<ApiOrder | null>(null);
    const [filmDateTime, setFilmDateTime] = useState("");
    const [savingFilm, setSavingFilm] = useState(false);

    // Job Card modal state
    const [jobCardModalOrder, setJobCardModalOrder] = useState<ApiOrder | null>(null);

    const openJobCardModal = (order: ApiOrder) => {
        setJobCardModalOrder(order);
    };

    const openFilmModal = (order: ApiOrder) => {
        setFilmModalOrder(order);
        const existingFilmVal = getMetaValue(order, 'film_datetime', getMetaValue(order, 'film_date', ''));
        if (existingFilmVal && existingFilmVal !== 'N/A') {
            let formatted = existingFilmVal;
            try {
                const dateObj = new Date(existingFilmVal);
                if (!isNaN(dateObj.getTime())) {
                    const pad = (n: number) => n < 10 ? '0' + n : n;
                    formatted = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
                }
            } catch (e) { }
            setFilmDateTime(formatted);
        } else {
            const now = new Date();
            const pad = (n: number) => n < 10 ? '0' + n : n;
            const defaultNow = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
            setFilmDateTime(defaultNow);
        }
    };

    const handleSaveFilm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!filmModalOrder) return;
        if (!filmDateTime) {
            toast.error("Please select a date and time");
            return;
        }

        setSavingFilm(true);
        const toastId = toast.loading("Saving Film Date & Time...");

        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/${filmModalOrder.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    meta_key: "film_datetime",
                    meta_value: filmDateTime,
                    metas: {
                        film_datetime: filmDateTime,
                        film_date: filmDateTime
                    }
                })
            });

            const data = await res.json();
            if (res.ok && (data.status || data.success)) {
                toast.success("Film date & time saved successfully", { id: toastId });
                setFilmModalOrder(null);
                fetchData(debouncedSearch);
            } else {
                toast.error(data.message || "Failed to save film date & time", { id: toastId });
            }
        } catch (err: any) {
            toast.error(err?.message || "Error saving film date & time", { id: toastId });
        } finally {
            setSavingFilm(false);
        }
    };

    const openLogsModal = async (order: ApiOrder) => {
        setLogsModalOrder(order);
        setLogsData([]);
        setLoadingLogs(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/${order.order_number}/logs`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.status || json.success) {
                setLogsData(json.data || []);
            } else {
                toast.error("Failed to load activity logs");
            }
        } catch (e) {
            console.error("Failed to fetch order logs:", e);
            toast.error("Error loading order logs");
        } finally {
            setLoadingLogs(false);
        }
    };

    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [activePreset, setActivePreset] = useState<string | null>(null);

    // Generate last 5 months options dynamically (e.g. Aug 2026, Jul 2026, etc.)
    const getLast5MonthsOptions = () => {
        const options: { label: string; start: string; end: string; key: string }[] = [];
        const now = new Date();
        for (let i = 0; i < 5; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const start = `${yyyy}-${mm}-01`;
            const lastDay = new Date(yyyy, d.getMonth() + 1, 0).getDate();
            const end = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;
            options.push({ label, start, end, key: `month_${i}` });
        }
        return options;
    };

    const MONTH_OPTIONS = getLast5MonthsOptions();

    const PRESET_OPTIONS = [
        { label: "Today", value: "today" },
        { label: "Yesterday", value: "yesterday" },
        { label: "Last 7 Days", value: "7days" },
        { label: "Last 30 Days", value: "30days" },
        { label: "This Month", value: "this_month" },
        { label: "Last Month", value: "last_month" },
        { label: "This Year", value: "this_year" },
        { label: "Last Year", value: "last_year" },
    ];

    const applyPreset = (presetKey: string) => {
        setActivePreset(presetKey);
        const now = new Date();
        const formatDateStr = (d: Date) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        };

        let start = new Date();
        let end = new Date();

        if (presetKey === 'today') {
            start = new Date();
            end = new Date();
        } else if (presetKey === 'yesterday') {
            const y = new Date();
            y.setDate(y.getDate() - 1);
            start = y;
            end = y;
        } else if (presetKey === '7days') {
            const d = new Date();
            d.setDate(d.getDate() - 6);
            start = d;
            end = new Date();
        } else if (presetKey === '30days') {
            const d = new Date();
            d.setDate(d.getDate() - 29);
            start = d;
            end = new Date();
        } else if (presetKey === 'this_month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date();
        } else if (presetKey === 'last_month') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
        } else if (presetKey === 'this_year') {
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date();
        } else if (presetKey === 'last_year') {
            start = new Date(now.getFullYear() - 1, 0, 1);
            end = new Date(now.getFullYear() - 1, 11, 31);
        }

        setTempStartDate(formatDateStr(start));
        setTempEndDate(formatDateStr(end));
    };

    const formatDateShort = (dStr: string) => {
        if (!dStr) return "";
        try {
            const parts = dStr.split('-');
            if (parts.length === 3) {
                const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            }
            return dStr;
        } catch {
            return dStr;
        }
    };

    // Debounce search effect (400ms delay)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    // Fetch live orders and pipeline statuses
    const fetchData = async (searchQuery: string = debouncedSearch) => {
        setLoading(true);
        setIsSearching(true);
        try {
            const token = localStorage.getItem("admin_token");
            const headers = { Authorization: `Bearer ${token}` };

            let url = `/api/admin/orders?sort_by=delivery_date&sort_order=desc&per_page=${pageSize}&limit=${pageSize}`;
            if (startDate) url += `&start_date=${startDate}`;
            if (endDate) url += `&end_date=${endDate}`;
            if (searchQuery.trim()) {
                const q = encodeURIComponent(searchQuery.trim());
                url += `&search=${q}&q=${q}`;
            }
            if (statusFilter && statusFilter !== "All") {
                url += `&status=${encodeURIComponent(statusFilter)}`;
            }

            const [ordersRes, statusesRes] = await Promise.all([
                fetch(url, { headers }),
                statuses.length === 0 ? fetch("/api/admin/statuses", { headers }) : Promise.resolve(null)
            ]);

            const ordersData = await ordersRes.json();
            if (statusesRes) {
                const statusesData = await statusesRes.json();
                if (statusesData.status || statusesData.success) {
                    setStatuses(statusesData.data || []);
                }
            }

            if (ordersData.status || ordersData.success) {
                setOrders(ordersData.data || []);
            } else {
                setOrders([]);
            }
        } catch (err) {
            console.error("Failed to load orders data:", err);
            toast.error("Failed to load orders");
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    useEffect(() => {
        fetchData(debouncedSearch);
    }, [debouncedSearch, startDate, endDate, statusFilter, pageSize]);

    const handleResetFilter = () => {
        setSearch("");
        setStatusFilter("All");
        setStartDate("");
        setEndDate("");
        setActivePreset(null);
        setPage(1);
    };

    // Helper to get meta key value
    const getMetaValue = (order: ApiOrder, key: string, fallback = "N/A") => {
        if (!order || !order.metas) return fallback;
        const found = order.metas.find(m => m && m.meta_key && m.meta_key.toLowerCase() === key.toLowerCase());
        return found ? found.meta_value : fallback;
    };

    // Helper to format date as "05 Aug 2026, 11:41 am"
    const formatDate = (dateString?: string | null) => {
        if (!dateString || dateString === 'N/A') return 'N/A';
        try {
            const d = new Date(dateString);
            if (isNaN(d.getTime())) return dateString;
            const formatted = d.toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
            return formatted.replace(/\b(AM|PM)\b/gi, (m) => m.toLowerCase());
        } catch {
            return dateString || 'N/A';
        }
    };

    // Helper to check if delivery date is before today (only for non-completed orders)
    const isPastDeliveryDate = (dateString?: string | null, status?: string | null) => {
        if (!dateString || dateString === 'N/A') return false;
        if (status) {
            const s = status.toString().toLowerCase().trim();
            if (['completed', 'shipped', 'delivered', 'cancelled', 'canceled'].includes(s)) {
                return false;
            }
        }
        try {
            const d = new Date(dateString);
            if (isNaN(d.getTime())) return false;
            const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            return dDate < today;
        } catch {
            return false;
        }
    };

    // Filter logic
    const filtered = orders.filter((o) => {
        if (!o) return false;
        const query = search.toLowerCase();
        const orderNum = (o.order_number || "").toString().toLowerCase();
        const boardName = (o.board_name || "").toString().toLowerCase();
        const userEmail = (o.user_email || "").toString().toLowerCase();
        const userMobile = (o.user_mobile || "").toString().toLowerCase();
        const customerName = (o.customer_name || "").toString().toLowerCase();

        // Gerber file name & URL search
        const gerberFileName = getMetaValue(o, 'gerber_file_name', getMetaValue(o, 'gerber_name', getMetaValue(o, 'file_name', getMetaValue(o, 'gerber_file', '')))).toLowerCase();
        const gerberUrl = getMetaValue(o, 'gerber_file_url', getMetaValue(o, 'gerber_url', getMetaValue(o, 'gerber_path', ''))).toLowerCase();

        // Payment details search
        const paymentId = (getMetaValue(o, 'payment_id', getMetaValue(o, 'razorpay_payment_id', getMetaValue(o, 'transaction_id', (o as any).payment_id || ''))) || "").toString().toLowerCase();
        const paymentStatus = (getMetaValue(o, 'payment_status', (o as any).payment_status || "")).toString().toLowerCase();
        const paymentMode = (getMetaValue(o, 'payment_mode', getMetaValue(o, 'payment_method', (o as any).payment_mode || ""))).toString().toLowerCase();
        const orderValue = (o.order_value || "").toString().toLowerCase();

        const filmVal = getMetaValue(o, 'film_datetime', getMetaValue(o, 'film_date', '')).toLowerCase();
        const filmStatus = filmVal && filmVal !== 'n/a' ? `yes ${filmVal} ${formatDate(filmVal).toLowerCase()}` : 'no';

        const matchSearch =
            orderNum.includes(query) ||
            boardName.includes(query) ||
            userEmail.includes(query) ||
            userMobile.includes(query) ||
            customerName.includes(query) ||
            gerberFileName.includes(query) ||
            gerberUrl.includes(query) ||
            paymentId.includes(query) ||
            paymentStatus.includes(query) ||
            paymentMode.includes(query) ||
            orderValue.includes(query) ||
            filmStatus.includes(query);

        let matchStatus = false;
        const currentStatusStr = (o.status || "").toString().toLowerCase().trim();

        if (statusFilter === "All") {
            matchStatus = true;
        } else if (statusFilter === "In Production") {
            const excludedStatuses = ["pending", "completed", "cancelled", "canceled"];
            matchStatus = !excludedStatuses.includes(currentStatusStr);
        } else {
            matchStatus = currentStatusStr === statusFilter.toLowerCase().trim();
        }

        return matchSearch && matchStatus;
    });

    const totalPages = Math.ceil(filtered.length / pageSize);
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);


    // Open change status modal
    const handleOpenStatusModal = (order: ApiOrder) => {
        if (!hasChangeStatusPermission) return;
        const isCompleted = ['completed', 'shipped', 'delivered'].includes((order.status || '').toLowerCase());
        const totalQtyVal = parseInt(getMetaValue(order, 'qty', getMetaValue(order, 'quantity', '5'))) || 0;
        const initialCompletedQty = typeof order.completed_qty === 'number' ? order.completed_qty : (isCompleted ? totalQtyVal : 0);
        const initialFailedQty = typeof order.failed_qty === 'number' ? order.failed_qty : (parseInt(getMetaValue(order, 'failed_qty', '0')) || 0);

        const initialUserId = order.user_id ? String(order.user_id) : (order.user?.id ? String(order.user.id) : "");
        const fallbackName = order.customer_name || (order.user ? (order.user.company_name || order.user.name || `${order.user.first_name || ''} ${order.user.last_name || ''}`.trim()) : "") || "";
        setStatusModalOrder(order);
        setModalNewStatus(order.status);
        setModalCustomerName(fallbackName);
        setModalUserId(initialUserId);
        setCustomerSearch("");
        setCustomerDropdownOpen(false);
        fetchCustomersList("");
        setModalCompletedQty(initialCompletedQty);
        setModalFailedQty(initialFailedQty);
        setModalQNo(order.q_no ? String(order.q_no) : "");
        setModalCombo(order.combo ? String(order.combo) : "");
        setModalLaunchQty(order.launch_qty || 0);
        setModalPanelQty(order.panel_qty || 0);
        setModalUpsQty(order.ups_qty || 0);
        setModalFinalQty(order.final_qty || 0);
        setModalBillNumber(order.bill_number ? String(order.bill_number) : "");
        setModalDeliveryDate(order.delivery_date ? String(order.delivery_date).split('T')[0] : "");
        setModalRemark("");
    };
    const openStatusModal = handleOpenStatusModal;

    // Quick inline status change handler
    const handleInlineStatusChange = async (order: ApiOrder, newStatus: string) => {
        if (!hasChangeStatusPermission || order.status === newStatus) return;
        const toastId = toast.loading(`Updating Order #${order.order_number} status...`);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/${order.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: newStatus
                })
            });

            const data = await res.json();
            if (data.status || data.success) {
                toast.success(`Order #${order.order_number} status updated to "${newStatus}"`, { id: toastId });
                fetchData(debouncedSearch);
            } else {
                toast.error(data.message || "Failed to update status", { id: toastId });
            }
        } catch (err: any) {
            console.error("Inline status update error:", err);
            toast.error("Error updating status", { id: toastId });
        }
    };

    // Submit status update
    const handleStatusUpdateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!statusModalOrder || !modalNewStatus) return;

        setUpdatingStatus(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/${statusModalOrder.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: modalNewStatus,
                    user_id: modalUserId ? Number(modalUserId) : null,
                    customer_name: modalCustomerName,
                    completed_qty: modalCompletedQty,
                    failed_qty: modalFailedQty,
                    q_no: modalQNo,
                    combo: modalCombo,
                    launch_qty: modalLaunchQty,
                    panel_qty: modalPanelQty,
                    ups_qty: modalUpsQty,
                    final_qty: modalFinalQty,
                    bill_number: modalBillNumber,
                    delivery_date: modalDeliveryDate || null,
                    remark: modalRemark
                })
            });

            const data = await res.json();
            if (data.status || data.success) {
                toast.success(`Order #${statusModalOrder.order_number} updated successfully`);
                setStatusModalOrder(null);
                fetchData(debouncedSearch);
            } else {
                toast.error(data.message || "Failed to update status");
            }
        } catch (err: any) {
            console.error("Status update error:", err);
            toast.error("Error updating status");
        } finally {
            setUpdatingStatus(false);
        }
    };

    const headerActions = (
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Link href="/orders/import">
                <Button
                    type="button"
                    variant="outline"
                    className="flex items-center gap-2 px-3.5 py-2 bg-card hover:bg-accent/60 border-border/80 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer text-foreground h-9 sm:h-10"
                >
                    <Upload className="w-3.5 h-3.5 text-emerald-500" />
                    Import
                </Button>
            </Link>
            <Link href="/orders/export">
                <Button
                    type="button"
                    variant="outline"
                    className="flex items-center gap-2 px-3.5 py-2 bg-card hover:bg-accent/60 border-border/80 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer text-foreground h-9 sm:h-10"
                >
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                    Export
                </Button>
            </Link>
            {hasCreateOrderPermission && (
                <Link
                    href="/orders/create"
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer h-9 sm:h-10"
                >
                    <Plus className="w-4 h-4" />
                    New Order
                </Link>
            )}
        </div>
    );

    // Dynamic statistics based on current filtered orders
    const statsTotalOrders = filtered.length;
    const statsActiveOrders = filtered.filter((o) => !['completed', 'shipped', 'delivered', 'cancelled', 'canceled'].includes((o.status || '').toLowerCase())).length;
    const statsCompletedOrders = filtered.filter((o) => ['completed', 'shipped', 'delivered'].includes((o.status || '').toLowerCase())).length;
    const statsTotalOrderValue = filtered.reduce((sum, o) => sum + (Number(o.order_value) || 0), 0);

    // Quantity calculations excluding Part orders
    const nonPartFilteredOrders = filtered.filter((o) => getMetaValue(o, 'product_type', 'pcb').toLowerCase() !== 'part');
    const statsTotalQty = nonPartFilteredOrders.reduce((sum, o) => sum + (parseInt(getMetaValue(o, 'qty', getMetaValue(o, 'quantity', '5'))) || 0), 0);
    const statsLaunchQty = nonPartFilteredOrders.reduce((sum, o) => {
        const totalQ = parseInt(getMetaValue(o, 'qty', getMetaValue(o, 'quantity', '5'))) || 0;
        const launch = typeof o.launch_qty === 'number' ? o.launch_qty : (parseInt(getMetaValue(o, 'launch_qty', String(totalQ))) || totalQ);
        return sum + launch;
    }, 0);
    const statsCompletedQty = nonPartFilteredOrders.reduce((sum, o) => {
        const orderStatusStr = (o.status || '').toString().toLowerCase();
        const totalQ = parseInt(getMetaValue(o, 'qty', getMetaValue(o, 'quantity', '5'))) || 0;
        const isComp = ['completed', 'shipped', 'delivered'].includes(orderStatusStr);
        const comp = typeof o.completed_qty === 'number' ? o.completed_qty : (isComp ? totalQ : 0);
        return sum + comp;
    }, 0);
    const statsFailedQty = nonPartFilteredOrders.reduce((sum, o) => {
        const fail = typeof o.failed_qty === 'number' ? o.failed_qty : (parseInt(getMetaValue(o, 'failed_qty', '0')) || 0);
        return sum + fail;
    }, 0);

    return (
        <DashboardLayout
            title="Orders"
            subtitle={`${filtered.length} orders listed (${orders.length} total recorded)`}
            action={headerActions}
        >
            {loading ? (
                <OrdersSkeleton />
            ) : (
                <div className="w-full space-y-5">
                    {/* Stats Section */}
                    {hasStatisticsPermission && (
                        <div className="space-y-2.5">
                            {/* Row 1: Order Counts & Value */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                                <div className="bg-card border border-border/80 rounded-xl p-3 shadow-2xs flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                        <ShoppingBag className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Orders</p>
                                        <h3 className="text-lg font-black text-foreground leading-tight mt-0.5">{statsTotalOrders}</h3>
                                    </div>
                                </div>

                                <div className="bg-card border border-border/80 rounded-xl p-3 shadow-2xs flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">In Progress</p>
                                        <h3 className="text-lg font-black text-amber-500 leading-tight mt-0.5">{statsActiveOrders}</h3>
                                    </div>
                                </div>

                                <div className="bg-card border border-border/80 rounded-xl p-3 shadow-2xs flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Completed</p>
                                        <h3 className="text-lg font-black text-emerald-500 leading-tight mt-0.5">{statsCompletedOrders}</h3>
                                    </div>
                                </div>

                                <div className="bg-card border border-border/80 rounded-xl p-3 shadow-2xs flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                                        <Package className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Value</p>
                                        <h3 className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-tight mt-0.5">
                                            {hasPaymentPermission
                                                ? `₹${statsTotalOrderValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                                                : "XXXX"}
                                        </h3>
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: PCB Quantity Breakdown (Excludes Part Orders) */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                                <div className="bg-card border border-border/80 rounded-xl p-3 shadow-2xs flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                                        <Layers className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ordered Qty</p>
                                        <h3 className="text-lg font-black text-foreground leading-tight mt-0.5">{statsTotalQty} <span className="text-[10px] text-muted-foreground font-bold">Pcs</span></h3>
                                    </div>
                                </div>

                                <div className="bg-card border border-border/80 rounded-xl p-3 shadow-2xs flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                        <Rocket className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Launch Qty</p>
                                        <h3 className="text-lg font-black text-blue-600 dark:text-blue-400 leading-tight mt-0.5">{statsLaunchQty} <span className="text-[10px] text-muted-foreground font-bold">Pcs</span></h3>
                                    </div>
                                </div>

                                <div className="bg-card border border-border/80 rounded-xl p-3 shadow-2xs flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Final Qty</p>
                                        <h3 className="text-lg font-black text-emerald-500 leading-tight mt-0.5">{statsCompletedQty} <span className="text-[10px] text-muted-foreground font-bold">Pcs</span></h3>
                                    </div>
                                </div>

                                <div className="bg-card border border-border/80 rounded-xl p-3 shadow-2xs flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                                        <AlertCircle className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Failed Qty</p>
                                        <h3 className="text-lg font-black text-rose-500 leading-tight mt-0.5">{statsFailedQty} <span className="text-[10px] text-muted-foreground font-bold">Pcs</span></h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Search & Filter Header Bar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full pb-1">
                        <div className="relative flex-1 min-w-[200px]">
                            {isSearching ? (
                                <RefreshCw className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 animate-spin" />
                            ) : (
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            )}
                            <Input
                                type="search"
                                placeholder="Search orders by number, board, email, mobile..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                className="w-full h-10 sm:h-11 pl-10 pr-3 text-xs sm:text-sm bg-card border-border/80 rounded-xl placeholder:text-muted-foreground focus-visible:ring-emerald-500 font-medium transition-all shadow-xs"
                            />
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                            {/* Popover Date Range & Presets Selector */}
                            <Popover open={popoverOpen} onOpenChange={(open) => {
                                setPopoverOpen(open);
                                if (open) {
                                    setTempStartDate(startDate);
                                    setTempEndDate(endDate);
                                }
                            }}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="h-10 sm:h-11 min-w-[150px] sm:min-w-[170px] flex items-center justify-between gap-2 px-3.5 bg-card border-border/80 rounded-xl text-xs sm:text-sm font-bold text-foreground hover:bg-accent/40 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all shadow-xs shrink-0 cursor-pointer whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <CalendarIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                                            <span>
                                                {activePreset
                                                    ? PRESET_OPTIONS.find(p => p.value === activePreset)?.label || MONTH_OPTIONS.find(m => m.key === activePreset)?.label
                                                    : startDate && endDate
                                                        ? `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`
                                                        : startDate
                                                            ? `From ${formatDateShort(startDate)}`
                                                            : "Date Filter"}
                                            </span>
                                        </div>
                                        {(startDate || endDate) && (
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setStartDate("");
                                                    setEndDate("");
                                                    setTempStartDate("");
                                                    setTempEndDate("");
                                                    setActivePreset(null);
                                                    setPage(1);
                                                    fetchData(debouncedSearch);
                                                }}
                                                className="p-1 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors ml-1"
                                                title="Clear date filter"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="z-50 w-80 sm:w-[360px] p-4 bg-card border-border/80 rounded-2xl shadow-xl space-y-4 text-foreground"
                                    align="end"
                                    sideOffset={8}
                                >
                                    <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
                                        <span className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                            <CalendarIcon className="w-4 h-4 text-emerald-500" /> Select Date Range
                                        </span>
                                    </div>

                                    {/* Side by Side Start & End Date Inputs */}
                                    <div>
                                        <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block mb-1.5">Custom Date Range</span>
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <div>
                                                <label className="text-[10px] font-bold text-muted-foreground block mb-1">Start Date</label>
                                                <Input
                                                    type="date"
                                                    value={tempStartDate}
                                                    onChange={(e) => {
                                                        setTempStartDate(e.target.value);
                                                        setActivePreset(null);
                                                    }}
                                                    className="w-full bg-background border-border rounded-xl px-2.5 py-1.5 text-xs font-bold text-foreground focus-visible:ring-emerald-500 cursor-pointer shadow-2xs h-9"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-muted-foreground block mb-1">End Date</label>
                                                <Input
                                                    type="date"
                                                    value={tempEndDate}
                                                    onChange={(e) => {
                                                        setTempEndDate(e.target.value);
                                                        setActivePreset(null);
                                                    }}
                                                    className="w-full bg-background border-border rounded-xl px-2.5 py-1.5 text-xs font-bold text-foreground focus-visible:ring-emerald-500 cursor-pointer shadow-2xs h-9"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Last 5 Months Quick Options */}
                                    <div className="pt-2 border-t border-border/60">
                                        <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block mb-2">Last 5 Months</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {MONTH_OPTIONS.map((m) => {
                                                const isActive = activePreset === m.key;
                                                return (
                                                    <Button
                                                        key={m.key}
                                                        type="button"
                                                        variant={isActive ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => {
                                                            setActivePreset(m.key);
                                                            setTempStartDate(m.start);
                                                            setTempEndDate(m.end);
                                                        }}
                                                        className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all h-auto cursor-pointer ${isActive
                                                            ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs"
                                                            : "bg-muted/40 hover:bg-muted text-foreground border-border/60"
                                                            }`}
                                                    >
                                                        {m.label}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Action Buttons: Reset & Apply */}
                                    <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setTempStartDate("");
                                                setTempEndDate("");
                                                setStartDate("");
                                                setEndDate("");
                                                setActivePreset(null);
                                                setPage(1);
                                                setPopoverOpen(false);
                                            }}
                                            className="px-3.5 py-1.5 text-xs font-bold rounded-xl border-border/80 text-foreground hover:bg-muted h-auto cursor-pointer"
                                        >
                                            Reset
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                setStartDate(tempStartDate);
                                                setEndDate(tempEndDate);
                                                setPage(1);
                                                setPopoverOpen(false);
                                            }}
                                            className="px-4 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs h-auto cursor-pointer"
                                        >
                                            Apply
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <Select
                                value={statusFilter}
                                onValueChange={(val) => { setStatusFilter(val); setPage(1); }}
                            >
                                <SelectTrigger className="h-10 sm:h-11 w-[150px] sm:w-[170px] px-3 text-xs sm:text-sm bg-card border-border/80 rounded-xl text-foreground font-semibold shadow-xs shrink-0">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All Statuses</SelectItem>
                                    <SelectItem value="In Production">In Production</SelectItem>
                                    {statuses.map((s) => (
                                        <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Orders Data Table */}
                    <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-sm">
                        {loading || isSearching ? (
                            <div className="p-5 space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                                    <div className="h-4 bg-muted/60 rounded-md animate-pulse w-36" />
                                    <div className="h-4 bg-muted/60 rounded-md animate-pulse w-24" />
                                </div>
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="p-4 border-b border-border/40 flex items-center justify-between gap-4">
                                        <div className="h-7 bg-muted/60 rounded-lg animate-pulse w-28 shrink-0" />
                                        <div className="h-5 bg-muted/40 rounded-md animate-pulse w-12 shrink-0" />
                                        <div className="h-5 bg-muted/40 rounded-md animate-pulse w-44 shrink-0" />
                                        <div className="h-5 bg-muted/40 rounded-md animate-pulse w-32 shrink-0" />
                                        <div className="h-5 bg-muted/40 rounded-md animate-pulse w-32 shrink-0" />
                                        <div className="h-5 bg-muted/40 rounded-md animate-pulse w-32 shrink-0" />
                                        <div className="h-5 bg-muted/40 rounded-md animate-pulse w-32 shrink-0" />
                                        <div className="h-8 bg-muted/60 rounded-xl animate-pulse w-24 shrink-0" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-muted/80 border-b border-border/80 text-foreground uppercase tracking-wider font-extrabold text-[11px]">
                                            <th className="py-2 px-3.5">Status</th>
                                            <th className="py-2 px-3.5">Order Number</th>
                                            <th className="py-2 px-3.5">Customer</th>
                                            <th className="py-2 px-3.5">Layers</th>
                                            <th className="py-2 px-3.5">Film</th>
                                            <th className="py-2 px-3.5">
                                                Qty (Launch / Final / Fail)
                                            </th>
                                            <th className="py-2 px-3.5">Order Date</th>
                                            <th className="py-2 px-3.5">Delivery Date</th>
                                            <th className="py-2 px-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40">
                                        {paginated.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} className="px-5 py-16 text-center text-muted-foreground text-sm font-medium">
                                                    No orders matched your search or status filter.
                                                </td>
                                            </tr>
                                        ) : (
                                            paginated.map((order) => {
                                                const orderStatusStr = (order?.status || 'Pending').toString().toLowerCase();
                                                const matchedStatus = statuses.find(s => s && s.name && s.name.toString().toLowerCase() === orderStatusStr);
                                                const statusColor = matchedStatus?.color || "#10b981";
                                                const pcbColorVal = getMetaValue(order, 'pcb_color', getMetaValue(order, 'solder_mask', 'Green'));
                                                const orderNumColor = getPcbColorCode(pcbColorVal);
                                                const layerCount = getMetaValue(order, 'layers', getMetaValue(order, 'layer', '2'));

                                                const totalQty = parseInt(getMetaValue(order, 'qty', getMetaValue(order, 'quantity', '5'))) || 0;
                                                const launchQty = typeof order.launch_qty === 'number' ? order.launch_qty : (parseInt(getMetaValue(order, 'launch_qty', String(totalQty))) || totalQty);
                                                const isCompleted = ['completed', 'shipped', 'delivered'].includes(orderStatusStr);
                                                const completedQty = typeof order.completed_qty === 'number' ? order.completed_qty : (isCompleted ? totalQty : 0);
                                                const failedQty = typeof order.failed_qty === 'number' ? order.failed_qty : (parseInt(getMetaValue(order, 'failed_qty', '0')) || 0);
                                                const pendingQty = Math.max(0, totalQty - completedQty - failedQty);
                                                const productTypeVal = getMetaValue(order, 'product_type', 'pcb').toLowerCase();
                                                const isPartOrder = productTypeVal === 'part';

                                                const createdDateFormatted = formatDate(order.created_at);

                                                return (
                                                    <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                                                        {/* 1. Status */}
                                                        <td className="py-1.5 px-3.5 whitespace-nowrap">
                                                            <span
                                                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-2xs text-black"
                                                                style={{
                                                                    backgroundColor: statusColor,
                                                                    color: "#000000",
                                                                    borderColor: `${statusColor}80`
                                                                }}
                                                            >
                                                                {order.status}
                                                            </span>
                                                        </td>
                                                        {/* 2. Order Number */}
                                                        <td className="py-1.5 px-3.5 whitespace-nowrap">
                                                            {hasChangeStatusPermission ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openStatusModal(order)}
                                                                    title="Click to Change Status"
                                                                    className="font-mono text-xs font-black px-2 py-0.5 rounded-md border transition-all cursor-pointer hover:opacity-85 hover:scale-105 active:scale-95 shadow-2xs"
                                                                    style={{
                                                                        color: isPartOrder ? "#2563eb" : orderNumColor,
                                                                        backgroundColor: isPartOrder ? "#2563eb15" : `${orderNumColor}15`,
                                                                        borderColor: isPartOrder ? "#2563eb35" : `${orderNumColor}35`
                                                                    }}
                                                                >
                                                                    #{order.order_number}
                                                                </button>
                                                            ) : (
                                                                <span
                                                                    className="font-mono text-xs font-black px-2 py-0.5 rounded-md border shadow-2xs"
                                                                    style={{
                                                                        color: isPartOrder ? "#2563eb" : orderNumColor,
                                                                        backgroundColor: isPartOrder ? "#2563eb15" : `${orderNumColor}15`,
                                                                        borderColor: isPartOrder ? "#2563eb35" : `${orderNumColor}35`
                                                                    }}
                                                                >
                                                                    #{order.order_number}
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* 3. Customer */}
                                                        <td className="py-1.5 px-3.5 whitespace-nowrap">
                                                            {(() => {
                                                                const customerId = order.user_id || order.user?.id;
                                                                const custDisplayName = order.user?.company_name || order.user?.name || order.customer_name || (order.user_email ? order.user_email : null);

                                                                if (!custDisplayName && !customerId) {
                                                                    return <span className="text-muted-foreground font-medium text-xs">—</span>;
                                                                }

                                                                const displayText = custDisplayName || `Customer #${customerId}`;

                                                                if (customerId) {
                                                                    return (
                                                                        <Link
                                                                            href={`/clients/${customerId}`}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            title={displayText}
                                                                            className="inline-flex items-center gap-1 font-bold text-xs text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors max-w-[170px] truncate"
                                                                        >
                                                                            <span className="truncate">{displayText}</span>
                                                                        </Link>
                                                                    );
                                                                }

                                                                return (
                                                                    <span title={displayText} className="font-semibold text-xs text-muted-foreground max-w-[170px] truncate block">
                                                                        {displayText}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </td>

                                                        {/* 3. Layers */}
                                                        <td className="py-1.5 px-3.5 whitespace-nowrap">
                                                            {isPartOrder ? (
                                                                <span className="px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-extrabold text-xs uppercase tracking-wider">
                                                                    Part
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded-lg text-foreground font-extrabold text-xs">
                                                                    {(() => {
                                                                        const rawVal = (layerCount || '').toString().trim();
                                                                        if (!rawVal) return '2 Layers';
                                                                        if (rawVal.toLowerCase().includes('layer')) return rawVal;
                                                                        return `${rawVal} ${parseInt(rawVal, 10) === 1 ? 'Layer' : 'Layers'}`;
                                                                    })()}
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* 4. Film */}
                                                        <td className="py-1.5 px-3.5 whitespace-nowrap text-xs">
                                                            {isPartOrder ? (
                                                                <span className="text-muted-foreground font-bold px-2">-</span>
                                                            ) : (() => {
                                                                const filmVal = getMetaValue(order, 'film_datetime', getMetaValue(order, 'film_date', ''));
                                                                const hasFilm = filmVal && filmVal !== 'N/A' && filmVal.trim() !== '';
                                                                if (hasFilm) {
                                                                    return (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-sans">
                                                                            Yes
                                                                        </span>
                                                                    );
                                                                }
                                                                return (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-sans">
                                                                        No
                                                                    </span>
                                                                );
                                                            })()}
                                                        </td>

                                                        {/* 5. Qty (Ordered / Launch / Final / Fail) */}
                                                        <td className="py-1.5 px-3.5 whitespace-nowrap">
                                                            <div className="flex items-center gap-1 font-bold text-xs">
                                                                <span className="text-foreground font-extrabold" title="Ordered Quantity">
                                                                    {totalQty} Pcs
                                                                </span>
                                                                <span className="text-muted-foreground ml-0.5">(</span>
                                                                <span className="text-blue-600 dark:text-blue-400 font-extrabold" title="Launch Quantity">
                                                                    {launchQty} Lnc
                                                                </span>
                                                                <span className="text-muted-foreground">/</span>
                                                                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold" title="Final / Completed Quantity">
                                                                    {completedQty} Done
                                                                </span>
                                                                <span className="text-muted-foreground">/</span>
                                                                <span className="text-rose-600 dark:text-rose-400 font-extrabold" title="Failed Quantity">
                                                                    {failedQty} Fail
                                                                </span>
                                                                <span className="text-muted-foreground">)</span>
                                                            </div>
                                                        </td>

                                                        {/* 6. Order Date */}
                                                        <td className="py-1.5 px-3.5 font-bold text-foreground font-mono text-xs whitespace-nowrap">
                                                            {createdDateFormatted}
                                                        </td>

                                                        {/* 7. Delivery Date */}
                                                        <td className={`py-1.5 px-3.5 font-bold font-mono text-xs whitespace-nowrap ${isPastDeliveryDate(order.delivery_date, order.status) ? "text-red-500 font-extrabold" : "text-foreground"}`}>
                                                            {formatDate(order.delivery_date)}
                                                        </td>

                                                        {/* 8. Actions */}
                                                        <td className="py-1.5 px-3.5 text-right whitespace-nowrap">
                                                            <div className="inline-flex items-center justify-end gap-1">
                                                                {/* Change Status Icon Button */}
                                                                {hasChangeStatusPermission && (
                                                                    <button
                                                                        onClick={() => openStatusModal(order)}
                                                                        title="Change Status"
                                                                        aria-label="Change Status"
                                                                        className="p-1.5 bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-lg transition-all cursor-pointer shadow-2xs group relative"
                                                                    >
                                                                        <RefreshCw className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}

                                                                {/* Add/Edit Film Icon Button */}
                                                                {hasAddFilmPermission && !isPartOrder && (() => {
                                                                    const existingFilm = getMetaValue(order, 'film_datetime', getMetaValue(order, 'film_date', ''));
                                                                    const hasFilm = existingFilm && existingFilm !== 'N/A';
                                                                    return (
                                                                        <button
                                                                            onClick={() => openFilmModal(order)}
                                                                            title={hasFilm ? `Edit Film (${existingFilm})` : "Add Film"}
                                                                            aria-label="Add Film"
                                                                            className={`p-1.5 rounded-lg border transition-all cursor-pointer shadow-2xs ${hasFilm
                                                                                ? "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/40 hover:bg-purple-500 hover:text-white"
                                                                                : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500 hover:text-white"
                                                                                }`}
                                                                        >
                                                                            <Film className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    );
                                                                })()}

                                                                {/* Generate Job Card Icon Button */}
                                                                {hasGenerateJobCardPermission && !isPartOrder && (
                                                                    <button
                                                                        onClick={() => openJobCardModal(order)}
                                                                        title="Generate Job Card"
                                                                        aria-label="Generate Job Card"
                                                                        className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500 hover:text-white text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-lg transition-all cursor-pointer shadow-2xs"
                                                                    >
                                                                        <FileText className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}

                                                                {/* View Activity Logs Icon Button */}
                                                                {hasViewLogsPermission && (
                                                                    <button
                                                                        onClick={() => openLogsModal(order)}
                                                                        title="View Order Logs"
                                                                        aria-label="View Order Logs"
                                                                        className="p-1.5 bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-lg transition-all cursor-pointer shadow-2xs"
                                                                    >
                                                                        <History className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}

                                                                {/* Reorder Icon Button */}
                                                                {hasReorderPermission && !isPartOrder && (
                                                                    <button
                                                                        onClick={() => handleOpenReorderModal(order)}
                                                                        title="Reorder"
                                                                        aria-label="Reorder"
                                                                        className="p-1.5 bg-blue-500/10 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-lg transition-all cursor-pointer shadow-2xs"
                                                                    >
                                                                        <Copy className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}

                                                                {/* View Detail Page Icon Button */}
                                                                <Link
                                                                    href={`/orders/${order.order_number}`}
                                                                    title="View Order Details"
                                                                    aria-label="View Order Details"
                                                                    className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500 hover:text-white transition-all cursor-pointer shadow-2xs"
                                                                >
                                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                                </Link>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination Footer */}
                        <div className="p-3 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground font-medium bg-card">
                            <div className="flex items-center gap-3">
                                <span>
                                    Showing <strong className="text-foreground">{filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}</strong> to{" "}
                                    <strong className="text-foreground">{Math.min(page * pageSize, filtered.length)}</strong> of{" "}
                                    <strong className="text-foreground">{filtered.length}</strong> orders
                                </span>
                                <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-border/60">
                                    <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">Rows per page:</span>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => {
                                            setPageSize(Number(e.target.value));
                                            setPage(1);
                                        }}
                                        className="px-2 py-1 bg-card border border-border/80 rounded-lg text-foreground font-bold text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                                    >
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold cursor-pointer"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Previous
                                </button>
                                <span className="font-extrabold text-foreground px-2">
                                    Page {page} of {totalPages || 1}
                                </span>
                                <button
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold cursor-pointer"
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Status Modal */}
            <Dialog open={!!statusModalOrder} onOpenChange={(open) => !open && setStatusModalOrder(null)}>
                {statusModalOrder && (() => {
                    const modalPcbColorVal = getMetaValue(statusModalOrder, 'pcb_color', getMetaValue(statusModalOrder, 'solder_mask', 'Green'));
                    const modalPcbColor = getPcbColorCode(modalPcbColorVal);
                    return (
                        <DialogContent
                            className="max-w-2xl border rounded-2xl p-6 md:p-7 shadow-2xl space-y-5 text-slate-900 overflow-hidden"
                            style={{
                                backgroundColor: getPcbLightBg(modalPcbColor),
                                borderColor: `${modalPcbColor}60`
                            }}
                        >
                            <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: modalPcbColor }} />

                            <DialogHeader className="pb-3 border-b border-slate-200/80">
                                <div className="flex items-center gap-2.5">
                                    <div
                                        className="p-2 rounded-xl border shadow-xs"
                                        style={{ backgroundColor: `${modalPcbColor}20`, color: modalPcbColor, borderColor: `${modalPcbColor}40` }}
                                    >
                                        <RefreshCw className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-base font-black text-slate-900">
                                            Update Order
                                        </DialogTitle>
                                        <DialogDescription className="text-xs text-slate-600 font-semibold mt-0.5">
                                            Order #{statusModalOrder.order_number}
                                        </DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            <form onSubmit={handleStatusUpdateSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center justify-between">
                                            <span>Select Customer</span>
                                        </label>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setCustomerDropdownOpen(!customerDropdownOpen)}
                                                className="w-full px-3.5 py-2.5 text-xs font-bold bg-white border border-slate-300 rounded-xl text-slate-900 shadow-xs flex items-center justify-between hover:border-slate-400 transition-colors h-10"
                                            >
                                                <span className="truncate">
                                                    {modalCustomerName || "Select customer..."}
                                                </span>
                                                <ChevronDown className="w-4 h-4 text-slate-500 shrink-0 ml-1" />
                                            </button>

                                            {customerDropdownOpen && (
                                                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-2 space-y-2 max-w-full">
                                                    <input
                                                        type="text"
                                                        value={customerSearch}
                                                        onChange={(e) => {
                                                            setCustomerSearch(e.target.value);
                                                            fetchCustomersList(e.target.value);
                                                        }}
                                                        placeholder="🔍 Search customer name, email, phone..."
                                                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                                                        autoFocus
                                                    />

                                                    <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5">
                                                        {loadingCustomers ? (
                                                            <div className="p-3 text-center text-xs text-slate-400 italic">
                                                                Searching customers...
                                                            </div>
                                                        ) : customerList.length === 0 ? (
                                                            <div className="p-3 text-center text-xs text-slate-400 italic">
                                                                No matching customers found.
                                                            </div>
                                                        ) : (
                                                            customerList.map((c) => {
                                                                const displayName = c.company_name || c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed';
                                                                const contact = c.email || c.mobile || c.phone_number || '';
                                                                const isSelected = String(c.id) === String(modalUserId);
                                                                return (
                                                                    <button
                                                                        key={c.id}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setModalUserId(String(c.id));
                                                                            setModalCustomerName(displayName);
                                                                            setCustomerDropdownOpen(false);
                                                                        }}
                                                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${isSelected ? "bg-emerald-50 text-emerald-900 font-bold" : "hover:bg-slate-100 text-slate-800"
                                                                            }`}
                                                                    >
                                                                        <div className="min-w-0 pr-2">
                                                                            <p className="font-bold truncate">{displayName}</p>
                                                                            {contact && <p className="text-[10px] text-slate-500 font-normal truncate">{contact}</p>}
                                                                        </div>
                                                                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                                                    </button>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1.5">
                                            Select New Pipeline Status
                                        </label>
                                        <Select
                                            value={modalNewStatus}
                                            onValueChange={(val) => setModalNewStatus(val)}
                                        >
                                            <SelectTrigger className="w-full px-3.5 py-2.5 text-xs font-bold bg-white border-slate-300 rounded-xl text-slate-900 shadow-xs h-auto">
                                                <SelectValue placeholder="Select status..." />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-60 overflow-y-auto font-semibold">
                                                {statuses.map((s) => (
                                                    <SelectItem key={s.id} value={s.name}>
                                                        {s.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1.5">
                                            Q.No
                                        </label>
                                        <Input
                                            type="text"
                                            value={modalQNo}
                                            onChange={(e) => setModalQNo(e.target.value)}
                                            placeholder="Q.No..."
                                            className="w-full px-3.5 py-2.5 text-xs bg-white border-slate-300 rounded-xl text-slate-900 font-bold shadow-xs h-auto"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1.5">
                                            Combo
                                        </label>
                                        <Input
                                            type="text"
                                            value={modalCombo}
                                            onChange={(e) => setModalCombo(e.target.value)}
                                            placeholder="Combo..."
                                            className="w-full px-3.5 py-2.5 text-xs bg-white border-slate-300 rounded-xl text-slate-900 font-bold shadow-xs h-auto"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1.5">
                                            Bill Number
                                        </label>
                                        <Input
                                            type="text"
                                            value={modalBillNumber}
                                            onChange={(e) => setModalBillNumber(e.target.value)}
                                            placeholder="Bill Number..."
                                            className="w-full px-3.5 py-2.5 text-xs bg-white border-slate-300 rounded-xl text-slate-900 font-bold shadow-xs h-auto"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1.5">
                                            Completed Quantity (Pcs)
                                        </label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={modalCompletedQty}
                                            onChange={(e) => setModalCompletedQty(parseInt(e.target.value) || 0)}
                                            placeholder="Completed Pcs..."
                                            className="w-full px-3.5 py-2.5 text-xs bg-white border-slate-300 rounded-xl text-slate-900 font-bold shadow-xs h-auto"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1.5">
                                            Failed Quantity (Pcs)
                                        </label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={modalFailedQty}
                                            onChange={(e) => setModalFailedQty(parseInt(e.target.value) || 0)}
                                            placeholder="Failed Pcs..."
                                            className="w-full px-3.5 py-2.5 text-xs bg-white border-slate-300 rounded-xl text-rose-600 font-bold shadow-xs h-auto"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1.5">
                                            Launch Quantity
                                        </label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={modalLaunchQty}
                                            onChange={(e) => setModalLaunchQty(parseInt(e.target.value) || 0)}
                                            placeholder="Launch Qty..."
                                            className="w-full px-3.5 py-2.5 text-xs bg-white border-slate-300 rounded-xl text-slate-900 font-bold shadow-xs h-auto"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1.5">
                                            Panel Quantity
                                        </label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={modalPanelQty}
                                            onChange={(e) => setModalPanelQty(parseInt(e.target.value) || 0)}
                                            placeholder="Panel..."
                                            className="w-full px-3.5 py-2.5 text-xs bg-white border-slate-300 rounded-xl text-slate-900 font-bold shadow-xs h-auto"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1.5">
                                            Ups Quantity
                                        </label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={modalUpsQty}
                                            onChange={(e) => setModalUpsQty(parseInt(e.target.value) || 0)}
                                            placeholder="Ups..."
                                            className="w-full px-3.5 py-2.5 text-xs bg-white border-slate-300 rounded-xl text-slate-900 font-bold shadow-xs h-auto"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1.5">
                                            Final Quantity
                                        </label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={modalFinalQty}
                                            onChange={(e) => setModalFinalQty(parseInt(e.target.value) || 0)}
                                            placeholder="Final..."
                                            className="w-full px-3.5 py-2.5 text-xs bg-white border-slate-300 rounded-xl text-slate-900 font-bold shadow-xs h-auto"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                                        Add Audit Note / Remark (Optional)
                                    </label>
                                    <Textarea
                                        rows={3}
                                        value={modalRemark}
                                        onChange={(e) => setModalRemark(e.target.value)}
                                        placeholder="Enter reason or details for this status change..."
                                        className="w-full px-3.5 py-2.5 text-xs bg-white border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 resize-none font-medium shadow-xs"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/80">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setStatusModalOrder(null)}
                                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer border-slate-300/80 h-auto"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={updatingStatus}
                                        className="inline-flex items-center gap-1.5 px-5 py-2.5 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 hover:opacity-90 active:scale-95 h-auto"
                                        style={{ backgroundColor: modalPcbColor }}
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${updatingStatus ? 'animate-spin' : ''}`} />
                                        {updatingStatus ? "Saving..." : "Update Status"}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    );
                })()}
            </Dialog>

            {/* Quick Preview Modal */}
            <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                {selectedOrder && (() => {
                    const previewPcbColorVal = getMetaValue(selectedOrder, 'pcb_color', getMetaValue(selectedOrder, 'solder_mask', 'Green'));
                    const previewPcbColor = getPcbColorCode(previewPcbColorVal);
                    return (
                        <DialogContent
                            className="max-w-2xl max-h-[90vh] overflow-y-auto border rounded-2xl p-6 md:p-8 shadow-2xl space-y-5 text-slate-900 overflow-hidden"
                            style={{
                                backgroundColor: getPcbLightBg(previewPcbColor),
                                borderColor: `${previewPcbColor}60`
                            }}
                        >
                            <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: previewPcbColor }} />
                            <DialogHeader className="pb-4 border-b border-slate-200/80">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <DialogTitle className="text-xl font-black text-slate-900 font-mono">#{selectedOrder.order_number}</DialogTitle>
                                        {(() => {
                                            const selStatusStr = (selectedOrder?.status || 'Pending').toString().toLowerCase();
                                            const selMatchedStatus = statuses.find(s => s && s.name && s.name.toString().toLowerCase() === selStatusStr);
                                            const selStatusColor = selMatchedStatus?.color || "#10b981";
                                            return (
                                                <span
                                                    className="px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border text-black shadow-2xs"
                                                    style={{
                                                        backgroundColor: selStatusColor,
                                                        color: "#000000",
                                                        borderColor: `${selStatusColor}80`
                                                    }}
                                                >
                                                    {selectedOrder.status}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <DialogDescription className="text-xs text-slate-600 mt-1 font-medium">
                                        Board: <span className="font-bold text-slate-900">{selectedOrder.board_name}</span>
                                    </DialogDescription>
                                </div>
                            </DialogHeader>

                            <div className="grid grid-cols-2 gap-3 bg-white/90 p-4 rounded-xl text-xs border border-slate-200 shadow-xs">
                                <div><span className="text-slate-500 font-semibold">Amount:</span> <span className="font-black text-emerald-700">₹{Number(selectedOrder.order_value).toLocaleString('en-IN')}</span></div>
                                <div><span className="text-slate-500 font-semibold">Email:</span> <span className="font-bold text-slate-900">{selectedOrder.user_email}</span></div>
                                <div><span className="text-slate-500 font-semibold">Mobile:</span> <span className="font-bold text-slate-900">{selectedOrder.user_mobile}</span></div>
                                <div><span className="text-slate-500 font-semibold">Delivery:</span> <span className={`font-bold ${isPastDeliveryDate(selectedOrder.delivery_date, selectedOrder.status) ? "text-red-600 font-extrabold" : "text-slate-900"}`}>{formatDate(selectedOrder.delivery_date)}</span></div>
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                {hasGenerateJobCardPermission && (
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            const ord = selectedOrder;
                                            setSelectedOrder(null);
                                            openJobCardModal(ord);
                                        }}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all text-xs active:scale-95 cursor-pointer h-auto"
                                    >
                                        <FileText className="w-4 h-4" /> Generate Job Card
                                    </Button>
                                )}
                                <Link
                                    href={`/orders/${selectedOrder.order_number}`}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 text-white font-bold rounded-xl shadow-md hover:opacity-90 transition-all text-xs active:scale-95"
                                    style={{ backgroundColor: previewPcbColor }}
                                >
                                    <ExternalLink className="w-4 h-4" /> Go to Full Order Detail Page
                                </Link>
                            </div>
                        </DialogContent>
                    );
                })()}
            </Dialog>

            {/* View Order Activity Logs Modal */}
            <Dialog open={!!logsModalOrder} onOpenChange={(open) => !open && setLogsModalOrder(null)}>
                {logsModalOrder && (() => {
                    const logsPcbColorVal = getMetaValue(logsModalOrder, 'pcb_color', getMetaValue(logsModalOrder, 'solder_mask', 'Green'));
                    const logsPcbColor = getPcbColorCode(logsPcbColorVal);
                    return (
                        <DialogContent
                            className="max-w-3xl max-h-[85vh] overflow-y-auto border rounded-2xl p-6 md:p-7 shadow-2xl space-y-5 text-slate-900 overflow-hidden"
                            style={{
                                backgroundColor: getPcbLightBg(logsPcbColor),
                                borderColor: `${logsPcbColor}60`
                            }}
                        >
                            <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: logsPcbColor }} />
                            <DialogHeader className="pb-3 border-b border-slate-200/80">
                                <div className="flex items-center gap-2.5">
                                    <div
                                        className="p-2 rounded-xl border shadow-xs"
                                        style={{ backgroundColor: `${logsPcbColor}20`, color: logsPcbColor, borderColor: `${logsPcbColor}40` }}
                                    >
                                        <History className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                                            Order Activity Logs
                                            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-300">
                                                #{logsModalOrder.order_number}
                                            </span>
                                        </DialogTitle>
                                        <DialogDescription className="text-xs text-slate-600 font-semibold mt-0.5">
                                            Audit trail & pipeline status history for {logsModalOrder.board_name}
                                        </DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                                <div className="overflow-x-auto">
                                    {loadingLogs ? (
                                        <div className="p-6 space-y-4">
                                            <div className="h-6 bg-slate-100 rounded-md animate-pulse w-full" />
                                            <div className="h-6 bg-slate-100 rounded-md animate-pulse w-full" />
                                            <div className="h-6 bg-slate-100 rounded-md animate-pulse w-full" />
                                        </div>
                                    ) : (
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold uppercase tracking-wider text-[10px]">
                                                    <th className="py-3 px-4">Action</th>
                                                    <th className="py-3 px-4 whitespace-nowrap">User / Admin</th>
                                                    <th className="py-3 px-4">Timestamp</th>
                                                    <th className="py-3 px-4">Details / Description</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-sans">
                                                {logsData.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} className="py-8 text-center text-slate-500 italic">
                                                            No activity logs recorded for this order yet.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    logsData.map((log: any) => (
                                                        <tr key={log.id} className="hover:bg-slate-50">
                                                            <td className="py-3 px-4 whitespace-nowrap">
                                                                <span className="font-extrabold text-emerald-700">
                                                                    {log.action || "Order Action"}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                                                                {log.admin_name || log.resolved_user_name || log.user_name || (log.admin_id ? `Admin #${log.admin_id}` : (log.user_id ? `User #${log.user_id}` : "System"))}
                                                            </td>
                                                            <td className="py-3 px-4 font-medium text-foreground whitespace-nowrap">
                                                                {formatDate(log.created_at)}
                                                            </td>
                                                            <td className="py-3 px-4 font-medium text-foreground">
                                                                {log.description || "-"}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setLogsModalOrder(null)}
                                    className="px-4 py-2 font-bold text-xs rounded-xl transition-all cursor-pointer h-auto"
                                >
                                    Close
                                </Button>
                            </div>
                        </DialogContent>
                    );
                })()}
            </Dialog>

            {/* Add / Edit Film Date & Time Modal */}
            <Dialog open={!!filmModalOrder} onOpenChange={(open) => !open && setFilmModalOrder(null)}>
                {filmModalOrder && (() => {
                    const modalPcbColorVal = getMetaValue(filmModalOrder, 'pcb_color', getMetaValue(filmModalOrder, 'solder_mask', 'Green'));
                    const modalPcbColor = getPcbColorCode(modalPcbColorVal);
                    const existingFilmVal = getMetaValue(filmModalOrder, 'film_datetime', getMetaValue(filmModalOrder, 'film_date', ''));
                    const isExisting = existingFilmVal && existingFilmVal !== 'N/A';

                    return (
                        <DialogContent
                            className="max-w-md border rounded-2xl p-6 md:p-7 shadow-2xl space-y-5 text-slate-900 overflow-hidden"
                            style={{
                                backgroundColor: getPcbLightBg(modalPcbColor),
                                borderColor: `${modalPcbColor}60`
                            }}
                        >
                            <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: modalPcbColor }} />

                            <DialogHeader className="pb-3 border-b border-slate-200/80">
                                <div className="flex items-center gap-2.5">
                                    <div
                                        className="p-2 rounded-xl border shadow-xs"
                                        style={{ backgroundColor: `${modalPcbColor}20`, color: modalPcbColor, borderColor: `${modalPcbColor}40` }}
                                    >
                                        <Film className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-base font-black text-slate-900">
                                            {isExisting ? "Update Film Date & Time" : "Add Film Date & Time"}
                                        </DialogTitle>
                                        <DialogDescription className="text-xs text-slate-600 font-semibold mt-0.5">
                                            Order #{filmModalOrder.order_number} · {filmModalOrder.board_name}
                                        </DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            <form onSubmit={handleSaveFilm} className="space-y-4">
                                {isExisting && (
                                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs space-y-0.5">
                                        <span className="font-bold text-purple-900 block">Current Saved Film Date & Time:</span>
                                        <span className="font-mono text-purple-700 font-extrabold">{existingFilmVal}</span>
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                                        Select Film Date & Time
                                    </label>
                                    <Input
                                        type="datetime-local"
                                        value={filmDateTime}
                                        onChange={(e) => setFilmDateTime(e.target.value)}
                                        className="w-full px-3.5 py-2.5 text-xs bg-white border-slate-300 rounded-xl text-slate-900 font-bold shadow-xs h-auto cursor-pointer"
                                        required
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/80">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setFilmModalOrder(null)}
                                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer border-slate-300/80 h-auto"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={savingFilm}
                                        className="inline-flex items-center gap-1.5 px-5 py-2.5 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 hover:opacity-90 active:scale-95 h-auto"
                                        style={{ backgroundColor: modalPcbColor }}
                                    >
                                        <Film className={`w-3.5 h-3.5 ${savingFilm ? 'animate-spin' : ''}`} />
                                        {savingFilm ? "Saving..." : isExisting ? "Update Film" : "Save Film"}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    );
                })()}
            </Dialog>

            {/* Dynamic Job Card Generator & Preview Modal */}
            <Dialog open={!!jobCardModalOrder} onOpenChange={(open) => !open && setJobCardModalOrder(null)}>
                {jobCardModalOrder && (() => {
                    const order = jobCardModalOrder;
                    const layersStr = getMetaValue(order, 'layers', getMetaValue(order, 'layer', '2'));
                    const isSingleSide = layersStr === "1" || layersStr.toLowerCase().includes("1-side") || layersStr.toLowerCase().includes("single");

                    const createdDate = formatDate(order.created_at);
                    const launchDate = formatDate(order.launch_date || getMetaValue(order, 'launch_date', order.created_at));
                    const shippingDate = formatDate(order.delivery_date);

                    const orderQty = getMetaValue(order, 'qty', getMetaValue(order, 'quantity', 'N/A'));
                    const launchedQty = getMetaValue(order, 'launched_qty', getMetaValue(order, 'launched', orderQty));
                    const ups = getMetaValue(order, 'ups', '1');
                    const panels = getMetaValue(order, 'panels', '1');
                    const minHole = getMetaValue(order, 'min_hole', getMetaValue(order, 'min_hole_size', '0.8 MM'));

                    const panelSize = getMetaValue(order, 'panel_size', getMetaValue(order, 'dimensions', ''));
                    const cuttingSize = getMetaValue(order, 'cutting_size', '');

                    const material = getMetaValue(order, 'material', getMetaValue(order, 'base_material', 'FR4'));
                    const thickness = getMetaValue(order, 'board_thickness', getMetaValue(order, 'thickness', '1.6'));
                    const copperThickness = getMetaValue(order, 'copper_thickness', getMetaValue(order, 'copper_weight', '1 Oz'));
                    const surfaceFinish = getMetaValue(order, 'surface_finish', getMetaValue(order, 'finish', 'HAL Finish'));

                    const maskColour = getMetaValue(order, 'pcb_color', getMetaValue(order, 'solder_mask', 'Green'));
                    const lpColor = getMetaValue(order, 'legend_color', getMetaValue(order, 'silkscreen', 'White'));
                    const lpSide = getMetaValue(order, 'silkscreen_side', getMetaValue(order, 'legend_side', 'Top'));

                    const route = getMetaValue(order, 'route', getMetaValue(order, 'routing', 'CNC Routing'));
                    const vCut = getMetaValue(order, 'v_cut', 'Yes');
                    const fptProgram = getMetaValue(order, 'fpt_program', 'MNF-1 / MNF-2');
                    const secondStage = getMetaValue(order, 'second_stage', 'Yes');
                    const copperArea = getMetaValue(order, 'copper_area', '');
                    const internalCutouts = getMetaValue(order, 'internal_cutouts', 'No');

                    const productionNote = getMetaValue(order, 'production_note', '');
                    const customerNote = getMetaValue(order, 'customer_note', getMetaValue(order, 'special_instructions', ''));

                    const singleSideProcesses = [
                        "CUTTING",
                        "DRILL",
                        "DH Print",
                        "Expose/P&E",
                        "Devloping",
                        "ETCHING",
                        "ETCHING QC",
                        "PISM",
                        "HAL",
                        "LP",
                        "Manual Cutting",
                        "V-CUT",
                        "Routing",
                        "Final QC with QTY",
                        "Packing"
                    ];

                    const multiLayerProcesses = [
                        "CUTTING",
                        "DRILL",
                        "DH Print",
                        "Exposing",
                        "DEVLOPING QC",
                        "PLATING",
                        "PLATING QC",
                        "CAUSTIC",
                        "ETCHING",
                        "ETCH QC",
                        "PISM",
                        "HAL",
                        "LP",
                        "ROUT",
                        "V-CUT",
                        "BBT / FPT",
                        "FINAL QC",
                        "Packing"
                    ];

                    const processList = isSingleSide ? singleSideProcesses : multiLayerProcesses;

                    const handlePrint = () => {
                        const printContent = document.getElementById("job-card-printable-content");
                        if (!printContent) return;
                        const printWin = window.open("", "_blank");
                        if (!printWin) {
                            toast.error("Popup blocked! Please allow popups to print/download job cards.");
                            return;
                        }
                        printWin.document.write(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <title>JOB_CARD_${order.order_number}</title>
                                <style>
                                    @page { size: A4 portrait; margin: 5mm; }
                                    body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 5px; color: #000; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                                    * { box-sizing: border-box; }
                                    table { width: 100%; border-collapse: collapse !important; border-spacing: 0; }
                                    td, th { color: #000; font-family: Arial, sans-serif; }
                                    @media print {
                                        body { padding: 0; }
                                    }
                                </style>
                            </head>
                            <body>
                                ${printContent.innerHTML}
                                <script>
                                    window.onload = function() {
                                        window.focus();
                                        setTimeout(function() {
                                            window.print();
                                        }, 300);
                                    };
                                </script>
                            </body>
                            </html>
                        `);
                        printWin.document.close();
                    };

                    const handleDownload = () => {
                        handlePrint();
                    };

                    return (
                        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto border border-slate-300 rounded-2xl p-4 md:p-6 shadow-2xl space-y-4 text-slate-900 bg-slate-50 dark:bg-slate-900 dark:text-slate-100">
                            <DialogHeader className="pb-3 border-b border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between">
                                <div>
                                    <DialogTitle className="text-lg font-extrabold flex items-center gap-2 text-indigo-900 dark:text-indigo-300">
                                        <FileText className="w-5 h-5 text-indigo-600" />
                                        Job Card Preview & Generator
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-slate-500 font-semibold mt-0.5">
                                        Order #{order.order_number} · {order.board_name || 'PCB Order'} ({isSingleSide ? '1-SIDE' : `${layersStr}-Layer`})
                                    </DialogDescription>
                                </div>

                                <div className="flex items-center gap-2.5 mr-6">
                                    <Button
                                        type="button"
                                        onClick={handlePrint}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer h-auto"
                                    >
                                        <Printer className="w-4 h-4" /> Print Job Card
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={handleDownload}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer h-auto"
                                    >
                                        <Download className="w-4 h-4" /> Download PDF
                                    </Button>
                                </div>
                            </DialogHeader>

                            {/* Single Master Table Container Matching PDF Screenshot */}
                            <div className="p-3 bg-white border border-slate-300 rounded-lg shadow-md font-sans text-black overflow-x-auto">
                                <div id="job-card-printable-content" className="text-black bg-white">
                                    <table className="w-full border-collapse border-2 border-black text-xs font-semibold text-black" style={{ borderCollapse: 'collapse', border: '2px solid #000' }}>
                                        <tbody>
                                            {/* Header Row */}
                                            <tr className="border-b-2 border-black">
                                                <td className="p-2 border-r-2 border-black w-1/3 font-black text-sm align-middle" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>
                                                    JOB NO: <span className="font-extrabold text-base underline ml-1">{order.order_number}</span>
                                                </td>
                                                <td className="p-2 border-r-2 border-black w-1/3 text-center align-middle" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>
                                                    {isSingleSide ? (
                                                        <>
                                                            <div className="flex items-center justify-center gap-4 text-xs font-bold mb-0.5">
                                                                <span>Expose <span className="inline-block border border-black px-1 font-mono font-bold">✓</span></span>
                                                                <span>Print & Etch <span className="inline-block border border-black px-1.5 font-mono">&nbsp;</span></span>
                                                            </div>
                                                            <div className="text-xl font-black uppercase tracking-wider underline">JOB CARD</div>
                                                        </>
                                                    ) : (
                                                        <div className="text-xl font-black uppercase tracking-wider underline">JOB CARD</div>
                                                    )}
                                                </td>
                                                <td className="p-2 w-1/3 text-right font-black text-base align-middle" style={{ borderBottom: '2px solid #000' }}>
                                                    {isSingleSide ? "1- SIDE" : `${layersStr}-Layer Board`}
                                                </td>
                                            </tr>

                                            {/* Row 2: Dates */}
                                            <tr className="border-b-2 border-black">
                                                <td className="p-1.5 border-r-2 border-black" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>Order Date: <span className="font-bold ml-1">{createdDate}</span></td>
                                                <td className="p-1.5 border-r-2 border-black" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>Launch Date: <span className="font-bold ml-1">{launchDate}</span></td>
                                                <td className="p-1.5" style={{ borderBottom: '2px solid #000' }}>Shipping Date: <span className="font-bold ml-1">{shippingDate}</span></td>
                                            </tr>

                                            {/* Row 3: Quantities & Min Hole */}
                                            <tr className="border-b-2 border-black">
                                                <td className="p-1.5 border-r-2 border-black" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>ORDER QTY: <span className="font-bold ml-1">{orderQty}</span></td>
                                                <td className="p-1.5 border-r-2 border-black" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>LAUNCHED: <span className="font-bold ml-1">{launchedQty}</span></td>
                                                <td className="p-0" style={{ borderBottom: '2px solid #000' }}>
                                                    <table className="w-full border-collapse" style={{ borderCollapse: 'collapse' }}>
                                                        <tbody>
                                                            <tr>
                                                                <td className="p-1.5 border-r-2 border-black w-1/3" style={{ borderRight: '2px solid #000' }}>UPS: <span className="font-bold ml-1">{ups}</span></td>
                                                                <td className="p-1.5 border-r-2 border-black w-1/3" style={{ borderRight: '2px solid #000' }}>PANELS: <span className="font-bold ml-1">{panels}</span></td>
                                                                <td className="p-1.5 w-1/3">Min.Hole: <span className="font-bold ml-1">{minHole}</span></td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>

                                            {/* Row 4: Panel & Cutting Size */}
                                            <tr className="border-b-2 border-black">
                                                <td colSpan={2} className="p-1.5 border-r-2 border-black" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>PANEL SIZE: <span className="font-bold ml-1">{panelSize ? `${panelSize} MM` : 'MM'}</span></td>
                                                <td className="p-1.5" style={{ borderBottom: '2px solid #000' }}>CUTTING SIZE: <span className="font-bold ml-1">{cuttingSize ? `${cuttingSize} MM` : 'MM'}</span></td>
                                            </tr>

                                            {/* Row 5: Material, Thickness, Copper, Finish */}
                                            <tr className="border-b-2 border-black">
                                                <td className="p-1.5 border-r-2 border-black" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>Material: <span className="font-bold ml-1">{material}</span></td>
                                                <td className="p-1.5 border-r-2 border-black" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>Thick: <span className="font-bold ml-1">{thickness} MM</span></td>
                                                <td className="p-0" style={{ borderBottom: '2px solid #000' }}>
                                                    <table className="w-full border-collapse" style={{ borderCollapse: 'collapse' }}>
                                                        <tbody>
                                                            <tr>
                                                                <td className="p-1.5 border-r-2 border-black w-1/2" style={{ borderRight: '2px solid #000' }}>Copper Thick: <span className="font-bold ml-1">{copperThickness} Micron</span></td>
                                                                <td className="p-1.5 w-1/2">Finish: <span className="font-bold ml-1">{surfaceFinish}</span></td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>

                                            {/* Row 6: Mask Colour, LP Color, LP Side */}
                                            <tr className="border-b-2 border-black">
                                                <td className="p-1.5 border-r-2 border-black" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>Mask Colour: <span className="font-bold ml-1">{maskColour}</span></td>
                                                <td className="p-1.5 border-r-2 border-black" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>LP Color: <span className="font-bold ml-1">{lpColor}</span></td>
                                                <td className="p-1.5" style={{ borderBottom: '2px solid #000' }}>LP Side: <span className="font-bold ml-1">{lpSide}</span></td>
                                            </tr>

                                            {/* Row 7: Routing / V-Cut / FPT / Stage / Cutouts */}
                                            <tr className="border-b-2 border-black">
                                                {isSingleSide ? (
                                                    <>
                                                        <td className="p-1.5 border-r-2 border-black" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>Route: <span className="font-bold ml-1">{route}</span></td>
                                                        <td className="p-1.5 border-r-2 border-black" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>V-Cut: <span className="font-bold ml-1">{vCut}</span></td>
                                                        <td className="p-0" style={{ borderBottom: '2px solid #000' }}>
                                                            <table className="w-full border-collapse" style={{ borderCollapse: 'collapse' }}>
                                                                <tbody>
                                                                    <tr>
                                                                        <td className="p-1.5 border-r-2 border-black w-1/2" style={{ borderRight: '2px solid #000' }}>Shearing Cut: <span className="font-bold ml-1">Yes</span></td>
                                                                        <td className="p-1.5 w-1/2">Internal Cutouts Reqd.?: <span className="font-bold ml-1">{internalCutouts}</span></td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="p-1.5 border-r-2 border-black" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>Route: <span className="font-bold ml-1">{route}</span></td>
                                                        <td className="p-1.5 border-r-2 border-black" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>V-Cut: <span className="font-bold ml-1">{vCut}</span></td>
                                                        <td className="p-0" style={{ borderBottom: '2px solid #000' }}>
                                                            <table className="w-full border-collapse" style={{ borderCollapse: 'collapse' }}>
                                                                <tbody>
                                                                    <tr style={{ borderBottom: '2px solid #000' }}>
                                                                        <td className="p-1.5 border-r-2 border-black w-1/2" style={{ borderRight: '2px solid #000' }}>FPT Program: <span className="font-bold ml-1">{fptProgram}</span></td>
                                                                        <td className="p-1.5 w-1/2">2<sup>nd</sup> stage reqd.?: <span className="font-bold ml-1">{secondStage}</span></td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td className="p-1.5 border-r-2 border-black w-1/2" style={{ borderRight: '2px solid #000' }}>Copper Area: <span className="font-bold ml-1">{copperArea ? `${copperArea} Amp` : 'Amp'}</span></td>
                                                                        <td className="p-1.5 w-1/2">Internal Cutouts Reqd.?: <span className="font-bold ml-1">{internalCutouts}</span></td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>

                                            {/* Row 8: Notes Section */}
                                            <tr className="border-b-2 border-black">
                                                <td colSpan={2} className="p-2 border-r-2 border-black align-top h-20" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>
                                                    <div className="font-black text-xs underline mb-1">Production Note:</div>
                                                    <div className="text-[11px] font-medium leading-relaxed pl-2 whitespace-pre-wrap">
                                                        {productionNote ? productionNote : "• \n• "}
                                                    </div>
                                                </td>
                                                <td className="p-2 align-top h-20" style={{ borderBottom: '2px solid #000' }}>
                                                    <div className="font-black text-xs underline mb-1">Customer Special Note:</div>
                                                    <div className="text-[11px] font-medium leading-relaxed pl-2 whitespace-pre-wrap">
                                                        {customerNote ? customerNote : ""}
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Row 9: Final Quantities Header & Blank Row */}
                                            <tr className="border-b-2 border-black">
                                                <td colSpan={3} className="p-0" style={{ borderBottom: '2px solid #000' }}>
                                                    <table className="w-full border-collapse text-center" style={{ borderCollapse: 'collapse' }}>
                                                        <thead>
                                                            <tr className="border-b-2 border-black font-bold">
                                                                <th className="p-1.5 border-r-2 border-black w-1/4 font-bold text-xs" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>Final Panel Qty.</th>
                                                                <th className="p-1.5 border-r-2 border-black w-1/4 font-bold text-xs" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>Final Board Qty.</th>
                                                                <th className="p-1.5 border-r-2 border-black w-1/4 font-bold text-xs" style={{ borderRight: '2px solid #000', borderBottom: '2px solid #000' }}>Rejected Board Qty.</th>
                                                                <th className="p-1.5 w-1/4 font-bold text-xs" style={{ borderBottom: '2px solid #000' }}>Why Rejected?</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr className="h-7">
                                                                <td className="p-1 border-r-2 border-black" style={{ borderRight: '2px solid #000' }}></td>
                                                                <td className="p-1 border-r-2 border-black" style={{ borderRight: '2px solid #000' }}></td>
                                                                <td className="p-1 border-r-2 border-black" style={{ borderRight: '2px solid #000' }}></td>
                                                                <td className="p-1"></td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>

                                            {/* Row 10: Process Table Header & Rows */}
                                            <tr>
                                                <td colSpan={3} className="p-0">
                                                    <table className="w-full border-collapse text-xs" style={{ borderCollapse: 'collapse' }}>
                                                        <thead>
                                                            <tr className="border-b-2 border-black font-black uppercase text-[10px] text-center" style={{ borderBottom: '2px solid #000' }}>
                                                                <th className="p-1.5 border-r-2 border-black text-left font-black w-1/4 pl-3" style={{ borderRight: '2px solid #000' }}>PROCESS</th>
                                                                <th className="p-1.5 border-r-2 border-black text-center font-black w-12" style={{ borderRight: '2px solid #000' }}>IN</th>
                                                                <th className="p-1.5 border-r-2 border-black text-center font-black" style={{ borderRight: '2px solid #000' }}>PANEL QTY</th>
                                                                <th className="p-1.5 border-r-2 border-black text-center font-black w-12" style={{ borderRight: '2px solid #000' }}>OUT</th>
                                                                <th className="p-1.5 border-r-1.5 border-black text-center font-black" style={{ borderRight: '2px solid #000' }}>PANEL QTY</th>
                                                                <th className="p-1.5 border-r-2 border-black text-center font-black w-14" style={{ borderRight: '2px solid #000' }}>Q.C</th>
                                                                <th className="p-1.5 border-r-2 border-black text-center font-black w-20" style={{ borderRight: '2px solid #000' }}>SIGN</th>
                                                                <th className="p-1.5 text-center font-black">REMARK</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {processList.map((proc, idx) => (
                                                                <tr key={idx} className="border-b border-black h-5.5 text-[10px]" style={{ borderBottom: idx === processList.length - 1 ? 'none' : '1px solid #000' }}>
                                                                    <td className="p-1 border-r-2 border-black font-black text-left pl-3 uppercase" style={{ borderRight: '2px solid #000' }}>{proc}</td>
                                                                    <td className="p-1 border-r-2 border-black text-center" style={{ borderRight: '2px solid #000' }}></td>
                                                                    <td className="p-1 border-r-2 border-black text-center" style={{ borderRight: '2px solid #000' }}></td>
                                                                    <td className="p-1 border-r-2 border-black text-center" style={{ borderRight: '2px solid #000' }}></td>
                                                                    <td className="p-1 border-r-2 border-black text-center" style={{ borderRight: '2px solid #000' }}></td>
                                                                    <td className="p-1 border-r-2 border-black text-center" style={{ borderRight: '2px solid #000' }}></td>
                                                                    <td className="p-1 border-r-2 border-black text-center" style={{ borderRight: '2px solid #000' }}></td>
                                                                    <td className="p-1 text-center"></td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </DialogContent>
                    );
                })()}
            </Dialog>

            {/* Reorder Confirmation & Customization Dialog */}
            <Dialog open={!!reorderModalOrder} onOpenChange={(open) => !open && setReorderModalOrder(null)}>
                <DialogContent className="max-w-md rounded-2xl p-6 shadow-2xl bg-card border-border/80">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-black text-foreground">
                            <Copy className="w-5 h-5 text-blue-600" />
                            Place Reorder
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground pt-1 font-medium">
                            Customize order quantity and delivery date for this reorder. All stage quantities (Completed, Failed, Launch, etc.) will reset to 0.
                        </DialogDescription>
                    </DialogHeader>

                    {reorderModalOrder && (() => {
                        const custName = reorderModalOrder.customer_name
                            || getMetaValue(reorderModalOrder, 'customer_name', getMetaValue(reorderModalOrder, 'name', ''))
                            || reorderModalOrder.user_email
                            || reorderModalOrder.user_mobile
                            || 'N/A';
                        const unitPrice = Number(reorderModalOrder.unit_price || 0);
                        const estOrderValue = unitPrice > 0 ? unitPrice * reorderQty : Number(reorderModalOrder.order_value || 0);

                        return (
                            <form onSubmit={handleReorderSubmit} className="space-y-4 py-2">
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-border/60 space-y-1.5 text-xs font-medium">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground font-semibold">Original Order #:</span>
                                        <span className="font-mono font-bold text-foreground">#{reorderModalOrder.order_number}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground font-semibold">Customer:</span>
                                        <span className="font-bold text-foreground">{custName}</span>
                                    </div>
                                    {reorderModalOrder.board_name && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground font-semibold">Board Name:</span>
                                            <span className="font-bold text-foreground truncate max-w-[200px]">{reorderModalOrder.board_name}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-foreground block mb-1">
                                            Order Quantity (Pcs) <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={reorderQty}
                                            onChange={(e) => setReorderQty(Math.max(1, parseInt(e.target.value) || 0))}
                                            className="w-full h-10 text-xs font-bold rounded-xl border border-input bg-background"
                                            placeholder="Enter order quantity..."
                                            required
                                        />
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            Default is original order quantity ({reorderModalOrder.order_qty || getMetaValue(reorderModalOrder, 'quantity', '1')} Pcs). Production stage quantities will default to 0.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-foreground block mb-1">
                                            Delivery Date Option
                                        </label>
                                        <Input
                                            type="date"
                                            value={reorderDeliveryDate}
                                            onChange={(e) => setReorderDeliveryDate(e.target.value)}
                                            className="w-full h-10 text-xs font-bold rounded-xl border border-input bg-background"
                                        />
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            Optionally select a target delivery date for this reorder.
                                        </p>
                                    </div>

                                    {estOrderValue > 0 && (
                                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex justify-between items-center text-xs">
                                            <span className="font-bold text-emerald-800 dark:text-emerald-300">Estimated Order Value:</span>
                                            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                                ₹{estOrderValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <DialogFooter className="flex items-center justify-end gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setReorderModalOrder(null)}
                                        disabled={reordering}
                                        className="rounded-xl text-xs font-bold cursor-pointer"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={reordering}
                                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-2 cursor-pointer"
                                    >
                                        {reordering ? (
                                            <>
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                Placing Order...
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3.5 h-3.5" />
                                                Place Reorder
                                            </>
                                        )}
                                    </Button>
                                </DialogFooter>
                            </form>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            {/* Manufacturer Excel Import Modal */}
            <Dialog open={importModalOpen} onOpenChange={(open) => {
                if (!open && (importingPreview || executingImport)) return;
                setImportModalOpen(open);
                if (!open) {
                    setImportFile(null);
                    setImportPreviewData(null);
                }
            }}>
                <DialogContent className="sm:max-w-7xl w-[95vw] max-h-[92vh] overflow-y-auto bg-card border-border/80 rounded-2xl shadow-2xl p-6 text-foreground">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                            Import PCB Orders from Manufacturer Excel
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Upload a manufacturer Excel file (.xlsx, .xls) matching the standard 19-column layout.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Sample Sheet Download Banner */}
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="space-y-0.5 text-left">
                                <h4 className="text-xs font-black text-foreground">Import PCB Data</h4>
                                <p className="text-[11px] text-muted-foreground">
                                    Download the sample file, fill in your PCB manufacturing data, and upload it below.
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleDownloadSampleSheet}
                                className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs gap-1.5 cursor-pointer h-9"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Download Sample Sheet
                            </Button>
                        </div>

                        {/* File Upload Zone */}
                        <div className="border-2 border-dashed border-border/80 hover:border-emerald-500/50 rounded-2xl p-6 text-center transition-all bg-muted/20">
                            <input
                                type="file"
                                id="excel-file-input"
                                accept=".xlsx, .xls"
                                className="hidden"
                                onChange={(e) => {
                                    const selected = e.target.files?.[0];
                                    if (selected) {
                                        setImportFile(selected);
                                        setImportPreviewData(null);
                                        handlePreviewImport(selected);
                                    }
                                }}
                            />
                            <label htmlFor="excel-file-input" className="cursor-pointer flex flex-col items-center justify-center gap-2">
                                <Upload className="w-8 h-8 text-emerald-500" />
                                <span className="text-xs font-bold text-foreground">
                                    {importFile ? importFile.name : "Click to choose or drop manufacturer Excel file"}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-medium">
                                    Supported formats: .xlsx, .xls (max 50MB)
                                </span>
                            </label>
                        </div>

                        {importingPreview && (
                            <div className="flex items-center justify-center gap-2 py-4 text-xs font-bold text-emerald-500">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Parsing headers & validating data rows...
                            </div>
                        )}

                        {/* Import Preview Results */}
                        {importPreviewData && importPreviewData.summary && (
                            <div className="space-y-4">
                                {/* Summary Badge Cards */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
                                    <div className="bg-blue-500/10 border border-blue-500/20 p-2 rounded-xl">
                                        <div className="text-[9px] font-extrabold text-blue-500 uppercase">Total Rows</div>
                                        <div className="text-sm font-black text-foreground">{importPreviewData.summary.total_rows}</div>
                                    </div>
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl">
                                        <div className="text-[9px] font-extrabold text-emerald-500 uppercase">Valid Rows</div>
                                        <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">{importPreviewData.summary.valid_rows}</div>
                                    </div>
                                    <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl">
                                        <div className="text-[9px] font-extrabold text-rose-500 uppercase">Invalid Rows</div>
                                        <div className="text-sm font-black text-rose-500">{importPreviewData.summary.invalid_rows}</div>
                                    </div>
                                    <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl">
                                        <div className="text-[9px] font-extrabold text-amber-500 uppercase">Duplicates</div>
                                        <div className="text-sm font-black text-amber-500">{importPreviewData.summary.duplicate_rows}</div>
                                    </div>
                                    <div className="bg-indigo-500/10 border border-indigo-500/20 p-2 rounded-xl">
                                        <div className="text-[9px] font-extrabold text-indigo-500 uppercase">Existing Cust.</div>
                                        <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">{importPreviewData.summary.existing_customers_used ?? 0}</div>
                                    </div>
                                    <div className="bg-purple-500/10 border border-purple-500/20 p-2 rounded-xl">
                                        <div className="text-[9px] font-extrabold text-purple-500 uppercase">New Cust.</div>
                                        <div className="text-sm font-black text-purple-600 dark:text-purple-400">{importPreviewData.summary.new_customers_created ?? 0}</div>
                                    </div>
                                </div>

                                {/* Duplicate Handling Radio Selection */}
                                <div className="bg-muted/30 border border-border/60 p-3 rounded-xl space-y-2">
                                    <label className="text-xs font-extrabold text-foreground uppercase tracking-wider block">
                                        Duplicate Record Behavior:
                                    </label>
                                    <div className="flex flex-col sm:flex-row gap-3 text-xs font-bold text-foreground">
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="dupAction"
                                                value="skip"
                                                checked={importDuplicateAction === 'skip'}
                                                onChange={() => setImportDuplicateAction('skip')}
                                                className="accent-emerald-500"
                                            />
                                            Skip existing duplicates
                                        </label>
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="dupAction"
                                                value="update"
                                                checked={importDuplicateAction === 'update'}
                                                onChange={() => setImportDuplicateAction('update')}
                                                className="accent-emerald-500"
                                            />
                                            Update existing records
                                        </label>
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="dupAction"
                                                value="create_new"
                                                checked={importDuplicateAction === 'create_new'}
                                                onChange={() => setImportDuplicateAction('create_new')}
                                                className="accent-emerald-500"
                                            />
                                            Import all as new orders
                                        </label>
                                    </div>
                                </div>

                                {/* Customer Resolution & All Preview Rows Table */}
                                {importPreviewData.preview_items && importPreviewData.preview_items.length > 0 && (
                                    <div className="space-y-1.5">
                                        <div className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <User className="w-3.5 h-3.5 text-emerald-500" />
                                                Customer Resolution & Preview (All {importPreviewData.preview_items.length} Rows Data)
                                            </div>
                                            <span className="text-[10px] text-muted-foreground font-semibold">
                                                Showing {importPreviewData.preview_items.length} of {importPreviewData.summary?.total_rows ?? importPreviewData.preview_items.length} total rows
                                            </span>
                                        </div>
                                        <div className="max-h-[500px] overflow-y-auto border border-border/80 rounded-xl bg-card text-xs">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-muted/80 backdrop-blur-xs text-[10px] font-extrabold uppercase text-muted-foreground border-b border-border/80 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="p-2.5 pl-3">Row</th>
                                                        <th className="p-2.5">Customer Name</th>
                                                        <th className="p-2.5">P/N (Part Name)</th>
                                                        <th className="p-2.5">Qty</th>
                                                        <th className="p-2.5">Order Date</th>
                                                        <th className="p-2.5">Launch Date</th>
                                                        <th className="p-2.5">Delivery Date</th>
                                                        <th className="p-2.5">Record Type</th>
                                                        <th className="p-2.5 text-center">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/60 font-medium">
                                                    {importPreviewData.preview_items.map((item: any, idx: number) => (
                                                        <tr key={idx} className="hover:bg-muted/30">
                                                            <td className="p-2.5 pl-3 font-mono font-bold text-muted-foreground">#{item.row_number}</td>
                                                            <td className="p-2.5 font-bold text-foreground">{item.customer_name || 'N/A'}</td>
                                                            <td className="p-2.5 font-mono text-[11px] font-bold">{item.p_n || 'N/A'}</td>
                                                            <td className="p-2.5 font-mono text-[11px]">{item.quantity ? `${item.quantity} pcs` : '-'}</td>
                                                            <td className="p-2.5 text-[11px] whitespace-nowrap">{item.order_date || '-'}</td>
                                                            <td className="p-2.5 text-[11px] whitespace-nowrap">{item.launch_date || '-'}</td>
                                                            <td className="p-2.5 text-[11px] whitespace-nowrap">{item.delivery_date || '-'}</td>
                                                            <td className="p-2.5">
                                                                {item.is_duplicate ? (
                                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                                        Duplicate ({item.matched_order_number || 'Tool Match'})
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                                        New Record
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="p-2.5 text-center font-bold">
                                                                {item.is_valid ? (
                                                                    <span className="text-emerald-500 flex items-center justify-center gap-1 text-[11px]">
                                                                        <CheckCircle className="w-3.5 h-3.5" /> Valid
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-rose-500 flex items-center justify-center gap-1 text-[11px]">
                                                                        <AlertTriangle className="w-3.5 h-3.5" /> Error
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Validation Error List Preview */}
                                {importPreviewData.invalid_rows && importPreviewData.invalid_rows.length > 0 && (
                                    <div className="space-y-1.5">
                                        <div className="text-xs font-extrabold text-rose-500 flex items-center gap-1.5">
                                            <AlertTriangle className="w-4 h-4" />
                                            Invalid Rows Summary ({importPreviewData.invalid_rows.length} rows will be skipped):
                                        </div>
                                        <div className="max-h-36 overflow-y-auto border border-rose-500/20 bg-rose-500/5 rounded-xl p-3 text-[11px] space-y-1">
                                            {importPreviewData.invalid_rows.map((inv: any, i: number) => (
                                                <div key={i} className="flex gap-2">
                                                    <span className="font-bold text-rose-500 shrink-0">Row {inv.row}:</span>
                                                    <span className="text-muted-foreground">
                                                        {Object.entries(inv.errors || {}).map(([col, err]) => `${col}: ${err}`).join(" | ")}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {/* Background Import Operations & History */}
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-emerald-500" />
                                    Recent Background Imports ({importHistory.length})
                                </h4>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={fetchImportHistory}
                                    className="h-7 text-[11px] font-bold text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
                                >
                                    <RefreshCw className={`w-3 h-3 ${importHistoryLoading ? 'animate-spin' : ''}`} />
                                    Refresh Status
                                </Button>
                            </div>

                            {importHistory.length === 0 ? (
                                <div className="text-center py-6 border border-dashed border-border/60 rounded-xl text-xs text-muted-foreground">
                                    No background imports recorded yet. Upload a file above to start.
                                </div>
                            ) : (
                                <div className="max-h-60 overflow-y-auto border border-border/80 rounded-xl bg-card text-xs">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-muted/60 text-[10px] font-extrabold uppercase text-muted-foreground border-b border-border/80 sticky top-0 bg-muted/80 backdrop-blur-xs">
                                            <tr>
                                                <th className="p-2.5 pl-3">File Name</th>
                                                <th className="p-2.5">Status</th>
                                                <th className="p-2.5">Progress</th>
                                                <th className="p-2.5">Records</th>
                                                <th className="p-2.5 text-right pr-3">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/60 font-medium">
                                            {importHistory.map((imp: any) => {
                                                const pct = imp.total_rows > 0 ? Math.min(100, Math.round((imp.processed_rows / imp.total_rows) * 100)) : 0;
                                                return (
                                                    <tr key={imp.id} className="hover:bg-muted/30">
                                                        <td className="p-2.5 pl-3">
                                                            <div className="font-bold text-foreground text-xs truncate max-w-[160px]">{imp.original_file_name}</div>
                                                            <div className="text-[10px] text-muted-foreground">{formatDate(imp.created_at)}</div>
                                                        </td>
                                                        <td className="p-2.5">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold capitalize inline-flex items-center gap-1 ${imp.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                                                                imp.status === 'processing' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 animate-pulse' :
                                                                    imp.status === 'queued' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' :
                                                                        imp.status === 'failed' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                                                                            'bg-muted text-muted-foreground'
                                                                }`}>
                                                                {imp.status === 'processing' && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
                                                                {imp.status}
                                                            </span>
                                                        </td>
                                                        <td className="p-2.5">
                                                            <div className="w-28 space-y-1">
                                                                <div className="flex justify-between text-[10px] font-bold">
                                                                    <span>{imp.processed_rows} / {imp.total_rows}</span>
                                                                    <span>{pct}%</span>
                                                                </div>
                                                                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full transition-all duration-300 ${imp.status === 'completed' ? 'bg-emerald-500' :
                                                                            imp.status === 'failed' ? 'bg-rose-500' : 'bg-blue-500'
                                                                            }`}
                                                                        style={{ width: `${pct}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-2.5 text-[11px]">
                                                            <span className="text-emerald-600 font-bold">{imp.successful_rows || 0} OK</span>
                                                            {imp.failed_rows > 0 && <span className="text-rose-500 font-bold ml-1.5">{imp.failed_rows} Failed</span>}
                                                        </td>
                                                        <td className="p-2.5 text-right pr-3">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => fetchImportDetail(imp.id)}
                                                                    className="h-7 text-[11px] font-bold px-2 cursor-pointer"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5 text-blue-500" />
                                                                </Button>
                                                                {imp.status === 'failed' && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleRetryImport(imp.id)}
                                                                        className="h-7 text-[11px] font-bold text-amber-500 hover:text-amber-600 px-2 cursor-pointer"
                                                                        title="Retry Import"
                                                                    >
                                                                        <RefreshCw className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                )}
                                                                {imp.status === 'queued' && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleCancelImport(imp.id)}
                                                                        className="h-7 text-[11px] font-bold text-rose-500 hover:text-rose-600 px-2 cursor-pointer"
                                                                        title="Cancel Queue"
                                                                    >
                                                                        <X className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="flex items-center justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setImportModalOpen(false);
                                setImportFile(null);
                                setImportPreviewData(null);
                            }}
                            disabled={executingImport}
                            className="rounded-xl text-xs font-bold cursor-pointer"
                        >
                            Close
                        </Button>
                        <Button
                            type="button"
                            onClick={handleExecuteImport}
                            disabled={!importFile || !importPreviewData || importPreviewData.summary?.valid_rows === 0 || executingImport}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-2 cursor-pointer shadow-xs"
                        >
                            {executingImport ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    Queueing Import...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-3.5 h-3.5" />
                                    Upload & Queue Import
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Import Detail & Error Log Dialog */}
            <Dialog open={importDetailOpen} onOpenChange={(open) => setImportDetailOpen(open)}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-card border-border/80 rounded-2xl shadow-xl p-6 text-foreground">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                            Import #{selectedImportDetail?.id} — {selectedImportDetail?.original_file_name}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Complete background processing lifecycle and row validation results.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedImportDetail && (
                        <div className="space-y-4 py-2 text-xs">
                            {/* Stats Summary */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                                <div className="bg-muted/40 p-2.5 rounded-xl border border-border/60">
                                    <div className="text-[10px] font-extrabold text-muted-foreground uppercase">Status</div>
                                    <div className="text-sm font-black capitalize text-foreground">{selectedImportDetail.status}</div>
                                </div>
                                <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                                    <div className="text-[10px] font-extrabold text-emerald-500 uppercase">Successful Rows</div>
                                    <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">{selectedImportDetail.successful_rows} / {selectedImportDetail.total_rows}</div>
                                </div>
                                <div className="bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                                    <div className="text-[10px] font-extrabold text-rose-500 uppercase">Failed Rows</div>
                                    <div className="text-sm font-black text-rose-500">{selectedImportDetail.failed_rows}</div>
                                </div>
                                <div className="bg-purple-500/10 p-2.5 rounded-xl border border-purple-500/20">
                                    <div className="text-[10px] font-extrabold text-purple-500 uppercase">New Customers</div>
                                    <div className="text-sm font-black text-purple-600 dark:text-purple-400">{selectedImportDetail.new_customers}</div>
                                </div>
                            </div>

                            {selectedImportDetail.error_message && (
                                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-rose-500 space-y-1">
                                    <div className="font-bold flex items-center gap-1.5 text-xs">
                                        <AlertTriangle className="w-4 h-4" /> Global Error:
                                    </div>
                                    <div className="text-[11px] font-mono">{selectedImportDetail.error_message}</div>
                                </div>
                            )}

                            {/* Error Log Table */}
                            <div className="space-y-1.5">
                                <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                                    Row Validation Error Logs ({selectedImportDetail.errors?.length || 0})
                                </h4>
                                {selectedImportDetail.errors && selectedImportDetail.errors.length > 0 ? (
                                    <div className="max-h-60 overflow-y-auto border border-border/80 rounded-xl bg-card">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead className="bg-muted/60 text-[10px] font-extrabold uppercase text-muted-foreground border-b border-border/80 sticky top-0 bg-muted/80 backdrop-blur-xs">
                                                <tr>
                                                    <th className="p-2 pl-3">Row</th>
                                                    <th className="p-2">Column</th>
                                                    <th className="p-2">Value</th>
                                                    <th className="p-2">Error Message</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/60 font-medium">
                                                {selectedImportDetail.errors.map((err: any) => (
                                                    <tr key={err.id} className="hover:bg-muted/30">
                                                        <td className="p-2 pl-3 font-mono font-bold text-muted-foreground">#{err.row_number}</td>
                                                        <td className="p-2 font-bold text-foreground">{err.column_name || 'N/A'}</td>
                                                        <td className="p-2 font-mono text-[11px] text-muted-foreground">{err.value || 'N/A'}</td>
                                                        <td className="p-2 text-rose-500 font-medium">{err.error_message}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-xs text-muted-foreground border border-dashed border-border/60 rounded-xl">
                                        No row errors logged for this import.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setImportDetailOpen(false)}
                            className="rounded-xl text-xs font-bold cursor-pointer"
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Export PCB Data Modal */}
            <Dialog open={exportModalOpen} onOpenChange={(open) => setExportModalOpen(open)}>
                <DialogContent className="sm:max-w-7xl w-[95vw] max-h-[92vh] overflow-y-auto bg-card border-border/80 rounded-2xl shadow-2xl p-6 text-foreground">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black flex items-center gap-2">
                            <Download className="w-5 h-5 text-emerald-500" />
                            Export PCB Data
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Define filter criteria, preview matching PCB records, and select export format (XLSX / CSV).
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-2">
                        {/* Filters Form Card */}
                        <div className="bg-muted/30 border border-border/60 p-4 rounded-2xl space-y-4">
                            <div className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border/50 pb-2">
                                <Search className="w-3.5 h-3.5 text-emerald-500" />
                                Export Filters
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                                {/* Date Type Selector */}
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Date Field</label>
                                    <Select value={exportDateField} onValueChange={setExportDateField}>
                                        <SelectTrigger className="h-9 text-xs rounded-xl border-border/80 bg-card">
                                            <SelectValue placeholder="Date Field" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="created_at">Order Date</SelectItem>
                                            <SelectItem value="launch_date">Launch Date</SelectItem>
                                            <SelectItem value="delivery_date">Delivery Date</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* From Date */}
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">From Date</label>
                                    <Input
                                        type="date"
                                        value={exportStartDate}
                                        onChange={(e) => setExportStartDate(e.target.value)}
                                        className="h-9 text-xs rounded-xl border-border/80 bg-card"
                                    />
                                </div>

                                {/* To Date */}
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">To Date</label>
                                    <Input
                                        type="date"
                                        value={exportEndDate}
                                        onChange={(e) => setExportEndDate(e.target.value)}
                                        className="h-9 text-xs rounded-xl border-border/80 bg-card"
                                    />
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Status</label>
                                    <Select value={exportStatus} onValueChange={setExportStatus}>
                                        <SelectTrigger className="h-9 text-xs rounded-xl border-border/80 bg-card">
                                            <SelectValue placeholder="All Statuses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="All">All Statuses</SelectItem>
                                            {statuses.map((st) => (
                                                <SelectItem key={st.id} value={st.slug || st.name}>
                                                    {st.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Customer */}
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Customer Name</label>
                                    <Input
                                        type="text"
                                        placeholder="All Customers"
                                        value={exportCustomer}
                                        onChange={(e) => setExportCustomer(e.target.value)}
                                        className="h-9 text-xs rounded-xl border-border/80 bg-card"
                                    />
                                </div>

                                {/* Layer */}
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Layer</label>
                                    <Select value={exportLayer} onValueChange={setExportLayer}>
                                        <SelectTrigger className="h-9 text-xs rounded-xl border-border/80 bg-card">
                                            <SelectValue placeholder="All Layers" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="All">All Layers</SelectItem>
                                            <SelectItem value="1">1 Layer</SelectItem>
                                            <SelectItem value="2">2 Layer</SelectItem>
                                            <SelectItem value="4">4 Layer</SelectItem>
                                            <SelectItem value="6">6 Layer</SelectItem>
                                            <SelectItem value="8">8 Layer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Mask */}
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Mask Colour</label>
                                    <Select value={exportMask} onValueChange={setExportMask}>
                                        <SelectTrigger className="h-9 text-xs rounded-xl border-border/80 bg-card">
                                            <SelectValue placeholder="All Masks" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="All">All Masks</SelectItem>
                                            <SelectItem value="Green">Green</SelectItem>
                                            <SelectItem value="Red">Red</SelectItem>
                                            <SelectItem value="Blue">Blue</SelectItem>
                                            <SelectItem value="Black">Black</SelectItem>
                                            <SelectItem value="White">White</SelectItem>
                                            <SelectItem value="Yellow">Yellow</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* C/G */}
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">C/G</label>
                                    <Select value={exportCg} onValueChange={setExportCg}>
                                        <SelectTrigger className="h-9 text-xs rounded-xl border-border/80 bg-card">
                                            <SelectValue placeholder="All C/G" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="All">All</SelectItem>
                                            <SelectItem value="Cash">Cash</SelectItem>
                                            <SelectItem value="GST">GST</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Part Number (P/N) */}
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">P/N (Part Number)</label>
                                    <Input
                                        type="text"
                                        placeholder="Search Part Number"
                                        value={exportPn}
                                        onChange={(e) => setExportPn(e.target.value)}
                                        className="h-9 text-xs rounded-xl border-border/80 bg-card"
                                    />
                                </div>

                                {/* Quote # (Q# No.) */}
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Q# No. (Quote Number)</label>
                                    <Input
                                        type="text"
                                        placeholder="Search Quote Number"
                                        value={exportQuoteNo}
                                        onChange={(e) => setExportQuoteNo(e.target.value)}
                                        className="h-9 text-xs rounded-xl border-border/80 bg-card"
                                    />
                                </div>

                                {/* Tool */}
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Tool</label>
                                    <Input
                                        type="text"
                                        placeholder="All Tools"
                                        value={exportTool}
                                        onChange={(e) => setExportTool(e.target.value)}
                                        className="h-9 text-xs rounded-xl border-border/80 bg-card"
                                    />
                                </div>

                                {/* Bill Number */}
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Bill Number</label>
                                    <Input
                                        type="text"
                                        placeholder="Search Bill Number"
                                        value={exportBillNo}
                                        onChange={(e) => setExportBillNo(e.target.value)}
                                        className="h-9 text-xs rounded-xl border-border/80 bg-card"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        handleResetExportFilters();
                                        fetchExportPreview(1);
                                    }}
                                    className="rounded-xl text-xs font-bold h-8 px-3 cursor-pointer"
                                >
                                    Reset Filters
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => fetchExportPreview(1)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-8 px-4 gap-1.5 cursor-pointer"
                                >
                                    <Search className="w-3.5 h-3.5" />
                                    Apply Filters
                                </Button>
                            </div>
                        </div>

                        {/* Filter Preview Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                                    Preview
                                    <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold lowercase">
                                        {exportPreviewLoading ? "counting..." : `${exportPreviewData?.total_count ?? exportPreviewData?.total ?? exportPreviewData?.data?.length ?? 0} records found`}
                                    </span>
                                </div>
                                {exportPreviewData && (exportPreviewData.last_page > 1 || (exportPreviewData.total_pages && exportPreviewData.total_pages > 1)) && (
                                    <div className="flex items-center gap-1.5 text-xs">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={exportPreviewPage <= 1 || exportPreviewLoading}
                                            onClick={() => fetchExportPreview(exportPreviewPage - 1)}
                                            className="h-7 w-7 p-0 rounded-lg cursor-pointer"
                                        >
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                        </Button>
                                        <span className="text-[11px] font-bold text-muted-foreground">
                                            Page {exportPreviewPage} of {exportPreviewData.last_page ?? exportPreviewData.total_pages ?? 1}
                                        </span>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={exportPreviewPage >= (exportPreviewData.last_page ?? exportPreviewData.total_pages ?? 1) || exportPreviewLoading}
                                            onClick={() => fetchExportPreview(exportPreviewPage + 1)}
                                            className="h-7 w-7 p-0 rounded-lg cursor-pointer"
                                        >
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Preview Table */}
                            <div className="border border-border/80 rounded-2xl overflow-hidden bg-card text-xs">
                                {exportPreviewLoading ? (
                                    <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                                        Loading filter preview...
                                    </div>
                                ) : exportPreviewData && exportPreviewData.data && exportPreviewData.data.length > 0 ? (
                                    <div className="max-h-[500px] overflow-y-auto overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-muted/80 backdrop-blur-xs text-[10px] font-extrabold uppercase text-muted-foreground border-b border-border/80 sticky top-0 z-10">
                                                <tr>
                                                    <th className="p-2.5 pl-4">Order Date</th>
                                                    <th className="p-2.5">Q# No.</th>
                                                    <th className="p-2.5">Customer</th>
                                                    <th className="p-2.5">P/N</th>
                                                    <th className="p-2.5 text-center">Layer</th>
                                                    <th className="p-2.5 text-center">Qty</th>
                                                    <th className="p-2.5 text-center">Final Qty</th>
                                                    <th className="p-2.5 text-center">Status</th>
                                                    <th className="p-2.5 pr-4">Bill #</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/60 text-xs font-medium">
                                                {exportPreviewData.data.map((row: any) => (
                                                    <tr key={row.id} className="hover:bg-muted/30 transition-all">
                                                        <td className="p-2.5 pl-4 font-mono text-[11px] font-semibold">{row.order_date || 'N/A'}</td>
                                                        <td className="p-2.5 font-mono text-emerald-600 font-bold">{row.quote_number || 'N/A'}</td>
                                                        <td className="p-2.5 font-bold truncate max-w-[140px]">{row.customer_name || 'N/A'}</td>
                                                        <td className="p-2.5 font-semibold text-foreground/80 truncate max-w-[120px]">{row.p_n || row.board_name || 'N/A'}</td>
                                                        <td className="p-2.5 text-center font-bold">{row.layer || '1'}</td>
                                                        <td className="p-2.5 text-center font-mono font-bold">{row.qty || '0'}</td>
                                                        <td className="p-2.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{row.completed_qty || row.final_qty || '0'}</td>
                                                        <td className="p-2.5 text-center">
                                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-500/10 text-blue-500 uppercase">
                                                                {row.status || 'N/A'}
                                                            </span>
                                                        </td>
                                                        <td className="p-2.5 pr-4 font-mono text-muted-foreground">{row.bill_number || 'N/A'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-muted-foreground space-y-1">
                                        <Info className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                                        <p className="font-bold text-xs">No records found for the selected filters.</p>
                                        <p className="text-[11px]">Please adjust your filter criteria and try again.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Selected Filters Summary & Download Controls */}
                        <div className="bg-muted/20 border border-border/80 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                            {/* Active Filters Summary */}
                            <div className="space-y-1 text-xs">
                                <div className="font-extrabold text-foreground uppercase tracking-wider text-[10px]">Export Summary:</div>
                                <div className="flex flex-wrap gap-2 text-[11px] font-medium text-muted-foreground">
                                    <span className="bg-card border border-border/80 px-2.5 py-1 rounded-lg">
                                        <strong className="text-foreground">Records:</strong> {exportPreviewData?.total_count ?? exportPreviewData?.total ?? exportPreviewData?.data?.length ?? 0}
                                    </span>
                                    <span className="bg-card border border-border/80 px-2.5 py-1 rounded-lg">
                                        <strong className="text-foreground">Status:</strong> {exportStatus}
                                    </span>
                                    {exportCustomer && (
                                        <span className="bg-card border border-border/80 px-2.5 py-1 rounded-lg">
                                            <strong className="text-foreground">Customer:</strong> {exportCustomer}
                                        </span>
                                    )}
                                    {(exportStartDate || exportEndDate) && (
                                        <span className="bg-card border border-border/80 px-2.5 py-1 rounded-lg">
                                            <strong className="text-foreground">Date:</strong> {exportStartDate || 'Start'} → {exportEndDate || 'End'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Export Format Selector & Action */}
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="flex items-center gap-2 bg-card border border-border/80 p-1.5 rounded-xl text-xs font-bold">
                                    <label className="flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer hover:bg-muted/50">
                                        <input
                                            type="radio"
                                            name="exportFormat"
                                            value="xlsx"
                                            checked={exportFormat === 'xlsx'}
                                            onChange={() => setExportFormat('xlsx')}
                                            className="accent-emerald-500"
                                        />
                                        XLSX
                                    </label>
                                    <label className="flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer hover:bg-muted/50">
                                        <input
                                            type="radio"
                                            name="exportFormat"
                                            value="csv"
                                            checked={exportFormat === 'csv'}
                                            onChange={() => setExportFormat('csv')}
                                            className="accent-emerald-500"
                                        />
                                        CSV
                                    </label>
                                </div>

                                <Button
                                    type="button"
                                    onClick={handleDownloadFilteredExport}
                                    disabled={exporting || !exportPreviewData || ((exportPreviewData.total_count ?? exportPreviewData.total ?? 0) === 0 && (!exportPreviewData.data || exportPreviewData.data.length === 0))}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs gap-2 px-5 h-10 cursor-pointer"
                                >
                                    {exporting ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Generating Export...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4" />
                                            Download {exportFormat.toUpperCase()} ({exportPreviewData?.total_count ?? exportPreviewData?.total ?? exportPreviewData?.data?.length ?? 0})
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
