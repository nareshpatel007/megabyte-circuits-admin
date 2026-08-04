"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Search,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  RefreshCw,
  Phone,
  Mail,
  AtSign
} from "lucide-react";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/ui/skeleton";
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
  phone?: string;
  mobile?: string;
  phone_number?: string;
  status: string;
  role_id: number | null;
  role_name?: string;
  last_login_at: string | null;
  created_at: string;
}

const PAGE_SIZE = 10;

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [page, setPage] = useState(1);

  // Change Status Modal State
  const [statusModalUser, setStatusModalUser] = useState<StaffUser | null>(null);
  const [newStatus, setNewStatus] = useState("active");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Change Role Modal State
  const [roleModalUser, setRoleModalUser] = useState<StaffUser | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [updatingRole, setUpdatingRole] = useState(false);

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

      if (staffRes.ok && (staffData.status || staffData.success || Array.isArray(staffData.data))) {
        setStaff(staffData.data || []);
      } else {
        toast.error(staffData.message || "Failed to load staff members");
      }

      if (rolesRes.ok && (rolesData.status || rolesData.success || Array.isArray(rolesData.data))) {
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

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalUser) return;

    setUpdatingStatus(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/staff/${statusModalUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      if (res.ok && (data.status || data.success)) {
        toast.success(`Status updated to ${newStatus.toUpperCase()} for ${statusModalUser.name}`);
        setStaff(prev => prev.map(s => s.id === statusModalUser.id ? { ...s, status: newStatus } : s));
        setStatusModalUser(null);
      } else {
        toast.error(data.message || "Failed to update staff status");
      }
    } catch (err) {
      toast.error("Error updating status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleModalUser) return;

    setUpdatingRole(true);
    try {
      const token = localStorage.getItem("admin_token");
      const newRoleIdVal = selectedRoleId ? parseInt(selectedRoleId) : null;

      const res = await fetch(`/api/admin/staff/${roleModalUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role_id: newRoleIdVal })
      });

      const data = await res.json();
      if (res.ok && (data.status || data.success)) {
        const updatedRoleObj = roles.find(r => String(r.id) === selectedRoleId);
        const updatedRoleName = updatedRoleObj ? updatedRoleObj.name : "Super Admin";

        toast.success(`Access role updated to "${updatedRoleName}" for ${roleModalUser.name}!`);

        setStaff(prev => prev.map(s => s.id === roleModalUser.id ? {
          ...s,
          role_id: newRoleIdVal,
          role_name: updatedRoleName
        } : s));

        setRoleModalUser(null);
      } else {
        toast.error(data.message || "Failed to update staff role");
      }
    } catch (err) {
      toast.error("Error updating staff role");
    } finally {
      setUpdatingRole(false);
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

  const formatLastActive = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "Never";

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
      return "Never";
    }
  };

  const filtered = staff.filter(s => {
    const query = search.toLowerCase();
    const phoneNum = s.phone || s.mobile || s.phone_number || "";
    const matchSearch =
      s.name.toLowerCase().includes(query) ||
      (s.username && s.username.toLowerCase().includes(query)) ||
      s.email.toLowerCase().includes(query) ||
      phoneNum.toLowerCase().includes(query);

    const userStatus = s.status || "active";
    const matchStatus = statusFilter === "All" || userStatus.toLowerCase() === statusFilter.toLowerCase();

    const matchRole =
      roleFilter === "All" ||
      (roleFilter === "superadmin" && !s.role_id) ||
      (s.role_id && String(s.role_id) === roleFilter);

    return matchSearch && matchStatus && matchRole;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const addStaffButton = (
    <Link
      href="/staff/new"
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-600 text-black transition-all shadow-xs cursor-pointer whitespace-nowrap"
    >
      <UserPlus className="w-4 h-4" />
      Add New Staff Member
    </Link>
  );

  return (
    <DashboardLayout title="Staff Management" subtitle="Manage admin accounts, staff credentials & access roles" action={addStaffButton}>
      {loading ? (
        <TableSkeleton rows={7} />
      ) : (
        <div className="space-y-5 animate-in fade-in duration-300">

          {/* Stats Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Staff</p>
                <h3 className="text-2xl font-black text-foreground mt-0.5">{staff.length}</h3>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Registered team accounts</p>
              </div>
            </div>

            <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Staff</p>
                <h3 className="text-2xl font-black text-emerald-500 mt-0.5">
                  {staff.filter((s) => (s.status || 'active').toLowerCase() === "active").length}
                </h3>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Active login access</p>
              </div>
            </div>

            <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                <UserX className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Inactive Staff</p>
                <h3 className="text-2xl font-black text-red-500 mt-0.5">
                  {staff.filter((s) => (s.status || 'active').toLowerCase() !== "active").length}
                </h3>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Suspended or disabled</p>
              </div>
            </div>

            <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Roles</p>
                <h3 className="text-2xl font-black text-foreground mt-0.5">{roles.length || 1}</h3>
                <p className="text-[11px] text-purple-500 font-bold mt-0.5">
                  <Link href="/roles" className="hover:underline flex items-center gap-0.5">
                    Manage Roles →
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
              <input
                type="search"
                placeholder="Search staff by Name, Username, Email, Phone..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-muted/30 border border-border/80 rounded-xl text-xs text-foreground focus:outline-hidden focus:border-emerald-500 font-medium"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              {/* Role Select Dropdown */}
              <div className="w-full sm:w-auto">
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full sm:w-auto px-3.5 py-2 bg-muted/40 border border-border/80 rounded-xl text-foreground font-bold text-xs focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                >
                  <option value="All">All Roles</option>
                  <option value="superadmin">Default (Super Admin)</option>
                  {roles.map(r => (
                    <option key={r.id} value={String(r.id)}>{r.name}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                {["All", "Active", "Inactive"].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setStatusFilter(st);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${statusFilter === st
                        ? "bg-emerald-500 text-black shadow-xs"
                        : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Staff Table */}
          <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-6">Staff Member</th>
                    <th className="py-3.5 px-6">Mobile Number</th>
                    <th className="py-3.5 px-6">Assigned Role</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Last Active</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground text-xs font-medium">
                        No staff members found matching your search and filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((user) => {
                      const phoneNumber = user.phone || user.mobile || user.phone_number || "—";
                      const displayUsername = user.username || user.email.split('@')[0];

                      return (
                        <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-4 px-6 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black flex items-center justify-center text-sm border border-emerald-500/20 shrink-0">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-extrabold text-foreground text-sm">
                                  {user.name}
                                </p>
                                <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-2 mt-0.5">
                                  <span className="font-mono text-foreground/80 font-bold flex items-center gap-0.5">
                                    <AtSign className="w-3 h-3 text-emerald-500" />
                                    {displayUsername}
                                  </span>
                                  <span>•</span>
                                  <span className="select-all flex items-center gap-1">
                                    <Mail className="w-3 h-3 text-muted-foreground" />
                                    {user.email}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 font-mono font-semibold text-foreground whitespace-nowrap">
                            {phoneNumber !== "—" ? (
                              <span className="inline-flex items-center gap-1.5 text-foreground">
                                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                                {phoneNumber}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-4 px-6 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setRoleModalUser(user);
                                setSelectedRoleId(user.role_id ? String(user.role_id) : "");
                              }}
                              title="Click to Change Access Role"
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-muted/60 border border-border/80 text-foreground hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all cursor-pointer"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                              {user.role_name || "Super Admin"}
                              <RefreshCw className="w-3 h-3 ml-0.5 opacity-60" />
                            </button>
                          </td>
                          <td className="py-4 px-6 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setStatusModalUser(user);
                                setNewStatus(user.status || "active");
                              }}
                              title="Click to Change Status"
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider border shadow-2xs cursor-pointer hover:opacity-80 transition-opacity ${user.status === 'active'
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-600 border-red-500/20'
                                }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              {user.status}
                              <RefreshCw className="w-3 h-3 ml-0.5 opacity-60" />
                            </button>
                          </td>
                          <td className="py-4 px-6 text-muted-foreground font-mono text-[11px] whitespace-nowrap">
                            {formatLastActive(user.last_login_at)}
                          </td>
                          <td className="py-4 px-6 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setRoleModalUser(user);
                                  setSelectedRoleId(user.role_id ? String(user.role_id) : "");
                                }}
                                title="Change Access Role"
                                className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500 hover:text-black transition-all cursor-pointer shadow-2xs"
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setStatusModalUser(user);
                                  setNewStatus(user.status || "active");
                                }}
                                title="Change Account Status"
                                className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-xl hover:bg-amber-500 hover:text-white transition-all cursor-pointer shadow-2xs"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                              <Link
                                href={`/staff/${user.id}/edit`}
                                title="Edit Staff Member"
                                className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500 hover:text-white transition-all cursor-pointer shadow-2xs"
                              >
                                <Edit className="w-4 h-4" />
                              </Link>
                              {user.id !== 1 && (
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  title="Delete Staff Member"
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

            {/* Pagination Footer */}
            <div className="p-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground font-medium bg-card">
              <span>
                Showing <strong className="text-foreground">{filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}</strong> to{" "}
                <strong className="text-foreground">{Math.min(page * PAGE_SIZE, filtered.length)}</strong> of{" "}
                <strong className="text-foreground">{filtered.length}</strong> staff members
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

          {/* Change Status Modal */}
          <Dialog.Root open={!!statusModalUser} onOpenChange={(open) => !open && setStatusModalUser(null)}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 transition-opacity" />
              <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border/80 rounded-2xl p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-emerald-500" />
                    Change Staff Status
                  </h3>
                  <Dialog.Close className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer">
                    ✕
                  </Dialog.Close>
                </div>

                {statusModalUser && (
                  <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
                    <div className="p-3.5 bg-muted/40 border border-border/60 rounded-xl space-y-1">
                      <p className="font-extrabold text-foreground text-sm">{statusModalUser.name}</p>
                      <p className="text-muted-foreground font-mono">
                        @{statusModalUser.username || statusModalUser.email.split('@')[0]} • {statusModalUser.email}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground block mb-1.5 uppercase tracking-wider">
                        Select New Account Status
                      </label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-background border border-border/80 rounded-xl text-foreground font-bold text-sm focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>

                    <div className="pt-3 flex justify-end gap-3 border-t border-border/60">
                      <button
                        type="button"
                        onClick={() => setStatusModalUser(null)}
                        className="px-4 py-2.5 border border-border/80 rounded-xl text-xs font-bold hover:bg-muted cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={updatingStatus}
                        className="px-5 py-2.5 bg-emerald-500 text-black font-extrabold rounded-xl text-xs shadow-md hover:bg-emerald-600 disabled:opacity-50 cursor-pointer"
                      >
                        {updatingStatus ? "Updating..." : "Save Status"}
                      </button>
                    </div>
                  </form>
                )}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>

          {/* Change Role Modal */}
          <Dialog.Root open={!!roleModalUser} onOpenChange={(open) => !open && setRoleModalUser(null)}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 transition-opacity" />
              <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border/80 rounded-2xl p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    Change Staff Access Role
                  </h3>
                  <Dialog.Close className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer font-bold">
                    ✕
                  </Dialog.Close>
                </div>

                {roleModalUser && (
                  <form onSubmit={handleUpdateRole} className="space-y-4 text-xs">
                    <div className="p-3.5 bg-muted/40 border border-border/60 rounded-xl space-y-1">
                      <p className="font-extrabold text-foreground text-sm">{roleModalUser.name}</p>
                      <p className="text-muted-foreground font-mono">
                        @{roleModalUser.username || roleModalUser.email.split('@')[0]} • {roleModalUser.email}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted-foreground block mb-1.5 uppercase tracking-wider">
                        Select New Access Role
                      </label>
                      <select
                        value={selectedRoleId}
                        onChange={(e) => setSelectedRoleId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-background border border-border/80 rounded-xl text-foreground font-bold text-sm focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="">Default (Super Admin)</option>
                        {roles.map((r) => (
                          <option key={r.id} value={String(r.id)}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="pt-3 flex justify-end gap-3 border-t border-border/60">
                      <button
                        type="button"
                        onClick={() => setRoleModalUser(null)}
                        className="px-4 py-2.5 border border-border/80 rounded-xl text-xs font-bold hover:bg-muted cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={updatingRole}
                        className="px-5 py-2.5 bg-emerald-500 text-black font-extrabold rounded-xl text-xs shadow-md hover:bg-emerald-600 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                      >
                        {updatingRole ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Updating Role...
                          </>
                        ) : (
                          "Save Role"
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>

        </div>
      )}
    </DashboardLayout>
  );
}
