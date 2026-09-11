"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Eye,
    ThumbsUp,
    MessageSquare,
    FileText,
    CheckCircle,
    Clock,
    XCircle,
    Sparkles,
    Filter,
    Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useAuth } from "@/lib/auth-context";
import { BlogImage } from "@/components/blog/BlogImage";


export default function AdminBlogsPage() {
    const { user } = useAuth();
    const isSuperAdmin = user?.role?.toLowerCase() === "super admin";
    const userPermissions = user?.permissions || [];

    const canCreate = isSuperAdmin || userPermissions.includes("blog.create");
    const canEdit = isSuperAdmin || userPermissions.includes("blog.edit");
    const canDelete = isSuperAdmin || userPermissions.includes("blog.delete");

    const [blogs, setBlogs] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalBlogs, setTotalBlogs] = useState(0);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/blogs/stats", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status) {
                setStats(data.stats);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchBlogs = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("admin_token");
            const query = new URLSearchParams({
                page: page.toString(),
                per_page: perPage.toString(),
                search,
                status: statusFilter,
            });
            const res = await fetch(`/api/admin/blogs?${query.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status && data.blogs) {
                setBlogs(data.blogs.data || []);
                setTotalPages(data.blogs.last_page || 1);
                setTotalBlogs(data.blogs.total || 0);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        fetchBlogs();
    }, [page, perPage, search, statusFilter]);

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this blog post?")) return;
        setDeletingId(id);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/blogs/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status) {
                fetchBlogs();
                fetchStats();
            } else {
                alert(data.message || "Failed to delete blog post.");
            }
        } catch (e) {
            alert("Error deleting blog post.");
        } finally {
            setDeletingId(null);
        }
    };

    const handleToggleStatus = async (blog: any) => {
        const newStatus = blog.status === "published" ? "draft" : "published";
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/blogs/${blog.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus }),
            });
            const data = await res.json();
            if (data.status) {
                fetchBlogs();
                fetchStats();
            }
        } catch (e) {
            alert("Failed to update status.");
        }
    };

    const createBlogButton = (
        <Link href="/admin/blogs/create">
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-600 text-black transition-all shadow-xs cursor-pointer">
                <Plus className="w-4 h-4 stroke-[2.5]" /> Create Blog Post
            </button>
        </Link>
    );

    return (
        <DashboardLayout
            title="Blog Posts"
            subtitle="Manage articles, rich content, SEO metadata, and publishing status"
            action={canCreate ? createBlogButton : undefined}
        >
            <div className="space-y-5">


                {/* Dashboard Metrics */}
                {loading && !stats ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <Card key={i} className="border-border bg-card p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <Skeleton className="h-3 w-16" />
                                    <Skeleton className="h-4 w-4 rounded-full" />
                                </div>
                                <Skeleton className="h-7 w-12" />
                            </Card>
                        ))}
                    </div>
                ) : stats ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        <Card className="border-border bg-card">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                    Total Posts <FileText className="w-4 h-4 text-emerald-500" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="text-2xl font-bold text-foreground">{stats.total_blogs}</div>
                            </CardContent>
                        </Card>

                        <Card className="border-border bg-card">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                    Published <CheckCircle className="w-4 h-4 text-emerald-500" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="text-2xl font-bold text-emerald-600">{stats.published_blogs}</div>
                            </CardContent>
                        </Card>

                        <Card className="border-border bg-card">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                    Drafts <Clock className="w-4 h-4 text-amber-500" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="text-2xl font-bold text-amber-600">{stats.draft_blogs}</div>
                            </CardContent>
                        </Card>

                        <Card className="border-border bg-card">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                    Total Views <Eye className="w-4 h-4 text-blue-500" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="text-2xl font-bold text-foreground">{stats.total_views}</div>
                            </CardContent>
                        </Card>

                        <Card className="border-border bg-card">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                    Total Likes <ThumbsUp className="w-4 h-4 text-rose-500" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="text-2xl font-bold text-foreground">{stats.total_likes}</div>
                            </CardContent>
                        </Card>

                        <Card className="border-border bg-card">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                    Comments <MessageSquare className="w-4 h-4 text-purple-500" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="text-2xl font-bold text-foreground">{stats.total_comments}</div>
                                {stats.pending_comments > 0 && (
                                    <span className="text-[11px] font-semibold text-amber-600">
                                        {stats.pending_comments} pending
                                    </span>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                ) : null}

                {/* Filter and Search */}
                <Card className="border-border bg-card">
                    <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search titles, excerpt, category..."
                                className="pl-9 bg-background"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-muted-foreground" />
                                <select
                                    className="bg-background border border-input text-foreground text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    value={statusFilter}
                                    onChange={(e) => {
                                        setStatusFilter(e.target.value);
                                        setPage(1);
                                    }}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="published">Published</option>
                                    <option value="draft">Draft</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Blog Table */}
                    <div className="overflow-x-auto border-t border-border">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted/50 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="p-4">Blog Post</th>
                                    <th className="p-4">Category</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Stats</th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, index) => (
                                        <tr key={index}>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
                                                    <div className="space-y-2 flex-1">
                                                        <Skeleton className="h-4 w-48" />
                                                        <Skeleton className="h-3 w-32" />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <Skeleton className="h-6 w-24 rounded-full" />
                                            </td>
                                            <td className="p-4">
                                                <Skeleton className="h-6 w-20 rounded-full" />
                                            </td>
                                            <td className="p-4">
                                                <Skeleton className="h-4 w-28" />
                                            </td>
                                            <td className="p-4">
                                                <Skeleton className="h-4 w-20" />
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Skeleton className="h-8 w-8 rounded-lg" />
                                                    <Skeleton className="h-8 w-8 rounded-lg" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : blogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                            No blog posts found. Click "Create Blog Post" to add your first post.
                                        </td>
                                    </tr>
                                ) : (
                                    blogs.map((blog) => (
                                        <tr key={blog.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-lg bg-muted border border-border overflow-hidden shrink-0">
                                                        {blog.featured_image ? (
                                                            <BlogImage
                                                                src={blog.featured_image}
                                                                alt={blog.title}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground font-bold text-xs">
                                                                NO IMG
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        {canEdit ? (
                                                            <Link
                                                                href={`/admin/blogs/${blog.id}/edit`}
                                                                className="font-semibold text-foreground hover:text-emerald-600 transition-colors line-clamp-1"
                                                            >
                                                                {blog.title}
                                                            </Link>
                                                        ) : (
                                                            <span className="font-semibold text-foreground line-clamp-1">
                                                                {blog.title}
                                                            </span>
                                                        )}
                                                        <span className="text-xs text-muted-foreground block truncate">
                                                            /blog/{blog.slug}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <Badge variant="outline" className="font-medium text-xs">
                                                    {blog.category_name || blog.category || "Uncategorized"}
                                                </Badge>
                                            </td>
                                            <td className="p-4">
                                                {canEdit ? (
                                                    <button
                                                        onClick={() => handleToggleStatus(blog)}
                                                        className="cursor-pointer"
                                                        title="Click to toggle status"
                                                    >
                                                        {blog.status === "published" ? (
                                                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold hover:bg-emerald-500/20">
                                                                Published
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-semibold hover:bg-amber-500/20">
                                                                Draft
                                                            </Badge>
                                                        )}
                                                    </button>
                                                ) : (
                                                    blog.status === "published" ? (
                                                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold">
                                                            Published
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-semibold">
                                                            Draft
                                                        </Badge>
                                                    )
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1" title="Views">
                                                        <Eye className="w-3.5 h-3.5 text-blue-500" /> {blog.views || 0}
                                                    </span>
                                                    <span className="flex items-center gap-1" title="Likes">
                                                        <ThumbsUp className="w-3.5 h-3.5 text-rose-500" /> {blog.likes_count || 0}
                                                    </span>
                                                    <span className="flex items-center gap-1" title="Comments">
                                                        <MessageSquare className="w-3.5 h-3.5 text-purple-500" /> {blog.comments_count || 0}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-xs text-muted-foreground">
                                                {blog.published_at ? (
                                                    <span>{new Date(blog.published_at).toLocaleDateString()}</span>
                                                ) : (
                                                    <span>{new Date(blog.created_at).toLocaleDateString()}</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {canEdit && (
                                                        <Link href={`/admin/blogs/${blog.id}/edit`}>
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                        </Link>
                                                    )}
                                                    {canDelete && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                            onClick={() => handleDelete(blog.id)}
                                                            disabled={deletingId === blog.id}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Bar */}
                    {!loading && totalBlogs > 0 && (
                        <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-4">
                                <span className="text-xs text-muted-foreground">
                                    Showing {totalBlogs > 0 ? (page - 1) * perPage + 1 : 0} to {Math.min(page * perPage, totalBlogs)} of {totalBlogs} entries
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Rows per page:</span>
                                    <select
                                        className="bg-background border border-input text-foreground text-xs rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                                        value={perPage}
                                        onChange={(e) => {
                                            setPerPage(Number(e.target.value));
                                            setPage(1);
                                        }}
                                    >
                                        <option value={5}>5</option>
                                        <option value={10}>10</option>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page === 1}
                                    onClick={() => setPage(page - 1)}
                                    className="h-8 px-3 text-xs"
                                >
                                    Previous
                                </Button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                    <Button
                                        key={p}
                                        variant={p === page ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setPage(p)}
                                        className={`h-8 w-8 p-0 text-xs font-semibold ${
                                            p === page ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600" : ""
                                        }`}
                                    >
                                        {p}
                                    </Button>
                                ))}

                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page === totalPages || totalPages === 0}
                                    onClick={() => setPage(page + 1)}
                                    className="h-8 px-3 text-xs"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </DashboardLayout>
    );
}
