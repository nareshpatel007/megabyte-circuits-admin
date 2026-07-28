"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Shield, Plus, Edit, Trash2, ArrowLeft, CheckSquare, Square, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import LoadingSpinner from "@/components/ui/loading-spinner";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";

interface Permission {
    id: number;
    name: string;
    slug: string;
    module: string;
}

interface Role {
    id: number;
    name: string;
    slug: string;
    description: string;
    permissions?: Permission[];
}

export default function RolesPage() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [isOpen, setIsOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem("admin_token");
            const headers = { Authorization: `Bearer ${token}` };

            const [rolesRes, permsRes] = await Promise.all([
                fetch("/api/admin/roles", { headers }),
                fetch("/api/admin/permissions", { headers })
            ]);

            const rolesData = await rolesRes.json();
            const permsData = await permsRes.json();

            if (rolesData.status || rolesData.data) {
                setRoles(rolesData.data || []);
            }
            if (permsData.status || permsData.data) {
                setPermissions(permsData.data || []);
            }
        } catch (err) {
            console.error("Failed to load roles:", err);
            toast.error("Failed to load roles and permissions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const resetForm = () => {
        setName("");
        setDescription("");
        setSelectedPermissions([]);
        setEditingRole(null);
    };

    const togglePermission = (id: number) => {
        setSelectedPermissions(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleSaveRole = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const token = localStorage.getItem("admin_token");
            const isEdit = !!editingRole;
            const url = isEdit ? `/api/admin/roles/${editingRole.id}` : "/api/admin/roles";
            const method = isEdit ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    description,
                    permission_ids: selectedPermissions
                })
            });

            const data = await res.json();
            if (res.ok && (data.status || data.success)) {
                toast.success(isEdit ? "Role updated successfully" : "Role created successfully");
                setIsOpen(false);
                resetForm();
                fetchData();
            } else {
                toast.error(data.message || "Failed to save role");
            }
        } catch (err: any) {
            toast.error(err?.message || "Error saving role");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteRole = async (id: number) => {
        if (!confirm("Are you sure you want to delete this role?")) return;

        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/roles/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = await res.json();
            if (res.ok && data.status) {
                toast.success("Role deleted");
                fetchData();
            } else {
                toast.error(data.message || "Failed to delete role");
            }
        } catch (err) {
            toast.error("Error deleting role");
        }
    };

    const openEdit = (role: Role) => {
        setEditingRole(role);
        setName(role.name);
        setDescription(role.description || "");
        setSelectedPermissions(role.permissions ? role.permissions.map(p => p.id) : []);
        setIsOpen(true);
    };

    // Group permissions by module
    const groupedPermissions = permissions.reduce((acc, perm) => {
        const mod = perm.module || "General";
        if (!acc[mod]) acc[mod] = [];
        acc[mod].push(perm);
        return acc;
    }, {} as Record<string, Permission[]>);

    return (
        <DashboardLayout title="Roles & Permissions" subtitle="Define fine-grained access control policies">
            <div className="w-full space-y-6">
                {/* Action Header */}
                <div className="flex items-center justify-between">
                    <Link
                        href="/staff"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border/80 rounded-xl hover:bg-muted text-foreground font-bold text-xs transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Staff Management
                    </Link>
                    <button
                        onClick={() => { resetForm(); setIsOpen(true); }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white font-bold rounded-xl shadow-md hover:bg-emerald-600 transition-all text-xs cursor-pointer"
                    >
                        <Plus className="w-4 h-4" /> Create New Role
                    </button>
                </div>

                {/* Roles Cards Grid */}
                {loading ? (
                    <LoadingSpinner text="Loading roles & permissions matrix..." />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {roles.map((role) => (
                            <div key={role.id} className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                                <div>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center justify-center border border-emerald-500/20">
                                                <Shield className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h3 className="font-extrabold text-foreground text-sm">{role.name}</h3>
                                                <span className="text-[10px] font-mono text-muted-foreground">slug: {role.slug}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => openEdit(role)}
                                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white transition-all cursor-pointer"
                                                title="Edit Role"
                                            >
                                                <Edit className="w-3.5 h-3.5" />
                                            </button>
                                            {role.id !== 1 && (
                                                <button
                                                    onClick={() => handleDeleteRole(role.id)}
                                                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white transition-all cursor-pointer"
                                                    title="Delete Role"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-3 font-medium">
                                        {role.description || "No description provided."}
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-border/60">
                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                        Assigned Permissions ({role.permissions ? role.permissions.length : 0})
                                    </p>
                                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                                        {role.permissions && role.permissions.length > 0 ? (
                                            role.permissions.map(p => (
                                                <span key={p.id} className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-semibold text-foreground border border-border/60">
                                                    {p.name}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">Full Super Admin privileges granted.</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal: Create/Edit Role */}
            <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border/80 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
                        <div className="flex items-center justify-between pb-3 border-b border-border/60">
                            <h3 className="text-base font-extrabold text-foreground">
                                {editingRole ? "Edit Role & Permissions" : "Create New Role"}
                            </h3>
                            <Dialog.Close className="p-2 rounded-xl hover:bg-muted text-muted-foreground">
                                ✕
                            </Dialog.Close>
                        </div>

                        <form onSubmit={handleSaveRole} className="space-y-5">
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Role Title</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Production Specialist"
                                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-border/80 rounded-xl text-foreground font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Explain duties and scope for this role..."
                                    rows={2}
                                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-border/80 rounded-xl text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-extrabold uppercase tracking-wider text-foreground block mb-3">
                                    Configure Permission Matrix
                                </label>
                                <div className="space-y-4 max-h-64 overflow-y-auto pr-2 border border-border/60 rounded-xl p-4 bg-muted/20">
                                    {Object.entries(groupedPermissions).map(([moduleName, perms]) => (
                                        <div key={moduleName} className="space-y-2">
                                            <p className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{moduleName}</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {perms.map((p) => {
                                                    const isChecked = selectedPermissions.includes(p.id);
                                                    return (
                                                        <div
                                                            key={p.id}
                                                            onClick={() => togglePermission(p.id)}
                                                            className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${isChecked
                                                                    ? "bg-emerald-500/10 border-emerald-500/40 text-foreground font-bold"
                                                                    : "bg-card border-border/60 text-muted-foreground hover:bg-muted font-medium"
                                                                }`}
                                                        >
                                                            {isChecked ? <CheckSquare className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <Square className="w-4 h-4 flex-shrink-0" />}
                                                            <span>{p.name}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-3 flex justify-end gap-3 border-t border-border/60">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="px-4 py-2.5 border border-border/80 rounded-xl text-xs font-bold hover:bg-muted"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2.5 bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md hover:bg-emerald-600 disabled:opacity-50"
                                >
                                    {submitting ? "Saving..." : (editingRole ? "Update Role" : "Create Role")}
                                </button>
                            </div>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </DashboardLayout>
    );
}
