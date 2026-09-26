"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { 
    ArrowLeft, 
    Download, 
    Save, 
    Plus, 
    Trash2, 
    ArrowUp, 
    ArrowDown, 
    Eye, 
    FileText, 
    Upload, 
    CheckCircle2, 
    Layers, 
    RefreshCw, 
    X,
    Calendar,
    Sparkles,
    FileCode,
    Check,
    AlertCircle,
    Image as ImageIcon
} from "lucide-react";

export default function OrderJobCardPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [downloadingDocx, setDownloadingDocx] = useState(false);
    const [downloadingCombinedPdf, setDownloadingCombinedPdf] = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [selectedPreviewDoc, setSelectedPreviewDoc] = useState<any | null>(null);

    const [jobCardData, setJobCardData] = useState<any>(null);

    const fetchJobCard = async () => {
        if (!orderId) return;
        setLoading(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/${orderId}/job-card`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json"
                }
            });
            const json = await res.json();
            if (res.ok && json.success && json.data) {
                setJobCardData(json.data);
            } else {
                toast.error(json.message || "Failed to load Job Card details");
            }
        } catch (err: any) {
            console.error("Error loading job card:", err);
            toast.error("Failed to connect to server");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobCard();
    }, [orderId]);

    // Clipboard Image Paste Handler (Ctrl + V)
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (!orderId || uploadingDoc) return;
            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.type.indexOf('image') !== -1) {
                    const blob = item.getAsFile();
                    if (blob) {
                        e.preventDefault();
                        const now = new Date();
                        const timestamp = now.getFullYear() +
                            String(now.getMonth() + 1).padStart(2, '0') +
                            String(now.getDate()).padStart(2, '0') + '-' +
                            String(now.getHours()).padStart(2, '0') +
                            String(now.getMinutes()).padStart(2, '0') +
                            String(now.getSeconds()).padStart(2, '0');
                        const ext = item.type.split('/')[1] || 'png';
                        const pastedFile = new File([blob], `pasted-image-${timestamp}.${ext}`, { type: item.type });
                        toast.info("Uploading pasted image from clipboard...");
                        handleUploadJobCardDoc(pastedFile);
                    }
                    break;
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [orderId, uploadingDoc]);

    const updateJobCardField = (key: string, value: any) => {
        setJobCardData((prev: any) => prev ? { ...prev, [key]: value } : prev);
    };

    const updateJobCardProcess = (index: number, field: string, value: any) => {
        setJobCardData((prev: any) => {
            if (!prev || !prev.processes) return prev;
            const newProcs = [...prev.processes];
            newProcs[index] = { ...newProcs[index], [field]: value };
            return { ...prev, processes: newProcs };
        });
    };

    const handleSaveJobCard = async () => {
        if (!orderId || !jobCardData) return;
        setSaving(true);
        const toastId = toast.loading("Saving Job Card specifications...");
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/${orderId}/job-card`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({ job_card_data: jobCardData })
            });
            const json = await res.json();
            if (res.ok && json.success) {
                toast.success("Job Card saved successfully!", { id: toastId });
                if (json.data) setJobCardData(json.data);
            } else {
                toast.error(json.message || "Failed to save Job Card", { id: toastId });
            }
        } catch (err: any) {
            toast.error(err?.message || "Error saving Job Card", { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    const handleDownloadPdf = async () => {
        if (!orderId || !jobCardData) return;
        setDownloadingPdf(true);
        const toastId = toast.loading("Generating A4 Job Card PDF...");
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/${orderId}/job-card/pdf`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ job_card_data: jobCardData })
            });

            if (!res.ok) {
                throw new Error("Failed to generate PDF on backend");
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `JOB_CARD_${jobCardData.job_number || orderId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success("A4 Job Card PDF downloaded!", { id: toastId });
        } catch (err: any) {
            toast.error(err?.message || "Error downloading Job Card PDF", { id: toastId });
        } finally {
            setDownloadingPdf(false);
        }
    };

    const handleDownloadDocx = async () => {
        if (!orderId || !jobCardData) return;
        setDownloadingDocx(true);
        const toastId = toast.loading("Generating editable Job Card DOCX...");
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/${orderId}/job-card/docx`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ job_card_data: jobCardData })
            });

            if (!res.ok) {
                throw new Error("Failed to generate DOCX on backend");
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `JOB_CARD_${jobCardData.job_number || orderId}.docx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success("Editable Job Card DOCX downloaded!", { id: toastId });
        } catch (err: any) {
            toast.error(err?.message || "Error downloading Job Card DOCX", { id: toastId });
        } finally {
            setDownloadingDocx(false);
        }
    };

    const handleUploadJobCardDoc = async (file: File) => {
        if (!orderId) return;
        const ext = file.name.split('.').pop()?.toLowerCase();
        const allowedExts = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp'];
        if (!ext || !allowedExts.includes(ext)) {
            toast.error("Only PDF, Word (.doc, .docx), and Image (.jpg, .jpeg, .png, .webp) files are supported.");
            return;
        }
        if (file.size > 25 * 1024 * 1024) {
            toast.error("File size exceeds maximum limit of 25MB.");
            return;
        }

        setUploadingDoc(true);
        const isImage = ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
        const toastId = toast.loading(
            isImage 
                ? "Uploading & processing image to A4 PDF page..." 
                : (ext === 'pdf' ? "Uploading PDF attachment..." : "Uploading & converting Word document to PDF...")
        );
        try {
            const token = localStorage.getItem("admin_token");
            const formData = new FormData();
            formData.append("document", file);

            const res = await fetch(`/api/admin/orders/${orderId}/job-card/documents/upload`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json"
                },
                body: formData
            });

            const json = await res.json();
            if (res.ok && json.success && json.data) {
                toast.success(isImage ? "Image converted to A4 page & attached!" : "Document attached successfully!", { id: toastId });
                setJobCardData((prev: any) => {
                    if (!prev) return prev;
                    const existingDocs = prev.documents || [];
                    return { ...prev, documents: [...existingDocs, json.data] };
                });
            } else {
                toast.error(json.message || "Failed to attach document", { id: toastId });
            }
        } catch (err: any) {
            toast.error(err?.message || "Error uploading document", { id: toastId });
        } finally {
            setUploadingDoc(false);
        }
    };

    const handleDeleteJobCardDoc = async (docId: number) => {
        if (!orderId) return;
        if (!confirm("Are you sure you want to remove this attached document?")) return;

        const toastId = toast.loading("Removing document...");
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/orders/${orderId}/job-card/documents/${docId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json"
                }
            });

            const json = await res.json();
            if (res.ok && json.success) {
                toast.success("Document removed.", { id: toastId });
                setJobCardData((prev: any) => {
                    if (!prev) return prev;
                    const filtered = (prev.documents || []).filter((d: any) => d.id !== docId);
                    return { ...prev, documents: filtered };
                });
            } else {
                toast.error(json.message || "Failed to remove document", { id: toastId });
            }
        } catch (err: any) {
            toast.error(err?.message || "Error removing document", { id: toastId });
        }
    };

    const handleReorderJobCardDocs = async (newDocList: any[]) => {
        if (!orderId) return;
        setJobCardData((prev: any) => prev ? { ...prev, documents: newDocList } : prev);

        try {
            const token = localStorage.getItem("admin_token");
            const payload = {
                documents: newDocList.map((d: any, index: number) => ({
                    id: d.id,
                    sort_order: index + 2
                }))
            };

            await fetch(`/api/admin/orders/${orderId}/job-card/documents/reorder`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(payload)
            });
        } catch (err: any) {
            console.error("Failed to persist document order:", err);
        }
    };

    const handleMoveDocItem = (index: number, direction: 'up' | 'down') => {
        if (!jobCardData || !jobCardData.documents) return;
        const docs = [...jobCardData.documents];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= docs.length) return;

        const temp = docs[index];
        docs[index] = docs[targetIndex];
        docs[targetIndex] = temp;

        handleReorderJobCardDocs(docs);
    };

    const handleDownloadCombinedPdf = async () => {
        if (!orderId || !jobCardData) return;
        setDownloadingCombinedPdf(true);
        const toastId = toast.loading("Generating combined A4 PDF package...");
        try {
            const token = localStorage.getItem("admin_token");
            const docSequence = (jobCardData.documents || []).map((d: any) => d.id);
            const fullSequence = ['job_card', ...docSequence];

            const res = await fetch(`/api/admin/orders/${orderId}/job-card/combined-pdf`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    job_card_data: jobCardData,
                    document_sequence: fullSequence
                })
            });

            if (!res.ok) {
                const json = await res.json().catch(() => null);
                throw new Error(json?.message || "Failed to generate combined PDF");
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `JOB_CARD_${jobCardData.job_number || orderId}_COMPLETE.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success("Combined A4 PDF package downloaded!", { id: toastId });
        } catch (err: any) {
            toast.error(err?.message || "Error generating combined PDF", { id: toastId });
        } finally {
            setDownloadingCombinedPdf(false);
        }
    };

    const headerAction = (
        <div className="flex flex-wrap items-center gap-2">
            <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/orders")}
                className="bg-card hover:bg-muted text-foreground font-bold text-xs rounded-xl shadow-xs gap-2 border-border/80 h-10"
            >
                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                Back to Orders
            </Button>
            <Button
                type="button"
                variant="outline"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf || !jobCardData}
                className="bg-card hover:bg-muted text-foreground font-bold text-xs rounded-xl shadow-xs gap-2 border-border/80 h-10"
            >
                <Download className="w-4 h-4 text-indigo-500" />
                {downloadingPdf ? "Generating..." : "Download Job Card PDF"}
            </Button>
            <Button
                type="button"
                variant="outline"
                onClick={handleDownloadDocx}
                disabled={downloadingDocx || !jobCardData}
                className="bg-card hover:bg-muted text-foreground font-bold text-xs rounded-xl shadow-xs gap-2 border-border/80 h-10"
            >
                <FileText className="w-4 h-4 text-blue-500" />
                {downloadingDocx ? "Generating DOCX..." : "Download Job Card DOCX"}
            </Button>
            <Button
                type="button"
                onClick={handleDownloadCombinedPdf}
                disabled={downloadingCombinedPdf || !jobCardData}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md gap-2 h-10"
            >
                <Download className="w-4 h-4" />
                {downloadingCombinedPdf ? "Combining..." : "Download Combined PDF"}
            </Button>
            <Button
                type="button"
                onClick={handleSaveJobCard}
                disabled={saving || !jobCardData}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md gap-2 h-10"
            >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Changes"}
            </Button>
        </div>
    );

    return (
        <DashboardLayout
            title={`Job Card — Order #${jobCardData?.job_number || orderId}`}
            subtitle="Interactive manufacturing specification sheet, live A4 PDF preview, and attachment sequence manager."
            action={headerAction}
        >
            {loading ? (
                <div className="w-full h-96 flex flex-col items-center justify-center gap-3">
                    <LoadingSpinner />
                    <p className="text-sm font-semibold text-muted-foreground">Loading Job Card data & specifications...</p>
                </div>
            ) : !jobCardData ? (
                <div className="w-full p-12 text-center bg-card border border-border/80 rounded-2xl shadow-xs space-y-4">
                    <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
                    <h3 className="text-lg font-bold text-foreground">Order Job Card Not Found</h3>
                    <p className="text-sm text-muted-foreground">Could not load Job Card data for order ID #{orderId}.</p>
                    <Button variant="outline" onClick={() => router.push("/orders")}>
                        Return to Orders List
                    </Button>
                </div>
            ) : (
                <div className="w-full space-y-6 pb-24">
                    {/* Top Info Banner Card */}
                    <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg shrink-0 border border-indigo-500/20">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-black text-foreground tracking-tight">
                                        Job Number: {jobCardData.job_number}
                                    </h2>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                        {jobCardData.job_type}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                                    <span>Order Date: <strong className="text-foreground">{jobCardData.order_date}</strong></span>
                                    <span>•</span>
                                    <span>Launch Date: <strong className="text-foreground">{jobCardData.launch_date}</strong></span>
                                    <span>•</span>
                                    <span>Target Shipping: <strong className="text-foreground">{jobCardData.shipping_date}</strong></span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                            <Link href={`/orders/${jobCardData.job_number}`}>
                                <Button variant="ghost" size="sm" className="text-xs font-bold gap-1 text-muted-foreground hover:text-foreground">
                                    <Eye className="w-3.5 h-3.5" /> View Order Details
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Main Split Interface: Left = Job Card Editor Preview, Right = Attachments Manager */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        
                        {/* LEFT COLUMN: CLEAN JOB CARD PREVIEW/EDITOR & ATTACHMENT STREAM */}
                        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                            
                            {/* CLEAN JOB CARD EDITABLE SHEET (NO DARK OUTER BORDER OR HEADER BAR) */}
                            <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-6 shadow-xs overflow-hidden">
                                <div className="bg-white text-black p-4 sm:p-6 rounded-xl font-mono text-xs shadow-md space-y-3 border-2 border-black max-w-4xl mx-auto transition-all">
                                    
                                    {/* Header Row */}
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b-2 border-black pb-3">
                                        <div className="flex items-center gap-2">
                                            <label className="font-black text-sm">JOB NO:</label>
                                            <input
                                                type="text"
                                                value={jobCardData.job_number || ""}
                                                onChange={(e) => updateJobCardField("job_number", e.target.value)}
                                                className="font-black text-lg px-2 py-0.5 bg-amber-50 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-36"
                                            />
                                        </div>

                                        <div className="flex items-center gap-4 bg-slate-100 px-3 py-1 rounded border border-black text-xs font-bold">
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={!!jobCardData.expose}
                                                    onChange={(e) => updateJobCardField("expose", e.target.checked)}
                                                    className="w-4 h-4 accent-indigo-600"
                                                />
                                                Expose
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={!!jobCardData.print_and_etch}
                                                    onChange={(e) => updateJobCardField("print_and_etch", e.target.checked)}
                                                    className="w-4 h-4 accent-indigo-600"
                                                />
                                                Print & Etch
                                            </label>
                                        </div>

                                        <div className="text-right font-black text-lg tracking-wider">
                                            {jobCardData.job_type}
                                        </div>
                                    </div>

                                    {/* Title Banner */}
                                    <div className="text-center font-black text-2xl tracking-widest underline py-1">
                                        JOB CARD
                                    </div>

                                    {/* Dates Grid (Date Only - NO TIME) */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-t-2 border-black pt-2 text-xs">
                                        <div>
                                            <span className="font-bold">Order Date: </span>
                                            <input
                                                type="text"
                                                value={jobCardData.order_date || ""}
                                                onChange={(e) => updateJobCardField("order_date", e.target.value)}
                                                placeholder="e.g. 25 Sep 2026"
                                                className="w-full px-2 py-0.5 bg-slate-50 border border-slate-400 rounded font-bold mt-0.5 text-xs"
                                            />
                                        </div>
                                        <div>
                                            <span className="font-bold">Launch Date: </span>
                                            <input
                                                type="text"
                                                value={jobCardData.launch_date || ""}
                                                onChange={(e) => updateJobCardField("launch_date", e.target.value)}
                                                placeholder="e.g. 17 Aug 2026"
                                                className="w-full px-2 py-0.5 bg-slate-50 border border-slate-400 rounded font-bold mt-0.5 text-xs"
                                            />
                                        </div>
                                        <div>
                                            <span className="font-bold">Shipping Date: </span>
                                            <input
                                                type="text"
                                                value={jobCardData.shipping_date || ""}
                                                onChange={(e) => updateJobCardField("shipping_date", e.target.value)}
                                                placeholder="e.g. 14 Oct 2026"
                                                className="w-full px-2 py-0.5 bg-slate-50 border border-slate-400 rounded font-bold mt-0.5 text-xs"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 3: Quantities */}
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-t border-black pt-2">
                                        <div>
                                            <span className="font-bold block text-[10px] uppercase">ORDER QTY:</span>
                                            <input
                                                type="text"
                                                value={jobCardData.order_qty || ""}
                                                onChange={(e) => updateJobCardField("order_qty", e.target.value)}
                                                className="w-full px-2 py-0.5 bg-amber-50 border border-black font-black rounded text-xs"
                                            />
                                        </div>
                                        <div>
                                            <span className="font-bold block text-[10px] uppercase">LAUNCHED:</span>
                                            <input
                                                type="text"
                                                value={jobCardData.launched_qty || ""}
                                                onChange={(e) => updateJobCardField("launched_qty", e.target.value)}
                                                className="w-full px-2 py-0.5 bg-amber-50 border border-black font-black rounded text-xs"
                                            />
                                        </div>
                                        <div>
                                            <span className="font-bold block text-[10px] uppercase">UPS:</span>
                                            <input
                                                type="text"
                                                value={jobCardData.ups || ""}
                                                onChange={(e) => updateJobCardField("ups", e.target.value)}
                                                className="w-full px-2 py-0.5 bg-slate-50 border border-slate-300 font-bold rounded text-xs"
                                            />
                                        </div>
                                        <div>
                                            <span className="font-bold block text-[10px] uppercase">PANELS:</span>
                                            <input
                                                type="text"
                                                value={jobCardData.panels || ""}
                                                onChange={(e) => updateJobCardField("panels", e.target.value)}
                                                className="w-full px-2 py-0.5 bg-slate-50 border border-slate-300 font-bold rounded text-xs"
                                            />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <span className="font-bold block text-[10px] uppercase">Min.Hole:</span>
                                            <input
                                                type="text"
                                                value={jobCardData.min_hole || ""}
                                                onChange={(e) => updateJobCardField("min_hole", e.target.value)}
                                                className="w-full px-2 py-0.5 bg-slate-50 border border-slate-300 font-bold rounded text-xs"
                                            />
                                        </div>
                                    </div>

                                    {/* Panel Size & Cutting Size */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-black pt-2">
                                        <div>
                                            <span className="font-bold text-[11px]">PANEL SIZE: </span>
                                            <input
                                                type="text"
                                                value={jobCardData.panel_size || ""}
                                                onChange={(e) => updateJobCardField("panel_size", e.target.value)}
                                                className="w-full px-2 py-0.5 bg-slate-50 border border-slate-300 font-bold rounded text-xs mt-0.5"
                                            />
                                        </div>
                                        <div>
                                            <span className="font-bold text-[11px]">CUTTING SIZE: </span>
                                            <input
                                                type="text"
                                                value={jobCardData.cutting_size || ""}
                                                onChange={(e) => updateJobCardField("cutting_size", e.target.value)}
                                                placeholder="e.g. 100x200"
                                                className="w-full px-2 py-0.5 bg-amber-50 border border-black font-bold rounded text-xs mt-0.5"
                                            />
                                        </div>
                                    </div>

                                    {/* Material Specs */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-black pt-2">
                                        <div>
                                            <span className="font-bold block text-[10px] uppercase">Material:</span>
                                            <input
                                                type="text"
                                                value={jobCardData.material || ""}
                                                onChange={(e) => updateJobCardField("material", e.target.value)}
                                                className="w-full px-2 py-0.5 bg-slate-50 border border-slate-300 font-bold rounded text-xs"
                                            />
                                        </div>
                                        <div>
                                            <span className="font-bold block text-[10px] uppercase">Thick:</span>
                                            <input
                                                type="text"
                                                value={jobCardData.thickness || ""}
                                                onChange={(e) => updateJobCardField("thickness", e.target.value)}
                                                className="w-full px-2 py-0.5 bg-slate-50 border border-slate-300 font-bold rounded text-xs"
                                            />
                                        </div>
                                        <div>
                                            <span className="font-bold block text-[10px] uppercase">Copper Thick:</span>
                                            <input
                                                type="text"
                                                value={jobCardData.copper_thickness || ""}
                                                onChange={(e) => updateJobCardField("copper_thickness", e.target.value)}
                                                className="w-full px-2 py-0.5 bg-slate-50 border border-slate-300 font-bold rounded text-xs"
                                            />
                                        </div>
                                        <div>
                                            <span className="font-bold block text-[10px] uppercase">Finish:</span>
                                            <input
                                                type="text"
                                                value={jobCardData.finish || ""}
                                                onChange={(e) => updateJobCardField("finish", e.target.value)}
                                                className="w-full px-2 py-0.5 bg-slate-50 border border-slate-300 font-bold rounded text-xs"
                                            />
                                        </div>
                                    </div>

                                    {/* Mask & LP Specs */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-black pt-2">
                                        <div>
                                            <span className="font-bold block text-[10px] uppercase">Mask Colour:</span>
                                            <input
                                                type="text"
                                                value={jobCardData.mask_colour || ""}
                                                onChange={(e) => updateJobCardField("mask_colour", e.target.value)}
                                                className="w-full px-2 py-0.5 bg-slate-50 border border-slate-300 font-bold rounded text-xs"
                                            />
                                        </div>
                                        <div>
                                            <span className="font-bold block text-[10px] uppercase">LP Color:</span>
                                            <input
                                                type="text"
                                                value={jobCardData.lp_color || ""}
                                                onChange={(e) => updateJobCardField("lp_color", e.target.value)}
                                                className="w-full px-2 py-0.5 bg-slate-50 border border-slate-300 font-bold rounded text-xs"
                                            />
                                        </div>
                                        <div>
                                            <span className="font-bold block text-[10px] uppercase">LP Side:</span>
                                            <input
                                                type="text"
                                                value={jobCardData.lp_side || ""}
                                                onChange={(e) => updateJobCardField("lp_side", e.target.value)}
                                                className="w-full px-2 py-0.5 bg-slate-50 border border-slate-300 font-bold rounded text-xs"
                                            />
                                        </div>
                                    </div>

                                    {/* Routing & Cuts */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-black pt-2">
                                        <div>
                                            <span className="font-bold block text-[10px] uppercase">Route:</span>
                                            <input
                                                type="text"
                                                value={jobCardData.route || ""}
                                                onChange={(e) => updateJobCardField("route", e.target.value)}
                                                className="w-full px-2 py-0.5 bg-slate-50 border border-slate-300 font-bold rounded text-xs"
                                            />
                                        </div>
                                        <div>
                                            <span className="font-bold block text-[10px] uppercase">V-Cut:</span>
                                            <input
                                                type="text"
                                                value={jobCardData.v_cut || ""}
                                                onChange={(e) => updateJobCardField("v_cut", e.target.value)}
                                                className="w-full px-2 py-0.5 bg-slate-50 border border-slate-300 font-bold rounded text-xs"
                                            />
                                        </div>
                                        <div>
                                            <span className="font-bold block text-[10px] uppercase">Shearing Cut:</span>
                                            <input
                                                type="text"
                                                value={jobCardData.shearing_cut || ""}
                                                onChange={(e) => updateJobCardField("shearing_cut", e.target.value)}
                                                className="w-full px-2 py-0.5 bg-slate-50 border border-slate-300 font-bold rounded text-xs"
                                            />
                                        </div>
                                        <div>
                                            <span className="font-bold block text-[10px] uppercase">Internal Cutouts:</span>
                                            <input
                                                type="text"
                                                value={jobCardData.internal_cutouts || ""}
                                                onChange={(e) => updateJobCardField("internal_cutouts", e.target.value)}
                                                className="w-full px-2 py-0.5 bg-slate-50 border border-slate-300 font-bold rounded text-xs"
                                            />
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t-2 border-black pt-2">
                                        <div>
                                            <label className="font-black block text-xs uppercase mb-1">Production Note:</label>
                                            <textarea
                                                rows={2}
                                                value={jobCardData.production_note || ""}
                                                onChange={(e) => updateJobCardField("production_note", e.target.value)}
                                                className="w-full p-1.5 bg-slate-50 border border-black rounded text-xs font-mono resize-y"
                                            />
                                        </div>
                                        <div>
                                            <label className="font-black block text-xs uppercase mb-1">Customer Special Note:</label>
                                            <textarea
                                                rows={2}
                                                value={jobCardData.customer_note || ""}
                                                onChange={(e) => updateJobCardField("customer_note", e.target.value)}
                                                placeholder="Special notes from client..."
                                                className="w-full p-1.5 bg-slate-50 border border-black rounded text-xs font-mono resize-y"
                                            />
                                        </div>
                                    </div>

                                    {/* Quantities & Rejections */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t-2 border-black pt-2">
                                        <div>
                                            <span className="font-black block text-[10px] uppercase">Final Panel Qty:</span>
                                            <input
                                                type="text"
                                                value={jobCardData.final_panel_qty || ""}
                                                onChange={(e) => updateJobCardField("final_panel_qty", e.target.value)}
                                                placeholder="e.g. 10"
                                                className="w-full px-2 py-0.5 bg-amber-50 border border-black font-black rounded text-xs"
                                            />
                                        </div>
                                        <div>
                                            <span className="font-black block text-[10px] uppercase">Final Board Qty:</span>
                                            <input
                                                type="text"
                                                value={jobCardData.final_board_qty || ""}
                                                onChange={(e) => updateJobCardField("final_board_qty", e.target.value)}
                                                className="w-full px-2 py-0.5 bg-emerald-50 border border-black font-black rounded text-xs text-emerald-800"
                                            />
                                        </div>
                                        <div>
                                            <span className="font-black block text-[10px] uppercase">Rejected Board Qty:</span>
                                            <input
                                                type="text"
                                                value={jobCardData.rejected_board_qty || ""}
                                                onChange={(e) => updateJobCardField("rejected_board_qty", e.target.value)}
                                                className="w-full px-2 py-0.5 bg-rose-50 border border-black font-black rounded text-xs text-rose-800"
                                            />
                                        </div>
                                        <div>
                                            <span className="font-black block text-[10px] uppercase">Why Rejected?</span>
                                            <input
                                                type="text"
                                                value={jobCardData.why_rejected || ""}
                                                onChange={(e) => updateJobCardField("why_rejected", e.target.value)}
                                                placeholder="e.g. Surface defect"
                                                className="w-full px-2 py-0.5 bg-slate-50 border border-black font-bold rounded text-xs"
                                            />
                                        </div>
                                    </div>

                                    {/* Process Routing Table */}
                                    <div className="border-t-2 border-black pt-2">
                                        <h4 className="font-black text-xs uppercase mb-1.5">Manufacturing Process Routing Log</h4>
                                        <div className="overflow-x-auto border-2 border-black rounded">
                                            <table className="w-full text-left text-[11px] border-collapse">
                                                <thead className="bg-black text-white font-black uppercase">
                                                    <tr>
                                                        <th className="p-1 border border-slate-700 w-28">PROCESS</th>
                                                        <th className="p-1 border border-slate-700 text-center w-10">IN</th>
                                                        <th className="p-1 border border-slate-700 text-center w-14">PANEL QTY</th>
                                                        <th className="p-1 border border-slate-700 text-center w-10">OUT</th>
                                                        <th className="p-1 border border-slate-700 text-center w-14">PANEL QTY</th>
                                                        <th className="p-1 border border-slate-700 text-center w-10">Q.C</th>
                                                        <th className="p-1 border border-slate-700 text-center w-14">SIGN</th>
                                                        <th className="p-1 border border-slate-700">REMARK</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-black font-bold">
                                                    {(jobCardData.processes || []).map((proc: any, index: number) => (
                                                        <tr key={index} className={index % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                                                            <td className="p-1 border border-black font-black uppercase text-[10px] bg-slate-100">
                                                                {proc.process}
                                                            </td>
                                                            <td className="p-0.5 border border-black">
                                                                <input
                                                                    type="text"
                                                                    value={proc.in || ""}
                                                                    onChange={(e) => updateJobCardProcess(index, "in", e.target.value)}
                                                                    className="w-full text-center px-0.5 py-0.5 border border-slate-300 rounded font-mono text-[10px]"
                                                                />
                                                            </td>
                                                            <td className="p-0.5 border border-black">
                                                                <input
                                                                    type="text"
                                                                    value={proc.panel_qty_in || ""}
                                                                    onChange={(e) => updateJobCardProcess(index, "panel_qty_in", e.target.value)}
                                                                    className="w-full text-center px-0.5 py-0.5 border border-slate-300 rounded font-mono text-[10px]"
                                                                />
                                                            </td>
                                                            <td className="p-0.5 border border-black">
                                                                <input
                                                                    type="text"
                                                                    value={proc.out || ""}
                                                                    onChange={(e) => updateJobCardProcess(index, "out", e.target.value)}
                                                                    className="w-full text-center px-0.5 py-0.5 border border-slate-300 rounded font-mono text-[10px]"
                                                                />
                                                            </td>
                                                            <td className="p-0.5 border border-black">
                                                                <input
                                                                    type="text"
                                                                    value={proc.panel_qty_out || ""}
                                                                    onChange={(e) => updateJobCardProcess(index, "panel_qty_out", e.target.value)}
                                                                    className="w-full text-center px-0.5 py-0.5 border border-slate-300 rounded font-mono text-[10px]"
                                                                />
                                                            </td>
                                                            <td className="p-0.5 border border-black">
                                                                <input
                                                                    type="text"
                                                                    value={proc.qc || ""}
                                                                    onChange={(e) => updateJobCardProcess(index, "qc", e.target.value)}
                                                                    className="w-full text-center px-0.5 py-0.5 border border-slate-300 rounded font-mono text-[10px]"
                                                                />
                                                            </td>
                                                            <td className="p-0.5 border border-black">
                                                                <input
                                                                    type="text"
                                                                    value={proc.sign || ""}
                                                                    onChange={(e) => updateJobCardProcess(index, "sign", e.target.value)}
                                                                    className="w-full text-center px-0.5 py-0.5 border border-slate-300 rounded font-mono text-[10px]"
                                                                />
                                                            </td>
                                                            <td className="p-0.5 border border-black">
                                                                <input
                                                                    type="text"
                                                                    value={proc.remark || ""}
                                                                    onChange={(e) => updateJobCardProcess(index, "remark", e.target.value)}
                                                                    className="w-full px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px]"
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* ATTACHED DOCUMENTS LIVE PREVIEW STREAM (PAGES 2+) */}
                            {jobCardData.documents && jobCardData.documents.length > 0 && (
                                <div className="space-y-4 pt-4 border-t border-border/80">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                                            <Layers className="w-4 h-4 text-indigo-500" />
                                            Attached Documents Preview
                                        </h3>
                                        <span className="text-xs text-muted-foreground font-bold">
                                            {jobCardData.documents.length} Attachment(s)
                                        </span>
                                    </div>

                                    {jobCardData.documents.map((doc: any, index: number) => {
                                        const isImg = ['jpg', 'jpeg', 'png', 'webp'].includes(doc.file_type?.toLowerCase()) || doc.source_type === 'uploaded_image';
                                        return (
                                            <div key={doc.id} className="bg-card border border-border/80 rounded-xl p-4 space-y-3 shadow-xs">
                                                <div className="flex items-center justify-between border-b border-border/80 pb-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="w-6 h-6 rounded bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                                                            {index + 2}
                                                        </span>
                                                        <span className="font-bold text-xs text-foreground truncate max-w-sm">
                                                            {doc.original_name}
                                                        </span>
                                                        {isImg ? (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase flex items-center gap-1">
                                                                <ImageIcon className="w-3 h-3" /> IMAGE (1 Page A4)
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase">
                                                                {doc.file_type}
                                                            </span>
                                                        )}
                                                        {doc.converted_pdf_path && !isImg && (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                                DOCX → PDF ({doc.page_count || 1} pages)
                                                            </span>
                                                        )}
                                                    </div>

                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setSelectedPreviewDoc(doc)}
                                                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 gap-1.5 h-7"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" /> Fullscreen Preview
                                                    </Button>
                                                </div>

                                                <div className="rounded-lg overflow-hidden h-[450px] border border-border bg-slate-100 dark:bg-slate-900">
                                                    <iframe
                                                        src={`/api/admin/orders/${orderId}/job-card/documents/${doc.id}/file?token=${localStorage.getItem("admin_token")}`}
                                                        className="w-full h-full border-none"
                                                        title={`Attachment ${doc.original_name}`}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                        </div>

                        {/* RIGHT COLUMN: ATTACHMENTS & DOCUMENT SEQUENCE MANAGER */}
                        <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-6">
                            
                            {/* Attachments Card */}
                            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-5">
                                <div className="border-b border-border/80 pb-3 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                                            <FileCode className="w-4 h-4 text-indigo-500" />
                                            Additional Documents & Images
                                        </h3>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                            Upload PDFs, Word docs, or images (JPG/PNG/WEBP). Paste via Ctrl+V supported.
                                        </p>
                                    </div>
                                </div>

                                {/* Drag & Drop Upload Zone */}
                                <div 
                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const droppedFile = e.dataTransfer.files?.[0];
                                        if (droppedFile) handleUploadJobCardDoc(droppedFile);
                                    }}
                                    className="border-2 border-dashed border-indigo-500/30 hover:border-indigo-500/80 bg-indigo-500/5 transition-all rounded-xl p-5 text-center space-y-3"
                                >
                                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
                                        <Upload className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-foreground">
                                            Drop files here or click to browse
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                                            PDF • DOC • DOCX • Images (JPG, PNG, WEBP)
                                        </p>
                                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-1">
                                            Supports Ctrl+V clipboard image paste
                                        </p>
                                    </div>

                                    <label className="inline-block cursor-pointer">
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                                            disabled={uploadingDoc}
                                            onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (f) handleUploadJobCardDoc(f);
                                            }}
                                            className="hidden"
                                        />
                                        <span className={`inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all ${uploadingDoc ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                            <Plus className="w-4 h-4" />
                                            {uploadingDoc ? "Processing..." : "+ Add Document / Image"}
                                        </span>
                                    </label>
                                </div>

                                {/* Document Sequence List */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                                            Sequence & Attachments List
                                        </h4>
                                        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                                            {1 + (jobCardData.documents?.length || 0)} Total Documents
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        {/* Item 1: Primary Job Card (Always Item 1) */}
                                        <div className="p-3 bg-slate-950 text-white dark:bg-slate-900 border-2 border-indigo-500/50 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-6 h-6 rounded bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                                                    1
                                                </div>
                                                <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-bold text-xs truncate">
                                                            Job Card {jobCardData.job_number || orderId}.pdf
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 font-medium truncate">
                                                        Primary A4 Document (1 Page)
                                                    </p>
                                                </div>
                                            </div>

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleDownloadPdf}
                                                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 h-7 px-2"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>

                                        {/* Attached Secondary Documents */}
                                        {(!jobCardData.documents || jobCardData.documents.length === 0) ? (
                                            <div className="p-4 border-2 border-dashed border-border/80 rounded-xl text-center bg-muted/10">
                                                <p className="text-xs text-muted-foreground font-medium">
                                                    No additional documents/images attached. Secondary PDFs/images will appear here in sequence.
                                                </p>
                                            </div>
                                        ) : (
                                            jobCardData.documents.map((doc: any, index: number) => {
                                                const isImg = ['jpg', 'jpeg', 'png', 'webp'].includes(doc.file_type?.toLowerCase()) || doc.source_type === 'uploaded_image';
                                                return (
                                                    <div key={doc.id} className="p-3 bg-card border border-border/80 hover:border-indigo-500/50 rounded-xl flex items-center justify-between gap-2 transition-all shadow-2xs">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="w-6 h-6 rounded bg-muted text-muted-foreground font-black text-xs flex items-center justify-center shrink-0">
                                                                {index + 2}
                                                            </div>
                                                            {isImg ? (
                                                                <ImageIcon className="w-4 h-4 text-purple-500 shrink-0" />
                                                            ) : (
                                                                <FileCode className="w-4 h-4 text-emerald-500 shrink-0" />
                                                            )}
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="font-bold text-xs text-foreground truncate max-w-[140px]" title={doc.original_name}>
                                                                        {doc.original_name}
                                                                    </span>
                                                                    {isImg ? (
                                                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase">
                                                                            IMAGE
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase">
                                                                            {doc.file_type}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-[10px] text-muted-foreground font-medium truncate">
                                                                    {isImg ? 'IMAGE • 1 page (A4)' : (doc.converted_pdf_path ? `DOCX → PDF (${doc.page_count || 1} pages)` : `${doc.page_count || 1} pages`)}
                                                                </p>
                                                            </div>
                                                        </div>

                                                    <div className="flex items-center gap-0.5 shrink-0">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            disabled={index === 0}
                                                            onClick={() => handleMoveDocItem(index, 'up')}
                                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                            title="Move Up"
                                                        >
                                                            <ArrowUp className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            disabled={index === jobCardData.documents.length - 1}
                                                            onClick={() => handleMoveDocItem(index, 'down')}
                                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                            title="Move Down"
                                                        >
                                                            <ArrowDown className="w-3.5 h-3.5" />
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setSelectedPreviewDoc(doc)}
                                                            className="h-7 w-7 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
                                                            title="Preview Document"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDeleteJobCardDoc(doc.id)}
                                                            className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                                                            title="Delete Document"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                        )}
                                    </div>
                                </div>

                                {/* Export Combined Action */}
                                <div className="pt-2 border-t border-border/80">
                                    <Button
                                        type="button"
                                        onClick={handleDownloadCombinedPdf}
                                        disabled={downloadingCombinedPdf}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md gap-2 h-11"
                                    >
                                        <Download className="w-4 h-4" />
                                        {downloadingCombinedPdf ? "Combining Package..." : "Download Complete Combined Package (A4)"}
                                    </Button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* Document Preview Modal */}
            {selectedPreviewDoc && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                            <div>
                                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-indigo-500" />
                                    {selectedPreviewDoc.original_name}
                                </h3>
                                <p className="text-[11px] text-muted-foreground">Attached Document Preview (A4 Normalized)</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedPreviewDoc(null)}
                                className="rounded-full"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="flex-1 bg-slate-900">
                            <iframe
                                src={`/api/admin/orders/${orderId}/job-card/documents/${selectedPreviewDoc.id}/file?token=${localStorage.getItem("admin_token")}`}
                                className="w-full h-full border-none"
                                title="Document Preview"
                            />
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
