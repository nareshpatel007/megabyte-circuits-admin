"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Save, Calculator, RefreshCw, Loader2, AlertTriangle, Layers, Palette, ShieldAlert, Truck, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/ui/skeleton";

type MaskType = "Green" | "Other";
type CopperType = "1oz" | "2oz";
type ThicknessType = "1.6" | "other";

const MASKS: { id: MaskType; label: string }[] = [
    { id: "Green", label: "Green Soldermask" },
    { id: "Other", label: "Other Color Soldermasks" }
];

const COPPER_WEIGHTS: { id: CopperType; label: string }[] = [
    { id: "1oz", label: "1 oz Copper Weight" },
    { id: "2oz", label: "2 oz Copper Weight" }
];

const THICKNESSES: { id: ThicknessType; label: string }[] = [
    { id: "1.6", label: "Standard 1.6mm Thickness" },
    { id: "other", label: "Other Thicknesses (<1.6mm or >1.6mm)" }
];

const LAYERS_LIST = ["1", "2", "4", "6", "8", "10"];
const AREA_BRACKETS = [
    { key: "0.5 or less", label: "≤ 0.5 m²" },
    { key: "0.51 to 1", label: "0.51 to 1.0 m²" },
    { key: "1.01 to 2", label: "1.01 to 2.0 m²" },
    { key: "2.01 to 3", label: "2.01 to 3.0 m²" },
    { key: "3.01 to 9.99", label: "3.01 to 9.99 m²" }
];

const LEAD_TIME_INDEX_LABELS = ["1 Day", "3 Days", "5 Days", "7 Days", "10/20 Days"];

const DEFAULT_SHIPPING_OPTIONS = [
    { key: "standard", location: "Standard", method: "Standard", rate: 0 },
    { key: "plus", location: "Plus", method: "Plus", rate: 150 },
    { key: "fasttrack", location: "Fasttrack", method: "Fasttrack", rate: 450 },
];

export default function PcbPricingPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Fixed Costs State
    const [fixedCosts, setFixedCosts] = useState<Record<string, Record<string, number>>>({});

    // Price Tiers State
    const [priceTiers, setPriceTiers] = useState<any>({});

    // Shipping Options State
    const [shippingOptions, setShippingOptions] = useState<Array<{ key: string; location: string; method: string; rate: number }>>([]);

    // UI Tab Filters for Price Tiers Table
    const [activeMask, setActiveMask] = useState<MaskType>("Green");
    const [activeCopper, setActiveCopper] = useState<CopperType>("1oz");
    const [activeThickness, setActiveThickness] = useState<ThicknessType>("1.6");

    const fetchPricing = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/pcb-pricing", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.data) {
                setFixedCosts(data.data.fixedCosts || {});
                setPriceTiers(data.data.priceTiers || {});
                setShippingOptions(
                    data.data.shippingOptions && data.data.shippingOptions.length > 0
                        ? data.data.shippingOptions
                        : DEFAULT_SHIPPING_OPTIONS
                );
            } else {
                toast.error(data.message || "Failed to load PCB pricing");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to load PCB pricing settings");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPricing();
    }, []);

    const handleFixedCostChange = (layer: string, day: string, value: string) => {
        const num = parseFloat(value) || 0;
        setFixedCosts(prev => ({
            ...prev,
            [layer]: {
                ...(prev[layer] || {}),
                [day]: num
            }
        }));
    };

    const handleTierPriceChange = (
        mask: MaskType,
        copper: CopperType,
        thickness: ThicknessType,
        layer: string,
        areaKey: string,
        index: number,
        valStr: string
    ) => {
        const num = parseFloat(valStr) || 0;
        setPriceTiers((prev: any) => {
            const copy = JSON.parse(JSON.stringify(prev || {}));
            if (!copy[mask]) copy[mask] = {};
            if (!copy[mask][copper]) copy[copper] = {};
            if (!copy[mask][copper][thickness]) copy[mask][copper][thickness] = {};
            if (!copy[mask][copper][thickness][layer]) copy[mask][copper][thickness][layer] = {};
            if (!Array.isArray(copy[mask][copper][thickness][layer][areaKey])) {
                copy[mask][copper][thickness][layer][areaKey] = [0, 0, 0, 0, 0];
            }
            copy[mask][copper][thickness][layer][areaKey][index] = num;
            return copy;
        });
    };

    const handleShippingChange = (index: number, field: string, value: any) => {
        setShippingOptions(prev => {
            const copy = [...prev];
            copy[index] = {
                ...copy[index],
                [field]: field === "rate" ? (value === "" ? "" : parseFloat(value) || 0) : value
            };
            return copy;
        });
    };

    const handleAddShippingOption = () => {
        setShippingOptions(prev => [
            ...prev,
            { key: `shipping_${Date.now().toString().slice(-4)}`, location: "New Region", method: "Delivery Method", rate: 50 }
        ]);
    };

    const handleDeleteShippingOption = (index: number) => {
        setShippingOptions(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/pcb-pricing", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    fixedCosts,
                    priceTiers,
                    shippingOptions
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success("PCB Pricing Calculations updated successfully!");
            } else {
                toast.error(data.message || "Failed to save PCB pricing.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error saving pricing settings");
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!confirm("Are you sure you want to reset PCB pricing calculations to factory defaults?")) return;
        setLoading(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/pcb-pricing/reset", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                toast.success("PCB Pricing reset to defaults");
                fetchPricing();
            } else {
                toast.error(data.message || "Failed to reset");
                setLoading(false);
            }
        } catch (err) {
            toast.error("Error resetting pricing");
            setLoading(false);
        }
    };

    return (
        <DashboardLayout
            title="PCB Pricing Settings"
            subtitle="Configure base setup fixed costs and variable tier matrices loaded live on the PCB quote calculator"
        >
            <div className="w-full space-y-6">
                {loading ? (
                    <div className="space-y-4">
                        <TableSkeleton />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Section 1: Lead Time Fixed Setup Costs */}
                        <div className="bg-card border border-border/80 rounded-xl p-5 md:p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/60">
                                <div>
                                    <h3 className="text-sm font-bold text-foreground tracking-tight">Layer & Lead Time Base Fixed Setup Costs (₹)</h3>
                                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                        Fixed setup cost per layer count and lead time days
                                    </p>
                                </div>
                                <button
                                    disabled={saving}
                                    onClick={handleSave}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-xs disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    Save Changes
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[650px]">
                                    <thead>
                                        <tr className="border-b border-border/60 bg-muted/30 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                            <th className="py-3 px-4">Layer Count</th>
                                            <th className="py-3 px-4">1 Day</th>
                                            <th className="py-3 px-4">3 Days</th>
                                            <th className="py-3 px-4">5 Days</th>
                                            <th className="py-3 px-4">7 Days</th>
                                            <th className="py-3 px-4">10 Days</th>
                                            <th className="py-3 px-4">20 Days</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40 text-xs">
                                        {LAYERS_LIST.map((layer) => (
                                            <tr key={layer} className="hover:bg-muted/20 transition-colors">
                                                <td className="py-3.5 px-4 font-bold text-foreground">
                                                    {layer} {layer === "1" ? "Layer" : "Layers"}
                                                </td>
                                                {[1, 3, 5, 7, 10, 20].map((day) => {
                                                    const val = fixedCosts[layer]?.[day.toString()];
                                                    return (
                                                        <td key={day} className="py-2 px-3">
                                                            <input
                                                                type="number"
                                                                value={val !== undefined ? val : ""}
                                                                placeholder="N/A"
                                                                onChange={(e) => handleFixedCostChange(layer, day.toString(), e.target.value)}
                                                                className="w-24 px-3 py-2 text-xs font-semibold bg-background/60 border border-border/85 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                                                            />
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Section 2: Variable Area & Tier Price Matrix Editor (Proper HTML Form UI) */}
                        <div className="bg-card border border-border/80 rounded-xl p-5 md:p-6 shadow-sm space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/60 gap-4">
                                <div>
                                    <h3 className="text-sm font-bold text-foreground tracking-tight">Area & Material Variable Rate Matrix (₹ / cm²)</h3>
                                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                        Rate per cm² organized by Solder Mask, Copper Weight, Board Thickness, and Total Area brackets
                                    </p>
                                </div>
                                <button
                                    disabled={saving}
                                    onClick={handleSave}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
                                >
                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    Save Changes
                                </button>
                            </div>

                            {/* Sub-Filters / Selection Pills */}
                            <div className="bg-muted/20 p-4 rounded-xl border border-border/50">
                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                    {/* Filter 1: Solder Mask */}
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                                            1. Solder Mask Color
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {MASKS.map((mask) => (
                                                <button
                                                    key={mask.id}
                                                    type="button"
                                                    onClick={() => setActiveMask(mask.id)}
                                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer border ${activeMask === mask.id
                                                        ? "bg-emerald-500 text-white border-emerald-500 shadow-xs"
                                                        : "bg-background text-foreground/80 hover:text-foreground border-border/80 hover:bg-muted/40"
                                                        }`}
                                                >
                                                    {mask.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Filter 2: Copper Weight */}
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                                            2. Copper Weight
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {COPPER_WEIGHTS.map((copper) => (
                                                <button
                                                    key={copper.id}
                                                    type="button"
                                                    onClick={() => setActiveCopper(copper.id)}
                                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer border ${activeCopper === copper.id
                                                        ? "bg-emerald-500 text-white border-emerald-500 shadow-xs"
                                                        : "bg-background text-foreground/80 hover:text-foreground border-border/80 hover:bg-muted/40"
                                                        }`}
                                                >
                                                    {copper.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Filter 3: PCB Thickness */}
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                                            3. PCB Thickness
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {THICKNESSES.map((thickness) => (
                                                <button
                                                    key={thickness.id}
                                                    type="button"
                                                    onClick={() => setActiveThickness(thickness.id)}
                                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer border ${activeThickness === thickness.id
                                                        ? "bg-emerald-500 text-white border-emerald-500 shadow-xs"
                                                        : "bg-background text-foreground/80 hover:text-foreground border-border/80 hover:bg-muted/40"
                                                        }`}
                                                >
                                                    {thickness.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Active Configuration Heading */}
                            <div className="flex items-center justify-between px-1">
                                <h4 className="text-xs font-bold uppercase text-foreground tracking-wider">
                                    Editing Matrix for: <span className="text-emerald-500">{activeMask}</span> / <span className="text-emerald-500">{activeCopper}</span> / <span className="text-emerald-500">{activeThickness === "1.6" ? "1.6mm" : "Other Thickness"}</span>
                                </h4>
                            </div>

                            {/* HTML Editable Tables per Layer */}
                            <div className="space-y-6">
                                {LAYERS_LIST.map((layer) => {
                                    const layerTiers = priceTiers[activeMask]?.[activeCopper]?.[activeThickness]?.[layer] || {};

                                    return (
                                        <div key={layer} className="border border-border/70 rounded-xl overflow-hidden shadow-2xs">
                                            <div className="bg-muted/40 px-4 py-2.5 border-b border-border/60 flex items-center justify-between">
                                                <span className="text-xs font-bold text-foreground tracking-tight">
                                                    {layer} {layer === "1" ? "Layer Board" : "Layers Board"}
                                                </span>
                                                <span className="text-[11px] font-medium text-muted-foreground">
                                                    Rate per cm² by Lead Time
                                                </span>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse min-w-[700px]">
                                                    <thead>
                                                        <tr className="border-b border-border/60 bg-muted/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                            <th className="py-2.5 px-4 w-40">Total Order Area</th>
                                                            {LEAD_TIME_INDEX_LABELS.map((lbl, idx) => (
                                                                <th key={idx} className="py-2.5 px-3">
                                                                    {lbl} (Rate ₹/cm²)
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border/40 text-xs">
                                                        {AREA_BRACKETS.map((area) => {
                                                            const pricesArray: number[] = Array.isArray(layerTiers[area.key])
                                                                ? layerTiers[area.key]
                                                                : [0, 0, 0, 0, 0];

                                                            return (
                                                                <tr key={area.key} className="hover:bg-muted/10 transition-colors">
                                                                    <td className="py-2.5 px-4 font-bold text-foreground text-[11px]">
                                                                        {area.label}
                                                                        <span className="block text-[10px] font-normal text-muted-foreground">{area.key}</span>
                                                                    </td>
                                                                    {[0, 1, 2, 3, 4].map((idx) => {
                                                                        const val = pricesArray[idx];
                                                                        return (
                                                                            <td key={idx} className="py-2 px-2.5">
                                                                                <input
                                                                                    type="number"
                                                                                    step="0.001"
                                                                                    value={val !== undefined ? val : ""}
                                                                                    placeholder="0.00"
                                                                                    onChange={(e) =>
                                                                                        handleTierPriceChange(
                                                                                            activeMask,
                                                                                            activeCopper,
                                                                                            activeThickness,
                                                                                            layer,
                                                                                            area.key,
                                                                                            idx,
                                                                                            e.target.value
                                                                                        )
                                                                                    }
                                                                                    className="w-24 px-2.5 py-1.5 text-xs font-semibold bg-background/80 border border-border/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                                                                                />
                                                                            </td>
                                                                        );
                                                                    })}
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
