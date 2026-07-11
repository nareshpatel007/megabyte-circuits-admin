"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { mockInventory, type InventoryItem } from "@/lib/mock-data";
import { Search, Plus, Pencil, Trash2, AlertTriangle, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";

const statusStyle: Record<string, string> = {
  "In Stock": "bg-green-500/20 text-green-400 border-green-500/30",
  "Low Stock": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "Out of Stock": "bg-red-500/20 text-red-400 border-red-500/30",
};

const emptyForm = { name: "", sku: "", unitPrice: "", availableQuantity: "", lowStockThreshold: "" };

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>(mockInventory);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const lowStockCount = items.filter((i) => i.availableQuantity <= i.lowStockThreshold).length;

  const filtered = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      sku: item.sku,
      unitPrice: String(item.unitPrice),
      availableQuantity: String(item.availableQuantity),
      lowStockThreshold: String(item.lowStockThreshold),
    });
    setDialogOpen(true);
  };

  const computeStatus = (qty: number, threshold: number): InventoryItem["status"] => {
    if (qty === 0) return "Out of Stock";
    if (qty <= threshold) return "Low Stock";
    return "In Stock";
  };

  const handleSave = () => {
    const qty = parseInt(form.availableQuantity);
    const threshold = parseInt(form.lowStockThreshold);
    const price = parseFloat(form.unitPrice);

    if (!form.name || !form.sku || isNaN(qty) || isNaN(threshold) || isNaN(price)) {
      toast.error("Please fill in all fields correctly.");
      return;
    }

    if (editing) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === editing.id
            ? { ...i, ...form, unitPrice: price, availableQuantity: qty, lowStockThreshold: threshold, status: computeStatus(qty, threshold) }
            : i
        )
      );
      toast.success(`${form.name} updated.`);
    } else {
      const newItem: InventoryItem = {
        id: `INV-${String(items.length + 1).padStart(3, "0")}`,
        name: form.name,
        sku: form.sku,
        unitPrice: price,
        availableQuantity: qty,
        lowStockThreshold: threshold,
        status: computeStatus(qty, threshold),
      };
      setItems((prev) => [newItem, ...prev]);
      toast.success(`${form.name} added to inventory.`);
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    const item = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success(`${item?.name} removed from inventory.`);
    setDeleteId(null);
  };

    return (
        <DashboardLayout title="Component Inventory" subtitle={`${items.length} components tracked`}>
            <div className="space-y-5">
                {/* Low stock alert */}
                {lowStockCount > 0 && (
                    <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-xl px-4 py-3.5 shadow-sm">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <span className="text-sm font-semibold">
                            {lowStockCount} component{lowStockCount > 1 ? "s" : ""} at or below low-stock threshold. Please reorder.
                        </span>
                    </div>
                )}

                {/* Controls */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="search"
                            placeholder="Search by name or SKU..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border/80 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium"
                        />
                    </div>
                    <button
                        onClick={openAdd}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg shadow-emerald-500/10 transition-all active:scale-[0.98] shrink-0 cursor-pointer"
                    >
                        <Plus className="w-4.5 h-4.5" />
                        Add Component
                    </button>
                </div>

                {/* Table */}
                <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/60 bg-muted/40">
                                    {["Component Name", "SKU", "Unit Price", "Qty", "Threshold", "Status", "Actions"].map((h) => (
                                        <th key={h} className="px-5 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-16 text-center text-muted-foreground text-sm font-medium">
                                            No components match your search.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((item) => {
                                        const isAlert = item.availableQuantity <= item.lowStockThreshold;
                                        return (
                                            <tr
                                                key={item.id}
                                                className={`border-b border-border/40 hover:bg-muted/30 transition-colors duration-150 ${
                                                    isAlert ? "bg-yellow-500/5 hover:bg-yellow-500/10" : ""
                                                }`}
                                            >
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2">
                                                        {isAlert && <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />}
                                                        <span className={`font-semibold ${isAlert ? "text-yellow-600 dark:text-yellow-400" : "text-foreground"}`}>
                                                            {item.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 font-mono text-xs font-semibold text-muted-foreground whitespace-nowrap">{item.sku}</td>
                                                <td className="px-5 py-4 text-foreground font-semibold whitespace-nowrap">₹{item.unitPrice.toFixed(2)}</td>
                                                <td className={`px-5 py-4 font-bold whitespace-nowrap ${isAlert ? "text-yellow-600 dark:text-yellow-400" : "text-foreground"}`}>
                                                    {item.availableQuantity.toLocaleString("en-IN")}
                                                </td>
                                                <td className="px-5 py-4 text-muted-foreground font-semibold whitespace-nowrap">
                                                    {item.lowStockThreshold.toLocaleString("en-IN")}
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold ${statusStyle[item.status]}`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => openEdit(item)}
                                                            className="p-1.5 rounded-lg border border-border/80 hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600 transition-all"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteId(item.id)}
                                                            className="p-1.5 rounded-lg border border-border/80 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add/Edit Modal */}
            <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/60">
                            <Dialog.Title className="text-base font-bold text-foreground tracking-tight">
                                {editing ? "Edit Component Specs" : "Add New Component"}
                            </Dialog.Title>
                            <Dialog.Close className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
                                <X className="w-4.5 h-4.5" />
                            </Dialog.Close>
                        </div>

                        <div className="space-y-4">
                            {[
                                { key: "name", label: "Component Name", placeholder: "e.g. 10kΩ 0603 Resistor", type: "text" },
                                { key: "sku", label: "SKU Code", placeholder: "e.g. RES-10K-0603", type: "text" },
                                { key: "unitPrice", label: "Unit Price (₹)", placeholder: "e.g. 0.15", type: "number" },
                                { key: "availableQuantity", label: "Available Quantity", placeholder: "e.g. 50000", type: "number" },
                                { key: "lowStockThreshold", label: "Low Stock Threshold", placeholder: "e.g. 10000", type: "number" },
                            ].map((f) => (
                                <div key={f.key} className="space-y-1.5">
                                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider">{f.label}</label>
                                    <input
                                        type={f.type}
                                        placeholder={f.placeholder}
                                        value={form[f.key as keyof typeof form]}
                                        onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                                        className="w-full px-3.5 py-3 text-sm bg-background/50 border border-border/80 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3 mt-6 pt-4 border-t border-border/60">
                            <Dialog.Close className="flex-1 px-4 py-3 text-sm border border-border/80 rounded-xl text-muted-foreground font-bold hover:bg-muted transition-colors">
                                Cancel
                            </Dialog.Close>
                            <button
                                onClick={handleSave}
                                className="flex-1 px-4 py-3 text-sm bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white rounded-xl font-bold shadow-md hover:shadow-lg shadow-emerald-500/10 transition-all active:scale-[0.98] cursor-pointer"
                            >
                                {editing ? "Save Changes" : "Create Item"}
                            </button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Delete Confirm */}
            <Dialog.Root open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl">
                        <Dialog.Title className="text-base font-bold text-foreground mb-2">Delete Component?</Dialog.Title>
                        <p className="text-sm text-muted-foreground mb-6 font-medium">This action cannot be undone. It will remove the item permanently from Megabyte database.</p>
                        <div className="flex gap-3">
                            <Dialog.Close className="flex-1 px-4 py-3 text-sm border border-border/80 rounded-xl text-muted-foreground font-bold hover:bg-muted transition-colors">
                                Cancel
                            </Dialog.Close>
                            <button
                                onClick={() => deleteId && handleDelete(deleteId)}
                                className="flex-1 px-4 py-3 text-sm bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors shadow-md hover:shadow-lg shadow-red-500/10 cursor-pointer"
                            >
                                Delete Item
                            </button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </DashboardLayout>
    );
}
