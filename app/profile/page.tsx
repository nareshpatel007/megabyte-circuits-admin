"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useAuth } from "@/lib/auth-context";
import { AdminAvatar } from "@/components/ui/admin-avatar";
import { toast } from "sonner";
import {
    User as UserIcon,
    Mail,
    Phone,
    Shield,
    KeyRound,
    Camera,
    Trash2,
    Save,
    Lock,
    Eye,
    EyeOff,
    CheckCircle2,
    Calendar,
    Clock,
    UserCheck,
    AlertCircle,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

function ProfileContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, updateUser, refreshProfile } = useAuth();

    const initialTab = searchParams?.get("tab") === "password" ? "password" : "general";
    const [activeTab, setActiveTab] = useState<"general" | "password">(initialTab);

    // Profile fields
    const [name, setName] = useState(user?.name || "");
    const [email, setEmail] = useState(user?.email || "");
    const [username, setUsername] = useState(user?.username || "");
    const [mobile, setMobile] = useState(user?.mobile || "");

    // Account details
    const [role, setRole] = useState(user?.role || "Administrator");
    const [status, setStatus] = useState("Active");
    const [createdAt, setCreatedAt] = useState<string | null>(user?.created_at || null);
    const [lastLoginAt, setLastLoginAt] = useState<string | null>(user?.last_login_at || null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar_url || user?.profile_picture || null);

    // Password fields
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Show/Hide password states
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Loading states
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [removingAvatar, setRemovingAvatar] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [showRemoveModal, setShowRemoveModal] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const getAuthHeaders = () => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("admin_token") : null;
        return {
            "Authorization": token ? `Bearer ${token}` : "",
            "Accept": "application/json"
        };
    };

    // Load fresh profile from backend
    const fetchProfileData = async () => {
        setLoadingProfile(true);
        try {
            const res = await fetch("/api/admin/profile", {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (res.ok && data.status && data.data) {
                const p = data.data;
                setName(p.name || "");
                setEmail(p.email || "");
                setUsername(p.username || "");
                setMobile(p.mobile || "");
                setRole(p.role || "Administrator");
                setStatus(p.status || "Active");
                setCreatedAt(p.created_at || null);
                setLastLoginAt(p.last_login_at || null);
                setAvatarUrl(p.avatar_url || p.profile_picture || null);

                updateUser({
                    name: p.name,
                    email: p.email,
                    username: p.username,
                    mobile: p.mobile,
                    profile_picture: p.profile_picture,
                    avatar_url: p.avatar_url,
                    role: p.role
                });
            }
        } catch (error) {
            console.error("Failed to load profile", error);
            toast.error("Failed to load profile details");
        } finally {
            setLoadingProfile(false);
        }
    };

    useEffect(() => {
        fetchProfileData();
    }, []);

    useEffect(() => {
        if (searchParams?.get("tab") === "password") {
            setActiveTab("password");
        }
    }, [searchParams]);

    useEffect(() => {
        const freshAvatar = user?.avatar_url || user?.profile_picture || null;
        if (freshAvatar) {
            setAvatarUrl(freshAvatar);
        }
    }, [user?.avatar_url, user?.profile_picture]);

    // Profile Update Handler
    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error("Name is required");
            return;
        }
        if (!email.trim()) {
            toast.error("Email is required");
            return;
        }

        setSavingProfile(true);
        try {
            const res = await fetch("/api/admin/profile", {
                method: "PUT",
                headers: {
                    ...getAuthHeaders(),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim(),
                    username: username.trim(),
                    mobile: mobile.trim()
                })
            });

            const data = await res.json();
            if (res.ok && data.status) {
                toast.success(data.message || "Profile updated successfully");
                if (data.data) {
                    updateUser({
                        name: data.data.name,
                        email: data.data.email,
                        username: data.data.username,
                        mobile: data.data.mobile
                    });
                }
            } else {
                toast.error(data.message || "Failed to update profile");
            }
        } catch (error) {
            toast.error("An error occurred while saving profile");
        } finally {
            setSavingProfile(false);
        }
    };

    // Avatar Upload Handler
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
        if (!validTypes.includes(file.type)) {
            toast.error("Invalid file format. Please upload JPG, PNG, or WEBP.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("File size exceeds maximum limit of 5MB.");
            return;
        }

        const formData = new FormData();
        formData.append("profile_picture", file);

        setUploadingAvatar(true);
        try {
            const res = await fetch("/api/admin/profile/picture", {
                method: "POST",
                headers: getAuthHeaders(),
                body: formData
            });

            const data = await res.json();
            if (res.ok && data.status) {
                toast.success(data.message || "Profile picture updated successfully");
                const profileObj = data.data || {};
                const newAvatar = profileObj.avatar_url || profileObj.profile_picture || data.avatar_url || data.profile_picture || null;
                setAvatarUrl(newAvatar);
                updateUser({
                    avatar_url: newAvatar,
                    profile_picture: profileObj.profile_picture || data.profile_picture || newAvatar
                });
                refreshProfile();
            } else {
                toast.error(data.message || "Failed to upload image");
            }
        } catch (error) {
            toast.error("An error occurred while uploading avatar");
        } finally {
            setUploadingAvatar(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    // Remove Avatar Handler
    const handleRemoveAvatar = async () => {
        setRemovingAvatar(true);
        try {
            const res = await fetch("/api/admin/profile/picture", {
                method: "DELETE",
                headers: getAuthHeaders()
            });

            const data = await res.json();
            if (res.ok && data.status) {
                toast.success(data.message || "Profile picture removed successfully");
                setAvatarUrl(null);
                updateUser({
                    avatar_url: null,
                    profile_picture: null
                });
                refreshProfile();
                setShowRemoveModal(false);
            } else {
                toast.error(data.message || "Failed to remove profile picture");
            }
        } catch (error) {
            toast.error("An error occurred while removing picture");
        } finally {
            setRemovingAvatar(false);
        }
    };

    // Change Password Handler
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentPassword) {
            toast.error("Current password is required");
            return;
        }
        if (!newPassword) {
            toast.error("New password is required");
            return;
        }
        if (newPassword.length < 6) {
            toast.error("New password must be at least 6 characters long");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("New password and confirmation password must match");
            return;
        }

        setChangingPassword(true);
        try {
            const res = await fetch("/api/admin/profile/password", {
                method: "PUT",
                headers: {
                    ...getAuthHeaders(),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword,
                    new_password_confirmation: confirmPassword
                })
            });

            const data = await res.json();
            if (res.ok && data.status) {
                toast.success(data.message || "Password changed successfully");
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
            } else {
                toast.error(data.message || "Failed to change password");
            }
        } catch (error) {
            toast.error("An error occurred while updating password");
        } finally {
            setChangingPassword(false);
        }
    };

    if (loadingProfile) {
        return (
            <DashboardLayout title="Admin Profile" subtitle="Manage your account profile and credentials">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                        <p className="text-sm font-semibold">Loading profile details...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Admin Profile" subtitle="Manage your personal profile, credentials, and avatar">
            <div className="max-w-6xl space-y-6">
                {/* Header Profile Summary Banner (Matching App Design) */}
                <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 md:p-8 shadow-xs text-foreground">
                    <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
                        {/* Avatar Container */}
                        <div className="relative group shrink-0">
                            <AdminAvatar
                                src={avatarUrl}
                                name={name}
                                className="w-24 h-24 text-3xl border-2 border-emerald-500/40 shadow-md"
                                iconClassName="w-12 h-12 text-emerald-600"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingAvatar}
                                className="absolute bottom-0 right-0 p-2 rounded-full bg-emerald-600 text-white shadow-md hover:bg-emerald-700 transition-all cursor-pointer border-2 border-background"
                                title="Change Profile Picture"
                            >
                                <Camera className="w-4 h-4" />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/jpg"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </div>

                        {/* User Summary Info */}
                        <div className="flex-1 space-y-2">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                <h1 className="text-2xl font-black text-foreground tracking-tight">{name || "Admin User"}</h1>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    <UserCheck className="w-3.5 h-3.5" />
                                    {role}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    {status}
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground font-semibold flex items-center justify-center md:justify-start gap-2">
                                <Mail className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span>{email || "N/A"}</span>
                                {username && (
                                    <>
                                        <span className="text-border">•</span>
                                        <span className="text-muted-foreground">@{username}</span>
                                    </>
                                )}
                            </p>
                            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingAvatar}
                                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                                >
                                    {uploadingAvatar ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Uploading...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Camera className="w-3.5 h-3.5" />
                                            <span>Upload New Photo</span>
                                        </>
                                    )}
                                </button>
                                {avatarUrl && (
                                    <button
                                        onClick={() => setShowRemoveModal(true)}
                                        disabled={removingAvatar}
                                        className="px-3.5 py-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-destructive/20"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Remove Photo</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Controls */}
                <div className="flex border-b border-border/60 gap-2">
                    <button
                        onClick={() => { setActiveTab("general"); router.replace("/profile"); }}
                        className={cn(
                            "px-5 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer",
                            activeTab === "general"
                                ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-t-xl"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-t-xl"
                        )}
                    >
                        <UserIcon className="w-4 h-4" />
                        <span>Profile Information</span>
                    </button>
                    <button
                        onClick={() => { setActiveTab("password"); router.replace("/profile?tab=password"); }}
                        className={cn(
                            "px-5 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer",
                            activeTab === "password"
                                ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-t-xl"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-t-xl"
                        )}
                    >
                        <KeyRound className="w-4 h-4" />
                        <span>Security & Password</span>
                    </button>
                </div>

                {/* Tab 1: Profile Information */}
                {activeTab === "general" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Form: Edit Info */}
                        <div className="lg:col-span-2 rounded-2xl border border-border/80 bg-card p-6 shadow-xs text-foreground space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <UserIcon className="w-5 h-5 text-emerald-500" />
                                    <span>Personal Details</span>
                                </h3>
                                <p className="text-xs text-muted-foreground font-medium mt-1">Update your account name, email address, username, and mobile contact number.</p>
                            </div>

                            <form onSubmit={handleUpdateProfile} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-foreground mb-1.5">
                                            Full Name <span className="text-destructive">*</span>
                                        </label>
                                        <div className="relative">
                                            <UserIcon className="w-4 h-4 absolute left-3.5 top-3 text-muted-foreground" />
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                required
                                                placeholder="Enter full name"
                                                className="w-full bg-background border border-border/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 transition shadow-2xs"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-foreground mb-1.5">
                                            Username
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-2.5 text-muted-foreground font-mono text-sm font-bold">@</span>
                                            <input
                                                type="text"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                placeholder="admin.username"
                                                className="w-full bg-background border border-border/80 rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 transition shadow-2xs"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-foreground mb-1.5">
                                            Email Address <span className="text-destructive">*</span>
                                        </label>
                                        <div className="relative">
                                            <Mail className="w-4 h-4 absolute left-3.5 top-3 text-muted-foreground" />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                placeholder="admin@megabyte.com"
                                                className="w-full bg-background border border-border/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 transition shadow-2xs"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-foreground mb-1.5">
                                            Mobile / Phone Number
                                        </label>
                                        <div className="relative">
                                            <Phone className="w-4 h-4 absolute left-3.5 top-3 text-muted-foreground" />
                                            <input
                                                type="text"
                                                value={mobile}
                                                onChange={(e) => setMobile(e.target.value)}
                                                placeholder="+91XXXXXXXXXX"
                                                className="w-full bg-background border border-border/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 transition shadow-2xs"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={savingProfile}
                                        className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                    >
                                        {savingProfile ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Saving Changes...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4" />
                                                <span>Save Changes</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Right Column: Account Details (Read-only) */}
                        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs text-foreground space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-emerald-500" />
                                    <span>Account Details</span>
                                </h3>
                                <p className="text-xs text-muted-foreground font-medium mt-1">System privileges and account statistics.</p>
                            </div>

                            <div className="space-y-4 text-xs divide-y divide-border/60">
                                <div className="pt-2 flex justify-between items-center">
                                    <span className="text-muted-foreground font-bold flex items-center gap-1.5">
                                        <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                                        System Role
                                    </span>
                                    <span className="font-bold text-foreground bg-muted px-2.5 py-1 rounded-lg border border-border/60">
                                        {role}
                                    </span>
                                </div>

                                <div className="pt-3 flex justify-between items-center">
                                    <span className="text-muted-foreground font-bold flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                                        Account Status
                                    </span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                                        {status}
                                    </span>
                                </div>

                                <div className="pt-3 flex justify-between items-center">
                                    <span className="text-muted-foreground font-bold flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                        Member Since
                                    </span>
                                    <span className="font-mono font-bold text-foreground">
                                        {createdAt ? new Date(createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A"}
                                    </span>
                                </div>

                                <div className="pt-3 flex justify-between items-center">
                                    <span className="text-muted-foreground font-bold flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                        Last Login
                                    </span>
                                    <span className="font-mono font-bold text-foreground">
                                        {lastLoginAt ? new Date(lastLoginAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" }) : "Recent"}
                                    </span>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground space-y-1">
                                <p className="font-bold text-foreground flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    <span>Privileges Note</span>
                                </p>
                                <p className="leading-relaxed font-medium">
                                    Role assignment and access permissions are managed centrally by Super Administrators.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab 2: Security & Password */}
                {activeTab === "password" && (
                    <div className="max-w-2xl rounded-2xl border border-border/80 bg-card p-6 md:p-8 shadow-xs text-foreground space-y-6">
                        <div>
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Lock className="w-5 h-5 text-emerald-500" />
                                <span>Change Password</span>
                            </h3>
                            <p className="text-xs text-muted-foreground font-medium mt-1">
                                Ensure your account is using a strong, secure password to protect admin features.
                            </p>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-foreground mb-1.5">
                                    Current Password <span className="text-destructive">*</span>
                                </label>
                                <div className="relative">
                                    <Lock className="w-4 h-4 absolute left-3.5 top-3 text-muted-foreground" />
                                    <input
                                        type={showCurrent ? "text" : "password"}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        required
                                        placeholder="••••••••••••"
                                        className="w-full bg-background border border-border/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-foreground font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 transition shadow-2xs"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrent(!showCurrent)}
                                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground cursor-pointer"
                                    >
                                        {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-foreground mb-1.5">
                                    New Password <span className="text-destructive">*</span>
                                </label>
                                <div className="relative">
                                    <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-muted-foreground" />
                                    <input
                                        type={showNew ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        placeholder="••••••••••••"
                                        className="w-full bg-background border border-border/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-foreground font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 transition shadow-2xs"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNew(!showNew)}
                                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground cursor-pointer"
                                    >
                                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-foreground mb-1.5">
                                    Confirm New Password <span className="text-destructive">*</span>
                                </label>
                                <div className="relative">
                                    <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-muted-foreground" />
                                    <input
                                        type={showConfirm ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        placeholder="••••••••••••"
                                        className="w-full bg-background border border-border/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-foreground font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 transition shadow-2xs"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground cursor-pointer"
                                    >
                                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={changingPassword}
                                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {changingPassword ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Updating Password...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="w-4 h-4" />
                                            <span>Change Password</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* Remove Avatar Confirmation Modal */}
            {showRemoveModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-4 text-foreground">
                        <div className="flex items-center gap-3 text-destructive">
                            <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-base font-bold text-foreground">Remove Profile Picture?</h4>
                                <p className="text-xs text-muted-foreground font-medium mt-0.5">Your profile picture will be deleted and reset to default.</p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowRemoveModal(false)}
                                disabled={removingAvatar}
                                className="px-4 py-2 rounded-xl bg-card border border-border/80 hover:bg-muted text-foreground font-bold text-xs transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleRemoveAvatar}
                                disabled={removingAvatar}
                                className="px-4 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                {removingAvatar ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Removing...</span>
                                    </>
                                ) : (
                                    <span>Remove Photo</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}

export default function ProfilePage() {
    return (
        <Suspense fallback={
            <DashboardLayout title="Admin Profile" subtitle="Manage your personal profile, credentials, and avatar">
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                </div>
            </DashboardLayout>
        }>
            <ProfileContent />
        </Suspense>
    );
}
