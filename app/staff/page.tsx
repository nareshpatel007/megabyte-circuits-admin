"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Users, UserPlus, Shield, Key, Edit, Trash2, CheckCircle, XCircle, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import LoadingSpinner from "@/components/ui/loading-spinner";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";

interface Role {
    id: number;
    name: string;
    slug: string;
    description: string;
}

interface StaffUser {
    id: number;
    name: string;
    username: string;
    email: string;
    status: string;
    role_id: number | null;
    role_name?: string;
    last_login_at: string | null;
    created_at: string;
}

export default function StaffPage() {
    const [staff, setStaff] = useState<StaffUser[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Modal state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<StaffUser | null>(null);

    // Form fields
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [roleId, setRoleId] = useState<string>("");
    const [status, setStatus] = useState("active");
    const [submitting, setSubmitting] = useState(false);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem("admin_token");
            const headers = { Authorization: `Bearer ${token}` };

            const [staffRes, rolesRes] = await Promise.all([
                fetch("/api/admin/staff", { headers }),
                fetch("/api/admin/roles", { headers })
            ]);

            const staffData = await staffRes.json();
            const rolesData = await rolesRes.json();

            if (staffData.status || staffData.data) {
                setStaff(staffData.data || []);
            }
            if (rolesData.status || rolesData.data) {
                setRoles(rolesData.data || []);
            }
        } catch (err) {
            console.error("Failed to load staff data:", err);
            toast.error("Failed to load staff members");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const resetForm = () => {
        setName("");
        setUsername("");
        setEmail("");
        setPassword("");
        setRoleId("");
        setStatus("active");
        setEditingUser(null);
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const token = localStorage.getItem("admin_token");
            const isEdit = !!editingUser;
            const url = isEdit ? `/api/admin/staff/${editingUser.id}` : "/api/admin/staff";
            const method = isEdit ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    username,
                    email,
                    password: password || undefined,
                    role_id: roleId ? parseInt(roleId) : null,
                    status
                })
            });

            const data = await res.json();
            if (res.ok && (data.status || data.success)) {
                toast.success(isEdit ? "Staff user updated" : "Staff user created");
                setIsCreateOpen(false);
                resetForm();
                fetchData();
            } else {
                toast.error(data.message || "Failed to save user");
            }
        } catch (err: any) {
            toast.error(err?.message || "Error saving user");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteUser = async (id: number) => {
        if (!confirm("Are you sure you want to delete this staff member?")) return;

        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/staff/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = await res.json();
            if (res.ok && data.status) {
                toast.success("Staff user deleted");
                fetchData();
            } else {
                toast.error(data.message || "Failed to delete staff user");
            }
        } catch (err) {
            toast.error("Error deleting staff user");
        }
    };

    const openEdit = (user: StaffUser) => {
        setEditingUser(user);
        setName(user.name);
        setUsername(user.username || "");
        setEmail(user.email);
        setPassword("");
        setRoleId(user.role_id ? String(user.role_id) : "");
        setStatus(user.status || "active");
        setIsCreateOpen(true);
    };

    const filtered = staff.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.username?.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <DashboardLayout title="User Management" subtitle="Manage admin accounts, staff credentials & system access">
            <div className="w-full space-y-6">
                {/* Action Header */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="search"
                            placeholder="Search staff by Name, Username, or Email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-card border border-border/80 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <Link
                            href="/staff/roles"
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-card border border-border/80 rounded-xl hover:bg-muted text-foreground font-bold text-xs transition-all"
                        >
                            <Shield className="w-4 h-4 text-emerald-500" /> Manage Roles & Permissions
                        </Link>
                        <button
                            onClick={() => { resetForm(); setIsCreateOpen(true); }}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white font-bold rounded-xl shadow-md hover:bg-emerald-600 transition-all text-xs cursor-pointer whitespace-nowrap"
                        >
                            <UserPlus className="w-4 h-4" /> Add New Staff Member
                        </button>
                    </div>
                </div>

                {/* Staff Table */}
                <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm">
                    {loading ? (
                        <LoadingSpinner text="Loading staff members..." />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-muted/80 border-b border-border/80 text-foreground uppercase tracking-wider font-extrabold text-[11px]">
                                        <th className="py-4 px-6">Staff Member</th>
                                        <th className="py-4 px-6">Login Username</th>
                                        <th className="py-4 px-6">Email Address</th>
                                        <th className="py-4 px-6">Assigned Role</th>
                                        <th className="py-4 px-6">Status</th>
                                        <th className="py-4 px-6">Last Active</th>
                                        <th className="py-4 px-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-16 text-center text-muted-foreground text-sm font-medium">
                                                No staff members found matching your search.
                                            </td>
                                        </tr>
                                    ) : (
                                        filtered.map((user) => (
                                            <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center justify-center text-sm border border-emerald-500/20">
                                                            {user.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-extrabold text-foreground text-sm">{user.name}</p>
                                                            <p className="text-[11px] text-muted-foreground">ID: #{user.id}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 font-mono font-bold text-foreground">
                                                    @{user.username || strtok(user.email, '@')}
                                                </td>
                                                <td className="py-4 px-6 font-medium text-foreground">
                                                    {user.email}
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                                        {user.role_name || "Super Admin"}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${user.status === 'active'
                                                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                                            : 'bg-red-500/10 text-red-600 border-red-500/20'
                                                        }`}>
                                                        {user.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                        {user.status}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-muted-foreground font-mono text-[11px]">
                                                    {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}
                                                </td>
                                                <td className="py-4 px-6 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center gap-2">
                                                        <button
                                                            onClick={() => openEdit(user)}
                                                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
                                                        >
                                                            <Edit className="w-3.5 h-3.5" />
                                                        </button>
                                                        {user.id !== 1 && (
                                                            <button
                                                                onClick={() => handleDeleteUser(user.id)}
                                                                className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white transition-all cursor-pointer"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Create/Edit Staff User */}
            <Dialog.Root open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-card border border-border/80 rounded-2xl p-6 shadow-2xl space-y-5">
                        <div className="flex items-center justify-between pb-3 border-b border-border/60">
                            <h3 className="text-base font-extrabold text-foreground">
                                {editingUser ? "Edit Staff Credentials" : "Add New Staff Member"}
                            </h3>
                            <Dialog.Close className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground">
                                ✕
                            </Dialog.Close>
                        </div>

                        <form onSubmit={handleSaveUser} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Rahul Sharma"
                                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-border/80 rounded-xl text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground block mb-1">Username (for login)</label>
                                    <input
                                        type="text"
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="rahul_admin"
                                        className="w-full px-3.5 py-2.5 text-sm bg-background border border-border/80 rounded-xl text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground block mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="rahul@megabyte.com"
                                        className="w-full px-3.5 py-2.5 text-sm bg-background border border-border/80 rounded-xl text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">
                                    Password {editingUser && "(Leave blank to keep current)"}
                                </label>
                                <input
                                    type="password"
                                    required={!editingUser}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-border/80 rounded-xl text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground block mb-1">Assign Role</label>
                                    <select
                                        value={roleId}
                                        onChange={(e) => setRoleId(e.target.value)}
                                        className="w-full px-3.5 py-2.5 text-sm bg-background border border-border/80 rounded-xl text-foreground font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                                    >
                                        <option value="">Default (Super Admin)</option>
                                        {roles.map(r => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground block mb-1">Account Status</label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="w-full px-3.5 py-2.5 text-sm bg-background border border-border/80 rounded-xl text-foreground font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-3 flex justify-end gap-3 border-t border-border/60">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="px-4 py-2.5 border border-border/80 rounded-xl text-xs font-bold hover:bg-muted"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2.5 bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md hover:bg-emerald-600 disabled:opacity-50"
                                >
                                    {submitting ? "Saving..." : (editingUser ? "Update User" : "Create Account")}
                                </button>
                            </div>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </DashboardLayout>
    );
}
