"use client";

import React from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { BlogForm } from "@/components/blog/BlogForm";

export default function CreateBlogPage() {
    return (
        <DashboardLayout title="Create Blog Post">
            <div className="p-6 max-w-5xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Create New Blog Post</h1>
                    <p className="text-sm text-muted-foreground">Draft or publish a new article with rich content and custom SEO metadata.</p>
                </div>
                <BlogForm />
            </div>
        </DashboardLayout>
    );
}
