"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import {
    Search,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Edit2,
    RotateCcw,
    Eye,
    Percent,
    DollarSign,
    Loader2,
    X,
    Check,
    Package,
    Sliders,
    Layers,
    Filter,
    ArrowUpRight,
    Settings,
} from "lucide-react";
import { toast } from "sonner";

interface PricingTier {
    BreakQuantity: number;
    DigiKeyUnitPrice: number;
    UnitPrice: number;
    TotalPrice: number;
}

interface DigiKeyAdminProduct {
    id: number;
    digikey_product_number: string | null;
    manufacturer_product_number: string;
    manufacturer_name: string | null;
    product_description: string | null;
    category: string | null;
    base_unit_price: number;
    margin_type: "percentage" | "fixed";
    margin_value: number;
    is_custom_margin: boolean;
    final_customer_price: number;
    quantity_available: number;
    product_status: string;
    pricing_tiers: PricingTier[];
    updated_at: string | null;
}

interface DefaultMarginConfig {
    margin_type: "percentage" | "fixed";
    margin_value: number;
    is_active: boolean;
}

export default function DigiKeyProductsManagementPage() {
    const [products, setProducts] = useState<DigiKeyAdminProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [defaultMargin, setDefaultMargin] = useState<DefaultMarginConfig>({
        margin_type: "percentage",
        margin_value: 0,
        is_active: true,
    });
    const [updatingDefault, setUpdatingDefault] = useState(false);

    // Selected products for bulk action
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Modals & Drawers State
    const [selectedProduct, setSelectedProduct] = useState<DigiKeyAdminProduct | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showTiersModal, setShowTiersModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [showDefaultModal, setShowDefaultModal] = useState(false);

    // Single Edit Form
    const [editMarginType, setEditMarginType] = useState<"percentage" | "fixed">("percentage");
    const [editMarginValue, setEditMarginValue] = useState<number>(0);
    const [submitting, setSubmitting] = useState(false);

    // Bulk Edit Form
    const [bulkMarginType, setBulkMarginType] = useState<"percentage" | "fixed">("percentage");
    const [bulkMarginValue, setBulkMarginValue] = useState<number>(0);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("admin_token");
            const queryParams = new URLSearchParams();
            queryParams.append("page", page.toString());
            queryParams.append("per_page", "15");
            if (search.trim()) queryParams.append("search", search.trim());
            if (categoryFilter !== "all") queryParams.append("category", categoryFilter);

            const res = await fetch(`/api/admin/settings/digikey-products?${queryParams.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();

            if (data.success) {
                setProducts(data.data || []);
                setTotalPages(data.meta?.last_page || 1);
                setTotalCount(data.meta?.total || 0);
                if (data.default_margin) {
                    setDefaultMargin(data.default_margin);
                }
            } else {
                toast.error(data.message || "Failed to fetch DigiKey products");
            }
        } catch (err) {
            console.error(err);
            toast.error("Network error fetching DigiKey products");
        } finally {
            setLoading(false);
        }
    }, [page, search, categoryFilter]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(products.map((p) => p.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleToggleSelect = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const handleOpenEdit = (prod: DigiKeyAdminProduct) => {
        setSelectedProduct(prod);
        setEditMarginType(prod.margin_type);
        setEditMarginValue(prod.margin_value);
        setShowEditModal(true);
    };

    const handleOpenTiers = (prod: DigiKeyAdminProduct) => {
        setSelectedProduct(prod);
        setShowTiersModal(true);
    };

    const handleSaveSingleMargin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;

        setSubmitting(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/settings/digikey-products/${selectedProduct.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    margin_type: editMarginType,
                    margin_value: Number(editMarginValue),
                }),
            });

            const data = await res.json();
            if (data.success) {
                toast.success("Product margin updated successfully");
                setShowEditModal(false);
                fetchProducts();
            } else {
                toast.error(data.message || "Failed to update margin");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error updating product margin");
        } finally {
            setSubmitting(false);
        }
    };

    const handleResetMargin = async (prod: DigiKeyAdminProduct) => {
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/settings/digikey-products/${prod.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();

            if (data.success) {
                toast.success("Margin reset to default successfully");
                fetchProducts();
            } else {
                toast.error(data.message || "Failed to reset margin");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error resetting product margin");
        }
    };

    const handleSaveBulkMargin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedIds.length === 0) {
            toast.error("No products selected for bulk action");
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/settings/digikey-products/bulk-margin", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    product_ids: selectedIds,
                    margin_type: bulkMarginType,
                    margin_value: Number(bulkMarginValue),
                }),
            });

            const data = await res.json();
            if (data.success) {
                toast.success(`Updated margin for ${selectedIds.length} products`);
                setShowBulkModal(false);
                setSelectedIds([]);
                fetchProducts();
            } else {
                toast.error(data.message || "Bulk margin update failed");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error updating bulk margins");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveDefaultMargin = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdatingDefault(true);

        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/settings/digikey-products/default-margin", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    margin_type: defaultMargin.margin_type,
                    margin_value: Number(defaultMargin.margin_value),
                }),
            });

            const data = await res.json();
            if (data.success) {
                toast.success("Global default DigiKey margin updated successfully");
                setShowDefaultModal(false);
                fetchProducts();
            } else {
                toast.error(data.message || "Failed to update default margin");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error updating default margin");
        } finally {
            setUpdatingDefault(false);
        }
    };

    // Helper preview price calculation for edit dialogs
    const calculatePreviewPrice = (base: number, type: "percentage" | "fixed", val: number) => {
        if (!base || base <= 0) return 0;
        if (type === "fixed") return Math.max(0, base + val);
        return Math.max(0, base * (1 + val / 100));
    };

    return (
        <DashboardLayout
            title="DigiKey Products Margin Management"
            subtitle="Manage product pricing margins, set global or item-level quantity break pricing rules for DigiKey electronic parts."
        >
            <div className="space-y-6">
                {/* Global Default Margin Banner */}
                <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 border border-emerald-500/20 rounded-2xl p-5 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                            <Sliders className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-base text-white">Global Default DigiKey Margin</h3>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    System Rule
                                </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-0.5">
                                Applied automatically to all DigiKey products without a product-specific custom margin override.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                        <div className="bg-white/10 backdrop-blur-xs px-4 py-2 rounded-xl border border-white/10 text-right">
                            <span className="text-[11px] text-slate-300 block font-medium">Default Rule</span>
                            <span className="text-sm font-extrabold text-emerald-300 font-mono">
                                {defaultMargin.margin_type === "percentage"
                                    ? `+${defaultMargin.margin_value}%`
                                    : `+₹${defaultMargin.margin_value.toFixed(2)}`}
                            </span>
                        </div>
                        <button
                            onClick={() => setShowDefaultModal(true)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                            <Settings className="w-4 h-4" />
                            <span>Edit Default</span>
                        </button>
                    </div>
                </div>

                {/* Filter & Action Toolbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-xs">
                    <div className="flex flex-wrap items-center gap-3 flex-1">
                        {/* Search Bar */}
                        <div className="relative flex-1 min-w-[220px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search by DigiKey Part #, Mfg Part #, Name..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Bulk Margin Button */}
                        {selectedIds.length > 0 && (
                            <button
                                onClick={() => setShowBulkModal(true)}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs px-3.5 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow-xs"
                            >
                                <Sliders className="w-3.5 h-3.5" />
                                <span>Bulk Set Margin ({selectedIds.length})</span>
                            </button>
                        )}

                        <button
                            onClick={fetchProducts}
                            title="Refresh Catalog"
                            className="p-2.5 text-muted-foreground hover:text-foreground border border-input rounded-lg bg-background hover:bg-accent transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        </button>
                    </div>
                </div>

                {/* Table View */}
                <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xs">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 text-muted-foreground">
                            <Loader2 className="w-6 h-6 animate-spin mr-2" />
                            <span>Loading DigiKey catalog & margin rules...</span>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-16 px-4">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                                <Package className="w-6 h-6" />
                            </div>
                            <h3 className="text-base font-semibold text-foreground">No DigiKey products found</h3>
                            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                                No products match your search query.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-muted/50 border-b border-border text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                                        <th className="py-3 px-4 w-10 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.length === products.length && products.length > 0}
                                                onChange={(e) => handleSelectAll(e.target.checked)}
                                                className="rounded border-input text-emerald-600 focus:ring-emerald-500"
                                            />
                                        </th>
                                        <th className="py-3 px-4">Product Details</th>
                                        <th className="py-3 px-4">Category / Mfg</th>
                                        <th className="py-3 px-4 text-right">Base DigiKey Price</th>
                                        <th className="py-3 px-4 text-center">Active Margin</th>
                                        <th className="py-3 px-4 text-right">Final Customer Price</th>
                                        <th className="py-3 px-4 text-center">Qty Breaks</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border text-sm">
                                    {products.map((item) => (
                                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-3.5 px-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(item.id)}
                                                    onChange={() => handleToggleSelect(item.id)}
                                                    className="rounded border-input text-emerald-600 focus:ring-emerald-500"
                                                />
                                            </td>

                                            {/* Product Details */}
                                            <td className="py-3.5 px-4 max-w-xs">
                                                <div className="font-bold text-foreground truncate" title={item.manufacturer_product_number}>
                                                    {item.manufacturer_product_number}
                                                </div>
                                                {item.digikey_product_number && (
                                                    <div className="text-xs text-muted-foreground font-mono">
                                                        DigiKey: {item.digikey_product_number}
                                                    </div>
                                                )}
                                                <div className="text-xs text-muted-foreground truncate mt-0.5" title={item.product_description || ""}>
                                                    {item.product_description || "No description"}
                                                </div>
                                            </td>

                                            {/* Category & Manufacturer */}
                                            <td className="py-3.5 px-4">
                                                <div className="text-xs font-semibold text-foreground">
                                                    {item.manufacturer_name || "-"}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground truncate">
                                                    {item.category || "General"}
                                                </div>
                                            </td>

                                            {/* Base Price */}
                                            <td className="py-3.5 px-4 text-right font-mono font-medium text-foreground whitespace-nowrap">
                                                ₹{item.base_unit_price.toFixed(2)}
                                            </td>

                                            {/* Active Margin */}
                                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                {item.is_custom_margin ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                                        {item.margin_type === "percentage" ? `${item.margin_value}%` : `₹${item.margin_value}`}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                                                        Default ({item.margin_type === "percentage" ? `${item.margin_value}%` : `₹${item.margin_value}`})
                                                    </span>
                                                )}
                                            </td>

                                            {/* Final Customer Price */}
                                            <td className="py-3.5 px-4 text-right font-mono font-extrabold text-emerald-600 whitespace-nowrap">
                                                ₹{item.final_customer_price.toFixed(2)}
                                            </td>

                                            {/* Quantity Breaks */}
                                            <td className="py-3.5 px-4 text-center">
                                                <button
                                                    onClick={() => handleOpenTiers(item)}
                                                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    <span>{item.pricing_tiers.length} Tiers</span>
                                                </button>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleOpenEdit(item)}
                                                        className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
                                                        title="Edit Margin"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    {item.is_custom_margin && (
                                                        <button
                                                            onClick={() => handleResetMargin(item)}
                                                            className="p-1.5 text-amber-600 hover:text-amber-700 rounded-md hover:bg-amber-500/10 transition-colors"
                                                            title="Reset to Default Margin"
                                                        >
                                                            <RotateCcw className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
                            <div>
                                Showing <span className="font-semibold text-foreground">{products.length}</span> of <span className="font-semibold text-foreground">{totalCount}</span> products
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                                    disabled={page === 1}
                                    className="p-1.5 border border-input rounded-md hover:bg-accent disabled:opacity-50 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span>Page {page} of {totalPages}</span>
                                <button
                                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                                    disabled={page === totalPages}
                                    className="p-1.5 border border-input rounded-md hover:bg-accent disabled:opacity-50 transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* EDIT SINGLE PRODUCT MARGIN MODAL */}
                {showEditModal && selectedProduct && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                                <h3 className="font-bold text-foreground flex items-center gap-2">
                                    <Edit2 className="w-4 h-4 text-emerald-600" />
                                    Configure Product Margin
                                </h3>
                                <button onClick={() => setShowEditModal(false)} className="p-1 text-muted-foreground hover:text-foreground rounded-md">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <form onSubmit={handleSaveSingleMargin} className="p-5 space-y-4">
                                <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1 text-xs">
                                    <div className="font-bold text-foreground">{selectedProduct.manufacturer_product_number}</div>
                                    <div className="text-muted-foreground">DigiKey Base Cost: <span className="font-mono font-bold text-foreground">₹{selectedProduct.base_unit_price.toFixed(2)}</span></div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1.5">Margin Type</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setEditMarginType("percentage")}
                                            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${editMarginType === "percentage"
                                                ? "border-emerald-600 bg-emerald-500/10 text-emerald-600"
                                                : "border-input bg-background text-muted-foreground hover:bg-accent"
                                                }`}
                                        >
                                            <Percent className="w-4 h-4" /> Percentage (%)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditMarginType("fixed")}
                                            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${editMarginType === "fixed"
                                                ? "border-emerald-600 bg-emerald-500/10 text-emerald-600"
                                                : "border-input bg-background text-muted-foreground hover:bg-accent"
                                                }`}
                                        >
                                            <DollarSign className="w-4 h-4" /> Fixed Amount (₹)
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1">
                                        Margin Value {editMarginType === "percentage" ? "(%)" : "(₹)"}
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        value={editMarginValue}
                                        onChange={(e) => setEditMarginValue(parseFloat(e.target.value) || 0)}
                                        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 font-mono font-bold"
                                    />
                                </div>

                                {/* Dynamic Customer Price Live Preview */}
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                                    <span className="text-xs font-semibold text-foreground">Calculated Customer Price:</span>
                                    <span className="text-base font-black font-mono text-emerald-600">
                                        ₹{calculatePreviewPrice(selectedProduct.base_unit_price, editMarginType, editMarginValue).toFixed(2)}
                                    </span>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className="px-4 py-2 border border-input rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50"
                                    >
                                        {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                        Save Margin
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* QUANTITY TIERS PREVIEW MODAL */}
                {showTiersModal && selectedProduct && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                                <h3 className="font-bold text-foreground flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-emerald-600" />
                                    Quantity Break Tiers Comparison
                                </h3>
                                <button onClick={() => setShowTiersModal(false)} className="p-1 text-muted-foreground hover:text-foreground rounded-md">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="text-xs text-muted-foreground">
                                    Product: <span className="font-bold text-foreground">{selectedProduct.manufacturer_product_number}</span>
                                </div>

                                <div className="border border-border rounded-xl overflow-hidden text-xs">
                                    <div className="bg-muted/50 grid grid-cols-4 px-3 py-2 font-bold text-muted-foreground border-b border-border">
                                        <span>Quantity</span>
                                        <span className="text-right">DigiKey Base</span>
                                        <span className="text-right">Customer Unit</span>
                                        <span className="text-right">Line Total</span>
                                    </div>
                                    {selectedProduct.pricing_tiers.map((tier, idx) => (
                                        <div key={idx} className="grid grid-cols-4 px-3 py-2 border-b border-border last:border-0 items-center font-mono">
                                            <span className="font-bold text-foreground">{tier.BreakQuantity}+</span>
                                            <span className="text-right text-muted-foreground">₹{tier.DigiKeyUnitPrice.toFixed(2)}</span>
                                            <span className="text-right font-bold text-emerald-600">₹{tier.UnitPrice.toFixed(2)}</span>
                                            <span className="text-right text-foreground font-semibold">₹{tier.TotalPrice.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={() => setShowTiersModal(false)}
                                        className="px-4 py-2 border border-input rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* BULK MARGIN EDIT MODAL */}
                {showBulkModal && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                                <h3 className="font-bold text-foreground flex items-center gap-2">
                                    <Sliders className="w-4 h-4 text-emerald-600" />
                                    Bulk Apply Product Margin
                                </h3>
                                <button onClick={() => setShowBulkModal(false)} className="p-1 text-muted-foreground hover:text-foreground rounded-md">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <form onSubmit={handleSaveBulkMargin} className="p-5 space-y-4">
                                <div className="p-3 bg-muted/40 rounded-xl border border-border text-xs text-foreground font-medium">
                                    Applying margin rule to <span className="font-bold text-emerald-600">{selectedIds.length}</span> selected products.
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1.5">Margin Type</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setBulkMarginType("percentage")}
                                            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${bulkMarginType === "percentage"
                                                ? "border-emerald-600 bg-emerald-500/10 text-emerald-600"
                                                : "border-input bg-background text-muted-foreground hover:bg-accent"
                                                }`}
                                        >
                                            <Percent className="w-4 h-4" /> Percentage (%)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setBulkMarginType("fixed")}
                                            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${bulkMarginType === "fixed"
                                                ? "border-emerald-600 bg-emerald-500/10 text-emerald-600"
                                                : "border-input bg-background text-muted-foreground hover:bg-accent"
                                                }`}
                                        >
                                            <DollarSign className="w-4 h-4" /> Fixed Amount (₹)
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1">
                                        Margin Value {bulkMarginType === "percentage" ? "(%)" : "(₹)"}
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        value={bulkMarginValue}
                                        onChange={(e) => setBulkMarginValue(parseFloat(e.target.value) || 0)}
                                        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 font-mono font-bold"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                                    <button
                                        type="button"
                                        onClick={() => setShowBulkModal(false)}
                                        className="px-4 py-2 border border-input rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50"
                                    >
                                        {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                        Apply to {selectedIds.length} Products
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* EDIT DEFAULT MARGIN MODAL */}
                {showDefaultModal && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                                <h3 className="font-bold text-foreground flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-emerald-600" />
                                    Configure Global Default Margin
                                </h3>
                                <button onClick={() => setShowDefaultModal(false)} className="p-1 text-muted-foreground hover:text-foreground rounded-md">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <form onSubmit={handleSaveDefaultMargin} className="p-5 space-y-4">
                                <p className="text-xs text-muted-foreground">
                                    This default margin rule will apply to all DigiKey products that do not have an explicit custom margin configured.
                                </p>

                                <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1.5">Margin Type</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setDefaultMargin((prev) => ({ ...prev, margin_type: "percentage" }))}
                                            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${defaultMargin.margin_type === "percentage"
                                                ? "border-emerald-600 bg-emerald-500/10 text-emerald-600"
                                                : "border-input bg-background text-muted-foreground hover:bg-accent"
                                                }`}
                                        >
                                            <Percent className="w-4 h-4" /> Percentage (%)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDefaultMargin((prev) => ({ ...prev, margin_type: "fixed" }))}
                                            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${defaultMargin.margin_type === "fixed"
                                                ? "border-emerald-600 bg-emerald-500/10 text-emerald-600"
                                                : "border-input bg-background text-muted-foreground hover:bg-accent"
                                                }`}
                                        >
                                            <DollarSign className="w-4 h-4" /> Fixed Amount (₹)
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1">
                                        Margin Value {defaultMargin.margin_type === "percentage" ? "(%)" : "(₹)"}
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        value={defaultMargin.margin_value}
                                        onChange={(e) =>
                                            setDefaultMargin((prev) => ({
                                                ...prev,
                                                margin_value: parseFloat(e.target.value) || 0,
                                            }))
                                        }
                                        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 font-mono font-bold"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                                    <button
                                        type="button"
                                        onClick={() => setShowDefaultModal(false)}
                                        className="px-4 py-2 border border-input rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={updatingDefault}
                                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50"
                                    >
                                        {updatingDefault ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                        Save Default Margin
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
