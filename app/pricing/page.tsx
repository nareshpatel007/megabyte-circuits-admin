"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { toast } from "sonner";
import { Save, Calculator } from "lucide-react";

const defaultConfig = {
  globalMargin: 22,
  standardShipping: 250,
  expressShipping: 650,
  customsMultiplier: 1.15,
  jlcMarkup: 8,
  rushPremium: 35,
};

export default function PricingPage() {
  const [config, setConfig] = useState(defaultConfig);
  const [previewCost, setPreviewCost] = useState("");
  const [lastSaved, setLastSaved] = useState("Today at 09:42 AM");

  const set = (key: keyof typeof config, val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num)) setConfig((prev) => ({ ...prev, [key]: num }));
  };

  const finalPrice = () => {
    const base = parseFloat(previewCost);
    if (isNaN(base) || base <= 0) return null;
    const afterJlc = base * (1 + config.jlcMarkup / 100);
    const afterMargin = afterJlc * (1 + config.globalMargin / 100);
    const afterCustoms = afterMargin * config.customsMultiplier;
    return Math.round(afterCustoms);
  };

  const handleSave = () => {
    setLastSaved(
      new Date().toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    );
    toast.success("Pricing configuration saved successfully.");
  };

  const fields: { key: keyof typeof config; label: string; suffix: string; description: string }[] = [
    { key: "globalMargin", label: "Global Profit Margin", suffix: "%", description: "Applied on top of all JLC costs" },
    { key: "standardShipping", label: "Standard Shipping Rate", suffix: "₹", description: "Base shipping charge per order" },
    { key: "expressShipping", label: "Express Shipping Rate", suffix: "₹", description: "Priority shipping charge per order" },
    { key: "customsMultiplier", label: "Customs / Duties Multiplier", suffix: "x", description: "Multiplied after margin (e.g. 1.15 = +15%)" },
    { key: "jlcMarkup", label: "JLC API Markup", suffix: "%", description: "Added on top of raw JLC cost before margin" },
    { key: "rushPremium", label: "Rush Order Premium", suffix: "%", description: "Extra charge for rush / expedited orders" },
  ];

  const preview = finalPrice();

    return (
        <DashboardLayout title="Pricing & Margin Config" subtitle="Adjust global pricing rules on top of JLC PCB costs">
            <div className="max-w-3xl space-y-6">
                {/* Config Form */}
                <div className="bg-card border border-border/80 rounded-xl p-6 md:p-8 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-border/60">
                        <div>
                            <h2 className="text-base font-bold text-foreground tracking-tight">Pricing Rules</h2>
                            <p className="text-xs text-muted-foreground mt-1">Last saved: <span className="font-semibold">{lastSaved}</span></p>
                        </div>
                        <button
                            onClick={handleSave}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg shadow-emerald-500/10 transition-all active:scale-[0.98] cursor-pointer"
                        >
                            <Save className="w-4.5 h-4.5" />
                            Save Configuration
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {fields.map((f) => (
                            <div key={f.key} className="space-y-1.5">
                                <label className="block text-xs font-bold text-foreground uppercase tracking-wider">{f.label}</label>
                                <div className="flex items-center relative group">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={config[f.key]}
                                        onChange={(e) => set(f.key, e.target.value)}
                                        className="w-full px-3.5 py-3 pr-10 text-sm bg-background/50 border border-border/80 rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium"
                                    />
                                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/60">
                                        {f.suffix}
                                    </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground font-medium">{f.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pricing Preview Calculator */}
                <div className="bg-card border border-border/80 rounded-xl p-6 md:p-8 shadow-sm">
                    <div className="flex items-center gap-2.5 mb-2">
                        <Calculator className="w-5 h-5 text-emerald-500" />
                        <h2 className="text-base font-bold text-foreground tracking-tight">Pricing Calculator</h2>
                    </div>
                    <p className="text-xs text-muted-foreground mb-6 font-medium">Enter the raw JLC cost to see the final customer-facing price.</p>

                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                        <div className="flex-1 w-full space-y-1.5">
                            <label className="block text-xs font-bold text-foreground uppercase tracking-wider">Raw JLC Cost (₹)</label>
                            <input
                                type="number"
                                placeholder="e.g. 5000"
                                value={previewCost}
                                onChange={(e) => setPreviewCost(e.target.value)}
                                className="w-full px-3.5 py-3 text-sm bg-background/50 border border-border/80 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium"
                            />
                        </div>

                        <div className="flex-1 w-full space-y-1.5">
                            <label className="block text-xs font-bold text-foreground uppercase tracking-wider">Final Customer Price</label>
                            <div className="px-4 py-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl min-h-[46px] flex items-center shadow-inner">
                                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                                    {preview !== null ? `₹${preview.toLocaleString("en-IN")}` : "—"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {preview !== null && previewCost && (
                        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border/60 pt-6">
                            {[
                                ["JLC Markup", `₹${Math.round(parseFloat(previewCost) * config.jlcMarkup / 100).toLocaleString("en-IN")}`],
                                ["Profit Margin", `₹${Math.round(parseFloat(previewCost) * (1 + config.jlcMarkup / 100) * config.globalMargin / 100).toLocaleString("en-IN")}`],
                                ["Customs Added", `${((config.customsMultiplier - 1) * 100).toFixed(0)}%`],
                            ].map(([label, val]) => (
                                <div key={label} className="bg-background/40 border border-border/60 rounded-xl p-3.5 text-center">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">{label}</p>
                                    <p className="text-sm font-bold text-foreground mt-1">{val}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
