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
    AlertCircle
} from "lucide-react";

export default function OrderJobCardPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [downloadingCombinedPdf, setDownloadingCombinedPdf] = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [selectedPreviewDoc, setSelectedPreviewDoc] = useState<any | null>(null);
    const [combinedPreviewOpen, setCombinedPreviewOpen] = useState(false);

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
        const toastId = toast.loading("Generating Job Card PDF...");
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
            toast.success("Job Card PDF downloaded!", { id: toastId });
        } catch (err: any) {
            toast.error(err?.message || "Error downloading Job Card PDF", { id: toastId });
        } finally {
            setDownloadingPdf(false);
        }
    };

    const handleUploadJobCardDoc = async (file: File) => {
        if (!orderId) return;
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!ext || !['pdf', 'doc', 'docx'].includes(ext)) {
            toast.error("Only .pdf, .doc, and .docx files are supported.");
            return;
        }
        if (file.size > 25 * 1024 * 1024) {
            toast.error("File size exceeds maximum limit of 25MB.");
            return;
        }

        setUploadingDoc(true);
        const toastId = toast.loading(ext === 'pdf' ? "Uploading PDF attachment..." : "Uploading & converting Word document to PDF...");
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
                toast.success("Document attached successfully!", { id: toastId });
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
        const toastId = toast.loading("Generating combined Job Card + attachments PDF...");
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
            toast.success("Combined PDF downloaded successfully!", { id: toastId });
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
                {downloadingPdf ? "Generating..." : "Download Job Card"}
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
            subtitle="Interactive manufacturing specification sheet, process routing log, and attached document sequence manager."
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

                    {/* Main Job Card Specifications Card */}
                    <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden">
                        <div className="p-4 sm:p-6 bg-slate-900 text-white dark:bg-slate-950 border-b border-slate-800">
                            {/* Visual Job Card Print Form Header */}
                            <div className="bg-white text-black p-4 sm:p-6 rounded-xl font-mono text-xs shadow-inner space-y-4 max-w-5xl mx-auto border-2 border-black">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b-2 border-black pb-3">
                                    <div className="flex items-center gap-3">
                                        <label className="font-bold">JOB NO:</label>
                                        <input
                                            type="text"
                                            value={jobCardData.job_number || ""}
                                            onChange={(e) => updateJobCardField("job_number", e.target.value)}
                                            className="font-black text-lg px-2 py-1 bg-amber-50 border-2 border-black rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div className="flex items-center gap-4 bg-slate-100 px-3 py-1.5 rounded border border-black">
                                        <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={!!jobCardData.expose}
                                                onChange={(e) => updateJobCardField("expose", e.target.checked)}
                                                className="w-4 h-4 accent-indigo-600"
                                            />
                                            Expose
                                        </label>
                                        <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={!!jobCardData.print_and_etch}
                                                onChange={(e) => updateJobCardField("print_and_etch", e.target.checked)}
                                                className="w-4 h-4 accent-indigo-600"
                                            />
                                            Print & Etch
                                        </label>
                                    </div>

                                    <div className="text-right font-black text-xl tracking-wider">
                                        {jobCardData.job_type}
                                    </div>
                                </div>

                                <div className="text-center font-black text-2xl tracking-widest underline py-1">
                                    JOB CARD
                                </div>

                                {/* Spec Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-t-2 border-black pt-3">
                                    <div>
                                        <span className="font-bold">Order Date: </span>
                                        <input
                                            type="text"
                                            value={jobCardData.order_date || ""}
                                            onChange={(e) => updateJobCardField("order_date", e.target.value)}
                                            className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded font-bold mt-1 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <span className="font-bold">Launch Date: </span>
                                        <input
                                            type="text"
                                            value={jobCardData.launch_date || ""}
                                            onChange={(e) => updateJobCardField("launch_date", e.target.value)}
                                            className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded font-bold mt-1 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <span className="font-bold">Shipping Date: </span>
                                        <input
                                            type="text"
                                            value={jobCardData.shipping_date || ""}
                                            onChange={(e) => updateJobCardField("shipping_date", e.target.value)}
                                            className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded font-bold mt-1 text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-t border-black pt-2">
                                    <div>
                                        <span className="font-bold block text-[10px] uppercase">ORDER QTY:</span>
                                        <input
                                            type="text"
                                            value={jobCardData.order_qty || ""}
                                            onChange={(e) => updateJobCardField("order_qty", e.target.value)}
                                            className="w-full px-2 py-1 bg-amber-50 border border-black font-black rounded text-xs"
                                        />
                                    </div>
                                    <div>
                                        <span className="font-bold block text-[10px] uppercase">LAUNCHED:</span>
                                        <input
                                            type="text"
                                            value={jobCardData.launched_qty || ""}
                                            onChange={(e) => updateJobCardField("launched_qty", e.target.value)}
                                            className="w-full px-2 py-1 bg-amber-50 border border-black font-black rounded text-xs"
                                        />
                                    </div>
                                    <div>
                                        <span className="font-bold block text-[10px] uppercase">UPS:</span>
                                        <input
                                            type="text"
                                            value={jobCardData.ups || ""}
                                            onChange={(e) => updateJobCardField("ups", e.target.value)}
                                            className="w-full px-2 py-1 bg-slate-50 border border-slate-300 font-bold rounded text-xs"
                                        />
                                    </div>
                                    <div>
                                        <span className="font-bold block text-[10px] uppercase">PANELS:</span>
                                        <input
                                            type="text"
                                            value={jobCardData.panels || ""}
                                            onChange={(e) => updateJobCardField("panels", e.target.value)}
                                            className="w-full px-2 py-1 bg-slate-50 border border-slate-300 font-bold rounded text-xs"
                                        />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <span className="font-bold block text-[10px] uppercase">Min.Hole:</span>
                                        <input
                                            type="text"
                                            value={jobCardData.min_hole || ""}
                                            onChange={(e) => updateJobCardField("min_hole", e.target.value)}
                                            className="w-full px-2 py-1 bg-slate-50 border border-slate-300 font-bold rounded text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-black pt-2">
                                    <div>
                                        <span className="font-bold text-[11px]">PANEL SIZE: </span>
                                        <input
                                            type="text"
                                            value={jobCardData.panel_size || ""}
                                            onChange={(e) => updateJobCardField("panel_size", e.target.value)}
                                            className="w-full px-2 py-1 bg-slate-50 border border-slate-300 font-bold rounded text-xs mt-1"
                                        />
                                    </div>
                                    <div>
                                        <span className="font-bold text-[11px]">CUTTING SIZE: </span>
                                        <input
                                            type="text"
                                            value={jobCardData.cutting_size || ""}
                                            onChange={(e) => updateJobCardField("cutting_size", e.target.value)}
                                            placeholder="e.g. 100x200"
                                            className="w-full px-2 py-1 bg-amber-50 border border-black font-bold rounded text-xs mt-1"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-black pt-2">
                                    <div>
                                        <span className="font-bold block text-[10px] uppercase">Material:</span>
                                        <input
                                            type="text"
                                            value={jobCardData.material || ""}
                                            onChange={(e) => updateJobCardField("material", e.target.value)}
                                            className="w-full px-2 py-1 bg-slate-50 border border-slate-300 font-bold rounded text-xs"
                                        />
                                    </div>
                                    <div>
                                        <span className="font-bold block text-[10px] uppercase">Thick:</span>
                                        <input
                                            type="text"
                                            value={jobCardData.thickness || ""}
                                            onChange={(e) => updateJobCardField("thickness", e.target.value)}
                                            className="w-full px-2 py-1 bg-slate-50 border border-slate-300 font-bold rounded text-xs"
                                        />
                                    </div>
                                    <div>
                                        <span className="font-bold block text-[10px] uppercase">Copper Thick:</span>
                                        <input
                                            type="text"
                                            value={jobCardData.copper_thickness || ""}
                                            onChange={(e) => updateJobCardField("copper_thickness", e.target.value)}
                                            className="w-full px-2 py-1 bg-slate-50 border border-slate-300 font-bold rounded text-xs"
                                        />
                                    </div>
                                    <div>
                                        <span className="font-bold block text-[10px] uppercase">Finish:</span>
                                        <input
                                            type="text"
                                            value={jobCardData.finish || ""}
                                            onChange={(e) => updateJobCardField("finish", e.target.value)}
                                            className="w-full px-2 py-1 bg-slate-50 border border-slate-300 font-bold rounded text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-black pt-2">
                                    <div>
                                        <span className="font-bold block text-[10px] uppercase">Mask Colour:</span>
                                        <input
                                            type="text"
                                            value={jobCardData.mask_colour || ""}
                                            onChange={(e) => updateJobCardField("mask_colour", e.target.value)}
                                            className="w-full px-2 py-1 bg-slate-50 border border-slate-300 font-bold rounded text-xs"
                                        />
                                    </div>
                                    <div>
                                        <span className="font-bold block text-[10px] uppercase">LP Color:</span>
                                        <input
                                            type="text"
                                            value={jobCardData.lp_color || ""}
                                            onChange={(e) => updateJobCardField("lp_color", e.target.value)}
                                            className="w-full px-2 py-1 bg-slate-50 border border-slate-300 font-bold rounded text-xs"
                                        />
                                    </div>
                                    <div>
                                        <span className="font-bold block text-[10px] uppercase">LP Side:</span>
                                        <input
                                            type="text"
                                            value={jobCardData.lp_side || ""}
                                            onChange={(e) => updateJobCardField("lp_side", e.target.value)}
                                            className="w-full px-2 py-1 bg-slate-50 border border-slate-300 font-bold rounded text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-black pt-2">
                                    <div>
                                        <span className="font-bold block text-[10px] uppercase">Route:</span>
                                        <input
                                            type="text"
                                            value={jobCardData.route || ""}
                                            onChange={(e) => updateJobCardField("route", e.target.value)}
                                            className="w-full px-2 py-1 bg-slate-50 border border-slate-300 font-bold rounded text-xs"
                                        />
                                    </div>
                                    <div>
                                        <span className="font-bold block text-[10px] uppercase">V-Cut:</span>
                                        <input
                                            type="text"
                                            value={jobCardData.v_cut || ""}
                                            onChange={(e) => updateJobCardField("v_cut", e.target.value)}
                                            className="w-full px-2 py-1 bg-slate-50 border border-slate-300 font-bold rounded text-xs"
                                        />
                                    </div>
                                    <div>
                                        <span className="font-bold block text-[10px] uppercase">Shearing Cut:</span>
                                        <input
                                            type="text"
                                            value={jobCardData.shearing_cut || ""}
                                            onChange={(e) => updateJobCardField("shearing_cut", e.target.value)}
                                            className="w-full px-2 py-1 bg-slate-50 border border-slate-300 font-bold rounded text-xs"
                                        />
                                    </div>
                                    <div>
                                        <span className="font-bold block text-[10px] uppercase">Internal Cutouts:</span>
                                        <input
                                            type="text"
                                            value={jobCardData.internal_cutouts || ""}
                                            onChange={(e) => updateJobCardField("internal_cutouts", e.target.value)}
                                            className="w-full px-2 py-1 bg-slate-50 border border-slate-300 font-bold rounded text-xs"
                                        />
                                    </div>
                                </div>

                                {/* Production & Customer Notes */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t-2 border-black pt-3">
                                    <div>
                                        <label className="font-black block text-xs uppercase mb-1">Production Note:</label>
                                        <textarea
                                            rows={3}
                                            value={jobCardData.production_note || ""}
                                            onChange={(e) => updateJobCardField("production_note", e.target.value)}
                                            className="w-full p-2 bg-slate-50 border border-black rounded text-xs font-mono resize-y"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-black block text-xs uppercase mb-1">Customer Special Note:</label>
                                        <textarea
                                            rows={3}
                                            value={jobCardData.customer_note || ""}
                                            onChange={(e) => updateJobCardField("customer_note", e.target.value)}
                                            placeholder="Special notes from client..."
                                            className="w-full p-2 bg-slate-50 border border-black rounded text-xs font-mono resize-y"
                                        />
                                    </div>
                                </div>

                                {/* Quantities & Rejection Summary */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t-2 border-black pt-3">
                                    <div>
                                        <span className="font-black block text-[10px] uppercase">Final Panel Qty:</span>
                                        <input
                                            type="text"
                                            value={jobCardData.final_panel_qty || ""}
                                            onChange={(e) => updateJobCardField("final_panel_qty", e.target.value)}
                                            placeholder="e.g. 10"
                                            className="w-full px-2 py-1 bg-amber-50 border border-black font-black rounded text-xs"
                                        />
                                    </div>
                                    <div>
                                        <span className="font-black block text-[10px] uppercase">Final Board Qty:</span>
                                        <input
                                            type="text"
                                            value={jobCardData.final_board_qty || ""}
                                            onChange={(e) => updateJobCardField("final_board_qty", e.target.value)}
                                            className="w-full px-2 py-1 bg-emerald-50 border border-black font-black rounded text-xs text-emerald-800"
                                        />
                                    </div>
                                    <div>
                                        <span className="font-black block text-[10px] uppercase">Rejected Board Qty:</span>
                                        <input
                                            type="text"
                                            value={jobCardData.rejected_board_qty || ""}
                                            onChange={(e) => updateJobCardField("rejected_board_qty", e.target.value)}
                                            className="w-full px-2 py-1 bg-rose-50 border border-black font-black rounded text-xs text-rose-800"
                                        />
                                    </div>
                                    <div>
                                        <span className="font-black block text-[10px] uppercase">Why Rejected?</span>
                                        <input
                                            type="text"
                                            value={jobCardData.why_rejected || ""}
                                            onChange={(e) => updateJobCardField("why_rejected", e.target.value)}
                                            placeholder="e.g. Surface defect"
                                            className="w-full px-2 py-1 bg-slate-50 border border-black font-bold rounded text-xs"
                                        />
                                    </div>
                                </div>

                                {/* Process Routing Table */}
                                <div className="border-t-2 border-black pt-3">
                                    <h4 className="font-black text-xs uppercase mb-2">Process Routing Execution Log</h4>
                                    <div className="overflow-x-auto border-2 border-black rounded">
                                        <table className="w-full text-left text-[11px] border-collapse">
                                            <thead className="bg-black text-white font-black uppercase">
                                                <tr>
                                                    <th className="p-1.5 border border-slate-700 w-28">PROCESS</th>
                                                    <th className="p-1.5 border border-slate-700 text-center w-12">IN</th>
                                                    <th className="p-1.5 border border-slate-700 text-center w-16">PANEL QTY</th>
                                                    <th className="p-1.5 border border-slate-700 text-center w-12">OUT</th>
                                                    <th className="p-1.5 border border-slate-700 text-center w-16">PANEL QTY</th>
                                                    <th className="p-1.5 border border-slate-700 text-center w-12">Q.C</th>
                                                    <th className="p-1.5 border border-slate-700 text-center w-16">SIGN</th>
                                                    <th className="p-1.5 border border-slate-700">REMARK</th>
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
                                                                className="w-full text-center px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px]"
                                                            />
                                                        </td>
                                                        <td className="p-0.5 border border-black">
                                                            <input
                                                                type="text"
                                                                value={proc.panel_qty_in || ""}
                                                                onChange={(e) => updateJobCardProcess(index, "panel_qty_in", e.target.value)}
                                                                className="w-full text-center px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px]"
                                                            />
                                                        </td>
                                                        <td className="p-0.5 border border-black">
                                                            <input
                                                                type="text"
                                                                value={proc.out || ""}
                                                                onChange={(e) => updateJobCardProcess(index, "out", e.target.value)}
                                                                className="w-full text-center px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px]"
                                                            />
                                                        </td>
                                                        <td className="p-0.5 border border-black">
                                                            <input
                                                                type="text"
                                                                value={proc.panel_qty_out || ""}
                                                                onChange={(e) => updateJobCardProcess(index, "panel_qty_out", e.target.value)}
                                                                className="w-full text-center px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px]"
                                                            />
                                                        </td>
                                                        <td className="p-0.5 border border-black">
                                                            <input
                                                                type="text"
                                                                value={proc.qc || ""}
                                                                onChange={(e) => updateJobCardProcess(index, "qc", e.target.value)}
                                                                className="w-full text-center px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px]"
                                                            />
                                                        </td>
                                                        <td className="p-0.5 border border-black">
                                                            <input
                                                                type="text"
                                                                value={proc.sign || ""}
                                                                onChange={(e) => updateJobCardProcess(index, "sign", e.target.value)}
                                                                className="w-full text-center px-1 py-0.5 border border-slate-300 rounded font-mono text-[10px]"
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
                    </div>

                    {/* Additional Documents Attachment & Sequence Manager Card */}
                    <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-5">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
                            <div>
                                <h3 className="text-base font-black text-foreground flex items-center gap-2">
                                    <FileCode className="w-5 h-5 text-indigo-500" />
                                    Additional Attached Documents
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Attach PDFs, DOC, or DOCX documents to combine with this Job Card into a single PDF export.
                                </p>
                            </div>

                            <label className="cursor-pointer shrink-0">
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleUploadJobCardDoc(f);
                                    }}
                                    className="hidden"
                                />
                                <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all">
                                    <Plus className="w-4 h-4" /> Add PDF / DOC / DOCX
                                </span>
                            </label>
                        </div>

                        {/* Sequence & Attachments List */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                                Sequence & Attachments List
                            </h4>

                            <div className="space-y-2">
                                {/* 1. Primary Generated Job Card Item */}
                                <div className="p-3.5 bg-slate-950 text-white dark:bg-slate-900 border-2 border-indigo-500/50 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-lg bg-indigo-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                                            1
                                        </div>
                                        <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm">
                                                    Job Card {jobCardData.job_number || orderId}.pdf
                                                </span>
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                    Primary Document
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 font-medium">
                                                Auto-generated from latest Job Card specifications & process routing log
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleDownloadPdf}
                                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 gap-1.5"
                                    >
                                        <Download className="w-3.5 h-3.5" /> Download PDF
                                    </Button>
                                </div>

                                {/* Additional Attached Documents */}
                                {(!jobCardData.documents || jobCardData.documents.length === 0) ? (
                                    <div className="p-6 border-2 border-dashed border-border/80 rounded-xl text-center bg-muted/20">
                                        <p className="text-xs text-muted-foreground font-medium">
                                            No additional PDF or Word documents attached yet. Click <strong>&quot;Add PDF / DOC / DOCX&quot;</strong> above to attach secondary specs or drawings.
                                        </p>
                                    </div>
                                ) : (
                                    jobCardData.documents.map((doc: any, index: number) => (
                                        <div key={doc.id} className="p-3.5 bg-card border border-border/80 hover:border-indigo-500/50 rounded-xl flex items-center justify-between gap-3 transition-all shadow-2xs">
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 rounded-lg bg-muted text-muted-foreground font-black text-xs flex items-center justify-center shrink-0">
                                                    {index + 2}
                                                </div>
                                                <FileCode className="w-5 h-5 text-emerald-500 shrink-0" />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-sm text-foreground">
                                                            {doc.original_name}
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase">
                                                            {doc.file_type || 'PDF'}
                                                        </span>
                                                        {doc.converted_pdf_path && (
                                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                                Converted to PDF ({doc.page_count || 1} pages)
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground font-medium">
                                                        Uploaded on {doc.created_at ? new Date(doc.created_at).toLocaleString() : 'Recently'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    disabled={index === 0}
                                                    onClick={() => handleMoveDocItem(index, 'up')}
                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                    title="Move Up"
                                                >
                                                    <ArrowUp className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    disabled={index === jobCardData.documents.length - 1}
                                                    onClick={() => handleMoveDocItem(index, 'down')}
                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                    title="Move Down"
                                                >
                                                    <ArrowDown className="w-4 h-4" />
                                                </Button>

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setSelectedPreviewDoc(doc)}
                                                    className="h-8 px-2.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 gap-1"
                                                >
                                                    <Eye className="w-3.5 h-3.5" /> Preview
                                                </Button>

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteJobCardDoc(doc.id)}
                                                    className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                                                    title="Delete document"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Combined Summary & Export Bar */}
                        <div className="p-4 bg-muted/30 border border-border/80 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                            <div className="text-xs font-bold text-muted-foreground">
                                Total Sequence Documents: <span className="text-foreground font-black">{1 + (jobCardData.documents?.length || 0)}</span>
                            </div>
                            <Button
                                type="button"
                                onClick={handleDownloadCombinedPdf}
                                disabled={downloadingCombinedPdf}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md gap-2"
                            >
                                <Download className="w-4 h-4" />
                                {downloadingCombinedPdf ? "Generating PDF..." : "Download Complete Combined Package"}
                            </Button>
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
                                <p className="text-[11px] text-muted-foreground">Attached Document Preview</p>
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
