"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, Check, ShieldAlert, Trash2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { toast } from "sonner";

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
            } else {
                toast.error("Failed to load comments");
            }
        } catch (e) {
            console.error(e);
            toast.error("Error fetching comments");
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
                toast.success(`Comment status updated to ${status}`);
                fetchComments();
            } else {
                toast.error(data.message || "Failed to update comment status");
            }
        } catch (e) {
            toast.error("Failed to update status.");
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
            if (data.status) {
                toast.success("Comment deleted");
                fetchComments();
            } else {
                toast.error(data.message || "Failed to delete comment");
            }
        } catch (e) {
            toast.error("Failed to delete comment.");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "approved":
                return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold uppercase text-[10px]">Approved</Badge>;
            case "pending":
                return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold uppercase text-[10px]">Pending</Badge>;
            case "spam":
                return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 font-bold uppercase text-[10px]">Spam</Badge>;
            case "rejected":
                return <Badge variant="outline" className="font-bold uppercase text-[10px]">Rejected</Badge>;
            default:
                return <Badge variant="outline" className="font-bold uppercase text-[10px]">{status}</Badge>;
        }
    };

    return (
        <DashboardLayout
            title="Comment Moderation"
            subtitle="Review, approve, reject, or filter public user comments"
        >
            {loading ? (
                <TableSkeleton rows={6} />
            ) : (
                <div className="space-y-5">
                    <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Filter Status:</span>
                            <select
                                className="bg-muted/30 border border-border/80 text-foreground text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 cursor-pointer"
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
                        <span className="text-xs text-muted-foreground font-semibold">
                            Page {page} of {totalPages}
                        </span>
                    </div>

                    <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead>
                                    <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                                        <th className="py-3.5 px-5">Author & Email</th>
                                        <th className="py-3.5 px-5">Comment Content</th>
                                        <th className="py-3.5 px-5">Blog Post</th>
                                        <th className="py-3.5 px-5">Status</th>
                                        <th className="py-3.5 px-5 text-right">Moderation Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {comments.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-12 text-muted-foreground font-medium">
                                                No comments found matching the current filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        comments.map((comment) => (
                                            <tr key={comment.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="py-4 px-5 whitespace-nowrap">
                                                    <div className="font-bold text-foreground text-sm">{comment.name}</div>
                                                    <div className="text-xs text-muted-foreground font-medium">{comment.email}</div>
                                                    <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                                                        {new Date(comment.created_at).toLocaleString()}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-5 max-w-sm">
                                                    <p className="text-xs text-foreground leading-relaxed bg-muted/30 p-2.5 rounded-xl border border-border/60">
                                                        "{comment.content}"
                                                    </p>
                                                </td>
                                                <td className="py-4 px-5 text-xs font-semibold text-foreground">
                                                    {comment.blog?.title || `Blog #${comment.blog_id}`}
                                                </td>
                                                <td className="py-4 px-5">{getStatusBadge(comment.status)}</td>
                                                <td className="py-4 px-5 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center justify-end gap-1.5">
                                                        {comment.status !== "approved" && (
                                                            <button
                                                                onClick={() => handleUpdateStatus(comment.id, "approved")}
                                                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer inline-flex items-center gap-1"
                                                            >
                                                                <Check className="w-3.5 h-3.5" /> Approve
                                                            </button>
                                                        )}
                                                        {comment.status !== "spam" && (
                                                            <button
                                                                onClick={() => handleUpdateStatus(comment.id, "spam")}
                                                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all cursor-pointer inline-flex items-center gap-1"
                                                            >
                                                                <ShieldAlert className="w-3.5 h-3.5" /> Spam
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDelete(comment.id)}
                                                            className="p-2 bg-muted/40 text-muted-foreground border border-border/80 rounded-xl hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                                                            title="Delete Comment"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {totalPages > 1 && (
                        <div className="p-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground font-medium bg-card rounded-xl border">
                            <span>Page {page} of {totalPages}</span>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded-xl text-xs font-bold">
                                    Previous
                                </Button>
                                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)} className="rounded-xl text-xs font-bold">
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </DashboardLayout>
    );
}
