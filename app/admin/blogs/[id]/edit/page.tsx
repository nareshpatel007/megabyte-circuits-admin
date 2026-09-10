"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { BlogForm } from "@/components/blog/BlogForm";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";

export default function EditBlogPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id;
    const { user, isLoading: authLoading } = useAuth();

    const roleName = user?.role?.toLowerCase() || "";
    const isSuperAdmin = roleName === "super admin" || roleName === "superadmin";
    const canEdit = isSuperAdmin || (user?.permissions || []).includes("blog.edit");

    const [blog, setBlog] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !canEdit) {
            router.replace("/admin/blogs");
        }
    }, [authLoading, canEdit, router]);

    useEffect(() => {
        if (!id || !canEdit) return;
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
    }, [id, canEdit]);

    if (authLoading || !canEdit) {
        return null;
    }

    return (
        <DashboardLayout title="Edit Blog Post">
            <div className="p-6 w-full space-y-6">
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
