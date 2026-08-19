"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { 
  ArrowLeft, 
  UserPlus, 
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

interface Role {
  id: number;
  name: string;
  slug: string;
}

export default function AddStaffPage() {
  const router = useRouter();

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
  const [submitting, setSubmitting] = useState(false);

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/admin/roles", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status || data.success || Array.isArray(data.data)) {
        setRoles(data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRoles();
    generatePassword();
  }, []);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
    setShowPassword(true);
    toast.info("Generated random secure password");
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
    if (!password) {
      toast.error("Password is required");
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim() || strtok(email.trim(), '@'),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password: password,
          role_id: roleId ? parseInt(roleId) : null,
          status: status
        })
      });

      const data = await res.json();

      if (data.status || data.success) {
        toast.success(`Staff user "${name}" created successfully!`, { duration: 5000 });
        router.push("/staff");
      } else {
        toast.error(data.message || "Failed to create staff member");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Error creating staff member");
    } finally {
      setSubmitting(false);
    }
  };

  const strtok = (str: string, delim: string) => {
    return str.split(delim)[0] || str;
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
    <DashboardLayout title="Add New Staff Member" subtitle="Create admin credentials and assign system roles" action={backButton}>
      <div className="w-full space-y-6 animate-in fade-in duration-300">
        
        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Section 1: Member Credentials */}
          <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3.5">
              <User className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Staff Account Credentials</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div>
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

          {/* Section 2: Password Generator */}
          <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-500" />
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Account Password</h2>
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-muted/50 border border-border/80 rounded-xl text-foreground font-mono text-base font-bold tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

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
              </div>
              <p className="text-[11px] text-muted-foreground">
                Generate or input a strong password. You can copy it to share credentials with the staff member.
              </p>
            </div>
          </div>

          {/* Sticky Bottom Action Bar Section */}
          <div className="sticky bottom-6 z-30 bg-card/95 backdrop-blur-md border border-border/90 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4">
            <div className="text-xs text-muted-foreground font-medium hidden sm:block">
              Ready to create account? Ensure details are accurate before submitting.
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
                    Creating Account...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Create Staff Account
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </DashboardLayout>
  );
}
