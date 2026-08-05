"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { ArrowLeft, Key, RefreshCw, Copy, Check, ShieldCheck, Mail, Phone, Building, User } from "lucide-react";
import { toast } from "sonner";
import { ClientDetailSkeleton } from "@/components/ui/skeleton";

export default function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

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
    const [status, setStatus] = useState("Active");
    const [password, setPassword] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchClient = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("admin_token");
                const res = await fetch(`/api/admin/users/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const result = await res.json();

                if (result.status && result.data && result.data.user) {
                    const u = result.data.user;
                    setFirstName(u.first_name || strtok(u.name || "", ' '));
                    setLastName(u.last_name || "");
                    setEmail(u.email || "");
                    setPhone(u.phone_number || u.phone || u.mobile || "");
                    setCompanyName(u.company_name || u.company || "");
                    setGstin(u.gstin || u.gst_number || u.tax_id || "");
                    setStatus(u.status || "Active");

                    const addrs = result.data.addresses || [];
                    if (addrs.length > 0) {
                        const primary = addrs[0];
                        setStreetAddress([primary.building_no, primary.street_address, primary.address_line1].filter(Boolean).join(", "));
                        setCity(primary.city || "");
                        setState(primary.state || "");
                        setPostalCode(primary.postal_code || primary.pincode || "");
                    }
                } else {
                    toast.error(result.message || "Failed to load client details");
                }
            } catch (err) {
                console.error(err);
                toast.error("Error fetching client information");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchClient();
        }
    }, [id]);

    const strtok = (str: string, delim: string) => {
        return str.split(delim)[0] || str;
    };

    const generateRandomPassword = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
        let pass = "";
        for (let i = 0; i < 12; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setPassword(pass);
        toast.info("Generated new random secure password");
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

        if (!email.trim()) {
            toast.error("Email address is required");
            return;
        }
        if (!firstName.trim()) {
            toast.error("First name is required");
            return;
        }

        setSubmitting(true);

        try {
            const token = localStorage.getItem("admin_token");
            const res = await fetch(`/api/admin/users/${id}`, {
                method: "PUT",
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
                    status: status,
                    password: password || undefined
                })
            });

            const data = await res.json();

            if (data.status || data.success) {
                toast.success(data.message || "Client details updated successfully!");
                router.push(`/clients/${id}`);
            } else {
                toast.error(data.message || "Failed to update client details");
            }
        } catch (err) {
            console.error(err);
            toast.error("An error occurred while updating client details");
        } finally {
            setSubmitting(false);
        }
    };

    const backButton = (
        <Link
            href={`/clients/${id}`}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-card border border-border/80 hover:bg-muted text-foreground transition-all shadow-xs"
        >
            <ArrowLeft className="w-4 h-4 text-emerald-500" />
            Back to Client Profile
        </Link>
    );

    const fullDisplayName = `${firstName} ${lastName}`.trim() || `Client #${id}`;

    return (
        <DashboardLayout title={`Edit Client: ${fullDisplayName}`} subtitle="Update client profile & account status" action={backButton}>
            {loading ? (
                <ClientDetailSkeleton />
            ) : (
                <div className="w-full space-y-6 animate-in fade-in duration-300">

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-5">
                            <div className="flex items-center gap-2 border-b border-border/60 pb-3.5">
                                <User className="w-4 h-4 text-emerald-500" />
                                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Personal Details</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 text-xs">
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

                        {/* Section 2: Business & Status Information */}
                        <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-5">
                            <div className="flex items-center gap-2 border-b border-border/60 pb-3.5">
                                <Building className="w-4 h-4 text-emerald-500" />
                                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Business Details & Account Status</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
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

                                <div>
                                    <label className="block text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                                        Account Status
                                    </label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-muted/30 border border-border/80 rounded-xl text-foreground font-bold focus:outline-hidden focus:border-emerald-500 text-xs"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Suspended">Suspended</option>
                                        <option value="On Hold">On Hold</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Reset Password (Optional) */}
                        <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs space-y-4">
                            <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
                                <div className="flex items-center gap-2">
                                    <Key className="w-4 h-4 text-emerald-500" />
                                    <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Reset Client Password (Optional)</h2>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Leave blank to keep existing password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="flex-1 px-4 py-3 bg-muted/50 border border-border/80 rounded-xl text-foreground font-mono text-xs font-bold tracking-wider"
                                    />
                                    {password && (
                                        <button
                                            type="button"
                                            onClick={handleCopyPassword}
                                            className="px-4 py-3 rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground transition-all cursor-pointer flex items-center gap-2 text-xs font-bold shrink-0"
                                        >
                                            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={generateRandomPassword}
                                        className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer flex items-center gap-2 text-xs font-bold shrink-0"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Generate New
                                    </button>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Only enter or generate a new password if you wish to reset the client&apos;s login credentials.
                                </p>
                            </div>
                        </div>

                        {/* Bottom Action Footer */}
                        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex items-center justify-end gap-3">
                            <Link
                                href={`/clients/${id}`}
                                className="px-6 py-2.5 rounded-xl text-xs font-bold border border-border/80 bg-card hover:bg-muted text-foreground transition-all cursor-pointer"
                            >
                                Cancel
                            </Link>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2 uppercase tracking-wider"
                            >
                                {submitting ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Saving Changes...
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="w-4 h-4" />
                                        Save Client Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </DashboardLayout>
    );
}
