"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import {
    ArrowLeft,
    ShieldCheck,
    Pencil,
    Check,
    Sparkles,
    RefreshCw,
    Shield
} from "lucide-react";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/ui/skeleton";

interface PermissionItem {
    id: number;
    name: string;
    slug: string;
    module: string;
}

interface PermissionGroup {
    module: string;
    items: PermissionItem[];
}

export default function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);

    useEffect(() => {
        const fetchPermissionsAndRole = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("admin_token");

                // Fetch database permissions list
                const permRes = await fetch("/api/admin/permissions", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const permData = await permRes.json();
                if (permRes.ok && permData.status && Array.isArray(permData.data)) {
                    const groupsMap: Record<string, PermissionItem[]> = {};
                    permData.data.forEach((item: PermissionItem) => {
                        const mod = item.module || "General";
                        if (!groupsMap[mod]) groupsMap[mod] = [];
                        groupsMap[mod].push(item);
                    });

                    const groupsArr: PermissionGroup[] = Object.keys(groupsMap).map((mod) => ({
                        module: mod,
                        items: groupsMap[mod]
                    }));

                    setPermissionGroups(groupsArr);
                }

                // Fetch specific role details
                const res = await fetch(`/api/admin/roles/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();

                if (res.ok && (data.status || data.success) && data.data) {
                    const r = data.data;
                    setName(r.name || "");
                    setDescription(r.description || "");

                    const existingPerms: string[] = Array.isArray(r.permissions)
                        ? r.permissions.map((p: any) => (typeof p === "object" ? p.slug || p.name : p))
                        : [];

                    setSelectedPermissions(existingPerms);
                } else {
                    toast.error(data.message || "Failed to load role details");
                }
            } catch (err) {
                console.error(err);
                toast.error("Error fetching role details");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchPermissionsAndRole();
        }
    }, [id]);

    const togglePermission = (key: string) => {
        setSelectedPermissions((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    };

    const selectAllGroup = (groupKeys: string[]) => {
        const allSelected = groupKeys.every((k) => selectedPermissions.includes(k));
        if (allSelected) {
            setSelectedPermissions((prev) => prev.filter((k) => !groupKeys.includes(k)));
        } else {
            setSelectedPermissions((prev) => Array.from(new Set([...prev, ...groupKeys])));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error("Role title is required");
            return;
        }

        setSubmitting(true);

        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/roles/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim(),
                    permissions: selectedPermissions
                })
            });

            const data = await res.json();

            if (data.status || data.success) {
                toast.success(`Role "${name}" updated successfully!`, { duration: 5000 });
                router.push("/roles");
            } else {
                toast.error(data.message || "Failed to update role");
            }
        } catch (err: any) {
            console.error(err);
            toast.error("Error updating role");
        } finally {
            setSubmitting(false);
        }
    };

    const backButton = (
        <Link
            href="/roles"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-card border border-border/80 hover:bg-muted text-foreground transition-all shadow-xs"
        >
            <ArrowLeft className="w-4 h-4 text-emerald-500" />
            Back to Roles List
        </Link>
    );

    return (
        <DashboardLayout title={name ? `Edit Role: ${name}` : `Edit Role`} subtitle="Update staff access scope and permission privileges" action={backButton}>
            {loading ? (
                <TableSkeleton rows={5} />
            ) : (
                <div className="w-full space-y-6 animate-in fade-in duration-300">

                    {/* Main Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Role Metadata */}
                        <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-5">
                            <div className="flex items-center gap-2 border-b border-border/60 pb-3.5">
                                <Shield className="w-4 h-4 text-emerald-500" />
                                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Role Metadata & Identification</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                                <div>
                                    <label className="block text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                                        Role Title <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Production Manager"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        className="w-full px-3.5 py-2.5 bg-muted/30 border border-border/80 rounded-xl text-foreground focus:outline-hidden focus:border-emerald-500 text-xs font-bold"
                                    />
                                </div>

                                <div>
                                    <label className="block text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                                        Description
                                    </label>
                                    <textarea
                                        rows={1}
                                        placeholder="Describe duties, responsibilities, and access limits for this staff role..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-muted/30 border border-border/80 rounded-xl text-foreground focus:outline-hidden focus:border-emerald-500 text-xs font-medium"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Permission Scope Checklists */}
                        <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-5">
                            <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                    <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Module Permission Scope</h2>
                                </div>
                                <span className="text-[11px] font-extrabold text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                                    {selectedPermissions.length} Enabled
                                </span>
                            </div>

                            <div className="space-y-4">
                            {permissionGroups.length === 0 ? (
                                <div className="p-8 text-center text-xs text-muted-foreground">
                                    No permissions found in system database.
                                </div>
                            ) : (
                                permissionGroups.map((group) => {
                                    const groupSlugs = group.items.map((i) => i.slug);
                                    const allInGroup = groupSlugs.every((k) => selectedPermissions.includes(k));

                                    return (
                                        <div key={group.module} className="p-4 bg-muted/30 border border-border/60 rounded-xl space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-extrabold text-foreground tracking-wide flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                    {group.module}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => selectAllGroup(groupSlugs)}
                                                    className="text-[11px] font-bold text-emerald-500 hover:underline cursor-pointer"
                                                >
                                                    {allInGroup ? "Deselect All" : "Select All"}
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                                {group.items.map((perm) => {
                                                    const key = perm.slug;
                                                    const isChecked = selectedPermissions.includes(key);
                                                    return (
                                                        <label
                                                            key={perm.id || perm.slug}
                                                            onClick={() => togglePermission(key)}
                                                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-mono cursor-pointer transition-all ${isChecked
                                                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold shadow-2xs"
                                                                : "bg-card border-border/60 text-muted-foreground hover:border-border"
                                                                }`}
                                                        >
                                                            <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${isChecked ? "bg-emerald-500 border-emerald-500 text-black" : "border-border/80 bg-background"}`}>
                                                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                                            </div>
                                                            <div className="truncate flex flex-col">
                                                                <span className="font-sans font-bold text-foreground truncate">{perm.name}</span>
                                                                <span className="text-[10px] text-muted-foreground font-mono truncate">{perm.slug}</span>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        </div>

                        {/* Sticky Bottom Action Bar Section */}
                        <div className="sticky bottom-6 z-30 bg-card/95 backdrop-blur-md border border-border/90 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4">
                            <div className="text-xs text-muted-foreground font-medium hidden sm:block">
                                Save updates to commit changed permissions for this role.
                            </div>
                            <div className="flex items-center gap-3 ml-auto">
                                <Link
                                    href="/roles"
                                    className="px-5 py-2.5 rounded-xl text-xs font-bold border border-border/80 bg-background hover:bg-muted text-foreground transition-all text-center cursor-pointer"
                                >
                                    Cancel
                                </Link>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="py-2.5 px-6 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-black transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
                                >
                                    {submitting ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Updating Role...
                                        </>
                                    ) : (
                                        <>
                                            <Pencil className="w-4 h-4 stroke-[2]" />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                    </form>
                </div>
            )}
        </DashboardLayout>
    );
}
