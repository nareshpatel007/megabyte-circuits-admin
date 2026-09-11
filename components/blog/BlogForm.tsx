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
    Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Editor } from "@tinymce/tinymce-react";

interface BlogFormProps {
    initialData?: any;
    isEdit?: boolean;
}

export function BlogForm({ initialData, isEdit = false }: BlogFormProps) {
    const router = useRouter();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const ogFileInputRef = React.useRef<HTMLInputElement>(null);

    const [categories, setCategories] = useState<any[]>([]);
    const [tags, setTags] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploadingImg, setUploadingImg] = useState(false);
    const [uploadingOgImg, setUploadingOgImg] = useState(false);

    const formatPublishedAt = (dateStr?: string) => {
        if (!dateStr) return "";
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return "";
            const tzOffset = d.getTimezoneOffset() * 60000;
            return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
        } catch {
            return "";
        }
    };

    // Form fields
    const [title, setTitle] = useState(initialData?.title || "");
    const [slug, setSlug] = useState(initialData?.slug || "");
    const [excerpt, setExcerpt] = useState(initialData?.excerpt || "");
    const [content, setContent] = useState(initialData?.content || "");
    const [featuredImage, setFeaturedImage] = useState(initialData?.featured_image || "");
    const [categoryId, setCategoryId] = useState(initialData?.category_id || "");
    const [categoryName, setCategoryName] = useState(initialData?.category || "");
    const [authorName, setAuthorName] = useState(initialData?.author_name || "");
    const [publishedAt, setPublishedAt] = useState(formatPublishedAt(initialData?.published_at) || "");
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

        if (file.size > 5 * 1024 * 1024) {
            alert("Image file size should be less than 5MB.");
            return;
        }

        setUploadingImg(true);
        try {
            const token = localStorage.getItem("admin_token");
            const formData = new FormData();
            formData.append("image", file);

            const res = await fetch("/api/admin/blogs/upload-image", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData,
            });

            const data = await res.json();
            if (data.status && data.url) {
                setFeaturedImage(data.url);
            } else {
                alert(data.message || "Image upload failed.");
            }
        } catch (err) {
            alert("Error uploading image file.");
        } finally {
            setUploadingImg(false);
        }
    };

    const handleRemoveImage = () => {
        setFeaturedImage("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleOgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert("OG Image file size should be less than 5MB.");
            return;
        }

        setUploadingOgImg(true);
        try {
            const token = localStorage.getItem("admin_token");
            const formData = new FormData();
            formData.append("image", file);

            const res = await fetch("/api/admin/blogs/upload-image", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData,
            });

            const data = await res.json();
            if (data.status && data.url) {
                setOgImage(data.url);
            } else {
                alert(data.message || "OG Image upload failed.");
            }
        } catch (err) {
            alert("Error uploading OG image file.");
        } finally {
            setUploadingOgImg(false);
        }
    };

    const handleRemoveOgImage = () => {
        setOgImage("");
        if (ogFileInputRef.current) {
            ogFileInputRef.current.value = "";
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
            author_name: authorName,
            published_at: publishedAt || null,
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
                        className="bg-background border border-input text-foreground text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold cursor-pointer"
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
                                        className="w-full mt-1 bg-background border border-input text-foreground text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
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
                                <div>
                                    <Label className="text-sm font-semibold">Author / Person Name</Label>
                                    <Input
                                        value={authorName}
                                        onChange={(e) => setAuthorName(e.target.value)}
                                        placeholder="e.g. Megabyte Circuits"
                                        className="mt-1 bg-background"
                                    />
                                </div>
                                <div>
                                    <Label className="text-sm font-semibold">Publish / Creation Date</Label>
                                    <Input
                                        type="datetime-local"
                                        value={publishedAt}
                                        onChange={(e) => setPublishedAt(e.target.value)}
                                        className="mt-1 bg-background"
                                    />
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
                                <Label className="text-sm font-semibold">Featured Image</Label>
                                <div className="mt-2 flex items-start gap-4">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                        disabled={uploadingImg}
                                    />

                                    {featuredImage ? (
                                        <div className="relative group w-48 h-32 rounded-lg border border-border overflow-hidden bg-muted shrink-0">
                                            <img src={featuredImage} alt="Featured Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={handleRemoveImage}
                                                    className="flex items-center gap-1 text-xs"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" /> Remove
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploadingImg}
                                            className="flex items-center gap-2 h-20 w-48 border-dashed border-2 justify-center text-muted-foreground hover:text-foreground"
                                        >
                                            <Upload className="w-5 h-5" /> {uploadingImg ? "Processing..." : "Select Image"}
                                        </Button>
                                    )}

                                    {featuredImage && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploadingImg}
                                            className="flex items-center gap-2"
                                        >
                                            <Upload className="w-4 h-4" /> Change Image
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Rich Content Editor Package */}
                    <Card className="border-border bg-card">
                        <CardHeader>
                            <CardTitle className="text-lg">Article Content</CardTitle>
                        </CardHeader>
                        <CardContent className="min-h-[450px]">
                            <Editor
                                apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY || "no-api-key"}
                                value={content}
                                onEditorChange={(newContent) => setContent(newContent)}
                                init={{
                                    height: 480,
                                    menubar: true,
                                    plugins: [
                                        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                                        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                                        'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                                    ],
                                    toolbar: 'undo redo | blocks | ' +
                                        'bold italic forecolor | alignleft aligncenter ' +
                                        'alignright alignjustify | bullist numlist outdent indent | ' +
                                        'removeformat | code fullscreen | help',
                                    images_upload_handler: async (blobInfo: any) => {
                                        const token = localStorage.getItem("admin_token");
                                        const formData = new FormData();
                                        formData.append('image', blobInfo.blob(), blobInfo.filename());
                                        const res = await fetch('/api/admin/blogs/upload-image', {
                                            method: 'POST',
                                            headers: { Authorization: `Bearer ${token}` },
                                            body: formData,
                                        });
                                        const data = await res.json();
                                        if (data.status && data.url) {
                                            return data.url;
                                        }
                                        throw new Error(data.message || 'Image upload failed');
                                    },
                                    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:15px }',
                                    skin: 'oxide',
                                    content_css: 'default',
                                }}
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
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-medium text-muted-foreground">OG Image</Label>
                                            {featuredImage && (
                                                <button
                                                    type="button"
                                                    onClick={() => setOgImage(featuredImage)}
                                                    className="text-[11px] text-emerald-600 hover:underline font-medium cursor-pointer"
                                                >
                                                    Use Featured Image
                                                </button>
                                            )}
                                        </div>
                                        
                                        <input
                                            ref={ogFileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleOgImageUpload}
                                            disabled={uploadingOgImg}
                                        />

                                        <div className="mt-1 flex flex-col gap-2">
                                            <Input
                                                value={ogImage}
                                                onChange={(e) => setOgImage(e.target.value)}
                                                placeholder={featuredImage || "Paste image URL or upload below..."}
                                                className="bg-background text-xs"
                                            />
                                            
                                            <div className="flex items-center gap-3">
                                                {ogImage ? (
                                                    <div className="relative group w-32 h-20 rounded border border-border overflow-hidden bg-muted shrink-0">
                                                        <img src={ogImage} alt="OG Preview" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <Button
                                                                type="button"
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={handleRemoveOgImage}
                                                                className="h-6 px-2 text-[10px] flex items-center gap-1 cursor-pointer"
                                                            >
                                                                <Trash2 className="w-3 h-3" /> Remove
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : null}

                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => ogFileInputRef.current?.click()}
                                                    disabled={uploadingOgImg}
                                                    className="text-xs flex items-center gap-2 cursor-pointer h-9"
                                                >
                                                    <Upload className="w-3.5 h-3.5" /> {uploadingOgImg ? "Uploading..." : ogImage ? "Change Image" : "Upload OG Image"}
                                                </Button>
                                            </div>
                                        </div>
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
                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setRobotsIndex(!robotsIndex)}>
                                    <Switch checked={robotsIndex} onCheckedChange={setRobotsIndex} />
                                    <Label className="text-sm font-medium cursor-pointer">Index (robots: index)</Label>
                                </div>
                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setRobotsFollow(!robotsFollow)}>
                                    <Switch checked={robotsFollow} onCheckedChange={setRobotsFollow} />
                                    <Label className="text-sm font-medium cursor-pointer">Follow links (robots: follow)</Label>
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
                                <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsFeatured(!isFeatured)}>
                                    <div>
                                        <Label className="font-semibold cursor-pointer">Featured Blog</Label>
                                        <p className="text-xs text-muted-foreground">Highlight this post prominently at the top of the blog directory.</p>
                                    </div>
                                    <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
                                </div>

                                <div className="flex items-center justify-between cursor-pointer" onClick={() => setAllowComments(!allowComments)}>
                                    <div>
                                        <Label className="font-semibold cursor-pointer">Allow Public Comments</Label>
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
