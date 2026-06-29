"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import {
  mockStaff, mockStaffActivity,
  StaffMember, StaffRole, StaffStatus, StaffActivity,
} from "@/lib/mock-data";
import {
  UserCog, Plus, Search, Smartphone, ShieldCheck, ShieldOff,
  Pencil, Trash2, X, Check, Users, UserCheck, UserX, Clock,
  Mail, Phone, Building2, Moon, Sun, Sunset, ChevronRight,
  Activity, Package, ArrowRight, Eye, Truck, BadgeCheck, BadgeX,
  FileText, CreditCard, Calendar, Wifi, WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ROLES: StaffRole[] = [
  "Floor Supervisor", "QA Engineer", "Dispatch Staff",
  "Procurement", "Production Lead", "Assembly Technician",
];
const DEPARTMENTS = ["Production", "Quality", "Logistics", "Supply Chain"];
const SHIFTS = ["Morning", "Evening", "Night"] as const;

const ROLE_COLORS: Record<StaffRole, string> = {
  "Floor Supervisor": "bg-blue-100 text-blue-700",
  "QA Engineer": "bg-purple-100 text-purple-700",
  "Dispatch Staff": "bg-orange-100 text-orange-700",
  "Procurement": "bg-teal-100 text-teal-700",
  "Production Lead": "bg-cyan-100 text-cyan-700",
  "Assembly Technician": "bg-rose-100 text-rose-700",
};

const STATUS_COLORS: Record<StaffStatus, string> = {
  Active: "bg-green-100 text-green-700",
  Inactive: "bg-gray-100 text-gray-500",
  "On Leave": "bg-yellow-100 text-yellow-700",
};

const SHIFT_ICON: Record<string, React.ReactNode> = {
  Morning: <Sun className="w-3 h-3" />,
  Evening: <Sunset className="w-3 h-3" />,
  Night: <Moon className="w-3 h-3" />,
};

const AVATAR_COLORS = [
  "from-cyan-400 to-blue-600",
  "from-purple-400 to-indigo-600",
  "from-orange-400 to-rose-600",
  "from-teal-400 to-green-600",
  "from-pink-400 to-rose-600",
  "from-amber-400 to-orange-600",
];

const ACTION_META: Record<StaffActivity["action"], { icon: React.ReactNode; color: string; dot: string }> = {
  "Status Update":      { icon: <ArrowRight className="w-3.5 h-3.5" />, color: "bg-blue-100 text-blue-700",   dot: "bg-blue-500" },
  "Order Viewed":       { icon: <Eye className="w-3.5 h-3.5" />,        color: "bg-gray-100 text-gray-600",   dot: "bg-gray-400" },
  "Dispatch Confirmed": { icon: <Truck className="w-3.5 h-3.5" />,      color: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  "QC Passed":          { icon: <BadgeCheck className="w-3.5 h-3.5" />, color: "bg-green-100 text-green-700", dot: "bg-green-500" },
  "QC Failed":          { icon: <BadgeX className="w-3.5 h-3.5" />,     color: "bg-rose-100 text-rose-700",   dot: "bg-rose-500" },
  "Invoice Sent":       { icon: <FileText className="w-3.5 h-3.5" />,   color: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  "Payment Marked":     { icon: <CreditCard className="w-3.5 h-3.5" />, color: "bg-teal-100 text-teal-700",   dot: "bg-teal-500" },
};

function avatarColor(id: string) {
  const idx = parseInt(id.replace("STF-", ""), 10) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

type ModalMode = "add" | "edit" | null;

const EMPTY_FORM = {
  name: "", email: "", phone: "",
  role: "Floor Supervisor" as StaffRole,
  department: "Production",
  shift: "Morning" as "Morning" | "Evening" | "Night",
  status: "Active" as StaffStatus,
  mobileAccess: false,
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>(mockStaff);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("All");
  const [filterAccess, setFilterAccess] = useState<string>("All");
  const [modal, setModal] = useState<ModalMode>(null);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [drawerStaff, setDrawerStaff] = useState<StaffMember | null>(null);

  const totalStaff = staff.length;
  const activeStaff = staff.filter((s) => s.status === "Active").length;
  const mobileEnabled = staff.filter((s) => s.mobileAccess).length;
  const onLeave = staff.filter((s) => s.status === "On Leave").length;

  const filtered = staff.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch = s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
    const matchesRole = filterRole === "All" || s.role === filterRole;
    const matchesAccess = filterAccess === "All" || (filterAccess === "Enabled" && s.mobileAccess) || (filterAccess === "Disabled" && !s.mobileAccess);
    return matchesSearch && matchesRole && matchesAccess;
  });

  function openAdd() { setForm(EMPTY_FORM); setEditTarget(null); setModal("add"); }
  function openEdit(s: StaffMember) {
    setForm({ name: s.name, email: s.email, phone: s.phone, role: s.role, department: s.department, shift: s.shift, status: s.status, mobileAccess: s.mobileAccess });
    setEditTarget(s); setModal("edit");
  }
  function closeModal() { setModal(null); setEditTarget(null); }

  function handleSave() {
    if (!form.name.trim() || !form.email.trim()) { toast.error("Name and email are required."); return; }
    if (modal === "add") {
      const nextId = `STF-${String(staff.length + 1).padStart(3, "0")}`;
      const initials = form.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
      setStaff((prev) => [{ id: nextId, ...form, avatar: initials, joinedDate: new Date().toISOString().split("T")[0], lastActive: "Never" }, ...prev]);
      toast.success(`${form.name} added to staff.`);
    } else if (modal === "edit" && editTarget) {
      setStaff((prev) => prev.map((s) => s.id === editTarget.id ? { ...s, ...form } : s));
      if (drawerStaff?.id === editTarget.id) setDrawerStaff((prev) => prev ? { ...prev, ...form } : prev);
      toast.success(`${form.name} updated.`);
    }
    closeModal();
  }

  function toggleAccess(id: string) {
    setStaff((prev) => prev.map((s) => {
      if (s.id !== id) return s;
      const next = !s.mobileAccess;
      toast.success(`Mobile access ${next ? "granted to" : "revoked from"} ${s.name}.`);
      return { ...s, mobileAccess: next };
    }));
    if (drawerStaff?.id === id) setDrawerStaff((prev) => prev ? { ...prev, mobileAccess: !prev.mobileAccess } : prev);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    setStaff((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    if (drawerStaff?.id === deleteTarget.id) setDrawerStaff(null);
    toast.success(`${deleteTarget.name} removed from staff.`);
    setDeleteTarget(null);
  }

  const drawerActivity = drawerStaff ? (mockStaffActivity[drawerStaff.id] ?? []) : [];
  const uniqueOrders = new Set(drawerActivity.map((a) => a.orderId)).size;

  return (
    <DashboardLayout
      title="Staff Management"
      subtitle={`${totalStaff} total staff members`}
      action={
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm">
          <Plus className="w-4 h-4" /> Add Staff
        </button>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Staff",   value: totalStaff,    icon: Users,      color: "text-blue-500",  bg: "bg-blue-50" },
          { label: "Active",        value: activeStaff,   icon: UserCheck,  color: "text-green-500", bg: "bg-green-50" },
          { label: "Mobile Access", value: mobileEnabled, icon: Smartphone, color: "text-cyan-500",  bg: "bg-cyan-50" },
          { label: "On Leave",      value: onLeave,       icon: Clock,      color: "text-amber-500", bg: "bg-amber-50" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", stat.bg)}>
              <stat.icon className={cn("w-5 h-5", stat.color)} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-border p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Search by name, email or ID…"
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
          <option value="All">All Roles</option>
          {ROLES.map((r) => <option key={r}>{r}</option>)}
        </select>
        <select className="px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" value={filterAccess} onChange={(e) => setFilterAccess(e.target.value)}>
          <option value="All">Mobile: All</option>
          <option value="Enabled">Access Enabled</option>
          <option value="Disabled">Access Disabled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Staff Member</th>
                <th className="text-left px-4 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Role / Dept</th>
                <th className="text-left px-4 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Shift</th>
                <th className="text-left px-4 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Mobile Access</th>
                <th className="text-left px-4 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Last Active</th>
                <th className="text-right px-5 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-muted-foreground">
                    <UserX className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No staff members match your filters.
                  </td>
                </tr>
              )}
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  className={cn("hover:bg-muted/20 transition-colors", drawerStaff?.id === s.id && "bg-primary/5")}
                >
                  {/* Avatar + name — clickable to open drawer */}
                  <td className="px-5 py-4">
                    <button
                      onClick={() => setDrawerStaff(drawerStaff?.id === s.id ? null : s)}
                      className="flex items-center gap-3 group text-left w-full"
                    >
                      <div className={cn("w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold shrink-0", avatarColor(s.id))}>
                        {s.avatar}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                          {s.name}
                          <ChevronRight className={cn("w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all", drawerStaff?.id === s.id && "opacity-100 rotate-90")} />
                        </p>
                        <p className="text-xs text-muted-foreground">{s.id} · {s.email}</p>
                      </div>
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold", ROLE_COLORS[s.role])}>{s.role}</span>
                    <p className="text-xs text-muted-foreground mt-1">{s.department}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-lg">
                      {SHIFT_ICON[s.shift]}{s.shift}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold", STATUS_COLORS[s.status])}>{s.status}</span>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => toggleAccess(s.id)}
                      className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all", s.mobileAccess ? "bg-cyan-100 text-cyan-700 hover:bg-cyan-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}
                    >
                      {s.mobileAccess ? <><ShieldCheck className="w-3.5 h-3.5" /> Enabled</> : <><ShieldOff className="w-3.5 h-3.5" /> Disabled</>}
                    </button>
                  </td>
                  <td className="px-4 py-4 text-xs text-muted-foreground whitespace-nowrap">{s.lastActive}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(s)} className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Remove">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-border text-xs text-muted-foreground">
            Showing {filtered.length} of {totalStaff} staff members · Click a name to view activity
          </div>
        )}
      </div>

      {/* ── DETAIL DRAWER ── */}
      {drawerStaff && (
        <>
          {/* Backdrop (mobile) */}
          <div className="fixed inset-0 z-40 bg-black/20 md:hidden" onClick={() => setDrawerStaff(null)} />

          <div className="fixed right-0 top-0 h-full z-50 w-full max-w-[440px] flex flex-col bg-card border-l border-border shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Activity className="w-4 h-4 text-primary" />
                Staff Activity Log
              </div>
              <button onClick={() => setDrawerStaff(null)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Card */}
            <div className="px-5 py-5 border-b border-border shrink-0">
              <div className="flex items-start gap-4">
                <div className={cn("w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-md", avatarColor(drawerStaff.id))}>
                  {drawerStaff.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-foreground">{drawerStaff.name}</h2>
                    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold", STATUS_COLORS[drawerStaff.status])}>{drawerStaff.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{drawerStaff.id} · {drawerStaff.department}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold", ROLE_COLORS[drawerStaff.role])}>{drawerStaff.role}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                      {SHIFT_ICON[drawerStaff.shift]}{drawerStaff.shift} Shift
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact row */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{drawerStaff.email}</span></div>
                <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 shrink-0" />{drawerStaff.phone}</div>
                <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 shrink-0" />Joined {drawerStaff.joinedDate}</div>
                <div className="flex items-center gap-1.5">
                  {drawerStaff.mobileAccess
                    ? <><Wifi className="w-3.5 h-3.5 text-cyan-500" /><span className="text-cyan-600 font-medium">Mobile Enabled</span></>
                    : <><WifiOff className="w-3.5 h-3.5" /><span>No Mobile Access</span></>
                  }
                </div>
              </div>

              {/* Quick stats */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { label: "Total Actions", value: drawerActivity.length },
                  { label: "Orders Touched", value: uniqueOrders },
                  { label: "Last Active", value: drawerStaff.lastActive === "Never" ? "—" : drawerStaff.lastActive.split(" ")[0] },
                ].map((st) => (
                  <div key={st.label} className="bg-muted/40 rounded-xl p-3 text-center">
                    <p className="text-base font-bold text-foreground">{st.value}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{st.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Log */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-5 py-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                  Activity Timeline
                  {drawerActivity.length > 0 && <span className="ml-2 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary normal-case font-semibold">{drawerActivity.length} events</span>}
                </p>

                {drawerActivity.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                      <Package className="w-6 h-6 text-muted-foreground opacity-50" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">No activity recorded</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {drawerStaff.mobileAccess
                        ? "This staff member hasn't used the mobile app yet."
                        : "Enable mobile access for this staff member to start tracking activity."}
                    </p>
                    {!drawerStaff.mobileAccess && (
                      <button
                        onClick={() => toggleAccess(drawerStaff.id)}
                        className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-white text-xs font-semibold hover:bg-cyan-600 transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> Enable Mobile Access
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

                    <div className="space-y-0">
                      {drawerActivity.map((act, idx) => {
                        const meta = ACTION_META[act.action];
                        const isLast = idx === drawerActivity.length - 1;
                        return (
                          <div key={act.id} className={cn("relative pl-10 pb-5", isLast && "pb-2")}>
                            {/* Dot */}
                            <div className={cn("absolute left-2.5 top-1 w-2.5 h-2.5 rounded-full border-2 border-card", meta.dot)} />

                            {/* Card */}
                            <div className="bg-background rounded-xl border border-border p-3.5 hover:border-primary/30 transition-colors">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold", meta.color)}>
                                    {meta.icon}{act.action}
                                  </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{act.timestamp}</span>
                              </div>

                              <p className="text-xs font-semibold text-foreground">{act.orderId} · {act.clientName}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{act.detail}</p>

                              {act.from && act.to && (
                                <div className="flex items-center gap-1.5 mt-2 text-[11px]">
                                  <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">{act.from}</span>
                                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">{act.to}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer footer actions */}
            <div className="shrink-0 px-5 py-4 border-t border-border flex gap-2">
              <button
                onClick={() => { openEdit(drawerStaff); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Pencil className="w-4 h-4" /> Edit Profile
              </button>
              <button
                onClick={() => toggleAccess(drawerStaff.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors",
                  drawerStaff.mobileAccess
                    ? "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200"
                    : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200"
                )}
              >
                {drawerStaff.mobileAccess
                  ? <><ShieldOff className="w-4 h-4" /> Revoke Access</>
                  : <><ShieldCheck className="w-4 h-4" /> Grant Access</>
                }
              </button>
            </div>
          </div>
        </>
      )}

      {/* Add / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <UserCog className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-base font-bold text-foreground">
                  {modal === "add" ? "Add New Staff Member" : "Edit Staff Member"}
                </h2>
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Full Name *</label>
                <input className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="e.g. Rahul Mehta" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5"><Mail className="inline w-3 h-3 mr-1" />Email *</label>
                  <input type="email" className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="name@pcbmfg.in" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5"><Phone className="inline w-3 h-3 mr-1" />Phone</label>
                  <input className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="+91 98000 00000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Role</label>
                  <select className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}>
                    {ROLES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5"><Building2 className="inline w-3 h-3 mr-1" />Department</label>
                  <select className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                    {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Shift</label>
                  <select className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value as typeof form.shift })}>
                    {SHIFTS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Status</label>
                  <select className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StaffStatus })}>
                    <option>Active</option><option>Inactive</option><option>On Leave</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", form.mobileAccess ? "bg-cyan-100" : "bg-gray-100")}>
                    <Smartphone className={cn("w-4 h-4", form.mobileAccess ? "text-cyan-600" : "text-gray-400")} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Mobile App Access</p>
                    <p className="text-xs text-muted-foreground">Allow this staff to log in to the mobile panel</p>
                  </div>
                </div>
                <button
                  onClick={() => setForm({ ...form, mobileAccess: !form.mobileAccess })}
                  className={cn("relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none", form.mobileAccess ? "bg-cyan-500" : "bg-gray-300")}
                >
                  <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200", form.mobileAccess ? "translate-x-5" : "translate-x-0")} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={closeModal} className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
                <Check className="w-4 h-4" />{modal === "add" ? "Add Staff" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center"><Trash2 className="w-5 h-5 text-rose-600" /></div>
              <div><h3 className="font-bold text-foreground">Remove Staff Member</h3><p className="text-xs text-muted-foreground">This action cannot be undone.</p></div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Are you sure you want to remove <span className="font-semibold text-foreground">{deleteTarget.name}</span>? Their mobile app access will also be revoked.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors">Remove</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
