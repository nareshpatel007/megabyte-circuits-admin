"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { 
  ArrowLeft, 
  Pencil, 
  Key, 
  RefreshCw, 
  Copy, 
  Check, 
  ShieldCheck, 
  Mail, 
  Phone,
  User, 
  Sparkles,
  Eye,
  EyeOff,
  Shield
} from "lucide-react";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/ui/skeleton";

interface Role {
  id: number;
  name: string;
  slug: string;
}

export default function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState<string>("");
  const [status, setStatus] = useState("active");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchStaffAndRoles = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("admin_token");
        const headers = { Authorization: `Bearer ${token}` };

        const [staffRes, rolesRes] = await Promise.all([
          fetch(`/api/admin/staff/${id}`, { headers }),
          fetch("/api/admin/roles", { headers })
        ]);

        const staffData = await staffRes.json();
        const rolesData = await rolesRes.json();

        if (rolesRes.ok && (rolesData.status || rolesData.success || Array.isArray(rolesData.data))) {
          setRoles(rolesData.data || []);
        }

        if (staffRes.ok && (staffData.status || staffData.success) && staffData.data) {
          const u = staffData.data;
          setName(u.name || "");
          setUsername(u.username || "");
          setEmail(u.email || "");
          setPhone(u.phone || u.mobile || u.phone_number || "");
          setRoleId(u.role_id ? String(u.role_id) : "");
          setStatus(u.status || "active");
        } else {
          toast.error(staffData.message || "Failed to load staff details");
        }
      } catch (err) {
        console.error(err);
        toast.error("Error fetching staff member details");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchStaffAndRoles();
    }
  }, [id]);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
    setShowPassword(true);
    toast.info("Generated new random password");
  };

  const handleCopyPassword = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    toast.success("Password copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!email.trim()) {
      toast.error("Email address is required");
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password: password || undefined,
          role_id: roleId ? parseInt(roleId) : null,
          status: status
        })
      });

      const data = await res.json();

      if (data.status || data.success) {
        toast.success(data.message || "Staff member details updated!");
        router.push("/staff");
      } else {
        toast.error(data.message || "Failed to update staff member");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating staff member");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRoleName = roles.find(r => String(r.id) === roleId)?.name || "Super Admin";

  const backButton = (
    <Link
      href="/staff"
      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-card border border-border/80 hover:bg-muted text-foreground transition-all shadow-xs"
    >
      <ArrowLeft className="w-4 h-4 text-emerald-500" />
      Back to Staff List
    </Link>
  );

  return (
    <DashboardLayout title={name ? `Edit Staff Member: ${name}` : `Edit Staff Member`} subtitle="Update staff credentials and access roles" action={backButton}>
      {loading ? (
        <TableSkeleton rows={5} />
      ) : (
        <div className="w-full space-y-6 animate-in fade-in duration-300">
          
          {/* Main Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Section 1: Member Details */}
            <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3.5">
                <User className="w-4 h-4 text-emerald-500" />
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Staff Account Credentials</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                <div className="md:col-span-2">
                  <label className="block text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 bg-muted/30 border border-border/80 rounded-xl text-foreground focus:outline-hidden focus:border-emerald-500 text-xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                    Login Username
                  </label>
                  <div className="relative">
                    <span className="text-muted-foreground absolute left-3 top-2.5 font-mono text-xs">@</span>
                    <input
                      type="text"
                      placeholder="rahul_admin"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2.5 bg-muted/30 border border-border/80 rounded-xl text-foreground font-mono focus:outline-hidden focus:border-emerald-500 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <input
                      type="email"
                      placeholder="rahul@megabyte.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 bg-muted/30 border border-border/80 rounded-xl text-foreground focus:outline-hidden focus:border-emerald-500 text-xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                    Mobile / Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. +91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-muted/30 border border-border/80 rounded-xl text-foreground focus:outline-hidden focus:border-emerald-500 text-xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                    Assign Access Role
                  </label>
                  <div className="relative">
                    <Shield className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <select
                      value={roleId}
                      onChange={(e) => setRoleId(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-muted/30 border border-border/80 rounded-xl text-foreground font-bold focus:outline-hidden focus:border-emerald-500 text-xs cursor-pointer"
                    >
                      <option value="">Default (Super Admin)</option>
                      {roles.map((r) => (
                        <option key={r.id} value={String(r.id)}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                    Account Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-muted/30 border border-border/80 rounded-xl text-foreground font-bold focus:outline-hidden focus:border-emerald-500 text-xs cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Reset Password Option */}
            <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-500" />
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Reset Password (Optional)</h2>
                </div>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Generate New
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Leave blank to keep existing password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-muted/50 border border-border/80 rounded-xl text-foreground font-mono text-xs font-bold tracking-widest"
                    />
                    {password && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>

                  {password && (
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="px-4 py-3 rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground transition-all cursor-pointer flex items-center gap-2 text-xs font-bold shrink-0"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-muted-foreground" />
                          Copy
                        </>
                      )}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Only enter or generate a new password if you want to reset the staff member&apos;s password.
                </p>
              </div>
            </div>

            {/* Sticky Bottom Action Bar Section */}
            <div className="sticky bottom-6 z-30 bg-card/95 backdrop-blur-md border border-border/90 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4">
              <div className="text-xs text-muted-foreground font-medium hidden sm:block">
                Save updates to commit changed staff details or role assignments.
              </div>
              <div className="flex items-center gap-3 ml-auto">
                <Link
                  href="/staff"
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
                      Saving Changes...
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
