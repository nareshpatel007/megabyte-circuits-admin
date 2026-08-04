"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { mockInventory, type InventoryItem } from "@/lib/mock-data";
import { Search, Plus, Pencil, Trash2, AlertTriangle, X, Boxes, AlertCircle, XCircle, DollarSign, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/ui/skeleton";

const statusStyle: Record<string, { bg: string; color: string; border: string }> = {
  "In Stock": { bg: "#10b98115", color: "#10b981", border: "#10b98130" },
  "Low Stock": { bg: "#f59e0b15", color: "#f59e0b", border: "#f59e0b30" },
  "Out of Stock": { bg: "#ef444415", color: "#ef4444", border: "#ef444430" },
};

const emptyForm = { name: "", sku: "", unitPrice: "", availableQuantity: "", lowStockThreshold: "" };
const PAGE_SIZE = 10;

export default function InventoryPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setItems(mockInventory);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Computed Key Statistics
  const totalItemsCount = items.length;
  const inStockCount = items.filter((i) => i.status === "In Stock").length;
  const lowStockCount = items.filter((i) => i.availableQuantity <= i.lowStockThreshold && i.availableQuantity > 0).length;
  const outOfStockCount = items.filter((i) => i.availableQuantity === 0).length;
  const totalInventoryValue = items.reduce((acc, curr) => acc + curr.availableQuantity * curr.unitPrice, 0);

  // Filtered dataset
  const filtered = items.filter((i) => {
    const matchSearch =
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === "All" || i.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
    <DashboardLayout title="Component Inventory" subtitle={`${items.length} total components tracked in warehouse`}>
      {loading ? (
        <TableSkeleton rows={8} />
      ) : (
        <div className="space-y-5">

        {/* 1. Low Stock Banner Attention Message (At Top) */}
        {(lowStockCount > 0 || outOfStockCount > 0) && (
          <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 rounded-xl px-4 py-3.5 shadow-xs">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-500" />
            <span className="text-sm font-bold">
              Attention Required: {lowStockCount} component(s) on low stock threshold & {outOfStockCount} component(s) completely out of stock. Please reorder stock soon.
            </span>
          </div>
        )}

        {/* 2. Statistics Cards Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Components</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">{totalItemsCount}</h3>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Unique SKUs active</p>
            </div>
          </div>

          <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Low Stock Warning</p>
              <h3 className="text-2xl font-black text-amber-500 mt-0.5">{lowStockCount}</h3>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Requires reordering</p>
            </div>
          </div>

          <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Out of Stock</p>
              <h3 className="text-2xl font-black text-red-500 mt-0.5">{outOfStockCount}</h3>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Zero quantity available</p>
            </div>
          </div>

          <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Valuation</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">
                ₹{totalInventoryValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </h3>
              <p className="text-[11px] text-emerald-500 font-bold mt-0.5">{inStockCount} items in stock</p>
            </div>
          </div>
        </div>

        {/* 3. Controls & Filter Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search components by name or SKU code..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-11 pl-10 pr-4 text-sm bg-card border border-border/80 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium transition-all shadow-xs"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-11 px-3.5 text-sm bg-card border border-border/80 rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold transition-all cursor-pointer shadow-xs shrink-0"
            >
              <option value="All">All Stock Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>

            {/* Add Component Button */}
            <button
              onClick={openAdd}
              className="h-11 inline-flex items-center justify-center gap-2 px-5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg shadow-emerald-500/10 transition-all active:scale-[0.98] shrink-0 cursor-pointer"
            >
              <Plus className="w-4.5 h-4.5" />
              Add Component
            </button>
          </div>
        </div>

        {/* 3. Product Listing Table (Exact Design matching Orders list) */}
        <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/80 border-b border-border/80 text-foreground uppercase tracking-wider font-extrabold text-[11px]">
                  <th className="py-3.5 px-5">SKU Code</th>
                  <th className="py-3.5 px-5">Component Name</th>
                  <th className="py-3.5 px-5">Unit Price</th>
                  <th className="py-3.5 px-5">Available Qty</th>
                  <th className="py-3.5 px-5">Threshold</th>
                  <th className="py-3.5 px-5">Stock Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-muted-foreground text-sm font-medium">
                      No components match your search or status filter.
                    </td>
                  </tr>
                ) : (
                  paginated.map((item) => {
                    const st = statusStyle[item.status] || { bg: "#10b98115", color: "#10b981", border: "#10b98130" };
                    return (
                      <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-4 px-5 font-mono text-sm font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {item.sku}
                        </td>
                        <td className="py-4 px-5 whitespace-nowrap">
                          <p className="font-bold text-foreground text-sm">{item.name}</p>
                          <p className="text-[11px] text-muted-foreground font-medium">ID: {item.id}</p>
                        </td>
                        <td className="py-4 px-5 font-extrabold text-foreground text-sm whitespace-nowrap">
                          ₹{item.unitPrice.toFixed(2)}
                        </td>
                        <td className="py-4 px-5 whitespace-nowrap">
                          <span className="font-extrabold text-foreground text-sm">
                            {item.availableQuantity.toLocaleString("en-IN")}
                          </span>
                        </td>
                        <td className="py-4 px-5 whitespace-nowrap font-semibold text-muted-foreground">
                          {item.lowStockThreshold.toLocaleString("en-IN")}
                        </td>
                        <td className="py-4 px-5 whitespace-nowrap">
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold border"
                            style={{
                              backgroundColor: st.bg,
                              color: st.color,
                              borderColor: st.border,
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.color }} />
                            {item.status}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => openEdit(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-xs font-bold cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteId(item.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all text-xs font-bold cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
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

          {/* 4. Pagination (Exact Design matching Orders list) */}
          <div className="p-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground font-medium bg-card">
            <span>
              Showing <strong className="text-foreground">{filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}</strong> to{" "}
              <strong className="text-foreground">{Math.min(page * PAGE_SIZE, filtered.length)}</strong> of{" "}
              <strong className="text-foreground">{filtered.length}</strong> components
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="font-extrabold text-foreground px-2">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold cursor-pointer"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Add/Edit Dialog */}
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
              <Dialog.Close className="flex-1 px-4 py-3 text-sm border border-border/80 rounded-xl text-muted-foreground font-bold hover:bg-muted transition-colors cursor-pointer">
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

      {/* Delete Confirmation Dialog */}
      <Dialog.Root open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl">
            <Dialog.Title className="text-base font-bold text-foreground mb-2">Delete Component?</Dialog.Title>
            <p className="text-sm text-muted-foreground mb-6 font-medium">This action cannot be undone. It will remove the item permanently from Megabyte database.</p>
            <div className="flex gap-3">
              <Dialog.Close className="flex-1 px-4 py-3 text-sm border border-border/80 rounded-xl text-muted-foreground font-bold hover:bg-muted transition-colors cursor-pointer">
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
