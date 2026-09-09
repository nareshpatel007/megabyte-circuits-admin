"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, Check, X, ShieldAlert, Trash2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/components/layout/dashboard-layout";

export default function BlogCommentsPage() {
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchComments = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("admin_token");
            const query = new URLSearchParams({
                page: page.toString(),
                status: statusFilter,
            });
            const res = await fetch(`/api/admin/blog-comments?${query.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status && data.comments) {
                setComments(data.comments.data || []);
                setTotalPages(data.comments.last_page || 1);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComments();
    }, [page, statusFilter]);

    const handleUpdateStatus = async (id: number, status: string) => {
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/blog-comments/${id}/status`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status }),
            });
            const data = await res.json();
            if (data.status) {
                fetchComments();
            }
        } catch (e) {
            alert("Failed to update status.");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this comment?")) return;
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/blog-comments/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status) fetchComments();
        } catch (e) {
            alert("Failed to delete comment.");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "approved":
                return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Approved</Badge>;
            case "pending":
                return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>;
            case "spam":
                return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20">Spam</Badge>;
            case "rejected":
                return <Badge className="bg-muted text-muted-foreground">Rejected</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <DashboardLayout title="Comment Moderation">
            <div className="p-6 space-y-6 max-w-6xl mx-auto">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <MessageSquare className="w-6 h-6 text-purple-500" /> Comment Moderation
                        </h1>
                        <p className="text-sm text-muted-foreground">Review, approve, reject, or filter public user comments.</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <select
                            className="bg-background border border-input text-foreground text-sm rounded-md px-3 py-2 focus:outline-none"
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All Comments</option>
                            <option value="pending">Pending Moderation</option>
                            <option value="approved">Approved</option>
                            <option value="spam">Spam</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                </div>

                <Card className="border-border bg-card">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted/50 text-muted-foreground font-semibold text-xs uppercase">
                                <tr>
                                    <th className="p-4">Author & Email</th>
                                    <th className="p-4">Comment Content</th>
                                    <th className="p-4">Blog Post</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Moderation Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading ? (
                                    Array.from({ length: 4 }).map((_, index) => (
                                        <tr key={index}>
                                            <td className="p-4">
                                                <div className="space-y-1.5">
                                                    <Skeleton className="h-4 w-28" />
                                                    <Skeleton className="h-3 w-36" />
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <Skeleton className="h-12 w-full rounded-lg" />
                                            </td>
                                            <td className="p-4">
                                                <Skeleton className="h-4 w-32" />
                                            </td>
                                            <td className="p-4">
                                                <Skeleton className="h-6 w-20 rounded-full" />
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Skeleton className="h-8 w-20 rounded-lg" />
                                                    <Skeleton className="h-8 w-16 rounded-lg" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : comments.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                            No comments found matching the current filter.
                                        </td>
                                    </tr>
                                ) : (
                                    comments.map((comment) => (
                                        <tr key={comment.id} className="hover:bg-muted/30">
                                            <td className="p-4">
                                                <div className="font-semibold text-foreground">{comment.name}</div>
                                                <div className="text-xs text-muted-foreground">{comment.email}</div>
                                                <div className="text-[10px] text-muted-foreground mt-1">
                                                    {new Date(comment.created_at).toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="p-4 max-w-sm">
                                                <p className="text-xs text-foreground leading-relaxed bg-muted/30 p-2.5 rounded-lg border border-border">
                                                    "{comment.content}"
                                                </p>
                                            </td>
                                            <td className="p-4 text-xs font-medium text-foreground">
                                                {comment.blog?.title || `Blog #${comment.blog_id}`}
                                            </td>
                                            <td className="p-4">{getStatusBadge(comment.status)}</td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {comment.status !== "approved" && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 text-xs text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/30 flex items-center gap-1"
                                                            onClick={() => handleUpdateStatus(comment.id, "approved")}
                                                        >
                                                            <Check className="w-3.5 h-3.5" /> Approve
                                                        </Button>
                                                    )}
                                                    {comment.status !== "spam" && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 text-xs text-rose-600 hover:bg-rose-500/10 border-rose-500/30 flex items-center gap-1"
                                                            onClick={() => handleUpdateStatus(comment.id, "spam")}
                                                        >
                                                            <ShieldAlert className="w-3.5 h-3.5" /> Spam
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                        onClick={() => handleDelete(comment.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="p-4 border-t border-border flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                                    Previous
                                </Button>
                                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
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
