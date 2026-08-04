"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { 
  Search, 
  ChevronRight, 
  ChevronLeft, 
  Users, 
  CheckCircle2, 
  XCircle, 
  ShoppingBag, 
  ExternalLink, 
  Mail, 
  Phone, 
  Building, 
  UserPlus, 
  Pencil, 
  Trash2, 
  RefreshCw, 
  AlertTriangle,
  ShieldAlert
} from "lucide-react";
import { TableSkeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface ApiUser {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone_number?: string;
  company_name?: string;
  status?: string;
  available_credits?: number;
  orders_count?: number;
  total_spent?: number;
  created_at: string;
}

const PAGE_SIZE = 10;

const POSSIBLE_STATUSES = ["Active", "Inactive", "Pending", "Suspended", "On Hold"];

export default function ClientsPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);

  // Status Change Modal State
  const [statusModalUser, setStatusModalUser] = useState<ApiUser | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("Active");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Delete Confirmation Modal State
  const [deleteModalUser, setDeleteModalUser] = useState<ApiUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status || data.success) {
        setUsers(data.data || data.users || []);
      } else {
        toast.error("Failed to load clients list");
      }
    } catch (err) {
      console.error("Failed to load clients:", err);
      toast.error("Error loading clients list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openStatusModal = (user: ApiUser) => {
    setStatusModalUser(user);
    setSelectedStatus(user.status || "Active");
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalUser) return;

    setUpdatingStatus(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/users/${statusModalUser.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: selectedStatus })
      });
      const data = await res.json();

      if (data.status || data.success) {
        toast.success(data.message || `Client status updated to ${selectedStatus}`);
        setUsers(prev => prev.map(u => u.id === statusModalUser.id ? { ...u, status: selectedStatus } : u));
        setStatusModalUser(null);
      } else {
        toast.error(data.message || "Failed to update client status");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating client status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openDeleteModal = (user: ApiUser) => {
    setDeleteModalUser(user);
  };

  const handleDeleteUser = async () => {
    if (!deleteModalUser) return;

    setDeleting(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/users/${deleteModalUser.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.status || data.success) {
        toast.success(data.message || "Client account soft deleted successfully");
        setUsers(prev => prev.filter(u => u.id !== deleteModalUser.id));
        setDeleteModalUser(null);
      } else {
        toast.error(data.message || "Failed to delete client account");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error soft deleting client account");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = users.filter((u) => {
    const query = search.toLowerCase();
    const fullName = `${u.first_name || ''} ${u.last_name || ''} ${u.name || ''}`.toLowerCase();
    const matchSearch =
      fullName.includes(query) ||
      (u.email && u.email.toLowerCase().includes(query)) ||
      (u.company_name && u.company_name.toLowerCase().includes(query)) ||
      (u.phone_number && u.phone_number.toLowerCase().includes(query));

    const userStatus = u.status || 'Active';
    const matchStatus = statusFilter === "All" || userStatus.toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const addClientButton = (
    <Link
      href="/clients/new"
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-600 text-black transition-all shadow-xs cursor-pointer"
    >
      <UserPlus className="w-4 h-4" />
      Add Client
    </Link>
  );

  return (
    <DashboardLayout title="Client Management" subtitle={`${users.length} registered clients`} action={addClientButton}>
      {loading ? (
        <TableSkeleton rows={7} />
      ) : (
        <div className="space-y-5">
          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Clients</p>
                <h3 className="text-2xl font-black text-foreground mt-0.5">{users.length}</h3>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Registered accounts</p>
              </div>
            </div>

            <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Clients</p>
                <h3 className="text-2xl font-black text-emerald-500 mt-0.5">
                  {users.filter((u) => (u.status || 'active').toLowerCase() === "active").length}
                </h3>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Verified active</p>
              </div>
            </div>

            <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Inactive</p>
                <h3 className="text-2xl font-black text-red-500 mt-0.5">
                  {users.filter((u) => (u.status || 'active').toLowerCase() !== "active").length}
                </h3>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Suspended or dormant</p>
              </div>
            </div>

            <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Orders</p>
                <h3 className="text-2xl font-black text-foreground mt-0.5">
                  {users.reduce((s, u) => s + (Number(u.orders_count) || 0), 0)}
                </h3>
                <p className="text-[11px] text-purple-500 font-bold mt-0.5">Across all clients</p>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search clients by name, email, company..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-muted/30 border border-border/80 rounded-xl text-xs text-foreground focus:outline-hidden focus:border-emerald-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
              {["All", "Active", "Inactive", "Pending", "Suspended", "On Hold"].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setStatusFilter(st);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === st
                      ? "bg-emerald-500 text-black shadow-xs"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Clients Table */}
          <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-5">Client Name & Email</th>
                    <th className="py-3.5 px-5">Company & Phone</th>
                    <th className="py-3.5 px-5">Orders</th>
                    <th className="py-3.5 px-5">Total Spent</th>
                    <th className="py-3.5 px-5">Joined Date</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground">
                        No clients found matching your search.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((user) => {
                      const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || `Client #${user.id}`;
                      const userStatus = user.status || "Active";
                      const joinedDateFormatted = user.created_at
                        ? new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'N/A';

                      return (
                        <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-4 px-5 whitespace-nowrap">
                            <p className="font-bold text-foreground text-sm">{displayName}</p>
                            <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5 select-all">
                              <Mail className="w-3 h-3" /> {user.email}
                            </p>
                          </td>
                          <td className="py-4 px-5 whitespace-nowrap">
                            <p className="font-semibold text-foreground text-xs flex items-center gap-1">
                              <Building className="w-3 h-3 text-muted-foreground" /> {user.company_name || 'Individual Client'}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{user.phone_number || 'N/A'}</p>
                          </td>
                          <td className="py-4 px-5 font-extrabold text-foreground text-xs whitespace-nowrap">
                            {user.orders_count || 0} Orders
                          </td>
                          <td className="py-4 px-5 font-black text-emerald-600 dark:text-emerald-400 text-sm whitespace-nowrap">
                            ₹{Number(user.total_spent || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-5 text-muted-foreground font-bold font-mono text-xs whitespace-nowrap">
                            {joinedDateFormatted}
                          </td>
                          <td className="py-4 px-5 whitespace-nowrap">
                            <button
                              onClick={() => openStatusModal(user)}
                              title="Click to Change Status"
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider border shadow-2xs cursor-pointer hover:opacity-80 transition-all ${
                                userStatus.toLowerCase() === "active"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : "bg-red-500/10 text-red-600 border-red-500/20"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${userStatus.toLowerCase() === "active" ? "bg-emerald-500" : "bg-red-500"}`}
                              />
                              {userStatus}
                            </button>
                          </td>
                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {/* View Details Button */}
                              <Link
                                href={`/clients/${user.id}`}
                                title="View Client Details"
                                aria-label="View Client Details"
                                className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500 hover:text-white transition-all cursor-pointer shadow-2xs"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Link>

                              {/* Edit Button */}
                              <Link
                                href={`/clients/${user.id}/edit`}
                                title="Edit Client Details"
                                aria-label="Edit Client Details"
                                className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500 hover:text-white transition-all cursor-pointer shadow-2xs"
                              >
                                <Pencil className="w-4 h-4" />
                              </Link>

                              {/* Change Status Button */}
                              <button
                                onClick={() => openStatusModal(user)}
                                title="Change Account Status"
                                aria-label="Change Account Status"
                                className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-xl hover:bg-amber-500 hover:text-white transition-all cursor-pointer shadow-2xs"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>

                              {/* Soft Delete Button */}
                              <button
                                onClick={() => openDeleteModal(user)}
                                title="Delete Client"
                                aria-label="Delete Client"
                                className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white transition-all cursor-pointer shadow-2xs"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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
                <strong className="text-foreground">{filtered.length}</strong> clients
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
          {statusModalUser && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
              <div className="bg-card border border-border/90 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-amber-500" />
                    Change Client Status
                  </h3>
                  <button
                    onClick={() => setStatusModalUser(null)}
                    className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveStatus} className="space-y-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">Client</span>
                    <p className="text-foreground font-bold text-sm mt-0.5">
                      {statusModalUser.name || `${statusModalUser.first_name || ''} ${statusModalUser.last_name || ''}`.trim()} ({statusModalUser.email})
                    </p>
                  </div>

                  <div>
                    <label className="block text-muted-foreground font-semibold mb-1 uppercase tracking-wider text-[10px]">
                      Select Status
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-foreground font-bold focus:outline-hidden focus:border-emerald-500 text-xs"
                    >
                      {POSSIBLE_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                    <button
                      type="button"
                      onClick={() => setStatusModalUser(null)}
                      className="px-4 py-2 rounded-xl text-xs font-bold border border-border bg-card hover:bg-muted text-foreground transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updatingStatus}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black font-extrabold transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {updatingStatus ? "Saving..." : "Save Status"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal (Soft Delete) */}
          {deleteModalUser && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
              <div className="bg-card border border-border/90 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center gap-3 text-rose-500 border-b border-border/60 pb-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Confirm Delete Client</h3>
                    <p className="text-[11px] text-muted-foreground">Soft Delete Operation</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <p className="text-muted-foreground leading-relaxed">
                    Are you sure you want to soft delete client <strong className="text-foreground">{deleteModalUser.name || deleteModalUser.email}</strong>?
                  </p>
                  <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl text-rose-400 text-[11px] leading-relaxed">
                    This operation will mark the client account, associated orders, payment transactions, and saved addresses as soft deleted.
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60 text-xs">
                  <button
                    type="button"
                    onClick={() => setDeleteModalUser(null)}
                    className="px-4 py-2 rounded-xl font-bold border border-border bg-card hover:bg-muted text-foreground transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleDeleteUser}
                    className="px-4 py-2 rounded-xl font-bold bg-rose-500 hover:bg-rose-600 text-white transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {deleting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        Yes, Delete Client
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </DashboardLayout>
  );
}
