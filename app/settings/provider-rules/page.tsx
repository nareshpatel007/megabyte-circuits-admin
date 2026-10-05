"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import {
    Plus,
    Trash2,
    Edit3,
    CheckCircle2,
    XCircle,
    ArrowRight,
    Loader2,
    RefreshCw,
    AlertCircle,
    Sparkles,
    Play,
    Sliders,
    HelpCircle,
    RotateCcw,
    Layers,
    ShieldAlert,
    Check,
    X,
    Filter
} from "lucide-react";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/ui/skeleton";

interface ProviderCondition {
    id?: number;
    field: string;
    operator: string;
    value: any;
    sort_order?: number;
}

interface ProviderRule {
    id: number;
    name: string;
    slug: string;
    provider: "IN_HOUSE" | "JLCPCB";
    priority: number;
    match_type: "ALL" | "ANY";
    description?: string;
    is_active: boolean;
    sort_order: number;
    conditions: ProviderCondition[];
    created_at?: string;
    updated_at?: string;
}

interface FieldMeta {
    field: string;
    label: string;
    type: string;
    options: any[];
    supported_operators: string[];
    default_operator: string;
    default_value: any;
    tooltip?: string;
}

export default function ProviderRulesPage() {
    const [rules, setRules] = useState<ProviderRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [fieldsMeta, setFieldsMeta] = useState<FieldMeta[]>([]);
    const [operatorsMeta, setOperatorsMeta] = useState<{ value: string; label: string }[]>([]);

    // Modal state for Add/Edit
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<ProviderRule | null>(null);
    const [formData, setFormData] = useState<{
        name: string;
        slug: string;
        provider: "IN_HOUSE" | "JLCPCB";
        priority: number;
        match_type: "ALL" | "ANY";
        description: string;
        is_active: boolean;
        conditions: ProviderCondition[];
    }>({
        name: "",
        slug: "",
        provider: "IN_HOUSE",
        priority: 10,
        match_type: "ALL",
        description: "",
        is_active: true,
        conditions: [],
    });
    const [isSaving, setIsSaving] = useState(false);

    // Test/Preview Simulator State
    const [testSpecs, setTestSpecs] = useState({
        productType: "pcb",
        baseMaterial: "FR-4",
        materialType: "FR4 TG135",
        layers: "2",
        surfaceFinish: "HASL(Leaded)",
        thickness: "1.6mm",
        minHole: "0.3mm/(0.4/0.45mm)",
        goldFingers: "No",
        castellated: "No",
        edgePlating: "No",
        blindSlots: "No",
        viaCovering: "Tented",
        viaPlating: "Not Specified",
        markOnPcb: "none",
        elecTest: "none",
    });
    const [simulationResult, setSimulationResult] = useState<any>(null);
    const [simulating, setSimulating] = useState(false);

    // Delete confirmation
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const fetchRules = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/provider-rules", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success && data.data) {
                setRules(data.data);
            } else {
                toast.error(data.message || "Failed to load provider rules");
            }
        } catch (e) {
            console.error("Failed to fetch provider rules", e);
            toast.error("Failed to load provider rules");
        } finally {
            setLoading(false);
        }
    };

    const fetchMetadata = async () => {
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/provider-rules/fields", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setFieldsMeta(data.fields || []);
                setOperatorsMeta(data.operators || []);
            }
        } catch (e) {
            console.error("Failed to load metadata", e);
        }
    };

    useEffect(() => {
        fetchRules();
        fetchMetadata();
    }, []);

    const openAddModal = () => {
        setEditingRule(null);
        setFormData({
            name: "",
            slug: "",
            provider: "IN_HOUSE",
            priority: 10,
            match_type: "ALL",
            description: "",
            is_active: true,
            conditions: [
                {
                    field: "base_material",
                    operator: "in",
                    value: ["FR-4"],
                },
            ],
        });
        setIsModalOpen(true);
    };

    const openEditModal = (rule: ProviderRule) => {
        setEditingRule(rule);
        setFormData({
            name: rule.name,
            slug: rule.slug,
            provider: rule.provider,
            priority: rule.priority,
            match_type: rule.match_type,
            description: rule.description || "",
            is_active: rule.is_active,
            conditions: rule.conditions.map((c) => ({
                field: c.field,
                operator: c.operator,
                value: c.value,
            })),
        });
        setIsModalOpen(true);
    };

    const handleSaveRule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error("Rule name is required");
            return;
        }
        if (formData.conditions.length === 0) {
            toast.error("At least one condition is required");
            return;
        }

        setIsSaving(true);
        try {
            const token = localStorage.getItem("admin_token");
            const url = editingRule
                ? `/api/admin/provider-rules/${editingRule.id}`
                : "/api/admin/provider-rules";
            const method = editingRule ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            const data = await res.json();
            if (data.success) {
                toast.success(data.message || "Rule saved successfully");
                setIsModalOpen(false);
                fetchRules();
                runSimulation();
            } else {
                toast.error(data.message || "Failed to save rule");
            }
        } catch (e) {
            console.error("Save rule error", e);
            toast.error("Error saving provider rule");
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleStatus = async (id: number) => {
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/provider-rules/${id}/toggle`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message);
                setRules((prev) =>
                    prev.map((r) => (r.id === id ? { ...r, is_active: !r.is_active } : r))
                );
                runSimulation();
            } else {
                toast.error(data.message || "Failed to toggle status");
            }
        } catch (e) {
            toast.error("Error toggling rule status");
        }
    };

    const handleDelete = async (id: number) => {
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/provider-rules/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message);
                setRules((prev) => prev.filter((r) => r.id !== id));
                setDeletingId(null);
                runSimulation();
            } else {
                toast.error(data.message || "Failed to delete rule");
            }
        } catch (e) {
            toast.error("Error deleting rule");
        }
    };

    const handleResetToDefault = async () => {
        if (!confirm("Are you sure you want to reset all routing rules back to the canonical In-House baseline? Custom rules will be replaced.")) {
            return;
        }

        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/provider-rules/reset", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message);
                fetchRules();
                runSimulation();
            } else {
                toast.error(data.message || "Failed to reset rules");
            }
        } catch (e) {
            toast.error("Error resetting rules");
        }
    };

    const addCondition = () => {
        const firstField = fieldsMeta[0];
        setFormData((prev) => ({
            ...prev,
            conditions: [
                ...prev.conditions,
                {
                    field: firstField ? firstField.field : "base_material",
                    operator: firstField ? firstField.default_operator : "in",
                    value: firstField ? firstField.default_value : ["FR-4"],
                },
            ],
        }));
    };

    const removeCondition = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            conditions: prev.conditions.filter((_, i) => i !== index),
        }));
    };

    const updateCondition = (index: number, updates: Partial<ProviderCondition>) => {
        setFormData((prev) => {
            const newConds = [...prev.conditions];
            const current = newConds[index];
            const updated = { ...current, ...updates };

            // If field changed, adapt operator & default value
            if (updates.field && updates.field !== current.field) {
                const meta = fieldsMeta.find((f) => f.field === updates.field);
                if (meta) {
                    updated.operator = meta.default_operator;
                    updated.value = meta.default_value;
                }
            }

            newConds[index] = updated;
            return { ...prev, conditions: newConds };
        });
    };

    // Run Test / Preview Tool
    const runSimulation = async (customSpecs?: any) => {
        setSimulating(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/provider-rules/preview", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(customSpecs || testSpecs),
            });
            const data = await res.json();
            if (data.success) {
                setSimulationResult(data.data);
            }
        } catch (e) {
            console.error("Simulation error", e);
        } finally {
            setSimulating(false);
        }
    };

    useEffect(() => {
        runSimulation();
    }, [testSpecs]);

    const totalRules = rules.length;
    const activeInHouseRules = rules.filter((r) => r.is_active && r.provider === "IN_HOUSE").length;
    const activeJlcpcbRules = rules.filter((r) => r.is_active && r.provider === "JLCPCB").length;

    const headerActions = (
        <div className="flex items-center gap-2.5">
            <button
                type="button"
                onClick={handleResetToDefault}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-muted/40 hover:bg-muted/70 text-foreground border border-border/80 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                title="Reset all rules to the canonical baseline"
            >
                <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
                Reset to Default
            </button>

            <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs whitespace-nowrap"
            >
                <Plus className="w-4 h-4" />
                Add Routing Rule
            </button>
        </div>
    );

    return (
        <DashboardLayout
            title="Quotation Provider Routing Rules"
            subtitle="Configure conditional routing rules to decide whether a PCB configuration quotes via IN-HOUSE or JLCPCB"
            action={headerActions}
        >
            <div className="w-full space-y-6 animate-in fade-in duration-200">
                {/* Metric Summary Cards Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                            <Layers className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Rules</p>
                            <h3 className="text-2xl font-black text-foreground mt-0.5">{totalRules}</h3>
                            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Configured routing rules</p>
                        </div>
                    </div>

                    <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">In-House Rules</p>
                            <h3 className="text-2xl font-black text-emerald-500 mt-0.5">{activeInHouseRules}</h3>
                            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Active local fabrication</p>
                        </div>
                    </div>

                    <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                            <Sliders className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">JLCPCB Rules</p>
                            <h3 className="text-2xl font-black text-indigo-500 mt-0.5">{activeJlcpcbRules}</h3>
                            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Active partner routing</p>
                        </div>
                    </div>

                    <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Default Fallback</p>
                            <h3 className="text-xl font-black text-foreground mt-0.5">JLCPCB</h3>
                            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">External quote pipeline</p>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid: Rules Table + Live Simulator */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Rules List (Left 2 cols) */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-card rounded-xl border border-border/80 shadow-xs overflow-hidden">
                            <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
                                <div className="flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-emerald-500" />
                                    <h2 className="text-sm font-bold text-foreground">Active Routing Rules (Priority Order)</h2>
                                </div>
                                <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
                                    Evaluated in order of priority (lower # = higher precedence)
                                </span>
                            </div>

                            {loading ? (
                                <div className="p-6">
                                    <TableSkeleton rows={4} />
                                </div>
                            ) : rules.length === 0 ? (
                                <div className="p-12 text-center text-muted-foreground space-y-3">
                                    <AlertCircle className="w-10 h-10 text-muted-foreground/60 mx-auto" />
                                    <p className="font-semibold text-foreground">No routing rules found.</p>
                                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                                        All quotations will default to JLCPCB unless an In-House rule is defined and activated.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleResetToDefault}
                                        className="mt-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                                    >
                                        Seed Canonical In-House Rule
                                    </button>
                                </div>
                            ) : (
                                <div className="divide-y divide-border/40">
                                    {rules.map((rule) => {
                                        const isInHouse = rule.provider === "IN_HOUSE";
                                        return (
                                            <div
                                                key={rule.id}
                                                className={`p-5 transition-colors hover:bg-muted/20 ${
                                                    !rule.is_active ? "opacity-60 bg-muted/10" : ""
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="space-y-1.5 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-muted/70 text-foreground border border-border/80">
                                                                #{rule.priority}
                                                            </span>

                                                            <h3 className="font-bold text-foreground text-sm">{rule.name}</h3>

                                                            <span
                                                                className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                                                                    isInHouse
                                                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                                                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                                                }`}
                                                            >
                                                                {isInHouse ? "IN-HOUSE" : "JLCPCB"}
                                                            </span>

                                                            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-muted/50 text-muted-foreground border border-border/60">
                                                                Match: {rule.match_type}
                                                            </span>

                                                            <span
                                                                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                                                                    rule.is_active
                                                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                                                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                                                }`}
                                                            >
                                                                {rule.is_active ? "Active" : "Disabled"}
                                                            </span>
                                                        </div>

                                                        {rule.description && (
                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                {rule.description}
                                                            </p>
                                                        )}

                                                        {/* Conditions Badges */}
                                                        <div className="pt-2 flex flex-wrap gap-1.5">
                                                            {rule.conditions.map((cond, cIdx) => (
                                                                <span
                                                                    key={cIdx}
                                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-muted/30 dark:bg-muted/20 border border-border/80 text-foreground rounded-lg text-xs font-mono"
                                                                >
                                                                    <strong className="text-foreground font-semibold">{cond.field}</strong>
                                                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{cond.operator}</span>
                                                                    <span className="text-muted-foreground truncate max-w-[200px]" title={JSON.stringify(cond.value)}>
                                                                        {Array.isArray(cond.value)
                                                                            ? `[${cond.value.join(", ")}]`
                                                                            : String(cond.value)}
                                                                    </span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleStatus(rule.id)}
                                                            className={`p-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                                                                rule.is_active
                                                                    ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                                                                    : "border-border/80 text-muted-foreground hover:bg-muted/50"
                                                            }`}
                                                            title={rule.is_active ? "Disable Rule" : "Activate Rule"}
                                                        >
                                                            {rule.is_active ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => openEditModal(rule)}
                                                            className="p-2 rounded-lg border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all cursor-pointer"
                                                            title="Edit Rule"
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (confirm(`Delete rule '${rule.name}'?`)) {
                                                                    handleDelete(rule.id);
                                                                }
                                                            }}
                                                            className="p-2 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                                                            title="Delete Rule"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Fallback Notice */}
                            <div className="p-4 bg-muted/20 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                                <span className="flex items-center gap-2">
                                    <HelpCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <span>
                                        <strong className="text-foreground">Default Fallback:</strong> Any PCB configuration that does not satisfy an active In-House rule routes to <strong className="text-foreground">JLCPCB</strong>.
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Test Configuration Simulator Tool (Right col) */}
                    <div className="space-y-4">
                        <div className="bg-card rounded-xl border border-border/80 shadow-xs p-5 space-y-4">
                            <div className="flex items-center justify-between border-b border-border/60 pb-3">
                                <div className="flex items-center gap-2">
                                    <Play className="w-4 h-4 text-emerald-500" />
                                    <h2 className="text-sm font-bold text-foreground">Rule Tester / Simulator</h2>
                                </div>
                                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                    Live Verification
                                </span>
                            </div>

                            <p className="text-xs text-muted-foreground">
                                Select options below to simulate how the active database rules will route this configuration in production:
                            </p>

                            <div className="space-y-3 text-xs">
                                {/* Base Material */}
                                <div>
                                    <label className="font-bold text-foreground block mb-1">Base Material</label>
                                    <select
                                        value={testSpecs.baseMaterial}
                                        onChange={(e) => {
                                            const newMat = e.target.value;
                                            setTestSpecs((s) => ({
                                                ...s,
                                                baseMaterial: newMat,
                                                surfaceFinish: newMat === "FR-4" ? "HASL(Leaded)" : (newMat === "Flex" || newMat === "Rogers" || newMat === "PTFE Teflon" ? "ENIG" : s.surfaceFinish),
                                                materialType: newMat === "FR-4" ? "FR4 TG135" : (newMat === "Rogers" ? "RO4350B(Dk=3.48,Df=0.0037)" : s.materialType)
                                            }));
                                        }}
                                        className="w-full px-3 py-2 bg-muted/30 dark:bg-muted/20 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
                                    >
                                        <option value="FR-4">FR-4</option>
                                        <option value="Flex">Flex</option>
                                        <option value="Rogers">Rogers</option>
                                        <option value="PTFE Teflon">PTFE Teflon</option>
                                    </select>
                                </div>

                                {/* Material Type */}
                                <div>
                                    <label className="font-bold text-foreground block mb-1">Material Type</label>
                                    <select
                                        value={testSpecs.materialType}
                                        onChange={(e) => setTestSpecs((s) => ({ ...s, materialType: e.target.value }))}
                                        className="w-full px-3 py-2 bg-muted/30 dark:bg-muted/20 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
                                    >
                                        <option value="FR4 TG135">FR4 TG135 (Standard)</option>
                                        <option value="KB6164 - TG135">KB6164 - TG135</option>
                                        <option value="Nan Ya NP-140F">Nan Ya NP-140F</option>
                                        <option value="S1141 TG140">S1141 TG140</option>
                                        <option value="S1000H TG155">S1000H TG155</option>
                                        <option value="RO4350B(Dk=3.48,Df=0.0037)">RO4350B (Rogers)</option>
                                    </select>
                                </div>

                                {/* Layers */}
                                <div>
                                    <label className="font-bold text-foreground block mb-1">Layer Count</label>
                                    <select
                                        value={testSpecs.layers}
                                        onChange={(e) => setTestSpecs((s) => ({ ...s, layers: e.target.value }))}
                                        className="w-full px-3 py-2 bg-muted/30 dark:bg-muted/20 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
                                    >
                                        <option value="1">1 Layer</option>
                                        <option value="2">2 Layers</option>
                                        <option value="4">4 Layers</option>
                                        <option value="6">6 Layers</option>
                                        <option value="8">8 Layers</option>
                                    </select>
                                </div>

                                {/* Surface Finish */}
                                <div>
                                    <label className="font-bold text-foreground block mb-1">Surface Finish</label>
                                    <select
                                        value={testSpecs.surfaceFinish}
                                        onChange={(e) => setTestSpecs((s) => ({ ...s, surfaceFinish: e.target.value }))}
                                        className="w-full px-3 py-2 bg-muted/30 dark:bg-muted/20 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
                                    >
                                        <option value="HASL(Leaded)">HASL (Leaded)</option>
                                        <option value="LeadFree HASL">LeadFree HASL</option>
                                        <option value="ENIG">ENIG (Electroless Nickel Immersion Gold)</option>
                                        <option value="OSP">OSP</option>
                                    </select>
                                </div>

                                {/* Thickness */}
                                <div>
                                    <label className="font-bold text-foreground block mb-1">PCB Thickness</label>
                                    <select
                                        value={testSpecs.thickness}
                                        onChange={(e) => setTestSpecs((s) => ({ ...s, thickness: e.target.value }))}
                                        className="w-full px-3 py-2 bg-muted/30 dark:bg-muted/20 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
                                    >
                                        <option value="0.6mm">0.6mm (Forces JLCPCB)</option>
                                        <option value="0.8mm">0.8mm</option>
                                        <option value="1.0mm">1.0mm</option>
                                        <option value="1.2mm">1.2mm</option>
                                        <option value="1.6mm">1.6mm (Standard)</option>
                                        <option value="2.0mm">2.0mm</option>
                                    </select>
                                </div>

                                {/* Min Via Hole */}
                                <div>
                                    <label className="font-bold text-foreground block mb-1">Min Via Hole</label>
                                    <select
                                        value={testSpecs.minHole}
                                        onChange={(e) => setTestSpecs((s) => ({ ...s, minHole: e.target.value }))}
                                        className="w-full px-3 py-2 bg-muted/30 dark:bg-muted/20 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
                                    >
                                        <option value="0.3mm/(0.4/0.45mm)">0.30mm (Standard)</option>
                                        <option value="0.25mm/(0.35/0.4mm)">0.25mm</option>
                                        <option value="0.2mm/(0.3/0.35mm)">0.20mm</option>
                                        <option value="0.15mm/(0.25/0.3mm)">0.15mm</option>
                                    </select>
                                </div>

                                {/* High-spec toggles */}
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <div>
                                        <label className="font-bold text-foreground block mb-1">Gold Fingers</label>
                                        <select
                                            value={testSpecs.goldFingers}
                                            onChange={(e) => setTestSpecs((s) => ({ ...s, goldFingers: e.target.value }))}
                                            className="w-full px-2 py-1.5 bg-muted/30 dark:bg-muted/20 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
                                        >
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="font-bold text-foreground block mb-1">Castellated</label>
                                        <select
                                            value={testSpecs.castellated}
                                            onChange={(e) => setTestSpecs((s) => ({ ...s, castellated: e.target.value }))}
                                            className="w-full px-2 py-1.5 bg-muted/30 dark:bg-muted/20 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
                                        >
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Simulation Output Card */}
                            <div className="pt-2 border-t border-border/60">
                                {simulating ? (
                                    <div className="p-4 text-center text-muted-foreground">
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-500" />
                                        <span className="text-xs mt-1 block font-medium">Evaluating rules...</span>
                                    </div>
                                ) : simulationResult ? (
                                    <div
                                        className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                                            simulationResult.provider === "IN_HOUSE"
                                                ? "bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/30 text-foreground"
                                                : "bg-blue-500/5 dark:bg-blue-950/20 border-blue-500/30 text-foreground"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold uppercase tracking-wider text-[11px] text-muted-foreground">
                                                Resolved Provider:
                                            </span>
                                            <span
                                                className={`px-3 py-1 rounded-full font-black text-xs shadow-xs ${
                                                    simulationResult.provider === "IN_HOUSE"
                                                        ? "bg-emerald-500 text-white"
                                                        : "bg-blue-600 text-white"
                                                }`}
                                            >
                                                {simulationResult.provider}
                                            </span>
                                        </div>

                                        <div className="space-y-1 text-xs">
                                            <div>
                                                <strong className="text-foreground">Matched Rule:</strong>{" "}
                                                <span className="text-muted-foreground">{simulationResult.rule_name || "Fallback to JLCPCB"}</span>
                                            </div>
                                            <div>
                                                <strong className="text-foreground">Quotation Source:</strong>{" "}
                                                <span className="font-mono text-muted-foreground">{simulationResult.quotation_source}</span>
                                            </div>
                                            <div>
                                                <strong className="text-foreground">Order Series:</strong>{" "}
                                                <span className="font-mono font-bold text-foreground">{simulationResult.series}</span>
                                            </div>
                                        </div>

                                        {/* Reasons if JLCPCB */}
                                        {simulationResult.reasons && simulationResult.reasons.length > 0 && (
                                            <div className="pt-2 border-t border-blue-500/20 space-y-1">
                                                <span className="font-bold text-rose-500 block">Routing Reasons:</span>
                                                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-rose-500/90">
                                                    {simulationResult.reasons.map((r: string, idx: number) => (
                                                        <li key={idx}>{r}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Matched conditions if In-House */}
                                        {simulationResult.matched_conditions && simulationResult.matched_conditions.length > 0 && (
                                            <div className="pt-2 border-t border-emerald-500/20 space-y-1">
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400 block">Verified Conditions ({simulationResult.matched_conditions.length}):</span>
                                                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                                                    {simulationResult.matched_conditions.slice(0, 5).map((c: string, idx: number) => (
                                                        <li key={idx} className="truncate">{c}</li>
                                                    ))}
                                                    {simulationResult.matched_conditions.length > 5 && (
                                                        <li className="italic">+ {simulationResult.matched_conditions.length - 5} more passed</li>
                                                    )}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Add / Edit Rule Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                        <div className="bg-card text-foreground rounded-2xl max-w-3xl w-full shadow-2xl border border-border/80 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
                            <form onSubmit={handleSaveRule}>
                                <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
                                    <div className="flex items-center gap-2">
                                        <Sliders className="w-5 h-5 text-emerald-500" />
                                        <h3 className="font-bold text-foreground text-base">
                                            {editingRule ? `Edit Rule: ${editingRule.name}` : "Create Quotation Provider Rule"}
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                                    {/* Basic Info */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-foreground mb-1">
                                                Rule Name <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.name}
                                                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                                                placeholder="e.g. Standard In-House 2-Layer"
                                                className="w-full px-3 py-2 bg-muted/30 dark:bg-muted/20 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:border-emerald-500 font-medium"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-foreground mb-1">
                                                Provider Target <span className="text-rose-500">*</span>
                                            </label>
                                            <select
                                                value={formData.provider}
                                                onChange={(e) => setFormData((f) => ({ ...f, provider: e.target.value as any }))}
                                                className="w-full px-3 py-2 bg-muted/30 dark:bg-muted/20 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
                                            >
                                                <option value="IN_HOUSE">IN-HOUSE (Local Fabrication)</option>
                                                <option value="JLCPCB">JLCPCB (External Partner)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-foreground mb-1">
                                                Priority (1 = Highest) <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="999"
                                                required
                                                value={formData.priority}
                                                onChange={(e) => setFormData((f) => ({ ...f, priority: parseInt(e.target.value, 10) || 10 }))}
                                                className="w-full px-3 py-2 bg-muted/30 dark:bg-muted/20 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:border-emerald-500 font-medium"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-foreground mb-1">
                                                Match Logic <span className="text-rose-500">*</span>
                                            </label>
                                            <select
                                                value={formData.match_type}
                                                onChange={(e) => setFormData((f) => ({ ...f, match_type: e.target.value as any }))}
                                                className="w-full px-3 py-2 bg-muted/30 dark:bg-muted/20 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
                                            >
                                                <option value="ALL">Match ALL Conditions (AND)</option>
                                                <option value="ANY">Match ANY Condition (OR)</option>
                                            </select>
                                        </div>

                                        <div className="flex items-center gap-3 pt-6">
                                            <input
                                                type="checkbox"
                                                id="is_active"
                                                checked={formData.is_active}
                                                onChange={(e) => setFormData((f) => ({ ...f, is_active: e.target.checked }))}
                                                className="w-4 h-4 rounded text-emerald-500 border-border focus:ring-emerald-500 cursor-pointer"
                                            />
                                            <label htmlFor="is_active" className="text-xs font-bold text-foreground cursor-pointer">
                                                Rule Active
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-foreground mb-1">
                                            Description / Notes
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={formData.description}
                                            onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                                            placeholder="Explain why this rule applies and what it covers..."
                                            className="w-full px-3 py-2 bg-muted/30 dark:bg-muted/20 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:border-emerald-500 font-medium"
                                        />
                                    </div>

                                    {/* Conditions Builder */}
                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-center justify-between border-b border-border/60 pb-2">
                                            <div>
                                                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Rule Conditions ({formData.conditions.length})</h4>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Specify field conditions that must evaluate to true.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={addCondition}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/40 hover:bg-muted/70 text-foreground border border-border/80 rounded-lg text-xs font-bold cursor-pointer transition-all shadow-xs"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Add Condition
                                            </button>
                                        </div>

                                        <div className="space-y-2.5">
                                            {formData.conditions.map((cond, idx) => {
                                                const fieldMeta = fieldsMeta.find((f) => f.field === cond.field);
                                                return (
                                                    <div
                                                        key={idx}
                                                        className="p-3 bg-muted/20 border border-border/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-2.5 text-xs"
                                                    >
                                                        {/* Field Select */}
                                                        <select
                                                            value={cond.field}
                                                            onChange={(e) => updateCondition(idx, { field: e.target.value })}
                                                            className="px-2.5 py-1.5 bg-card border border-border/80 rounded-lg font-bold text-foreground shrink-0 w-full sm:w-44 focus:outline-none focus:border-emerald-500 cursor-pointer"
                                                        >
                                                            {fieldsMeta.map((fm) => (
                                                                <option key={fm.field} value={fm.field}>
                                                                    {fm.label}
                                                                </option>
                                                            ))}
                                                        </select>

                                                        {/* Operator Select */}
                                                        <select
                                                            value={cond.operator}
                                                            onChange={(e) => updateCondition(idx, { operator: e.target.value })}
                                                            className="px-2 py-1.5 bg-card border border-border/80 rounded-lg font-mono text-emerald-600 dark:text-emerald-400 font-bold shrink-0 w-full sm:w-36 focus:outline-none focus:border-emerald-500 cursor-pointer"
                                                        >
                                                            {operatorsMeta.map((om) => (
                                                                <option key={om.value} value={om.value}>
                                                                    {om.label}
                                                                </option>
                                                            ))}
                                                        </select>

                                                        {/* Value Input */}
                                                        <div className="flex-1 w-full">
                                                            {cond.operator === "in" || cond.operator === "not_in" ? (
                                                                <input
                                                                    type="text"
                                                                    value={Array.isArray(cond.value) ? cond.value.join(", ") : String(cond.value)}
                                                                    onChange={(e) =>
                                                                        updateCondition(idx, {
                                                                            value: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                                                                        })
                                                                    }
                                                                    placeholder="Comma-separated values, e.g. FR-4, FR4"
                                                                    className="w-full px-2.5 py-1.5 bg-card border border-border/80 rounded-lg text-xs text-foreground focus:outline-none focus:border-emerald-500 font-medium"
                                                                />
                                                            ) : fieldMeta?.type === "boolean" ? (
                                                                <select
                                                                    value={String(cond.value)}
                                                                    onChange={(e) => updateCondition(idx, { value: e.target.value })}
                                                                    className="w-full px-2.5 py-1.5 bg-card border border-border/80 rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:border-emerald-500 cursor-pointer"
                                                                >
                                                                    <option value="No">No</option>
                                                                    <option value="Yes">Yes</option>
                                                                </select>
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    value={String(cond.value ?? "")}
                                                                    onChange={(e) => updateCondition(idx, { value: e.target.value })}
                                                                    placeholder="Value..."
                                                                    className="w-full px-2.5 py-1.5 bg-card border border-border/80 rounded-lg text-xs text-foreground focus:outline-none focus:border-emerald-500 font-medium"
                                                                />
                                                            )}
                                                        </div>

                                                        {/* Remove button */}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeCondition(idx)}
                                                            className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0 cursor-pointer"
                                                            title="Remove Condition"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="px-6 py-4 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 text-xs font-bold text-foreground bg-muted/40 hover:bg-muted/70 border border-border/80 rounded-xl transition-all cursor-pointer shadow-xs"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                                    >
                                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Save Rule
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
