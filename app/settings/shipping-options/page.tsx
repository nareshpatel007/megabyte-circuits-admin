"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Save, Truck, RefreshCw, Loader2, Key } from "lucide-react";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/ui/skeleton";

interface ShippingOption {
    key: string;
    location: string;
    method: string;
    rate: number;
}

const FIXED_SHIPPING_OPTIONS: ShippingOption[] = [
    { key: "gujarat_road", location: "In Gujarat", method: "By Road", rate: 40 },
    { key: "out_road", location: "Out of Gujarat", method: "By Road", rate: 80 },
    { key: "out_air", location: "Out of Gujarat", method: "By Air", rate: 150 },
    { key: "out_fastrack", location: "Out of Gujarat", method: "Fastrack", rate: 450 },
];

export default function ShippingOptionsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>(FIXED_SHIPPING_OPTIONS);

    const fetchPricing = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/pcb-pricing", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.data) {
                const fetchedOptions: ShippingOption[] = data.data.shippingOptions || [];

                // Merge fetched rates with fixed option structure to guarantee exact keys & descriptions
                const merged = FIXED_SHIPPING_OPTIONS.map(fixedOpt => {
                    const match = fetchedOptions.find(o => o.key === fixedOpt.key);
                    return {
                        ...fixedOpt,
                        rate: match && typeof match.rate === 'number' ? match.rate : (match && match.rate ? parseFloat(match.rate as any) || fixedOpt.rate : fixedOpt.rate)
                    };
                });

                setShippingOptions(merged);
            } else {
                toast.error(data.message || "Failed to load shipping rates");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to load shipping options settings");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPricing();
    }, []);

    const handleRateChange = (index: number, value: string) => {
        const numVal = value === "" ? 0 : parseFloat(value) || 0;
        setShippingOptions(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], rate: numVal };
            return copy;
        });
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
                    shippingOptions
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Shipping rates updated successfully!");
            } else {
                toast.error(data.message || "Failed to save shipping rates.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error saving shipping rates");
        } finally {
            setSaving(false);
        }
    };

    return (
        <DashboardLayout
            title="Shipping Options Settings"
            subtitle="Configure delivery freight charges (₹ / kg) applied live on the PCB quote calculator"
        >
            <div className="w-full space-y-6">
                {loading ? (
                    <div className="space-y-4">
                        <TableSkeleton />
                    </div>
                ) : (
                    <div className="bg-card border border-border/80 rounded-xl p-5 md:p-6 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/60 gap-4">
                            <div>
                                <h3 className="text-sm font-bold text-foreground tracking-tight">Delivery Regions & Freight Rates (₹ / kg)</h3>
                                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                    Option keys, delivery regions, and transport methods are fixed. Edit the per-kg rate below.
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
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                    <tr className="border-b border-border/60 bg-muted/30 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                        <th className="py-3 px-4 w-12 text-center">#</th>
                                        <th className="py-3 px-4">Delivery Region / Location</th>
                                        <th className="py-3 px-4">Transport Method</th>
                                        <th className="py-3 px-4 w-52">Auto Option Key</th>
                                        <th className="py-3 px-4 w-44">Rate (₹ / kg)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40 text-xs">
                                    {shippingOptions.map((opt, idx) => (
                                        <tr key={opt.key} className="hover:bg-muted/20 transition-colors">
                                            <td className="py-3 px-4 text-center font-bold text-muted-foreground text-xs">
                                                {idx + 1}
                                            </td>
                                            <td className="py-3 px-4 font-bold text-foreground">
                                                <div className="px-3 py-2 bg-muted/20 border border-border/40 rounded-lg text-xs font-semibold text-foreground">
                                                    {opt.location}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 font-bold text-foreground">
                                                <div className="px-3 py-2 bg-muted/20 border border-border/40 rounded-lg text-xs font-semibold text-foreground">
                                                    {opt.method}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-emerald-700 dark:text-emerald-300 font-mono text-[11px]">
                                                    <Key className="w-3.5 h-3.5 shrink-0 text-emerald-500/70" />
                                                    <span>{opt.key}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="relative">
                                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">₹</span>
                                                    <input
                                                        type="number"
                                                        step="1"
                                                        value={opt.rate !== undefined ? opt.rate : ""}
                                                        onChange={(e) => handleRateChange(idx, e.target.value)}
                                                        placeholder="40"
                                                        className="w-full pl-8 pr-3.5 py-2 text-xs font-extrabold bg-background border border-border/85 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-emerald-600 dark:text-emerald-400"
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
