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
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Pricing Rules</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Last saved: {lastSaved}</p>
            </div>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Configuration
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-foreground mb-1">{f.label}</label>
                <div className="flex items-center">
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      step="0.01"
                      value={config[f.key]}
                      onChange={(e) => set(f.key, e.target.value)}
                      className="w-full px-3 py-2 pr-10 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
                      {f.suffix}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{f.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Preview Calculator */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Pricing Calculator</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Enter the raw JLC cost to see the final customer-facing price.</p>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-foreground mb-1">Raw JLC Cost (₹)</label>
              <input
                type="number"
                placeholder="e.g. 5000"
                value={previewCost}
                onChange={(e) => setPreviewCost(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex-1">
              <label className="block text-xs font-medium text-foreground mb-1">Final Customer Price</label>
              <div className="px-3 py-2 bg-primary/10 border border-primary/30 rounded-lg min-h-[38px] flex items-center">
                <span className="text-sm font-bold text-primary">
                  {preview !== null ? `₹${preview.toLocaleString("en-IN")}` : "—"}
                </span>
              </div>
            </div>
          </div>

          {preview !== null && previewCost && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                ["JLC Markup", `₹${Math.round(parseFloat(previewCost) * config.jlcMarkup / 100).toLocaleString("en-IN")}`],
                ["Profit Margin", `₹${Math.round(parseFloat(previewCost) * (1 + config.jlcMarkup / 100) * config.globalMargin / 100).toLocaleString("en-IN")}`],
                ["Customs Added", `${((config.customsMultiplier - 1) * 100).toFixed(0)}%`],
              ].map(([label, val]) => (
                <div key={label} className="bg-background border border-border rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{val}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
