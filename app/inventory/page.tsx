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
      <div className="space-y-4">
        {/* Low stock alert */}
        {lowStockCount > 0 && (
          <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium">
              {lowStockCount} component{lowStockCount > 1 ? "s" : ""} at or below low-stock threshold
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
              className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={openAdd}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Component
          </button>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/40">
                  {["Component Name", "SKU", "Unit Price", "Qty", "Threshold", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                      No components match your search.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => {
                    const isAlert = item.availableQuantity <= item.lowStockThreshold;
                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-border/50 hover:bg-accent/30 transition-colors ${
                          isAlert ? "bg-yellow-500/5" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {isAlert && <AlertTriangle className="w-3 h-3 text-yellow-400 shrink-0" />}
                            <span className={`font-medium ${isAlert ? "text-yellow-400" : "text-foreground"}`}>
                              {item.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{item.sku}</td>
                        <td className="px-4 py-3 text-foreground whitespace-nowrap">₹{item.unitPrice.toFixed(2)}</td>
                        <td className={`px-4 py-3 font-semibold whitespace-nowrap ${isAlert ? "text-yellow-400" : "text-foreground"}`}>
                          {item.availableQuantity.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {item.lowStockThreshold.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusStyle[item.status]}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEdit(item)}
                              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteId(item.id)}
                              className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-base font-semibold text-foreground">
                {editing ? "Edit Component" : "Add Component"}
              </Dialog.Title>
              <Dialog.Close className="p-1.5 rounded-md hover:bg-accent text-muted-foreground">
                <X className="w-4 h-4" />
              </Dialog.Close>
            </div>

            <div className="space-y-4">
              {[
                { key: "name", label: "Component Name", placeholder: "e.g. 10kΩ 0603 Resistor", type: "text" },
                { key: "sku", label: "SKU", placeholder: "e.g. RES-10K-0603", type: "text" },
                { key: "unitPrice", label: "Unit Price (₹)", placeholder: "e.g. 0.15", type: "number" },
                { key: "availableQuantity", label: "Available Quantity", placeholder: "e.g. 50000", type: "number" },
                { key: "lowStockThreshold", label: "Low Stock Threshold", placeholder: "e.g. 10000", type: "number" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-foreground mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={form[f.key as keyof typeof form]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <Dialog.Close className="flex-1 px-4 py-2 text-sm border border-border rounded-lg text-muted-foreground hover:bg-accent transition-colors">
                Cancel
              </Dialog.Close>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 text-sm bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                {editing ? "Save Changes" : "Add Component"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Confirm */}
      <Dialog.Root open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl">
            <Dialog.Title className="text-base font-semibold text-foreground mb-2">Delete Component?</Dialog.Title>
            <p className="text-sm text-muted-foreground mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <Dialog.Close className="flex-1 px-4 py-2 text-sm border border-border rounded-lg text-muted-foreground hover:bg-accent transition-colors">
                Cancel
              </Dialog.Close>
              <button
                onClick={() => deleteId && handleDelete(deleteId)}
                className="flex-1 px-4 py-2 text-sm bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </DashboardLayout>
  );
}
