"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Tag as TagIcon, Search, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { toast } from "sonner";

export default function BlogTagsPage() {
    const [tags, setTags] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tagName, setTagName] = useState("");
    const [search, setSearch] = useState("");
    const [adding, setAdding] = useState(false);

    const fetchTags = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/blog-tags", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status) {
                setTags(data.tags || []);
            } else {
                toast.error("Failed to load blog tags");
            }
        } catch (e) {
            console.error(e);
            toast.error("Error loading tags");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTags();
    }, []);

    const handleAddTag = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tagName.trim()) {
            toast.error("Tag name is required");
            return;
        }

        setAdding(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/blog-tags", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ name: tagName }),
            });
            const data = await res.json();
            if (data.status) {
                toast.success("Tag created successfully");
                setTagName("");
                fetchTags();
            } else {
                toast.error(data.message || "Failed to add tag");
            }
        } catch (e) {
            toast.error("Error creating tag");
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`Are you sure you want to delete tag "${name}"?`)) return;
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/blog-tags/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status) {
                toast.success("Tag deleted successfully");
                fetchTags();
            } else {
                toast.error(data.message || "Failed to delete tag");
            }
        } catch (e) {
            toast.error("Error deleting tag");
        }
    };

    const filtered = tags.filter((t) => (t.name || "").toLowerCase().includes(search.toLowerCase()));

    return (
        <DashboardLayout title="Blog Tags" subtitle={`${tags.length} topic tags created`}>
            {loading ? (
                <TableSkeleton rows={5} />
            ) : (
                <div className="space-y-5">
                    {/* Stats Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex items-center gap-4">
                            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                <TagIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Tags</p>
                                <h3 className="text-2xl font-black text-foreground mt-0.5">{tags.length}</h3>
                            </div>
                        </div>

                        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex items-center gap-4">
                            <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Tagged Articles</p>
                                <h3 className="text-2xl font-black text-blue-500 mt-0.5">
                                    {tags.reduce((sum, t) => sum + (Number(t.blogs_count) || 0), 0)}
                                </h3>
                            </div>
                        </div>
                    </div>

                    {/* Add Tag Card */}
                    <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs space-y-3">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Add New Topic Tag</h3>
                        <form onSubmit={handleAddTag} className="flex flex-col sm:flex-row gap-3">
                            <Input
                                value={tagName}
                                onChange={(e) => setTagName(e.target.value)}
                                placeholder="e.g. High-Speed Layout, SMT, ENIG"
                                className="bg-muted/30 border-border/80 rounded-xl text-xs flex-1"
                            />
                            <button
                                type="submit"
                                disabled={adding}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-600 text-black transition-all shadow-xs cursor-pointer disabled:opacity-50"
                            >
                                <Plus className="w-4 h-4 stroke-[2.5]" />
                                {adding ? "Adding..." : "Add Tag"}
                            </button>
                        </form>
                    </div>

                    {/* Tags List Container */}
                    <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-border/60">
                            <div className="relative w-full sm:w-80">
                                <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search tags..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-muted/30 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:border-emerald-500 font-medium"
                                />
                            </div>
                            <span className="text-xs text-muted-foreground font-semibold">
                                Showing {filtered.length} of {tags.length} tags
                            </span>
                        </div>

                        {filtered.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-6 text-center font-medium">No tags found.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2.5 pt-1">
                                {filtered.map((tag) => (
                                    <div
                                        key={tag.id}
                                        className="flex items-center gap-2 bg-muted/50 dark:bg-muted/30 px-3.5 py-2 rounded-xl border border-border/80 text-xs font-bold text-foreground shadow-2xs group"
                                    >
                                        <TagIcon className="w-3.5 h-3.5 text-emerald-500" />
                                        <span>{tag.name}</span>
                                        <span className="text-[10px] font-extrabold text-muted-foreground bg-background px-2 py-0.5 rounded-md border border-border/60">
                                            {tag.blogs_count || 0}
                                        </span>
                                        <button
                                            onClick={() => handleDelete(tag.id, tag.name)}
                                            className="text-muted-foreground hover:text-rose-500 transition-colors ml-1 p-0.5 rounded-md hover:bg-rose-500/10"
                                            title="Delete tag"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

