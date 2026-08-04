"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { ArrowLeft, Boxes, Plus, Sparkles, PackageCheck, Tag, DollarSign, Layers, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function AddInventoryPage() {
    const router = useRouter();

    const [name, setName] = useState("");
    const [sku, setSku] = useState("");
    const [unitPrice, setUnitPrice] = useState("");
    const [availableQuantity, setAvailableQuantity] = useState("");
    const [lowStockThreshold, setLowStockThreshold] = useState("1000");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const price = parseFloat(unitPrice);
        const qty = parseInt(availableQuantity);
        const threshold = parseInt(lowStockThreshold);

        if (!name.trim()) {
            toast.error("Component name is required.");
            return;
        }
        if (!sku.trim()) {
            toast.error("SKU code is required.");
            return;
        }
        if (isNaN(price) || price < 0) {
            toast.error("Valid unit price is required.");
            return;
        }
        if (isNaN(qty) || qty < 0) {
            toast.error("Valid available quantity is required.");
            return;
        }
        if (isNaN(threshold) || threshold < 0) {
            toast.error("Valid low stock threshold is required.");
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/inventory", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: name.trim(),
                    sku: sku.trim().toUpperCase(),
                    unit_price: price,
                    available_quantity: qty,
                    low_stock_threshold: threshold
                })
            });

            const data = await res.json();

            if (res.ok && (data.status || data.success)) {
                toast.success(data.message || `Component "${name.trim()}" added to inventory!`);
                router.push("/inventory");
            } else {
                toast.error(data.message || "Failed to add component");
            }
        } catch (err) {
            console.error("Failed to save component:", err);
            toast.error("Error adding component to inventory.");
        } finally {
            setLoading(false);
        }
    };

    const backButton = (
        <Link
            href="/inventory"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-card border border-border/80 hover:bg-muted text-foreground transition-all shadow-xs"
        >
            <ArrowLeft className="w-4 h-4 text-emerald-500" />
            Back to Inventory
        </Link>
    );

    return (
        <DashboardLayout title="Add New Component" subtitle="Track new PCB component, specs & warehouse stock" action={backButton}>
            <div className="w-full space-y-6 animate-in fade-in duration-300">

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-6">
                        <div className="flex items-center gap-2 pb-4 border-b border-border/60">
                            <Sparkles className="w-5 h-5 text-emerald-500" />
                            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Component Information</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    Component Name <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <PackageCheck className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. 10kΩ 0603 Resistor"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2.5 bg-muted/30 border border-border/80 rounded-xl text-foreground font-semibold focus:outline-hidden focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    SKU Code <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <Tag className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. RES-10K-0603"
                                        value={sku}
                                        onChange={(e) => setSku(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2.5 bg-muted/30 border border-border/80 rounded-xl text-foreground font-mono font-bold focus:outline-hidden focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    Unit Price (₹) <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <DollarSign className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        placeholder="e.g. 0.15"
                                        value={unitPrice}
                                        onChange={(e) => setUnitPrice(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2.5 bg-muted/30 border border-border/80 rounded-xl text-foreground font-bold focus:outline-hidden focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    Initial Available Quantity <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <Layers className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                                    <input
                                        type="number"
                                        min="0"
                                        required
                                        placeholder="e.g. 50000"
                                        value={availableQuantity}
                                        onChange={(e) => setAvailableQuantity(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2.5 bg-muted/30 border border-border/80 rounded-xl text-foreground font-bold focus:outline-hidden focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5 md:col-span-2">
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    Low Stock Threshold <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <AlertTriangle className="w-4 h-4 text-amber-500 absolute left-3 top-3" />
                                    <input
                                        type="number"
                                        min="0"
                                        required
                                        placeholder="e.g. 10000"
                                        value={lowStockThreshold}
                                        onChange={(e) => setLowStockThreshold(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2.5 bg-muted/30 border border-border/80 rounded-xl text-foreground font-bold focus:outline-hidden focus:border-emerald-500"
                                    />
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    When available quantity drops below or equals this threshold, the status automatically switches to Low Stock.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
                            <Link
                                href="/inventory"
                                className="px-5 py-2.5 rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground text-xs font-bold transition-all cursor-pointer"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-extrabold shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                {loading ? "Adding Component..." : "Add Component"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
