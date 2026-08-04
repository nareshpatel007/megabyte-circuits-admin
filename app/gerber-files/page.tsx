"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/dashboard-layout";
import {
    Search,
    ChevronRight,
    ChevronLeft,
    FileArchive,
    Users,
    UserCheck,
    UserX,
    ShoppingBag,
    Download,
    Eye,
    Trash2,
    RefreshCw,
    AlertTriangle,
    FileCode,
    Mail,
    Phone,
    Building,
    ExternalLink,
    HardDrive,
    X,
    Filter
} from "lucide-react";
import { TableSkeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import GerberBoardPreview from "@/components/GerberBoardPreview";

interface ApiGerberFile {
    id: number;
    user_id?: number | null;
    original_name: string;
    file_name: string;
    file_path?: string;
    file_url?: string;
    file_size?: string;
    board_name?: string;
    preview_data?: string;
    created_at: string;
    updated_at: string;
    client_name?: string;
    client_first_name?: string;
    client_last_name?: string;
    client_email?: string;
    client_company?: string;
    client_phone?: string;
    order_id?: number | null;
    order_number?: string | null;
}

interface Stats {
    total_files: number;
    client_files: number;
    guest_files: number;
    ordered_files: number;
}

const PAGE_SIZE = 10;

export default function GerberFilesPage() {
    const [loading, setLoading] = useState(true);
    const [files, setFiles] = useState<ApiGerberFile[]>([]);
    const [stats, setStats] = useState<Stats>({
        total_files: 0,
        client_files: 0,
        guest_files: 0,
        ordered_files: 0
    });

    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all"); // all | client | guest
    const [attachmentFilter, setAttachmentFilter] = useState("all"); // all | attached | unattached
    const [page, setPage] = useState(1);

    // Modals
    const [previewModalFile, setPreviewModalFile] = useState<ApiGerberFile | null>(null);
    const [deleteModalFile, setDeleteModalFile] = useState<ApiGerberFile | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchGerberFiles = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/gerber-files", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status || data.success) {
                setFiles(data.data || []);
                if (data.stats) {
                    setStats(data.stats);
                }
            } else {
                toast.error("Failed to load Gerber files list");
            }
        } catch (err) {
            console.error("Failed to load Gerber files:", err);
            toast.error("Error loading Gerber files list");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGerberFiles();
    }, []);

    // Delete handler
    const handleDeleteFile = async () => {
        if (!deleteModalFile) return;
        setDeleting(true);

        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/gerber-files/${deleteModalFile.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = await res.json();
            if (res.ok && (data.status || data.success)) {
                toast.success("Gerber file deleted successfully");
                setFiles((prev) => prev.filter((f) => f.id !== deleteModalFile.id));
                setStats((prev) => ({
                    ...prev,
                    total_files: Math.max(0, prev.total_files - 1),
                    client_files: deleteModalFile.user_id ? Math.max(0, prev.client_files - 1) : prev.client_files,
                    guest_files: !deleteModalFile.user_id ? Math.max(0, prev.guest_files - 1) : prev.guest_files,
                }));
                setDeleteModalFile(null);
            } else {
                toast.error(data.message || "Failed to delete Gerber file");
            }
        } catch (err) {
            console.error("Delete error:", err);
            toast.error("An error occurred while deleting the file");
        } finally {
            setDeleting(false);
        }
    };

    // Filter Logic
    const filteredFiles = files.filter((file) => {
        // Search Filter
        const term = search.toLowerCase();
        const matchesSearch =
            !term ||
            file.original_name?.toLowerCase().includes(term) ||
            file.board_name?.toLowerCase().includes(term) ||
            file.file_name?.toLowerCase().includes(term) ||
            file.client_name?.toLowerCase().includes(term) ||
            file.client_email?.toLowerCase().includes(term) ||
            file.client_company?.toLowerCase().includes(term) ||
            file.order_number?.toLowerCase().includes(term);

        // Type Filter
        const matchesType =
            typeFilter === "all" ||
            (typeFilter === "client" && !!file.user_id) ||
            (typeFilter === "guest" && !file.user_id);

        // Attachment Filter
        const matchesAttachment =
            attachmentFilter === "all" ||
            (attachmentFilter === "attached" && !!file.order_id) ||
            (attachmentFilter === "unattached" && !file.order_id);

        return matchesSearch && matchesType && matchesAttachment;
    });

    const totalPages = Math.ceil(filteredFiles.length / PAGE_SIZE) || 1;
    const paginatedFiles = filteredFiles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    useEffect(() => {
        setPage(1);
    }, [search, typeFilter, attachmentFilter]);

    const refreshButton = (
        <button
            onClick={fetchGerberFiles}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh List
        </button>
    );

    return (
        <DashboardLayout
            title="Gerber Files"
            subtitle="Manage stored Gerber design packages, view client associations and order links"
            action={refreshButton}
        >
            {loading ? (
                <TableSkeleton rows={7} />
            ) : (
                <div className="space-y-5">
                    {/* Stats Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                <HardDrive className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Gerber Files</p>
                                <h3 className="text-2xl font-black text-foreground mt-0.5">{stats.total_files}</h3>
                                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Stored design packages</p>
                            </div>
                        </div>

                        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                <UserCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Client Uploads</p>
                                <h3 className="text-2xl font-black text-emerald-500 mt-0.5">{stats.client_files}</h3>
                                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Registered accounts</p>
                            </div>
                        </div>

                        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                                <UserX className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Guest / Unattached</p>
                                <h3 className="text-2xl font-black text-amber-500 mt-0.5">{stats.guest_files}</h3>
                                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Guest & cart uploads</p>
                            </div>
                        </div>

                        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                                <ShoppingBag className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Attached to Orders</p>
                                <h3 className="text-2xl font-black text-foreground mt-0.5">{stats.ordered_files}</h3>
                                <p className="text-[11px] text-purple-500 font-bold mt-0.5">Active order files</p>
                            </div>
                        </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative w-full md:w-96">
                            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
                            <input
                                type="text"
                                placeholder="Search by file, board, client name, email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-muted/30 dark:bg-muted/20 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:border-emerald-500 font-medium"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch("")}
                                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground text-xs font-semibold"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/80 text-xs font-semibold text-foreground focus:outline-none focus:border-emerald-500 cursor-pointer shadow-xs"
                                >
                                    <option value="all">All Uploaders</option>
                                    <option value="client">Registered Clients Only</option>
                                    <option value="guest">Guest / Unassigned</option>
                                </select>
                            </div>

                            <select
                                value={attachmentFilter}
                                onChange={(e) => setAttachmentFilter(e.target.value)}
                                className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/80 text-xs font-semibold text-foreground focus:outline-none focus:border-emerald-500 cursor-pointer shadow-xs"
                            >
                                <option value="all">All Statuses</option>
                                <option value="attached">Attached to Order</option>
                                <option value="unattached">Unattached / Cart Only</option>
                            </select>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead>
                                    <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                                        <th className="py-3.5 px-5">Gerber File & Board</th>
                                        <th className="py-3.5 px-5">Client / Uploader</th>
                                        <th className="py-3.5 px-5">Order Link</th>
                                        <th className="py-3.5 px-5">Uploaded Date</th>
                                        <th className="py-3.5 px-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {paginatedFiles.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-12 text-muted-foreground font-medium">
                                                <FileCode className="w-10 h-10 mx-auto mb-2 opacity-40 text-muted-foreground" />
                                                <p className="font-bold text-foreground text-sm">No Gerber files found</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {search || typeFilter !== "all" || attachmentFilter !== "all"
                                                        ? "Try adjusting your search filters"
                                                        : "No Gerber files have been uploaded yet."}
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedFiles.map((file) => (
                                            <tr key={file.id} className="hover:bg-muted/20 transition-colors">
                                                {/* File Details */}
                                                <td className="py-4 px-5">
                                                    <div className="flex items-center gap-3">
                                                        {file.preview_data ? (
                                                            <div className="w-11 h-11 rounded-xl overflow-hidden border border-emerald-500/30 bg-slate-900 shrink-0 p-1 flex items-center justify-center shadow-xs">
                                                                <GerberBoardPreview
                                                                    previewData={file.preview_data}
                                                                    boardName={file.board_name}
                                                                    originalName={file.original_name}
                                                                    className="w-full h-full"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                                                <FileArchive className="w-5 h-5" />
                                                            </div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-foreground text-sm truncate max-w-[220px]" title={file.original_name}>
                                                                {file.original_name}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                {file.board_name && (
                                                                    <span className="text-[11px] text-muted-foreground font-semibold">
                                                                        Board: <span className="font-mono text-foreground">{file.board_name}</span>
                                                                    </span>
                                                                )}
                                                                {file.file_size && (
                                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground border border-border/60">
                                                                        {file.file_size}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Client / Uploader */}
                                                <td className="py-4 px-5 whitespace-nowrap">
                                                    {file.user_id && file.client_email ? (
                                                        <div className="space-y-0.5">
                                                            <div className="flex items-center gap-2">
                                                                <Link
                                                                    href={`/clients?search=${encodeURIComponent(file.client_email)}`}
                                                                    className="font-bold text-foreground text-sm hover:text-emerald-500 transition-colors flex items-center gap-1 group"
                                                                >
                                                                    <span>{file.client_name || `${file.client_first_name || ''} ${file.client_last_name || ''}`.trim() || 'Client'}</span>
                                                                    <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </Link>
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                                    Client
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 select-all">
                                                                <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                                                                <span>{file.client_email}</span>
                                                            </p>
                                                            {file.client_company && (
                                                                <p className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                                                                    <Building className="w-3 h-3 text-muted-foreground shrink-0" />
                                                                    <span>{file.client_company}</span>
                                                                </p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                                                            <UserX className="w-3.5 h-3.5" />
                                                            Guest / Unattached
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Order Link */}
                                                <td className="py-4 px-5 whitespace-nowrap">
                                                    {file.order_id && file.order_number ? (
                                                        <Link
                                                            href={`/orders/${file.order_id}`}
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors group"
                                                        >
                                                            <ShoppingBag className="w-3.5 h-3.5" />
                                                            <span>{file.order_number}</span>
                                                            <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                                        </Link>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-muted-foreground bg-muted/50 border border-border/60">
                                                            Not Ordered
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Date */}
                                                <td className="py-4 px-5 text-xs text-muted-foreground font-bold font-mono whitespace-nowrap">
                                                    {new Date(file.created_at).toLocaleDateString("en-IN", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                    })}
                                                </td>

                                                {/* Actions */}
                                                <td className="py-4 px-5 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {file.file_url && (
                                                            <a
                                                                href={file.file_url}
                                                                download={file.original_name}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-colors"
                                                                title="Download Gerber file"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </a>
                                                        )}

                                                        <button
                                                            onClick={() => setPreviewModalFile(file)}
                                                            className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors"
                                                            title="View Details & Preview"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>

                                                        <button
                                                            onClick={() => setDeleteModalFile(file)}
                                                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-600 dark:text-red-400 transition-colors"
                                                            title="Delete file"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {filteredFiles.length > 0 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-3.5 border-t border-border/80 bg-muted/20 text-xs text-muted-foreground">
                                <div className="font-medium">
                                    Showing <span className="font-bold text-foreground">{(page - 1) * PAGE_SIZE + 1}</span> to{" "}
                                    <span className="font-bold text-foreground">{Math.min(page * PAGE_SIZE, filteredFiles.length)}</span> of{" "}
                                    <span className="font-bold text-foreground">{filteredFiles.length}</span> Gerber files
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="p-1.5 rounded-lg bg-card border border-border/80 hover:bg-muted disabled:opacity-40 disabled:hover:bg-card transition-colors text-foreground"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="px-3 py-1 bg-card border border-border/80 rounded-lg text-foreground font-bold">
                                        {page} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="p-1.5 rounded-lg bg-card border border-border/80 hover:bg-muted disabled:opacity-40 disabled:hover:bg-card transition-colors text-foreground"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Preview / Detail Modal */}
                    {previewModalFile && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
                            <div className="bg-card border border-border/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
                                <div className="flex items-center justify-between border-b border-border/80 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500">
                                            <FileArchive className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-foreground">{previewModalFile.original_name}</h3>
                                            <p className="text-xs text-muted-foreground font-medium">ID #{previewModalFile.id} • Board: {previewModalFile.board_name || "N/A"}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setPreviewModalFile(null)}
                                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Board Visualizer Preview */}
                                <div className="bg-muted/30 border border-border/80 rounded-xl p-4 flex flex-col items-center justify-center min-h-[200px]">
                                    <div className="w-52 h-52">
                                        <GerberBoardPreview
                                            previewData={previewModalFile.preview_data}
                                            boardName={previewModalFile.board_name}
                                            originalName={previewModalFile.original_name}
                                        />
                                    </div>
                                </div>

                                {/* File & Client Meta Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                    {/* File Info */}
                                    <div className="bg-muted/20 border border-border/80 p-4 rounded-xl space-y-2">
                                        <h4 className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">File Metadata</h4>
                                        <div className="space-y-1.5 text-foreground font-medium">
                                            <p><span className="text-muted-foreground font-normal">File Size:</span> {previewModalFile.file_size || 'Unknown'}</p>
                                            <p><span className="text-muted-foreground font-normal">Storage Path:</span> <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono text-emerald-600 dark:text-emerald-400">{previewModalFile.file_path || 'N/A'}</code></p>
                                            <p><span className="text-muted-foreground font-normal">Uploaded:</span> {new Date(previewModalFile.created_at).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    {/* Uploader Info */}
                                    <div className="bg-muted/20 border border-border/80 p-4 rounded-xl space-y-2">
                                        <h4 className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Client Details</h4>
                                        {previewModalFile.user_id && previewModalFile.client_email ? (
                                            <div className="space-y-1.5 text-foreground font-medium">
                                                <p><span className="text-muted-foreground font-normal">Name:</span> {previewModalFile.client_name || 'N/A'}</p>
                                                <p><span className="text-muted-foreground font-normal">Email:</span> {previewModalFile.client_email}</p>
                                                {previewModalFile.client_company && <p><span className="text-muted-foreground font-normal">Company:</span> {previewModalFile.client_company}</p>}
                                                {previewModalFile.client_phone && <p><span className="text-muted-foreground font-normal">Phone:</span> {previewModalFile.client_phone}</p>}
                                            </div>
                                        ) : (
                                            <p className="text-amber-500 font-semibold py-2">
                                                Uploaded by a Guest user (Unattached file).
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Modal Actions */}
                                <div className="flex items-center justify-end gap-3 border-t border-border/80 pt-4">
                                    {previewModalFile.file_url && (
                                        <a
                                            href={previewModalFile.file_url}
                                            download={previewModalFile.original_name}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl text-xs font-bold transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download File
                                        </a>
                                    )}
                                    <button
                                        onClick={() => setPreviewModalFile(null)}
                                        className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-xl text-xs font-bold transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Delete Confirmation Modal */}
                    {deleteModalFile && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
                            <div className="bg-card border border-red-500/30 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl">
                                <div className="flex items-center gap-4 text-red-500">
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                        <AlertTriangle className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-foreground">Delete Gerber File</h3>
                                        <p className="text-xs text-red-500 font-medium">This action cannot be undone</p>
                                    </div>
                                </div>

                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Are you sure you want to delete <strong className="text-foreground">{deleteModalFile.original_name}</strong>?
                                    This will permanently remove the file from storage and database records.
                                </p>

                                <div className="flex items-center justify-end gap-3 border-t border-border/80 pt-4">
                                    <button
                                        onClick={() => setDeleteModalFile(null)}
                                        disabled={deleting}
                                        className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeleteFile}
                                        disabled={deleting}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                                    >
                                        {deleting ? (
                                            <>
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                Deleting...
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Delete File
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </DashboardLayout>
    );
}
