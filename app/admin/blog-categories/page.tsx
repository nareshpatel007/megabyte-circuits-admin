"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, FolderTree, Search, Layers, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { TableSkeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export default function BlogCategoriesPage() {
    const { user } = useAuth();
    const isSuperAdmin = user?.role?.toLowerCase() === "super admin";
    const userPermissions = user?.permissions || [];

    const canCreate = isSuperAdmin || userPermissions.includes("blog_category.create");
    const canEdit = isSuperAdmin || userPermissions.includes("blog_category.edit");
    const canDelete = isSuperAdmin || userPermissions.includes("blog_category.delete");

    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);
    const [editingCat, setEditingCat] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/blog-categories", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status) {
                setCategories(data.categories || []);
            } else {
                toast.error("Failed to load blog categories");
            }
        } catch (e) {
            console.error(e);
            toast.error("Error fetching categories");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error("Category name is required");
            return;
        }

        setSaving(true);
        const payload = { name, slug, description };
        const url = editingCat ? `/api/admin/blog-categories/${editingCat.id}` : "/api/admin/blog-categories";
        const method = editingCat ? "PUT" : "POST";

        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.status) {
                toast.success(data.message || (editingCat ? "Category updated successfully" : "Category created successfully"));
                setOpen(false);
                resetForm();
                fetchCategories();
            } else {
                toast.error(data.message || "Failed to save category");
            }
        } catch (e) {
            toast.error("Error saving category");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number, catName: string) => {
        if (!confirm(`Are you sure you want to delete category "${catName}"?`)) return;
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/blog-categories/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status) {
                toast.success("Category deleted successfully");
                fetchCategories();
            } else {
                toast.error(data.message || "Failed to delete category");
            }
        } catch (e) {
            toast.error("Error deleting category");
        }
    };

    const resetForm = () => {
        setName("");
        setSlug("");
        setDescription("");
        setEditingCat(null);
    };

    const openEdit = (cat: any) => {
        setEditingCat(cat);
        setName(cat.name);
        setSlug(cat.slug);
        setDescription(cat.description || "");
        setOpen(true);
    };

    const filtered = categories.filter((cat) => {
        const q = search.toLowerCase();
        return (
            (cat.name || "").toLowerCase().includes(q) ||
            (cat.slug || "").toLowerCase().includes(q) ||
            (cat.description || "").toLowerCase().includes(q)
        );
    });

    const addCategoryButton = (
        <button
            onClick={() => {
                resetForm();
                setOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-600 text-black transition-all shadow-xs cursor-pointer"
        >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Add Category
        </button>
    );

    const totalPostsCount = categories.reduce((sum, c) => sum + (Number(c.blogs_count) || 0), 0);

    return (
        <DashboardLayout
            title="Blog Categories"
            subtitle={`${categories.length} categories created`}
            action={canCreate ? addCategoryButton : undefined}
        >
            {loading ? (
                <TableSkeleton rows={6} />
            ) : (
                <div className="space-y-5">
                    {/* Stats Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex items-center gap-4">
                            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                <FolderTree className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Categories</p>
                                <h3 className="text-2xl font-black text-foreground mt-0.5">{categories.length}</h3>
                            </div>
                        </div>

                        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex items-center gap-4">
                            <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Categorized Articles</p>
                                <h3 className="text-2xl font-black text-blue-500 mt-0.5">{totalPostsCount}</h3>
                            </div>
                        </div>

                        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex items-center gap-4 sm:col-span-2 lg:col-span-1">
                            <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                                <Layers className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Groupings</p>
                                <h3 className="text-2xl font-black text-purple-500 mt-0.5">
                                    {categories.filter(c => (c.blogs_count || 0) > 0).length} Active
                                </h3>
                            </div>
                        </div>
                    </div>

                    {/* Search & Filter Bar */}
                    <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="relative w-full sm:w-80">
                            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search category by name, slug..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-muted/30 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:border-emerald-500 font-medium"
                            />
                        </div>
                        <span className="text-xs text-muted-foreground font-semibold">
                            Showing {filtered.length} of {categories.length} categories
                        </span>
                    </div>

                    {/* Table Container */}
                    <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead>
                                    <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                                        <th className="py-3.5 px-5">Category Name</th>
                                        <th className="py-3.5 px-5">URL Slug</th>
                                        <th className="py-3.5 px-5">Description</th>
                                        <th className="py-3.5 px-5">Total Posts</th>
                                        <th className="py-3.5 px-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-12 text-muted-foreground font-medium">
                                                No categories found matching your search.
                                            </td>
                                        </tr>
                                    ) : (
                                        filtered.map((cat) => (
                                            <tr key={cat.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="py-4 px-5 font-bold text-foreground text-sm">
                                                    {cat.name}
                                                </td>
                                                <td className="py-4 px-5 font-mono text-xs text-muted-foreground">
                                                    /blog/category/{cat.slug}
                                                </td>
                                                <td className="py-4 px-5 text-xs text-muted-foreground max-w-xs truncate">
                                                    {cat.description || "—"}
                                                </td>
                                                <td className="py-4 px-5">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                        {cat.blogs_count || 0} Articles
                                                    </span>
                                                </td>
                                                <td className="py-4 px-5 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center justify-end gap-1.5">
                                                        {canEdit && (
                                                            <button
                                                                onClick={() => openEdit(cat)}
                                                                title="Edit Category"
                                                                aria-label="Edit Category"
                                                                className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500 hover:text-white transition-all cursor-pointer shadow-2xs"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                        )}

                                                        {canDelete && (
                                                            <button
                                                                onClick={() => handleDelete(cat.id, cat.name)}
                                                                title="Delete Category"
                                                                aria-label="Delete Category"
                                                                className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white transition-all cursor-pointer shadow-2xs"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Dialog Modal */}
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogContent className="bg-card text-foreground border-border/80 rounded-2xl max-w-md w-full p-6">
                            <DialogHeader>
                                <DialogTitle className="text-base font-bold text-foreground">
                                    {editingCat ? "Edit Blog Category" : "Add New Category"}
                                </DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSave} className="space-y-4 pt-2">
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Category Name *
                                    </Label>
                                    <Input
                                        value={name}
                                        onChange={(e) => {
                                            setName(e.target.value);
                                            if (!editingCat) {
                                                setSlug(e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
                                            }
                                        }}
                                        placeholder="e.g. Signal Integrity"
                                        className="bg-muted/30 border-border/80 rounded-xl text-xs"
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        URL Slug *
                                    </Label>
                                    <Input
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value)}
                                        placeholder="signal-integrity"
                                        className="bg-muted/30 border-border/80 rounded-xl text-xs font-mono"
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        Description
                                    </Label>
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Brief description of articles under this category..."
                                        className="bg-muted/30 border-border/80 rounded-xl text-xs min-h-[80px]"
                                    />
                                </div>

                                <DialogFooter className="pt-3 gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setOpen(false)}
                                        className="rounded-xl text-xs font-bold border-border"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={saving}
                                        className="rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-600 text-black cursor-pointer"
                                    >
                                        {saving ? "Saving..." : editingCat ? "Update Category" : "Create Category"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            )}
        </DashboardLayout>
    );
}

