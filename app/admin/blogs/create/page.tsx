"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { BlogForm } from "@/components/blog/BlogForm";
import { useAuth } from "@/lib/auth-context";

export default function CreateBlogPage() {
    const router = useRouter();
    const { user, isLoading } = useAuth();

    const roleName = user?.role?.toLowerCase() || "";
    const isSuperAdmin = roleName === "super admin" || roleName === "superadmin";
    const canCreate = isSuperAdmin || (user?.permissions || []).includes("blog.create");

    useEffect(() => {
        if (!isLoading && !canCreate) {
            router.replace("/admin/blogs");
        }
    }, [isLoading, canCreate, router]);

    if (isLoading || !canCreate) {
        return null;
    }

    return (
        <DashboardLayout title="Create Blog Post">
            <div className="p-6 w-full space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Create New Blog Post</h1>
                    <p className="text-sm text-muted-foreground">Draft or publish a new article with rich content and custom SEO metadata.</p>
                </div>
                <BlogForm />
            </div>
        </DashboardLayout>
    );
}
