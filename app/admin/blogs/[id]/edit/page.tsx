"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { BlogForm } from "@/components/blog/BlogForm";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditBlogPage() {
    const params = useParams();
    const id = params?.id;
    const [blog, setBlog] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        const fetchBlog = async () => {
            try {
                const token = localStorage.getItem("admin_token");
                const res = await fetch(`/api/admin/blogs/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.status && data.blog) {
                    setBlog(data.blog);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchBlog();
    }, [id]);

    return (
        <DashboardLayout title="Edit Blog Post">
            <div className="p-6 max-w-5xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Edit Blog Post</h1>
                    <p className="text-sm text-muted-foreground">Update content, metadata, and publishing configuration.</p>
                </div>
                {loading ? (
                    <div className="space-y-6">
                        <Skeleton className="h-12 w-full rounded-xl" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Skeleton className="h-10 w-full rounded-xl" />
                            <Skeleton className="h-10 w-full rounded-xl" />
                        </div>
                        <Skeleton className="h-64 w-full rounded-xl" />
                        <Skeleton className="h-32 w-full rounded-xl" />
                    </div>
                ) : !blog ? (
                    <div className="p-12 text-center text-destructive font-semibold">Blog post not found.</div>
                ) : (
                    <BlogForm initialData={blog} isEdit={true} />
                )}
            </div>
        </DashboardLayout>
    );
}
