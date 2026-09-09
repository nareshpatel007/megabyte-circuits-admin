"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Save,
    ArrowLeft,
    Image as ImageIcon,
    Globe,
    FileText,
    Settings,
    Upload,
    Code,
    Sparkles,
    Eye,
    Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface BlogFormProps {
    initialData?: any;
    isEdit?: boolean;
}

export function BlogForm({ initialData, isEdit = false }: BlogFormProps) {
    const router = useRouter();

    const [categories, setCategories] = useState<any[]>([]);
    const [tags, setTags] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploadingImg, setUploadingImg] = useState(false);

    // Form fields
    const [title, setTitle] = useState(initialData?.title || "");
    const [slug, setSlug] = useState(initialData?.slug || "");
    const [excerpt, setExcerpt] = useState(initialData?.excerpt || "");
    const [content, setContent] = useState(initialData?.content || "");
    const [featuredImage, setFeaturedImage] = useState(initialData?.featured_image || "");
    const [categoryId, setCategoryId] = useState(initialData?.category_id || "");
    const [categoryName, setCategoryName] = useState(initialData?.category || "");
    const [tagsInput, setTagsInput] = useState(initialData?.tags || "");
    const [status, setStatus] = useState(initialData?.status || "draft");
    const [readingTime, setReadingTime] = useState(initialData?.reading_time || "5 min read");
    const [isFeatured, setIsFeatured] = useState(initialData?.is_featured || false);
    const [allowComments, setAllowComments] = useState(initialData?.allow_comments ?? true);

    // SEO fields
    const [metaTitle, setMetaTitle] = useState(initialData?.meta_title || "");
    const [metaDescription, setMetaDescription] = useState(initialData?.meta_description || "");
    const [metaKeywords, setMetaKeywords] = useState(initialData?.meta_keywords || "");
    const [canonicalUrl, setCanonicalUrl] = useState(initialData?.canonical_url || "");
    const [ogTitle, setOgTitle] = useState(initialData?.og_title || "");
    const [ogDescription, setOgDescription] = useState(initialData?.og_description || "");
    const [ogImage, setOgImage] = useState(initialData?.og_image || "");
    const [twitterTitle, setTwitterTitle] = useState(initialData?.twitter_title || "");
    const [twitterDescription, setTwitterDescription] = useState(initialData?.twitter_description || "");
    const [twitterImage, setTwitterImage] = useState(initialData?.twitter_image || "");
    const [robotsIndex, setRobotsIndex] = useState(initialData?.robots_index ?? true);
    const [robotsFollow, setRobotsFollow] = useState(initialData?.robots_follow ?? true);

    useEffect(() => {
        fetchCategories();
        fetchTags();
    }, []);

    const fetchCategories = async () => {
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/blog-categories", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status) setCategories(data.categories || []);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchTags = async () => {
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/blog-tags", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status) setTags(data.tags || []);
        } catch (e) {
            console.error(e);
        }
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setTitle(val);
        if (!isEdit || !slug) {
            const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
            setSlug(autoSlug);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImg(true);
        const formData = new FormData();
        formData.append("image", file);

        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/blogs/upload-image", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            const data = await res.json();
            if (data.status && data.url) {
                setFeaturedImage(data.url);
            } else {
                alert(data.message || "Failed to upload image.");
            }
        } catch (err) {
            alert("Error uploading image.");
        } finally {
            setUploadingImg(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            alert("Blog Title is required.");
            return;
        }

        setLoading(true);
        const payload = {
            title,
            slug,
            excerpt,
            content,
            featured_image: featuredImage,
            category_id: categoryId ? parseInt(categoryId) : null,
            category: categoryName,
            tags: tagsInput,
            status,
            reading_time: readingTime,
            is_featured: isFeatured,
            allow_comments: allowComments,
            // SEO
            meta_title: metaTitle,
            meta_description: metaDescription,
            meta_keywords: metaKeywords,
            canonical_url: canonicalUrl,
            og_title: ogTitle,
            og_description: ogDescription,
            og_image: ogImage || featuredImage,
            twitter_title: twitterTitle || metaTitle || title,
            twitter_description: twitterDescription || metaDescription || excerpt,
            twitter_image: twitterImage || ogImage || featuredImage,
            robots_index: robotsIndex,
            robots_follow: robotsFollow,
            schema_markup: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "BlogPosting",
                "headline": title,
                "image": featuredImage,
                "description": metaDescription || excerpt,
            }),
        };

        try {
            const token = localStorage.getItem("admin_token");
            const url = isEdit ? `/api/admin/blogs/${initialData.id}` : "/api/admin/blogs";
            const method = isEdit ? "PUT" : "POST";

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
                router.push("/admin/blogs");
                router.refresh();
            } else {
                alert(data.message || "Failed to save blog post.");
            }
        } catch (err) {
            alert("Error saving blog post.");
        } finally {
            setLoading(false);
        }
    };

    // Helper formatting tools for rich content editor
    const insertFormat = (tagOpen: string, tagClose: string) => {
        setContent((prev: string) => `${prev}${tagOpen}Your text here${tagClose}`);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Top Bar */}
            <div className="flex items-center justify-between gap-4">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/admin/blogs")}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Blogs
                </Button>
                <div className="flex items-center gap-3">
                    <select
                        className="bg-background border border-input text-foreground text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                    >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                    </select>

                    <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-2">
                        <Save className="w-4 h-4" /> {loading ? "Saving..." : isEdit ? "Update Blog Post" : "Publish Blog Post"}
                    </Button>
                </div>
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="content" className="w-full">
                <TabsList className="bg-muted p-1 border border-border">
                    <TabsTrigger value="content" className="flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Content & Media
                    </TabsTrigger>
                    <TabsTrigger value="seo" className="flex items-center gap-2">
                        <Globe className="w-4 h-4" /> SEO & Meta Tags
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex items-center gap-2">
                        <Settings className="w-4 h-4" /> Post Settings
                    </TabsTrigger>
                </TabsList>

                {/* Tab 1: Content */}
                <TabsContent value="content" className="space-y-6 mt-6">
                    <Card className="border-border bg-card">
                        <CardHeader>
                            <CardTitle className="text-lg">Basic Information</CardTitle>
                            <CardDescription>Enter post headline, slug, and teaser excerpt.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label className="text-sm font-semibold">Blog Title *</Label>
                                <Input
                                    value={title}
                                    onChange={handleTitleChange}
                                    placeholder="e.g., PCB Design Tips for Signal Integrity"
                                    className="mt-1 bg-background text-lg font-semibold"
                                />
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-sm font-semibold">Slug (URL path) *</Label>
                                    <Input
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value)}
                                        placeholder="pcb-design-tips-signal-integrity"
                                        className="mt-1 bg-background"
                                    />
                                </div>
                                <div>
                                    <Label className="text-sm font-semibold">Category</Label>
                                    <select
                                        className="w-full mt-1 bg-background border border-input text-foreground text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        value={categoryId}
                                        onChange={(e) => {
                                            const id = e.target.value;
                                            setCategoryId(id);
                                            const found = categories.find((c) => c.id.toString() === id);
                                            if (found) setCategoryName(found.name);
                                        }}
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <Label className="text-sm font-semibold">Teaser Excerpt</Label>
                                <Textarea
                                    rows={2}
                                    value={excerpt}
                                    onChange={(e) => setExcerpt(e.target.value)}
                                    placeholder="Short summary displayed on blog cards and search results..."
                                    className="mt-1 bg-background"
                                />
                            </div>

                            <div>
                                <Label className="text-sm font-semibold">Featured Image URL / Text Path</Label>
                                <div className="flex items-center gap-3 mt-1">
                                    <Input
                                        value={featuredImage}
                                        onChange={(e) => setFeaturedImage(e.target.value)}
                                        placeholder="/storage/blogs/my-image.webp or https://..."
                                        className="bg-background flex-1"
                                    />
                                    <label className="cursor-pointer">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleImageUpload}
                                            disabled={uploadingImg}
                                        />
                                        <Button type="button" variant="outline" className="flex items-center gap-2">
                                            <Upload className="w-4 h-4" /> {uploadingImg ? "Uploading..." : "Upload File"}
                                        </Button>
                                    </label>
                                </div>
                                {featuredImage && (
                                    <div className="mt-3 w-48 h-32 rounded-lg border border-border overflow-hidden bg-muted">
                                        <img src={featuredImage} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Rich Content Editor */}
                    <Card className="border-border bg-card">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">Article Content</CardTitle>
                                    <CardDescription>Rich HTML content rendered on the public website.</CardDescription>
                                </div>
                                {/* Editor Toolbar */}
                                <div className="flex items-center gap-1.5 bg-muted p-1 rounded-md border border-border text-xs">
                                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => insertFormat("<h2>", "</h2>")}>H2</Button>
                                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => insertFormat("<h3>", "</h3>")}>H3</Button>
                                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 font-bold" onClick={() => insertFormat("<strong>", "</strong>")}>B</Button>
                                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 italic" onClick={() => insertFormat("<em>", "</em>")}>I</Button>
                                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => insertFormat("<blockquote>", "</blockquote>")}>Quote</Button>
                                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => insertFormat("<pre><code>", "</code></pre>")}>Code</Button>
                                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => insertFormat("<ul>\n  <li>", "</li>\n</ul>")}>List</Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                rows={14}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="<h2>Section Heading</h2><p>Write your article content here in rich HTML...</p>"
                                className="font-mono text-sm bg-background leading-relaxed"
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 2: SEO */}
                <TabsContent value="seo" className="space-y-6 mt-6">
                    <Card className="border-border bg-card">
                        <CardHeader>
                            <CardTitle className="text-lg">Independent Search Engine Optimization (SEO)</CardTitle>
                            <CardDescription>Customize meta title, meta description, and open graph social tags independently from visible post body.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label className="text-sm font-semibold">SEO Meta Title</Label>
                                <Input
                                    value={metaTitle}
                                    onChange={(e) => setMetaTitle(e.target.value)}
                                    placeholder={title || "SEO Page Title (Defaults to Blog Title if left blank)"}
                                    className="mt-1 bg-background"
                                />
                                <span className="text-xs text-muted-foreground block mt-1">Recommended length: 50–60 characters.</span>
                            </div>

                            <div>
                                <Label className="text-sm font-semibold">SEO Meta Description</Label>
                                <Textarea
                                    rows={3}
                                    value={metaDescription}
                                    onChange={(e) => setMetaDescription(e.target.value)}
                                    placeholder={excerpt || "Search Engine Teaser Description (Defaults to Excerpt if left blank)"}
                                    className="mt-1 bg-background"
                                />
                                <span className="text-xs text-muted-foreground block mt-1">Recommended length: 140–160 characters.</span>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-sm font-semibold">Meta Keywords</Label>
                                    <Input
                                        value={metaKeywords}
                                        onChange={(e) => setMetaKeywords(e.target.value)}
                                        placeholder="pcb, layout, signal integrity"
                                        className="mt-1 bg-background"
                                    />
                                </div>
                                <div>
                                    <Label className="text-sm font-semibold">Canonical URL</Label>
                                    <Input
                                        value={canonicalUrl}
                                        onChange={(e) => setCanonicalUrl(e.target.value)}
                                        placeholder="https://megabytecircuits.com/blogs/..."
                                        className="mt-1 bg-background"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border space-y-4">
                                <h3 className="font-semibold text-foreground text-sm">Open Graph (Facebook / LinkedIn)</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs font-medium text-muted-foreground">OG Title</Label>
                                        <Input
                                            value={ogTitle}
                                            onChange={(e) => setOgTitle(e.target.value)}
                                            placeholder="Social Card Title"
                                            className="mt-1 bg-background text-xs"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-medium text-muted-foreground">OG Image URL</Label>
                                        <Input
                                            value={ogImage}
                                            onChange={(e) => setOgImage(e.target.value)}
                                            placeholder={featuredImage || "/storage/blogs/..."}
                                            className="mt-1 bg-background text-xs"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border space-y-4">
                                <h3 className="font-semibold text-foreground text-sm">Twitter Card Metadata</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs font-medium text-muted-foreground">Twitter Title</Label>
                                        <Input
                                            value={twitterTitle}
                                            onChange={(e) => setTwitterTitle(e.target.value)}
                                            placeholder="Twitter Share Headline"
                                            className="mt-1 bg-background text-xs"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-medium text-muted-foreground">Twitter Image URL</Label>
                                        <Input
                                            value={twitterImage}
                                            onChange={(e) => setTwitterImage(e.target.value)}
                                            placeholder="Twitter Card Image"
                                            className="mt-1 bg-background text-xs"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border flex items-center gap-8">
                                <div className="flex items-center gap-3">
                                    <Switch checked={robotsIndex} onCheckedChange={setRobotsIndex} />
                                    <Label className="text-sm font-medium">Index (robots: index)</Label>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Switch checked={robotsFollow} onCheckedChange={setRobotsFollow} />
                                    <Label className="text-sm font-medium">Follow links (robots: follow)</Label>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 3: Settings */}
                <TabsContent value="settings" className="space-y-6 mt-6">
                    <Card className="border-border bg-card">
                        <CardHeader>
                            <CardTitle className="text-lg">Publishing & Metadata</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label className="text-sm font-semibold">Tags (Comma-separated)</Label>
                                <Input
                                    value={tagsInput}
                                    onChange={(e) => setTagsInput(e.target.value)}
                                    placeholder="Signal Integrity, High-Speed, Fabrication"
                                    className="mt-1 bg-background"
                                />
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-sm font-semibold">Estimated Reading Time</Label>
                                    <Input
                                        value={readingTime}
                                        onChange={(e) => setReadingTime(e.target.value)}
                                        placeholder="5 min read"
                                        className="mt-1 bg-background"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="font-semibold">Featured Blog</Label>
                                        <p className="text-xs text-muted-foreground">Highlight this post prominently at the top of the blog directory.</p>
                                    </div>
                                    <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="font-semibold">Allow Public Comments</Label>
                                        <p className="text-xs text-muted-foreground">Enable visitors to post comments awaiting moderation.</p>
                                    </div>
                                    <Switch checked={allowComments} onCheckedChange={setAllowComments} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </form>
    );
}
