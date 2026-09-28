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
            const token = localStorage.getItem("admin_token");
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

        // Check format & size
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
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/profile/picture", {
                method: "POST",
                headers: {
                    "Authorization": token ? `Bearer ${token}` : "",
                    "Accept": "application/json"
                },
                body: formData
            });

            const data = await res.json();
            if (res.ok && data.status) {
                toast.success(data.message || "Profile picture updated successfully");
                const newAvatar = data.avatar_url || data.profile_picture;
                setAvatarUrl(newAvatar);
                updateUser({
                    avatar_url: newAvatar,
                    profile_picture: data.profile_picture
                });
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
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                        <p className="text-sm font-medium">Loading profile details...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Admin Profile" subtitle="Manage your personal profile, credentials, and avatar">
            <div className="max-w-6xl space-y-6">
                {/* Header Profile Summary Banner */}
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/90 p-6 md:p-8 backdrop-blur-xl card-shadow-dark">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
                        {/* Avatar Container */}
                        <div className="relative group">
                            <AdminAvatar
                                src={avatarUrl}
                                name={name}
                                className="w-24 h-24 text-3xl border-2 border-emerald-500/30 shadow-2xl"
                                iconClassName="w-12 h-12 text-white"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingAvatar}
                                className="absolute bottom-0 right-0 p-2 rounded-full bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 transition-all cursor-pointer border-2 border-slate-900"
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
                                <h1 className="text-2xl font-bold text-white tracking-tight">{name || "Admin User"}</h1>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    <UserCheck className="w-3.5 h-3.5" />
                                    {role}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                    {status}
                                </span>
                            </div>
                            <p className="text-sm text-slate-400 font-mono flex items-center justify-center md:justify-start gap-2">
                                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>{email || "N/A"}</span>
                                {username && (
                                    <>
                                        <span className="text-slate-600">•</span>
                                        <span className="text-slate-400">@{username}</span>
                                    </>
                                )}
                            </p>
                            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs text-slate-400">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingAvatar}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-medium transition cursor-pointer flex items-center gap-1.5 border border-emerald-500/30"
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
                                        className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-medium transition cursor-pointer flex items-center gap-1.5 border border-rose-500/20"
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
                <div className="flex border-b border-white/10 gap-2">
                    <button
                        onClick={() => { setActiveTab("general"); router.replace("/profile"); }}
                        className={cn(
                            "px-5 py-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 cursor-pointer",
                            activeTab === "general"
                                ? "border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-xl"
                                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-t-xl"
                        )}
                    >
                        <UserIcon className="w-4 h-4" />
                        <span>Profile Information</span>
                    </button>
                    <button
                        onClick={() => { setActiveTab("password"); router.replace("/profile?tab=password"); }}
                        className={cn(
                            "px-5 py-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 cursor-pointer",
                            activeTab === "password"
                                ? "border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-xl"
                                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-t-xl"
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
                        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-slate-900/90 p-6 backdrop-blur-xl card-shadow-dark space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <UserIcon className="w-5 h-5 text-emerald-400" />
                                    <span>Personal Details</span>
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">Update your account name, email address, username, and mobile contact number.</p>
                            </div>

                            <form onSubmit={handleUpdateProfile} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                            Full Name <span className="text-rose-400">*</span>
                                        </label>
                                        <div className="relative">
                                            <UserIcon className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                required
                                                placeholder="Enter full name"
                                                className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                            Username
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-2.5 text-slate-400 font-mono text-sm">@</span>
                                            <input
                                                type="text"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                placeholder="admin.username"
                                                className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                            Email Address <span className="text-rose-400">*</span>
                                        </label>
                                        <div className="relative">
                                            <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                placeholder="admin@megabyte.com"
                                                className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                            Mobile / Phone Number
                                        </label>
                                        <div className="relative">
                                            <Phone className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                                            <input
                                                type="text"
                                                value={mobile}
                                                onChange={(e) => setMobile(e.target.value)}
                                                placeholder="+91XXXXXXXXXX"
                                                className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={savingProfile}
                                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
                        <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-6 backdrop-blur-xl card-shadow-dark space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-emerald-400" />
                                    <span>Account Details</span>
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">System privileges and account statistics.</p>
                            </div>

                            <div className="space-y-4 text-xs divide-y divide-white/5">
                                <div className="pt-2 flex justify-between items-center">
                                    <span className="text-slate-400 flex items-center gap-1.5">
                                        <Shield className="w-3.5 h-3.5 text-slate-500" />
                                        System Role
                                    </span>
                                    <span className="font-semibold text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-white/10">
                                        {role}
                                    </span>
                                </div>

                                <div className="pt-3 flex justify-between items-center">
                                    <span className="text-slate-400 flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                                        Account Status
                                    </span>
                                    <span className="font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                                        {status}
                                    </span>
                                </div>

                                <div className="pt-3 flex justify-between items-center">
                                    <span className="text-slate-400 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                        Member Since
                                    </span>
                                    <span className="font-mono text-slate-300">
                                        {createdAt ? new Date(createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A"}
                                    </span>
                                </div>

                                <div className="pt-3 flex justify-between items-center">
                                    <span className="text-slate-400 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                                        Last Login
                                    </span>
                                    <span className="font-mono text-slate-300">
                                        {lastLoginAt ? new Date(lastLoginAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" }) : "Recent"}
                                    </span>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 text-[11px] text-slate-400 space-y-1">
                                <p className="font-semibold text-slate-300 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <span>Privileges Note</span>
                                </p>
                                <p className="leading-relaxed">
                                    Role assignment and access permissions are managed centrally by Super Administrators.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab 2: Security & Password */}
                {activeTab === "password" && (
                    <div className="max-w-2xl rounded-2xl border border-white/10 bg-slate-900/90 p-6 md:p-8 backdrop-blur-xl card-shadow-dark space-y-6">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Lock className="w-5 h-5 text-amber-400" />
                                <span>Change Password</span>
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">
                                Ensure your account is using a strong, secure password to protect admin features.
                            </p>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                    Current Password <span className="text-rose-400">*</span>
                                </label>
                                <div className="relative">
                                    <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                                    <input
                                        type={showCurrent ? "text" : "password"}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        required
                                        placeholder="••••••••••••"
                                        className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrent(!showCurrent)}
                                        className="absolute right-3 top-3 text-slate-400 hover:text-white"
                                    >
                                        {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                    New Password <span className="text-rose-400">*</span>
                                </label>
                                <div className="relative">
                                    <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                                    <input
                                        type={showNew ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        placeholder="••••••••••••"
                                        className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNew(!showNew)}
                                        className="absolute right-3 top-3 text-slate-400 hover:text-white"
                                    >
                                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                    Confirm New Password <span className="text-rose-400">*</span>
                                </label>
                                <div className="relative">
                                    <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                                    <input
                                        type={showConfirm ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        placeholder="••••••••••••"
                                        className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute right-3 top-3 text-slate-400 hover:text-white"
                                    >
                                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={changingPassword}
                                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3 text-rose-400">
                            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-base font-bold text-white">Remove Profile Picture?</h4>
                                <p className="text-xs text-slate-400 mt-0.5">Your profile picture will be deleted and reset to default.</p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowRemoveModal(false)}
                                disabled={removingAvatar}
                                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleRemoveAvatar}
                                disabled={removingAvatar}
                                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-lg shadow-rose-600/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
