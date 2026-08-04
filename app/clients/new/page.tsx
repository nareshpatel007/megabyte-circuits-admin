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
  Building, 
  User, 
  MapPin, 
  Sparkles,
  Info,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

export default function AddClientPage() {
  const router = useRouter();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [gstin, setGstin] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Helper to generate a random secure password
  const generateRandomPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
    toast.info("Generated random secure password");
  };

  useEffect(() => {
    generateRandomPassword();
  }, []);

  const handleCopyPassword = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    toast.success("Password copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Email address is required");
      return;
    }
    if (!firstName.trim()) {
      toast.error("First name is required");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          email: email.trim().toLowerCase(),
          phone_number: phone.trim(),
          company_name: companyName.trim(),
          gstin: gstin.trim(),
          street_address: streetAddress.trim(),
          city: city.trim(),
          state: state.trim(),
          postal_code: postalCode.trim(),
          password: password,
          status: "Active"
        })
      });

      const data = await res.json();

      if (data.status || data.success) {
        toast.success(
          `Client account created & marked Active! Password: ${password}`,
          { duration: 6000 }
        );
        const newUserId = data.user_id || data.data?.id;
        if (newUserId) {
          router.push(`/clients/${newUserId}`);
        } else {
          router.push("/clients");
        }
      } else {
        toast.error(data.message || "Failed to create client account");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while creating client account");
    } finally {
      setLoading(false);
    }
  };

  const backButton = (
    <Link
      href="/clients"
      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-card border border-border/80 hover:bg-muted text-foreground transition-all shadow-xs"
    >
      <ArrowLeft className="w-4 h-4 text-emerald-500" />
      Back to Clients
    </Link>
  );

  const fullDisplayName = `${firstName} ${lastName}`.trim() || "New Client";

  return (
    <DashboardLayout title="Create Client Account" subtitle="Onboard a new client with active privileges" action={backButton}>
      <div className="w-full space-y-6 animate-in fade-in duration-300">
        
        {/* Top Header Banner */}
        <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
          
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 font-black text-xl flex items-center justify-center shrink-0 shadow-inner">
              <UserPlus className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-extrabold text-foreground tracking-tight">Client Registration</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  Status: Active
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Enter client contact details and company information to setup a new active user account.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              type="button"
              onClick={generateRandomPassword}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-muted/60 hover:bg-muted text-foreground border border-border/80 transition-all cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
              Regenerate Password
            </button>
          </div>
        </div>

        {/* Full Page Main Grid Form */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column (2 Cols): Form Sections */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Section 1: Personal Contact Information */}
            <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3.5">
                <User className="w-4 h-4 text-emerald-500" />
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Personal Contact Details</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                <div>
                  <label className="block text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. Rahul"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 bg-muted/30 border border-border/80 rounded-xl text-foreground focus:outline-hidden focus:border-emerald-500 text-xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                    Last Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. Patel"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
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
                      placeholder="e.g. client@megabyte.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 bg-muted/30 border border-border/80 rounded-xl text-foreground focus:outline-hidden focus:border-emerald-500 text-xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                    Phone Number
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
              </div>
            </div>

            {/* Section 2: Business & Billing Information */}
            <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3.5">
                <Building className="w-4 h-4 text-emerald-500" />
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Company & Address Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                <div>
                  <label className="block text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                    Company Name
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. Megabyte Circuits Pvt Ltd"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-muted/30 border border-border/80 rounded-xl text-foreground focus:outline-hidden focus:border-emerald-500 text-xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                    GSTIN / Tax ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 24AAAAA0000A1Z5"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-muted/30 border border-border/80 rounded-xl text-foreground font-mono focus:outline-hidden focus:border-emerald-500 text-xs font-medium"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                    Street Address / Premises
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. Plot 42, GIDC Industrial Estate"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-muted/30 border border-border/80 rounded-xl text-foreground focus:outline-hidden focus:border-emerald-500 text-xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ahmedabad"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-muted/30 border border-border/80 rounded-xl text-foreground focus:outline-hidden focus:border-emerald-500 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                    State / Pincode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="State"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-muted/30 border border-border/80 rounded-xl text-foreground focus:outline-hidden focus:border-emerald-500 text-xs font-medium"
                    />
                    <input
                      type="text"
                      placeholder="Pincode"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-muted/30 border border-border/80 rounded-xl text-foreground font-mono focus:outline-hidden focus:border-emerald-500 text-xs font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Credentials & Auto Password Generator */}
            <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-500" />
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Account Credentials & Password</h2>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Auto-Generated
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="flex-1 px-4 py-3 bg-muted/50 border border-border/80 rounded-xl text-foreground font-mono text-base font-bold tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="px-4 py-3 rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground transition-all cursor-pointer flex items-center gap-2 text-xs font-bold shrink-0"
                    title="Copy Password"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-500" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-muted-foreground" />
                        Copy Password
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer flex items-center gap-2 text-xs font-bold shrink-0"
                  >
                    <RefreshCw className="w-4 h-4" />
                    New Password
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  A strong encrypted password is automatically generated. Copy or share credentials with the client upon creation.
                </p>
              </div>
            </div>

          </div>

          {/* Right Column (1 Col): Live Profile Preview & Submit Action */}
          <div className="space-y-6">
            
            {/* Live Profile Summary Card */}
            <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-6 sticky top-6">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                Account Summary Preview
              </h3>

              {/* Profile Card Preview */}
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 font-black text-xl flex items-center justify-center shrink-0">
                    {fullDisplayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-base font-bold text-foreground truncate">{fullDisplayName}</h4>
                    <p className="text-xs text-muted-foreground truncate">{email || "email@client.com"}</p>
                    <span className="inline-block mt-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Active Account
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-emerald-500/20 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground">Company:</span>
                    <span className="font-semibold text-foreground truncate max-w-[150px]">{companyName || "Individual"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="font-semibold text-foreground">{phone || "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">GSTIN:</span>
                    <span className="font-mono font-semibold text-foreground text-[11px]">{gstin || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Security & Access Info */}
              <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 text-xs space-y-2">
                <div className="flex items-center gap-2 text-foreground font-bold">
                  <Info className="w-4 h-4 text-emerald-500 shrink-0" />
                  Account Permissions
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Upon submission, the user receives an active client account to place PCB orders, upload Gerber files, and track shipments.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-black transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Create & Activate Client
                    </>
                  )}
                </button>

                <Link
                  href="/clients"
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold border border-border/80 bg-card hover:bg-muted text-foreground transition-all text-center block"
                >
                  Cancel & Return
                </Link>
              </div>

            </div>

          </div>

        </form>
      </div>
    </DashboardLayout>
  );
}
