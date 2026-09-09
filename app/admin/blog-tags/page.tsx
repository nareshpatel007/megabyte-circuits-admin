"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/components/layout/dashboard-layout";

export default function BlogTagsPage() {
    const [tags, setTags] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tagName, setTagName] = useState("");

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
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTags();
    }, []);

    const handleAddTag = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tagName.trim()) return;

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
                setTagName("");
                fetchTags();
            } else {
                alert(data.message || "Failed to add tag.");
            }
        } catch (e) {
            alert("Error creating tag.");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this tag?")) return;
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/blog-tags/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status) fetchTags();
        } catch (e) {
            alert("Error deleting tag.");
        }
    };

    return (
        <DashboardLayout title="Blog Tags">
            <div className="p-6 space-y-6 max-w-4xl mx-auto">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <TagIcon className="w-6 h-6 text-emerald-500" /> Blog Tags
                    </h1>
                    <p className="text-sm text-muted-foreground">Create and manage topic tags for filtering blog posts.</p>
                </div>

                {/* Add Tag Card */}
                <Card className="border-border bg-card">
                    <CardHeader>
                        <CardTitle className="text-base">Add New Tag</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddTag} className="flex gap-3">
                            <Input
                                value={tagName}
                                onChange={(e) => setTagName(e.target.value)}
                                placeholder="e.g., High-Speed Layout, SMT, ENIG"
                                className="bg-background max-w-md"
                            />
                            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Add Tag
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Tags List */}
                <Card className="border-border bg-card">
                    <CardHeader>
                        <CardTitle className="text-base">Existing Tags ({tags.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex flex-wrap gap-3">
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                    <Skeleton key={i} className="h-8 w-24 rounded-lg" />
                                ))}
                            </div>
                        ) : tags.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No tags created yet.</p>
                        ) : (
                            <div className="flex flex-wrap gap-3">
                                {tags.map((tag) => (
                                    <div
                                        key={tag.id}
                                        className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg border border-border text-sm font-medium"
                                    >
                                        <span>{tag.name}</span>
                                        <span className="text-xs text-muted-foreground">({tag.blogs_count || 0})</span>
                                        <button
                                            onClick={() => handleDelete(tag.id)}
                                            className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                                            title="Delete tag"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
