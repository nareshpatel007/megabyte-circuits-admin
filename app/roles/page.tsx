"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import {
    Shield,
    ShieldCheck,
    Plus,
    Pencil,
    Trash2,
    Search,
    Users,
    ChevronLeft,
    ChevronRight,
    AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";

interface Permission {
    id?: number;
    name: string;
    slug: string;
    module?: string;
}

interface Role {
    id: number;
    name: string;
    slug: string;
    description?: string;
    users_count?: number;
    permissions?: Permission[] | string[];
    created_at?: string;
}

const DEFAULT_PERMISSIONS = [
    { module: "Dashboard & Analytics", keys: ["dashboard.view", "analytics.view"] },
    { module: "Order Management", keys: ["orders.view", "orders.create", "orders.edit", "orders.delete", "orders.status"] },
    { module: "Client Management", keys: ["clients.view", "clients.create", "clients.edit", "clients.delete"] },
    { module: "Inventory Management", keys: ["inventory.view", "inventory.create", "inventory.edit", "inventory.delete"] },
    { module: "Staff & User Roles", keys: ["staff.view", "staff.create", "staff.edit", "staff.delete", "roles.manage"] },
    { module: "System Settings", keys: ["settings.view", "settings.edit"] },
];

const PAGE_SIZE = 10;

export default function RolesPage() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [deleteRoleItem, setDeleteRoleItem] = useState<Role | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchRoles = async () => {
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch("/api/admin/roles", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && (data.status || data.success || Array.isArray(data.data))) {
                setRoles(data.data || data.roles || []);
            } else {
                toast.error(data.message || "Failed to load roles list");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error loading roles list");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const handleDeleteRole = async () => {
        if (!deleteRoleItem) return;
        setDeleting(true);
        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/roles/${deleteRoleItem.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && (data.status || data.success)) {
                toast.success("Role deleted successfully");
                setDeleteRoleItem(null);
                fetchRoles();
            } else {
                toast.error(data.message || "Failed to delete role");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error deleting role");
        } finally {
            setDeleting(false);
        }
    };

    const filteredRoles = roles.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(search.toLowerCase()))
    );

    const totalPages = Math.ceil(filteredRoles.length / PAGE_SIZE) || 1;
    const paginatedRoles = filteredRoles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const totalAssignedStaff = roles.reduce((acc, curr) => acc + (curr.users_count || 0), 0);

    const headerAction = (
        <Link
            href="/roles/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-600 text-black transition-all shadow-xs cursor-pointer"
        >
            <Plus className="w-4 h-4" />
            Create New Role
        </Link>
    );

    return (
        <DashboardLayout title="Role & Permission Management" subtitle="Define access controls and permission scopes for staff members" action={headerAction}>
            {loading ? (
                <TableSkeleton rows={6} />
            ) : (
                <div className="w-full space-y-5 animate-in fade-in duration-300">

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Roles</p>
                                <h3 className="text-2xl font-black text-foreground mt-0.5">{roles.length}</h3>
                                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Configured system roles</p>
                            </div>
                        </div>

                        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Assigned Staff</p>
                                <h3 className="text-2xl font-black text-blue-500 mt-0.5">{totalAssignedStaff}</h3>
                                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Members with custom roles</p>
                            </div>
                        </div>

                        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                                <Shield className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Module Scope</p>
                                <h3 className="text-2xl font-black text-foreground mt-0.5">{DEFAULT_PERMISSIONS.length} Modules</h3>
                                <p className="text-[11px] text-purple-500 font-bold mt-0.5">Full permission control</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative w-full md:w-96">
                            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
                            <input
                                type="search"
                                placeholder="Search roles by title, description..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full pl-10 pr-4 py-2 bg-muted/30 border border-border/80 rounded-xl text-xs text-foreground focus:outline-hidden focus:border-emerald-500 font-medium"
                            />
                        </div>

                        <div className="text-xs text-muted-foreground font-semibold">
                            Showing <strong className="text-foreground">{paginatedRoles.length}</strong> of <strong className="text-foreground">{filteredRoles.length}</strong> roles
                        </div>
                    </div>

                    <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-muted/40 border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                                        <th className="py-3.5 px-6">Role Details</th>
                                        <th className="py-3.5 px-6">Assigned Staff</th>
                                        <th className="py-3.5 px-6">Permission Scope</th>
                                        <th className="py-3.5 px-6">Created Date</th>
                                        <th className="py-3.5 px-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {paginatedRoles.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground text-xs font-medium">
                                                No roles found matching your search criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedRoles.map((role) => {
                                            const isSuperAdmin = role.name.toLowerCase().includes("super admin") || role.id === 1;

                                            const getModulesForRole = (perms?: any[]): string[] => {
                                                if (!perms || !Array.isArray(perms) || perms.length === 0) return [];
                                                const modulesSet = new Set<string>();

                                                perms.forEach((p) => {
                                                    if (typeof p === "object" && p !== null) {
                                                        if (p.module) {
                                                            modulesSet.add(p.module);
                                                            return;
                                                        }
                                                        const key = p.slug || p.name;
                                                        if (key) {
                                                            const found = DEFAULT_PERMISSIONS.find((m) => m.keys.includes(key));
                                                            if (found) modulesSet.add(found.module);
                                                        }
                                                    } else if (typeof p === "string") {
                                                        const found = DEFAULT_PERMISSIONS.find((m) => m.keys.includes(p));
                                                        if (found) {
                                                            modulesSet.add(found.module);
                                                        } else {
                                                            const modName = p.split(".")[0];
                                                            if (modName) {
                                                                modulesSet.add(modName.charAt(0).toUpperCase() + modName.slice(1));
                                                            }
                                                        }
                                                    }
                                                });

                                                return Array.from(modulesSet);
                                            };

                                            const assignedModules = getModulesForRole(Array.isArray(role.permissions) ? role.permissions : []);

                                            const formatRoleDate = (dateStr?: string) => {
                                                if (!dateStr) return "System Default";
                                                try {
                                                    const d = new Date(dateStr);
                                                    if (isNaN(d.getTime())) return "System Default";
                                                    const dateFormatted = d.toLocaleDateString("en-GB", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric"
                                                    });
                                                    const timeFormatted = d.toLocaleTimeString("en-GB", {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        hour12: false
                                                    });
                                                    return `${dateFormatted} ${timeFormatted}`;
                                                } catch (e) {
                                                    return "System Default";
                                                }
                                            };

                                            const formattedDate = formatRoleDate(role.created_at);

                                            return (
                                                <tr key={role.id} className="hover:bg-muted/20 transition-colors">

                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center font-bold shrink-0">
                                                                <ShieldCheck className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-extrabold text-foreground text-sm">{role.name}</p>
                                                                </div>
                                                                <p className="text-[11px] text-muted-foreground font-medium mt-0.5 max-w-md truncate">
                                                                    {role.description || "Grants specific access rights and management controls for staff."}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                            <Users className="w-3.5 h-3.5 text-blue-500" />
                                                            {role.users_count || 0} Members
                                                        </span>
                                                    </td>

                                                    <td className="py-4 px-6 whitespace-nowrap">
                                                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                                                            {isSuperAdmin ? (
                                                                <span className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                                                                    ★ Full System Access
                                                                </span>
                                                            ) : assignedModules.length === 0 ? (
                                                                <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-muted/50 text-muted-foreground border border-border/60">
                                                                    No Modules Assigned
                                                                </span>
                                                            ) : (
                                                                assignedModules.map((mod) => (
                                                                    <span key={mod} className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                                        {mod}
                                                                    </span>
                                                                ))
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="py-4 px-6 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                                                        {formattedDate}
                                                    </td>

                                                    <td className="py-4 px-6 text-right whitespace-nowrap">
                                                        <div className="inline-flex items-center justify-end gap-1.5">
                                                            <Link
                                                                href={`/roles/${role.id}/edit`}
                                                                title="Edit Role & Permissions"
                                                                className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500 hover:text-white transition-all cursor-pointer shadow-2xs"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </Link>

                                                            {!isSuperAdmin && (
                                                                <button
                                                                    onClick={() => setDeleteRoleItem(role)}
                                                                    title="Delete Role"
                                                                    className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white transition-all cursor-pointer shadow-2xs"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>

                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground font-medium bg-card">
                            <span>
                                Showing <strong className="text-foreground">{filteredRoles.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}</strong> to{" "}
                                <strong className="text-foreground">{Math.min(page * PAGE_SIZE, filteredRoles.length)}</strong> of{" "}
                                <strong className="text-foreground">{filteredRoles.length}</strong> roles
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    className="px-3 py-1.5 rounded-lg border border-border/80 bg-muted/30 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold cursor-pointer"
                                >
                                    <ChevronLeft className="w-4 h-4 inline" /> Prev
                                </button>
                                <span className="px-2 font-bold text-foreground">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    className="px-3 py-1.5 rounded-lg border border-border/80 bg-muted/30 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold cursor-pointer"
                                >
                                    Next <ChevronRight className="w-4 h-4 inline" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <Dialog.Root open={!!deleteRoleItem} onOpenChange={(open) => !open && setDeleteRoleItem(null)}>
                        <Dialog.Portal>
                            <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 transition-opacity" />
                            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border/80 rounded-2xl p-6 shadow-2xl space-y-4">
                                <div className="flex items-center gap-3 text-rose-500">
                                    <AlertTriangle className="w-6 h-6 shrink-0" />
                                    <h3 className="text-base font-extrabold text-foreground">Confirm Role Deletion</h3>
                                </div>

                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Are you sure you want to delete the role <strong className="text-foreground">{deleteRoleItem?.name}</strong>? Staff members assigned to this role will revert to the default access scope.
                                </p>

                                <div className="pt-3 flex justify-end gap-3 border-t border-border/60">
                                    <button
                                        type="button"
                                        onClick={() => setDeleteRoleItem(null)}
                                        className="px-4 py-2.5 border border-border/80 rounded-xl text-xs font-bold hover:bg-muted cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        disabled={deleting}
                                        onClick={handleDeleteRole}
                                        className="px-5 py-2.5 bg-rose-500 text-white font-extrabold rounded-xl text-xs shadow-md hover:bg-rose-600 disabled:opacity-50 cursor-pointer"
                                    >
                                        {deleting ? "Deleting..." : "Delete Role"}
                                    </button>
                                </div>
                            </Dialog.Content>
                        </Dialog.Portal>
                    </Dialog.Root>

                </div>
            )}
        </DashboardLayout>
    );
}
