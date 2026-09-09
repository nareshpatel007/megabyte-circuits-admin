"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit, FolderTree, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import DashboardLayout from "@/components/layout/dashboard-layout";

export default function BlogCategoriesPage() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editingCat, setEditingCat] = useState<any>(null);

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
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

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
                setOpen(false);
                resetForm();
                fetchCategories();
            } else {
                alert(data.message || "Failed to save category.");
            }
        } catch (e) {
            alert("Error saving category.");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this category?")) return;
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/blog-categories/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status) fetchCategories();
        } catch (e) {
            alert("Error deleting category.");
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

    return (
        <DashboardLayout title="Blog Categories">
            <div className="p-6 space-y-6 max-w-5xl mx-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <FolderTree className="w-6 h-6 text-emerald-500" /> Blog Categories
                        </h1>
                        <p className="text-sm text-muted-foreground">Manage category groupings for articles.</p>
                    </div>
                    <Button
                        onClick={() => {
                            resetForm();
                            setOpen(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Add Category
                    </Button>
                </div>

                <Card className="border-border bg-card">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted/50 text-muted-foreground font-semibold text-xs uppercase">
                                <tr>
                                    <th className="p-4">Category Name</th>
                                    <th className="p-4">Slug</th>
                                    <th className="p-4">Description</th>
                                    <th className="p-4">Total Posts</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                            Loading categories...
                                        </td>
                                    </tr>
                                ) : categories.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                            No categories created yet.
                                        </td>
                                    </tr>
                                ) : (
                                    categories.map((cat) => (
                                        <tr key={cat.id} className="hover:bg-muted/30">
                                            <td className="p-4 font-semibold text-foreground">{cat.name}</td>
                                            <td className="p-4 text-xs font-mono text-muted-foreground">/blogs/category/{cat.slug}</td>
                                            <td className="p-4 text-xs text-muted-foreground max-w-xs truncate">{cat.description || "—"}</td>
                                            <td className="p-4 text-xs font-bold text-emerald-600">{cat.blogs_count || 0}</td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="sm" onClick={() => openEdit(cat)} className="h-8 w-8 p-0">
                                                        <Edit className="w-4 h-4 text-muted-foreground" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(cat.id)} className="h-8 w-8 p-0">
                                                        <Trash2 className="w-4 h-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Modal Dialog */}
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogContent className="bg-card text-foreground border-border">
                        <DialogHeader>
                            <DialogTitle>{editingCat ? "Edit Category" : "Add New Category"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSave} className="space-y-4 py-2">
                            <div>
                                <Label className="text-sm font-semibold">Name *</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        if (!editingCat) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                                    }}
                                    placeholder="e.g., Signal Integrity"
                                    className="mt-1 bg-background"
                                />
                            </div>
                            <div>
                                <Label className="text-sm font-semibold">Slug *</Label>
                                <Input
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    placeholder="signal-integrity"
                                    className="mt-1 bg-background"
                                />
                            </div>
                            <div>
                                <Label className="text-sm font-semibold">Description</Label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Brief description of articles under this category..."
                                    className="mt-1 bg-background"
                                />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                    {editingCat ? "Update Category" : "Create Category"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
