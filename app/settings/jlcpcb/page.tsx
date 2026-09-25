"use client";

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Save, Sliders, Plus, Loader2, Calculator, Check, ArrowRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/ui/skeleton";

interface JlcpcbSettings {
    international_shipping_usd: number;
    usd_to_inr_rate: number;
    customs_duty_percent: number;
    customs_other_charges: number;
    sws_charges: number;
    import_gst_percent: number;
    import_gst_options: number[];
    customs_clearing: number;
    bank_forex_payment_charges: number;
    domestic_freight: number;
    other_buy_expenses: number;
    margin_markup_percent: number;
    sales_gst_percent: number;
}

const DEFAULT_SETTINGS: JlcpcbSettings = {
    international_shipping_usd: 25,
    usd_to_inr_rate: 100,
    customs_duty_percent: 30,
    customs_other_charges: 0,
    sws_charges: 0,
    import_gst_percent: 18,
    import_gst_options: [0, 5, 12, 18, 20],
    customs_clearing: 0,
    bank_forex_payment_charges: 0,
    domestic_freight: 1000,
    other_buy_expenses: 0,
    margin_markup_percent: 20,
    sales_gst_percent: 18,
};

export default function JlcpcbManagementPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<JlcpcbSettings>(DEFAULT_SETTINGS);

    // Modal state for adding custom GST option
    const [showAddGstModal, setShowAddGstModal] = useState(false);
    const [newGstInput, setNewGstInput] = useState("");
    const [addingGst, setAddingGst] = useState(false);

    // Live calculation preview input state
    const [samplePcbUsd, setSamplePcbUsd] = useState<number>(1);
    const [sampleQty, setSampleQty] = useState<number>(1);
    const [fetchingFx, setFetchingFx] = useState(false);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/jlcpcb-settings", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success && data.data) {
                setSettings({
                    ...DEFAULT_SETTINGS,
                    ...data.data,
                    import_gst_options: data.data.import_gst_options || DEFAULT_SETTINGS.import_gst_options,
                });
            } else {
                toast.error(data.message || "Failed to load JLCPCB settings");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error loading settings");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const handleChange = (field: keyof JlcpcbSettings, value: any) => {
        setSettings((prev) => ({
            ...prev,
            [field]: typeof value === "number" ? value : parseFloat(value) || 0,
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/jlcpcb-settings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(settings),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("JLCPCB Procurement Settings updated successfully!");
                if (data.data) {
                    setSettings((prev) => ({ ...prev, ...data.data }));
                }
            } else {
                toast.error(data.message || "Failed to save settings.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error saving settings");
        } finally {
            setSaving(false);
        }
    };

    const handleFetchExchangeRate = async () => {
        setFetchingFx(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/jlcpcb-settings/exchange-rate?refresh=true", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success && data.rate) {
                const rate = parseFloat(data.rate);
                setSettings((prev) => ({ ...prev, usd_to_inr_rate: rate }));
                toast.success(`Fetched live exchange rate: 1 USD = ₹${rate}`);
            } else {
                toast.error(data.message || "Failed to fetch current exchange rate");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error fetching exchange rate");
        } finally {
            setFetchingFx(false);
        }
    };

    const handleAddGstOption = async () => {
        const rate = parseFloat(newGstInput);
        if (isNaN(rate) || rate < 0 || rate > 100) {
            toast.error("Please enter a valid GST percentage between 0 and 100");
            return;
        }

        setAddingGst(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/jlcpcb-settings/gst-options", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ rate }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message || `GST rate ${rate}% added!`);
                if (data.data && data.data.import_gst_options) {
                    setSettings((prev) => ({
                        ...prev,
                        import_gst_options: data.data.import_gst_options,
                        import_gst_percent: rate,
                    }));
                } else {
                    setSettings((prev) => ({
                        ...prev,
                        import_gst_options: Array.from(new Set([...prev.import_gst_options, rate])).sort((a, b) => a - b),
                        import_gst_percent: rate,
                    }));
                }
                setShowAddGstModal(false);
                setNewGstInput("");
            } else {
                toast.error(data.message || "Failed to add GST option");
            }
        } catch (err) {
            toast.error("Error adding GST option");
        } finally {
            setAddingGst(false);
        }
    };

    // Real-time calculated preview derived state matching Outsource_PCB_Cost_Calculator.html exactly
    const previewCalc = useMemo(() => {
        const pcb = Math.max(0, samplePcbUsd);
        const ship = Math.max(0, settings.international_shipping_usd);
        const fx = Math.max(0.01, settings.usd_to_inr_rate);
        const dutyPct = Math.max(0, settings.customs_duty_percent);
        const otherDuty = Math.max(0, settings.customs_other_charges);
        const sws = Math.max(0, settings.sws_charges);
        const importGstPct = Math.max(0, settings.import_gst_percent);
        const clearing = Math.max(0, settings.customs_clearing);
        const bank = Math.max(0, settings.bank_forex_payment_charges);
        const freight = Math.max(0, settings.domestic_freight);
        const otherBuy = Math.max(0, settings.other_buy_expenses);
        const marginPct = Math.max(0, settings.margin_markup_percent);
        const salesGstPct = Math.max(0, settings.sales_gst_percent);
        const qty = Math.max(1, sampleQty);

        const totalUsd = pcb + ship;
        const goodsInr = totalUsd * fx;
        const customsDuty = goodsInr * (dutyPct / 100);
        const gstBase = goodsInr + customsDuty + sws + otherDuty;
        const importGst = gstBase * (importGstPct / 100);
        const localExpenses = clearing + bank + freight + otherBuy;

        const buyTotalExGst = goodsInr + customsDuty + otherDuty + sws + localExpenses;
        const totalBuyCost = buyTotalExGst + importGst;

        const buyPerUnitEx = buyTotalExGst / qty;
        const buyPerUnitInc = totalBuyCost / qty;

        const marginAmount = totalBuyCost * (marginPct / 100);
        const sellingPriceBeforeGst = totalBuyCost + marginAmount;
        const salesGstAmount = sellingPriceBeforeGst * (salesGstPct / 100);
        const finalCustomerPrice = sellingPriceBeforeGst + salesGstAmount;

        const sellPerUnitEx = sellingPriceBeforeGst / qty;
        const sellPerUnitInc = finalCustomerPrice / qty;
        const profitPerUnit = marginAmount / qty;

        return {
            totalUsd,
            goodsInr,
            customsDuty,
            importGst,
            localExpenses,
            buyTotalExGst,
            totalBuyCost,
            buyPerUnitEx,
            buyPerUnitInc,
            marginAmount,
            sellingPriceBeforeGst,
            salesGstAmount,
            finalCustomerPrice,
            sellPerUnitEx,
            sellPerUnitInc,
            profitPerUnit,
        };
    }, [samplePcbUsd, sampleQty, settings]);

    const formatMoney = (val: number, decimals = 2) =>
        "₹" +
        val.toLocaleString("en-IN", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });

    return (
        <DashboardLayout
            title="JLCPCB Management"
            subtitle="Configure procurement costs, import charges, exchange rates, markup margins, and live calculation preview"
        >
            <div className="w-full space-y-6">
                {loading ? (
                    <TableSkeleton />
                ) : (
                    <div className="space-y-6">
                        {/* Header Action Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/80 rounded-xl p-4 md:p-5 shadow-xs">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
                                    <Sliders className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-foreground tracking-tight">JLCPCB Procurement & Pricing Parameters</h2>
                                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                        Configure live import expenses, taxes, exchange rates, and profit margin.
                                    </p>
                                </div>
                            </div>
                            <button
                                disabled={saving}
                                onClick={handleSave}
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Configuration
                            </button>
                        </div>

                        {/* Form Sections Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Section 1: BUY / PROCUREMENT */}
                            <div className="bg-card border border-border/80 rounded-xl p-5 shadow-sm space-y-4">
                                <div className="pb-3 border-b border-border/60 flex items-center justify-between">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">1. BUY / PROCUREMENT</h3>
                                    <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded text-muted-foreground">USD / INR</span>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                                            International Shipping (USD)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={settings.international_shipping_usd}
                                            onChange={(e) => handleChange("international_shipping_usd", e.target.value)}
                                            className="w-full px-3.5 py-2.5 text-sm font-semibold bg-background border border-border/85 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                                        />
                                        <p className="text-[11px] font-medium text-muted-foreground mt-1">
                                            {settings.international_shipping_usd > 0 ? (
                                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                                    ✓ Fixed shipping fee of ${settings.international_shipping_usd.toFixed(2)} USD will be applied.
                                                </span>
                                            ) : (
                                                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                                    ⚡ Set to 0: Actual delivery charges will be calculated directly from JLCPCB API.
                                                </span>
                                            )}
                                        </p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                                                USD → INR Exchange Rate (₹)
                                            </label>
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={settings.usd_to_inr_rate}
                                                onChange={(e) => handleChange("usd_to_inr_rate", e.target.value)}
                                                className="w-full px-3.5 py-2.5 text-sm font-semibold bg-background border border-border/85 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                                            />
                                            <button
                                                type="button"
                                                disabled={fetchingFx}
                                                onClick={handleFetchExchangeRate}
                                                title="Fetch live USD to INR exchange rate from API"
                                                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 disabled:opacity-50 shadow-xs"
                                            >
                                                {fetchingFx ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <RefreshCw className="w-4 h-4" />
                                                )}
                                                <span>Fetch Rate</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: IMPORT & LOCAL CHARGES */}
                            <div className="bg-card border border-border/80 rounded-xl p-5 shadow-sm space-y-4 lg:col-span-2">
                                <div className="pb-3 border-b border-border/60 flex items-center justify-between">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">2. IMPORT & LOCAL CHARGES</h3>
                                    <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded text-muted-foreground">CUSTOMS & TAXES</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                                            Customs Duty (%)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={settings.customs_duty_percent}
                                            onChange={(e) => handleChange("customs_duty_percent", e.target.value)}
                                            className="w-full px-3.5 py-2.5 text-sm font-semibold bg-background border border-border/85 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                                            Customs / Duty Other Charges (₹)
                                        </label>
                                        <input
                                            type="number"
                                            step="1"
                                            value={settings.customs_other_charges}
                                            onChange={(e) => handleChange("customs_other_charges", e.target.value)}
                                            className="w-full px-3.5 py-2.5 text-sm font-semibold bg-background border border-border/85 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                                            Social Welfare Surcharge / SWS (₹)
                                        </label>
                                        <input
                                            type="number"
                                            step="1"
                                            value={settings.sws_charges}
                                            onChange={(e) => handleChange("sws_charges", e.target.value)}
                                            className="w-full px-3.5 py-2.5 text-sm font-semibold bg-background border border-border/85 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                                        />
                                    </div>

                                    {/* Configurable Import GST / IGST Dropdown */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                                                Import GST / IGST (%)
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setShowAddGstModal(true)}
                                                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                                            >
                                                <Plus className="w-3 h-3" /> Add Rate
                                            </button>
                                        </div>
                                        <select
                                            value={settings.import_gst_percent}
                                            onChange={(e) => handleChange("import_gst_percent", parseFloat(e.target.value))}
                                            className="w-full px-3.5 py-2.5 text-sm font-bold bg-background border border-border/85 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer font-mono"
                                        >
                                            {settings.import_gst_options.map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}% GST / IGST
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                                            Customs Clearing (₹)
                                        </label>
                                        <input
                                            type="number"
                                            step="1"
                                            value={settings.customs_clearing}
                                            onChange={(e) => handleChange("customs_clearing", e.target.value)}
                                            className="w-full px-3.5 py-2.5 text-sm font-semibold bg-background border border-border/85 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                                            Bank / Forex / Payment Charges (₹)
                                        </label>
                                        <input
                                            type="number"
                                            step="1"
                                            value={settings.bank_forex_payment_charges}
                                            onChange={(e) => handleChange("bank_forex_payment_charges", e.target.value)}
                                            className="w-full px-3.5 py-2.5 text-sm font-semibold bg-background border border-border/85 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                                            Domestic Freight / UPS (₹)
                                        </label>
                                        <input
                                            type="number"
                                            step="1"
                                            value={settings.domestic_freight}
                                            onChange={(e) => handleChange("domestic_freight", e.target.value)}
                                            className="w-full px-3.5 py-2.5 text-sm font-semibold bg-background border border-border/85 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                                            Other Buy Expenses (₹)
                                        </label>
                                        <input
                                            type="number"
                                            step="1"
                                            value={settings.other_buy_expenses}
                                            onChange={(e) => handleChange("other_buy_expenses", e.target.value)}
                                            className="w-full px-3.5 py-2.5 text-sm font-semibold bg-background border border-border/85 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: SELLING PRICE & MARGIN */}
                        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-sm space-y-4">
                            <div className="pb-3 border-b border-border/60 flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">3. SELLING PRICE & MARKUP</h3>
                                <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded">CUSTOMER SELLING PRICING</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                                        Margin / Markup on Buy Cost (%)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            value={settings.margin_markup_percent}
                                            onChange={(e) => handleChange("margin_markup_percent", e.target.value)}
                                            className="w-full px-3.5 py-2.5 text-sm font-bold bg-background border border-border/85 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                                        />
                                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground">%</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground font-medium">Applied directly to Total Buy Cost. Hidden from customer UI.</p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                                        Sales GST (%)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            value={settings.sales_gst_percent}
                                            onChange={(e) => handleChange("sales_gst_percent", e.target.value)}
                                            className="w-full px-3.5 py-2.5 text-sm font-bold bg-background border border-border/85 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                                        />
                                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground">%</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground font-medium">Applied on Selling Price (Before GST) for customer invoice.</p>
                                </div>
                            </div>
                        </div>

                        {/* LIVE PREVIEW CALCULATOR WIDGET (Matching Outsource_PCB_Cost_Calculator.html) */}
                        <div className="bg-card border border-border/80 rounded-xl p-5 md:p-6 shadow-sm space-y-6">
                            <div className="pb-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <Calculator className="w-5 h-5 text-emerald-600" />
                                    <div>
                                        <h3 className="text-sm font-bold text-foreground tracking-tight">Live Procurement & Quotation Calculation Preview</h3>
                                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                            Instant calculation simulation matching Outsource PCB Cost Calculator model
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-muted/30 px-3 py-1.5 rounded-xl border border-border/60">
                                    <div className="flex items-center gap-1.5">
                                        <label className="text-xs font-bold text-muted-foreground whitespace-nowrap">Sample PCB ($):</label>
                                        <input
                                            type="number"
                                            value={samplePcbUsd}
                                            onChange={(e) => setSamplePcbUsd(parseFloat(e.target.value) || 0)}
                                            className="w-20 px-2 py-1 text-xs font-bold bg-background border border-border/80 rounded-md font-mono"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <label className="text-xs font-bold text-muted-foreground whitespace-nowrap">Qty:</label>
                                        <input
                                            type="number"
                                            value={sampleQty}
                                            onChange={(e) => setSampleQty(parseInt(e.target.value, 10) || 1)}
                                            className="w-16 px-2 py-1 text-xs font-bold bg-background border border-border/80 rounded-md font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left Box: BUY COST BREAKDOWN */}
                                <div className="space-y-2 bg-muted/20 p-4 rounded-xl border border-border/60">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/40">
                                        Procurement / Landed Buy Cost Breakdown
                                    </h4>

                                    <div className="flex justify-between items-center text-xs py-1.5 border-b border-border/30">
                                        <span className="text-muted-foreground">Goods + Intl Shipping (INR)</span>
                                        <span className="font-mono font-bold text-foreground">{formatMoney(previewCalc.goodsInr)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs py-1.5 border-b border-border/30">
                                        <span className="text-muted-foreground">Customs Duty ({settings.customs_duty_percent}%)</span>
                                        <span className="font-mono font-bold text-foreground">{formatMoney(previewCalc.customsDuty)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs py-1.5 border-b border-border/30">
                                        <span className="text-muted-foreground">Other Duty Charges & SWS</span>
                                        <span className="font-mono font-bold text-foreground">{formatMoney(settings.customs_other_charges + settings.sws_charges)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs py-1.5 border-b border-border/30">
                                        <span className="text-muted-foreground">Import GST / IGST ({settings.import_gst_percent}%)</span>
                                        <span className="font-mono font-bold text-foreground">{formatMoney(previewCalc.importGst)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs py-1.5 border-b border-border/30">
                                        <span className="text-muted-foreground">Clearing + Bank + Freight + Other</span>
                                        <span className="font-mono font-bold text-foreground">{formatMoney(previewCalc.localExpenses)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs py-2.5 px-3 bg-blue-600 text-white rounded-lg font-black shadow-xs">
                                        <span className="font-extrabold text-white tracking-wide">BUY COST — BEFORE GST</span>
                                        <span className="font-mono font-black text-sm text-white">{formatMoney(previewCalc.buyTotalExGst)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs py-2.5 px-3 bg-emerald-600 text-white rounded-lg font-black shadow-xs">
                                        <span className="font-extrabold text-white tracking-wide">TOTAL BUY COST — INCLUDING GST</span>
                                        <span className="font-mono font-black text-sm text-white">{formatMoney(previewCalc.totalBuyCost)}</span>
                                    </div>
                                </div>

                                {/* Right Box: SELLING PRICE & CUSTOMER QUOTE */}
                                <div className="space-y-2 bg-muted/20 p-4 rounded-xl border border-border/60">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/40">
                                        Selling Price & Customer Quote Output
                                    </h4>

                                    <div className="flex justify-between items-center text-xs py-1.5 border-b border-border/30">
                                        <span className="text-muted-foreground">Margin Amount ({settings.margin_markup_percent}%)</span>
                                        <span className="font-mono font-bold text-amber-600">{formatMoney(previewCalc.marginAmount)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs py-1.5 border-b border-border/30">
                                        <span className="text-muted-foreground">Selling Price (Before GST)</span>
                                        <span className="font-mono font-bold text-foreground">{formatMoney(previewCalc.sellingPriceBeforeGst)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs py-1.5 border-b border-border/30">
                                        <span className="text-muted-foreground">Sales GST ({settings.sales_gst_percent}%)</span>
                                        <span className="font-mono font-bold text-foreground">{formatMoney(previewCalc.salesGstAmount)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs py-2.5 px-3 bg-emerald-600 text-white rounded-lg font-black mt-3 shadow-xs">
                                        <span className="font-extrabold text-white tracking-wide">CUSTOMER INVOICE — WITH GST</span>
                                        <span className="font-mono text-base font-black text-white">
                                            {formatMoney(previewCalc.finalCustomerPrice)}
                                        </span>
                                    </div>

                                    {/* Customer Exposed View Preview */}
                                    <div className="mt-4 p-3 bg-background border border-border/70 rounded-xl space-y-1.5">
                                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                                            Customer UI Displayed Pricing Breakdown
                                        </p>
                                        <div className="text-xs space-y-1 font-semibold text-foreground">
                                            <div className="flex justify-between">
                                                <span>PCB Price:</span>
                                                <span className="font-mono font-bold">{formatMoney(previewCalc.sellingPriceBeforeGst)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>GST ({settings.sales_gst_percent}%):</span>
                                                <span className="font-mono font-bold">{formatMoney(previewCalc.salesGstAmount)}</span>
                                            </div>
                                            <div className="flex justify-between pt-1.5 border-t border-border/60 text-emerald-700 dark:text-emerald-400 font-black text-sm">
                                                <span>Total:</span>
                                                <span className="font-mono">{formatMoney(previewCalc.finalCustomerPrice)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal to add custom GST option */}
            {showAddGstModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
                    <div className="bg-card border border-border/80 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <h3 className="text-sm font-bold text-foreground tracking-tight">Add New Import GST Rate Option</h3>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                                GST Percentage Rate (%)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={newGstInput}
                                onChange={(e) => setNewGstInput(e.target.value)}
                                placeholder="e.g. 28"
                                className="w-full px-3.5 py-2.5 text-sm font-bold bg-background border border-border/85 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                            />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowAddGstModal(false)}
                                className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={addingGst}
                                onClick={handleAddGstOption}
                                className="px-4 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                            >
                                {addingGst ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                Add Rate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
