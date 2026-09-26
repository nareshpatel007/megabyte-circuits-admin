"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import {
    GitMerge,
    ArrowLeft,
    Search,
    User,
    Building,
    Mail,
    Phone,
    ShoppingBag,
    CreditCard,
    CheckCircle2,
    AlertTriangle,
    X,
    Trash2,
    ShieldAlert,
    ArrowRight,
    FileText,
    MapPin,
    Tag,
    Clock,
    Check,
    Loader2
} from "lucide-react";
import { toast } from "sonner";

interface ClientOption {
    id: number;
    name: string;
    first_name?: string;
    last_name?: string;
    email: string;
    phone_number?: string;
    company_name?: string;
    status?: string;
    orders_count?: number;
    total_spent?: number;
    available_credits?: number;
    total_bonus_credits?: number;
    created_at?: string;
}

interface MergePreviewData {
    target: ClientOption;
    sources: ClientOption[];
    counts: {
        sources_count: number;
        orders_count: number;
        payments_count: number;
        addresses_count: number;
        gerber_files_count: number;
        support_tickets_count: number;
        logs_count: number;
        total_available_credits: number;
        total_bonus_credits: number;
    };
    conflicts: {
        field: string;
        label: string;
        target_value: string | null;
        sources_values: Array<{ source_id: number; name: string; value: string }>;
        has_conflict: boolean;
    }[];
}

const formatCurrency = (amount?: number) => {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(amount || 0);
};

const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return "N/A";
        return d.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    } catch {
        return "N/A";
    }
};

export default function MergeClientsPage() {
    const router = useRouter();

    // Workflow Steps: 1 = Select, 2 = Review, 3 = Completed
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // Selected Clients State
    const [sourceClients, setSourceClients] = useState<ClientOption[]>([]);
    const [targetClient, setTargetClient] = useState<ClientOption | null>(null);

    // Search Modal / Selection States
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<ClientOption[]>([]);
    const [searching, setSearching] = useState(false);
    const [activeModalType, setActiveModalType] = useState<"source" | "target" | null>(null);

    // Review & Preview States
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [previewData, setPreviewData] = useState<MergePreviewData | null>(null);
    const [conflictSelections, setConflictSelections] = useState<Record<string, string>>({});

    // Final Confirmation Modal State
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmInput, setConfirmInput] = useState("");
    const [executingMerge, setExecutingMerge] = useState(false);
    const [mergeProgressStep, setMergeProgressStep] = useState<string>("Initializing...");

    // Merge Success Summary Result
    const [mergeResult, setMergeResult] = useState<any>(null);

    // Search API call with debounce
    useEffect(() => {
        if (!activeModalType) return;
        const timer = setTimeout(() => {
            fetchSearchClients(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, activeModalType]);

    const fetchSearchClients = async (query: string) => {
        setSearching(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/clients/merge/search?q=${encodeURIComponent(query)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status || data.success) {
                setSearchResults(data.data || []);
            } else {
                toast.error("Failed to search clients");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error searching clients");
        } finally {
            setSearching(false);
        }
    };

    const handleSelectClient = (client: ClientOption) => {
        if (activeModalType === "source") {
            // Ensure target client is not in sources
            if (targetClient && targetClient.id === client.id) {
                toast.error("Target client cannot also be added as a source client");
                return;
            }
            if (sourceClients.some((c) => c.id === client.id)) {
                toast.error("Client is already selected as a source");
                return;
            }
            setSourceClients((prev) => [...prev, client]);
            toast.success(`Added ${client.name || client.email} to source clients`);
        } else if (activeModalType === "target") {
            // Ensure target is not already a source client
            if (sourceClients.some((c) => c.id === client.id)) {
                toast.error("This client is already selected in source clients. Please remove it from sources first.");
                return;
            }
            setTargetClient(client);
            toast.success(`Selected ${client.name || client.email} as target client`);
        }
        setActiveModalType(null);
        setSearchQuery("");
    };

    const handleRemoveSource = (id: number) => {
        setSourceClients((prev) => prev.filter((c) => c.id !== id));
    };

    const handleFetchPreview = async () => {
        if (sourceClients.length === 0) {
            toast.error("Please select at least 1 source client to merge");
            return;
        }
        if (!targetClient) {
            toast.error("Please select a target client");
            return;
        }
        if (sourceClients.some((c) => c.id === targetClient.id)) {
            toast.error("Target client cannot be included in source clients");
            return;
        }

        setLoadingPreview(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/clients/merge/preview", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    source_client_ids: sourceClients.map((c) => c.id),
                    target_client_id: targetClient.id
                })
            });
            const data = await res.json();

            if (data.status || data.success) {
                setPreviewData(data.data);
                // Initialize conflict resolutions to 'target' by default
                const initialConflicts: Record<string, string> = {};
                (data.data.conflicts || []).forEach((c: any) => {
                    initialConflicts[c.field] = "target";
                });
                setConflictSelections(initialConflicts);
                setStep(2);
            } else {
                toast.error(data.message || "Failed to generate merge preview");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error creating merge preview");
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleExecuteMerge = async () => {
        if (confirmInput.trim().toUpperCase() !== "MERGE") {
            toast.error("Please type MERGE to confirm");
            return;
        }

        if (!targetClient || sourceClients.length === 0) return;

        setExecutingMerge(true);
        setMergeProgressStep("Locking client records & starting transaction...");

        try {
            const token = localStorage.getItem("admin_token");

            setTimeout(() => setMergeProgressStep("Migrating PCB orders & order logs..."), 400);
            setTimeout(() => setMergeProgressStep("Reassigning payments, transactions & invoices..."), 800);
            setTimeout(() => setMergeProgressStep("Updating addresses, Gerber files & tickets..."), 1200);
            setTimeout(() => setMergeProgressStep("Aggregating credits & deactivating source accounts..."), 1600);

            const res = await fetch("/api/admin/clients/merge", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    source_client_ids: sourceClients.map((c) => c.id),
                    target_client_id: targetClient.id,
                    conflict_resolutions: conflictSelections,
                    confirmation: confirmInput.trim(),
                    confirm_code: confirmInput.trim()
                })
            });

            const data = await res.json();

            if (data.status || data.success) {
                setMergeResult(data.data);
                toast.success(data.message || "Client merge completed successfully!");
                setShowConfirmModal(false);
                setStep(3);
            } else {
                toast.error(data.message || "Merge operation failed and was rolled back safely.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error executing client merge operation");
        } finally {
            setExecutingMerge(false);
        }
    };

    return (
        <DashboardLayout
            title="Merge Clients"
            subtitle="Safely combine multiple client accounts and migrate related records into one target client"
            action={
                <Link
                    href="/clients"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground transition-all cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Clients
                </Link>
            }
        >
            {/* Step Stepper Header */}
            <div className="mb-6 bg-card border border-border/80 rounded-2xl p-4 shadow-xs">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${step === 1 ? 'bg-indigo-500 text-white shadow-indigo-500/25 shadow-md' : 'bg-emerald-500/10 text-emerald-500'}`}>
                            {step > 1 ? <Check className="w-5 h-5" /> : "1"}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Step 1</p>
                            <h4 className="text-sm font-extrabold text-foreground">Select Source & Target</h4>
                        </div>
                    </div>

                    <div className="hidden sm:block text-muted-foreground">
                        <ArrowRight className="w-5 h-5" />
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${step === 2 ? 'bg-indigo-500 text-white shadow-indigo-500/25 shadow-md' : step > 2 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                            {step > 2 ? <Check className="w-5 h-5" /> : "2"}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Step 2</p>
                            <h4 className="text-sm font-extrabold text-foreground">Review & Conflicts</h4>
                        </div>
                    </div>

                    <div className="hidden sm:block text-muted-foreground">
                        <ArrowRight className="w-5 h-5" />
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${step === 3 ? 'bg-emerald-500 text-black shadow-emerald-500/25 shadow-md' : 'bg-muted text-muted-foreground'}`}>
                            3
                        </div>
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Step 3</p>
                            <h4 className="text-sm font-extrabold text-foreground">Complete</h4>
                        </div>
                    </div>
                </div>
            </div>

            {/* STEP 1: CLIENT SELECTION */}
            {step === 1 && (
                <div className="space-y-6">
                    {/* Source Clients Box */}
                    <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-border/60">
                            <div>
                                <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                                    <User className="w-5 h-5 text-indigo-400" />
                                    Source Clients (To be merged & deactivated)
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Select the client accounts whose orders, payments, files, and records will be transferred.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveModalType("source");
                                    setSearchQuery("");
                                    fetchSearchClients("");
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-indigo-500 hover:bg-indigo-600 text-white transition-all shadow-xs cursor-pointer shrink-0"
                            >
                                <Search className="w-4 h-4" />
                                Add Source Client
                            </button>
                        </div>

                        {sourceClients.length === 0 ? (
                            <div className="border border-dashed border-border/80 rounded-xl p-8 text-center bg-muted/20">
                                <User className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                                <p className="text-sm font-bold text-foreground">No source clients selected yet</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Click "Add Source Client" above to search and select clients.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {sourceClients.map((client) => (
                                    <div
                                        key={client.id}
                                        className="bg-muted/30 border border-border/80 rounded-xl p-4 flex flex-col justify-between space-y-3 relative group"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-sm text-foreground">
                                                        {client.name || `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unnamed Client'}
                                                    </span>
                                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                        SOURCE
                                                    </span>
                                                </div>
                                                {client.company_name && (
                                                    <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                                                        <Building className="w-3.5 h-3.5" />
                                                        {client.company_name}
                                                    </p>
                                                )}
                                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                    <Mail className="w-3.5 h-3.5" />
                                                    {client.email}
                                                </p>
                                                {client.phone_number && (
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                        <Phone className="w-3.5 h-3.5" />
                                                        {client.phone_number}
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveSource(client.id)}
                                                className="text-muted-foreground hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                                                title="Remove from selection"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <ShoppingBag className="w-3.5 h-3.5 text-indigo-400" />
                                                {client.orders_count || 0} Orders
                                            </span>
                                            <span className="font-extrabold text-foreground">
                                                {formatCurrency(client.total_spent)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Target Client Box */}
                    <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-border/60">
                            <div>
                                <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    Target Client (Surviving identity)
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    This client will remain active in the system and receive all transferred records.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveModalType("target");
                                    setSearchQuery("");
                                    fetchSearchClients("");
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-600 text-black transition-all shadow-xs cursor-pointer shrink-0"
                            >
                                <Search className="w-4 h-4" />
                                {targetClient ? "Change Target Client" : "Select Target Client"}
                            </button>
                        </div>

                        {!targetClient ? (
                            <div className="border border-dashed border-border/80 rounded-xl p-8 text-center bg-muted/20">
                                <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                                <p className="text-sm font-bold text-foreground">No target client selected</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Click "Select Target Client" above to choose the surviving client account.
                                </p>
                            </div>
                        ) : (
                            <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-xl p-5 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-base text-foreground">
                                                {targetClient.name || `${targetClient.first_name || ''} ${targetClient.last_name || ''}`.trim() || 'Unnamed Client'}
                                            </span>
                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500 text-black">
                                                SURVIVING TARGET CLIENT
                                            </span>
                                        </div>
                                        {targetClient.company_name && (
                                            <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                                                <Building className="w-3.5 h-3.5" />
                                                {targetClient.company_name}
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                            <Mail className="w-3.5 h-3.5" />
                                            {targetClient.email}
                                        </p>
                                        {targetClient.phone_number && (
                                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                <Phone className="w-3.5 h-3.5" />
                                                {targetClient.phone_number}
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setTargetClient(null)}
                                        className="text-muted-foreground hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                                        title="Clear target client"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="pt-3 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold">
                                    <div className="flex items-center gap-4">
                                        <span className="flex items-center gap-1 text-foreground">
                                            <ShoppingBag className="w-3.5 h-3.5 text-emerald-500" />
                                            {targetClient.orders_count || 0} Existing Orders
                                        </span>
                                        <span className="flex items-center gap-1 text-foreground">
                                            <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                                            {formatCurrency(targetClient.total_spent)} Spent
                                        </span>
                                    </div>
                                    <span className="text-muted-foreground">
                                        Joined {formatDate(targetClient.created_at)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleFetchPreview}
                            disabled={sourceClients.length === 0 || !targetClient || loadingPreview}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-extrabold bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white transition-all shadow-md cursor-pointer"
                        >
                            {loadingPreview ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Analyzing Client Data...
                                </>
                            ) : (
                                <>
                                    Review Merge & Conflicts
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 2: REVIEW & CONFLICT RESOLUTION */}
            {step === 2 && previewData && (
                <div className="space-y-6">
                    {/* Visual Flow Banner */}
                    <div className="bg-gradient-to-r from-indigo-900/30 via-muted/40 to-emerald-900/30 border border-border/80 rounded-2xl p-6 shadow-xs">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 text-center">
                            Merge Operation Preview Summary
                        </h4>
                        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                            {/* Sources Box */}
                            <div className="bg-card border border-amber-500/30 rounded-xl p-4 text-center space-y-1 w-full md:w-64">
                                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">
                                    {previewData.sources.length} SOURCE CLIENT(S)
                                </span>
                                <div className="space-y-0.5 mt-2">
                                    {previewData.sources.map((s) => (
                                        <p key={s.id} className="text-xs font-bold text-foreground truncate">
                                            {s.name || s.email}
                                        </p>
                                    ))}
                                </div>
                                <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                                    Will be deactivated & merged
                                </p>
                            </div>

                            <div className="flex flex-col items-center text-indigo-400">
                                <GitMerge className="w-7 h-7 animate-pulse" />
                                <span className="text-[10px] font-extrabold uppercase mt-1">TRANSFER DATA</span>
                            </div>

                            {/* Target Box */}
                            <div className="bg-card border border-emerald-500/30 rounded-xl p-4 text-center space-y-1 w-full md:w-64">
                                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500 text-black">
                                    SURVIVING TARGET
                                </span>
                                <p className="text-sm font-black text-foreground mt-2 truncate">
                                    {previewData.target.name || previewData.target.email}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">{previewData.target.email}</p>
                                <p className="text-[11px] text-emerald-400 font-bold pt-1 border-t border-border/40">
                                    Receives all merged records
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Data Impact Table */}
                    <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs">
                        <h3 className="text-base font-extrabold text-foreground mb-4">
                            Migrated Data Records Summary
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-border/60 text-muted-foreground uppercase text-[10px] tracking-wider">
                                        <th className="py-3 px-4 font-bold">Data Category</th>
                                        <th className="py-3 px-4 font-bold text-right">Target Existing</th>
                                        <th className="py-3 px-4 font-bold text-right">Migrating From Sources</th>
                                        <th className="py-3 px-4 font-bold text-right text-emerald-400">Projected Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40 font-semibold">
                                    <tr>
                                        <td className="py-3.5 px-4 flex items-center gap-2">
                                            <ShoppingBag className="w-4 h-4 text-indigo-400" />
                                            PCB Orders
                                        </td>
                                        <td className="py-3.5 px-4 text-right text-muted-foreground">
                                            {previewData.target.orders_count || 0}
                                        </td>
                                        <td className="py-3.5 px-4 text-right text-amber-400 font-bold">
                                            +{previewData.counts.orders_count}
                                        </td>
                                        <td className="py-3.5 px-4 text-right text-foreground font-black text-sm">
                                            {(previewData.target.orders_count || 0) + previewData.counts.orders_count}
                                        </td>
                                    </tr>

                                    <tr>
                                        <td className="py-3.5 px-4 flex items-center gap-2">
                                            <CreditCard className="w-4 h-4 text-emerald-400" />
                                            Payments & Transactions
                                        </td>
                                        <td className="py-3.5 px-4 text-right text-muted-foreground">-</td>
                                        <td className="py-3.5 px-4 text-right text-amber-400 font-bold">
                                            +{previewData.counts.payments_count}
                                        </td>
                                        <td className="py-3.5 px-4 text-right text-foreground font-black text-sm">
                                            {previewData.counts.payments_count} Migrated
                                        </td>
                                    </tr>

                                    <tr>
                                        <td className="py-3.5 px-4 flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-blue-400" />
                                            User Addresses
                                        </td>
                                        <td className="py-3.5 px-4 text-right text-muted-foreground">-</td>
                                        <td className="py-3.5 px-4 text-right text-amber-400 font-bold">
                                            +{previewData.counts.addresses_count}
                                        </td>
                                        <td className="py-3.5 px-4 text-right text-foreground font-black text-sm">
                                            {previewData.counts.addresses_count} Saved
                                        </td>
                                    </tr>

                                    <tr>
                                        <td className="py-3.5 px-4 flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-purple-400" />
                                            Gerber Design Files
                                        </td>
                                        <td className="py-3.5 px-4 text-right text-muted-foreground">-</td>
                                        <td className="py-3.5 px-4 text-right text-amber-400 font-bold">
                                            +{previewData.counts.gerber_files_count}
                                        </td>
                                        <td className="py-3.5 px-4 text-right text-foreground font-black text-sm">
                                            {previewData.counts.gerber_files_count} Migrated
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Profile Conflict Resolution Section */}
                    <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-4">
                        <div>
                            <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-400" />
                                Profile Field Conflicts & Resolution
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Select which values to retain in the surviving target client profile when values differ.
                            </p>
                        </div>

                        {previewData.conflicts.length === 0 ? (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3 text-xs text-emerald-400 font-bold">
                                <CheckCircle2 className="w-5 h-5 shrink-0" />
                                No profile conflicts detected! All core target profile fields are intact.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {previewData.conflicts.map((conflict) => (
                                    <div
                                        key={conflict.field}
                                        className="bg-muted/30 border border-border/80 rounded-xl p-4 space-y-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-extrabold text-sm text-foreground uppercase tracking-wide">
                                                {conflict.label}
                                            </span>
                                            {conflict.has_conflict ? (
                                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                    CONFLICT DETECTED
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-muted-foreground">
                                                    NO CONFLICT
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                            {/* Target Option */}
                                            <label
                                                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${(conflictSelections[conflict.field] || "target") === "target"
                                                    ? "bg-emerald-500/10 border-emerald-500 text-foreground font-bold"
                                                    : "bg-card border-border/60 text-muted-foreground"
                                                    }`}
                                            >
                                                <div className="space-y-0.5">
                                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                                        Keep Target Value
                                                    </p>
                                                    <p className="text-sm font-black">
                                                        {conflict.target_value || "(Empty)"}
                                                    </p>
                                                </div>
                                                <input
                                                    type="radio"
                                                    name={`conflict_${conflict.field}`}
                                                    value="target"
                                                    checked={(conflictSelections[conflict.field] || "target") === "target"}
                                                    onChange={() =>
                                                        setConflictSelections((prev) => ({
                                                            ...prev,
                                                            [conflict.field]: "target"
                                                        }))
                                                    }
                                                    className="accent-emerald-500"
                                                />
                                            </label>

                                            {/* Source Options */}
                                            {conflict.sources_values.map((src) => (
                                                <label
                                                    key={src.source_id}
                                                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${conflictSelections[conflict.field] === `source_${src.source_id}`
                                                        ? "bg-indigo-500/10 border-indigo-500 text-foreground font-bold"
                                                        : "bg-card border-border/60 text-muted-foreground"
                                                        }`}
                                                >
                                                    <div className="space-y-0.5">
                                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                                            Use from {src.name}
                                                        </p>
                                                        <p className="text-sm font-black">
                                                            {src.value || "(Empty)"}
                                                        </p>
                                                    </div>
                                                    <input
                                                        type="radio"
                                                        name={`conflict_${conflict.field}`}
                                                        value={`source_${src.source_id}`}
                                                        checked={conflictSelections[conflict.field] === `source_${src.source_id}`}
                                                        onChange={() =>
                                                            setConflictSelections((prev) => ({
                                                                ...prev,
                                                                [conflict.field]: `source_${src.source_id}`
                                                            }))
                                                        }
                                                        className="accent-indigo-500"
                                                    />
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Step 2 Action Buttons */}
                    <div className="flex items-center justify-between pt-2">
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground transition-all cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Selection
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setConfirmInput("");
                                setShowConfirmModal(true);
                            }}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-extrabold bg-red-600 hover:bg-red-700 text-white transition-all shadow-md cursor-pointer"
                        >
                            <ShieldAlert className="w-4 h-4" />
                            Proceed to Execute Merge
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: SUCCESSFUL MERGE SUMMARY */}
            {step === 3 && mergeResult && (
                <div className="bg-card border border-emerald-500/30 rounded-2xl p-8 shadow-lg text-center space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>

                    <div>
                        <h2 className="text-2xl font-black text-foreground">Client Merge Completed Successfully!</h2>
                        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                            All selected source client records have been safely migrated into the target client, and source client accounts have been deactivated.
                        </p>
                    </div>

                    {/* Impact Summary Pill */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto pt-2">
                        <div className="bg-muted/40 border border-border/80 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Orders Migrated</p>
                            <p className="text-xl font-black text-foreground mt-0.5">{mergeResult.stats?.orders_migrated || 0}</p>
                        </div>
                        <div className="bg-muted/40 border border-border/80 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Payments Migrated</p>
                            <p className="text-xl font-black text-foreground mt-0.5">{mergeResult.stats?.payments_migrated || 0}</p>
                        </div>
                        <div className="bg-muted/40 border border-border/80 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Addresses Migrated</p>
                            <p className="text-xl font-black text-foreground mt-0.5">{mergeResult.stats?.addresses_migrated || 0}</p>
                        </div>
                        <div className="bg-muted/40 border border-border/80 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Deactivated Sources</p>
                            <p className="text-xl font-black text-amber-400 mt-0.5">{mergeResult.stats?.sources_deactivated || 0}</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-4 pt-4 border-t border-border/60">
                        <Link
                            href="/clients"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground transition-all cursor-pointer"
                        >
                            Return to Clients List
                        </Link>
                        {targetClient && (
                            <Link
                                href={`/clients/${targetClient.id}`}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-600 text-black transition-all shadow-md cursor-pointer"
                            >
                                View Target Client Profile
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        )}
                    </div>
                </div>
            )}

            {/* SEARCH CLIENT MODAL */}
            {activeModalType && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-5 border-b border-border/80 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-extrabold text-foreground">
                                    {activeModalType === "source" ? "Select Source Client" : "Select Target Client"}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Search by client name, email, company, or phone number
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveModalType(null)}
                                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="p-4 border-b border-border/60 bg-muted/20">
                            <div className="relative">
                                <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Type name, email, company, or phone..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Client Search List */}
                        <div className="p-4 max-h-80 overflow-y-auto space-y-2">
                            {searching ? (
                                <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                                    Searching client records...
                                </div>
                            ) : searchResults.length === 0 ? (
                                <div className="py-8 text-center text-xs text-muted-foreground">
                                    No clients found matching "{searchQuery}"
                                </div>
                            ) : (
                                searchResults.map((client) => {
                                    const isSelectedSource = sourceClients.some((c) => c.id === client.id);
                                    const isSelectedTarget = targetClient?.id === client.id;
                                    const isDisabled =
                                        (activeModalType === "source" && isSelectedTarget) ||
                                        (activeModalType === "target" && isSelectedSource);

                                    return (
                                        <div
                                            key={client.id}
                                            onClick={() => !isDisabled && handleSelectClient(client)}
                                            className={`p-3 rounded-xl border flex items-center justify-between transition-all ${isDisabled
                                                ? "opacity-40 cursor-not-allowed bg-muted/10 border-border/40"
                                                : "hover:bg-muted/40 cursor-pointer border-border/60 bg-card"
                                                }`}
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-extrabold text-sm text-foreground">
                                                        {client.name || `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unnamed Client'}
                                                    </span>
                                                    {client.status && (
                                                        <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-emerald-500/10 text-emerald-400">
                                                            {client.status}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                                    <span>{client.email}</span>
                                                    {client.company_name && <span>• {client.company_name}</span>}
                                                    {client.phone_number && <span>• {client.phone_number}</span>}
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span className="text-xs font-bold text-foreground block">
                                                    {client.orders_count || 0} Orders
                                                </span>
                                                <span className="text-[11px] text-muted-foreground">
                                                    {formatCurrency(client.total_spent)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRMATION TYPE "MERGE" MODAL */}
            {showConfirmModal && targetClient && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-card border border-red-500/40 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                                <ShieldAlert className="w-7 h-7" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-foreground">Confirm Destructive Client Merge</h3>
                                <p className="text-xs text-muted-foreground">
                                    This operation will migrate all data into target client and deactivate source accounts.
                                </p>
                            </div>
                        </div>

                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-2 text-xs text-red-400">
                            <p className="font-bold flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                Action Summary & Warnings:
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                <li>
                                    Migrating <strong className="text-foreground">{previewData?.counts.orders_count || 0} PCB orders</strong> and payments to <strong className="text-emerald-400">{targetClient.name || targetClient.email}</strong>.
                                </li>
                                <li>
                                    Deactivating <strong className="text-amber-400">{sourceClients.length} source client accounts</strong> permanently from active login.
                                </li>
                                <li>
                                    Invalidating active API tokens for deactivated source accounts.
                                </li>
                            </ul>
                        </div>

                        {executingMerge ? (
                            <div className="py-4 text-center space-y-3">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
                                <p className="text-xs font-bold text-foreground">{mergeProgressStep}</p>
                                <p className="text-[11px] text-muted-foreground">Please do not close or refresh this page.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-foreground">
                                    To execute this merge, type <span className="font-mono text-red-400 font-extrabold uppercase">MERGE</span> below:
                                </label>
                                <input
                                    type="text"
                                    placeholder="Type MERGE to confirm"
                                    value={confirmInput}
                                    onChange={(e) => setConfirmInput(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/50"
                                    autoFocus
                                />
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowConfirmModal(false)}
                                disabled={executingMerge}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleExecuteMerge}
                                disabled={confirmInput.trim().toUpperCase() !== "MERGE" || executingMerge}
                                className="inline-flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-extrabold bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white transition-all shadow-md cursor-pointer"
                            >
                                <GitMerge className="w-4 h-4" />
                                Confirm & Execute Merge
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
