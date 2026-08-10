"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./sidebar";
import Header from "./header";
import MobileBottomNav from "./mobile-bottom-nav";
import { Toaster } from "sonner";
import { useTheme } from "@/lib/theme-context";
import { ShieldAlert, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

interface DashboardLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
}

const PAGE_PERMISSIONS: { prefix: string; perm: string }[] = [
    { prefix: "/dashboard", perm: "dashboard.view" },
    { prefix: "/orders", perm: "orders.view" },
    { prefix: "/payments", perm: "payments.view" },
    { prefix: "/gerber-files", perm: "gerber.view" },
    { prefix: "/inventory", perm: "inventory.view" },
    { prefix: "/clients", perm: "clients.view" },
    { prefix: "/staff", perm: "staff.view" },
    { prefix: "/roles", perm: "role.view" },
    { prefix: "/settings/statuses", perm: "settings.order_status" },
    { prefix: "/settings", perm: "settings.general" },
];

export default function DashboardLayout({ children, title, subtitle, action }: DashboardLayoutProps) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const { theme } = useTheme();
    const pathname = usePathname();
    const router = useRouter();

    const [verifying, setVerifying] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);

    useEffect(() => {
        const verifyPagePermission = async () => {
            setVerifying(true);
            setAccessDenied(false);

            try {
                const token = localStorage.getItem("admin_token");
                const auth = localStorage.getItem("isAuthenticated");

                if (!token || auth !== "true") {
                    router.replace("/login");
                    return;
                }


                // Call API after page load to verify current role permissions
                const res = await fetch("/api/admin/my-permissions", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();

                if (res.ok && data.status) {
                    const isSuper = !!data.is_super_admin;
                    const perms: string[] = Array.isArray(data.permissions) ? data.permissions : [];

                    // Update stored user object permissions in localStorage for live sidebar sync
                    const userStr = localStorage.getItem("user");
                    if (userStr) {
                        try {
                            const u = JSON.parse(userStr);
                            u.permissions = perms;
                            localStorage.setItem("user", JSON.stringify(u));
                            window.dispatchEvent(new Event("storage"));
                        } catch (e) {}
                    }

                    if (isSuper) {
                        setAccessDenied(false);
                        setVerifying(false);
                        return;
                    }

                    // Match current pathname against required permission rule
                    const currentPath = pathname || "";
                    const rule = PAGE_PERMISSIONS.find((p) => currentPath === p.prefix || currentPath.startsWith(p.prefix + "/"));
                    if (rule) {
                        if (!perms.includes(rule.perm)) {
                            setAccessDenied(true);
                        } else {
                            setAccessDenied(false);
                        }
                    } else {
                        setAccessDenied(false);
                    }
                }
            } catch (err) {
                console.error("Error checking permissions on page load", err);
            } finally {
                setVerifying(false);
            }
        };

        verifyPagePermission();
    }, [pathname]);

    return (
        <div className="flex h-screen bg-background overflow-hidden relative">
            <Sidebar
                collapsed={collapsed}
                onCollapse={setCollapsed}
                mobileOpen={mobileOpen}
                onMobileClose={() => setMobileOpen(false)}
            />

            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <Header onMenuClick={() => setMobileOpen(true)} />

                {/* Page title bar */}
                <div
                    className="flex items-center justify-between px-5 md:px-7 py-4 border-b border-border/60 shrink-0"
                    style={{
                        background: theme === "light"
                            ? "linear-gradient(90deg, rgba(16,185,129,0.04) 0%, transparent 60%)"
                            : "linear-gradient(90deg, rgba(16,185,129,0.06) 0%, transparent 60%)",
                    }}
                >
                    <div>
                        <h1 className="text-lg md:text-xl font-700 text-foreground leading-tight">{title}</h1>
                        {subtitle && (
                            <p className="text-xs text-muted-foreground mt-0.5 font-400">{subtitle}</p>
                        )}
                    </div>
                    {action && <div className="shrink-0">{action}</div>}
                </div>

                <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
                    {verifying ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-3 text-muted-foreground">
                            <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                            <p className="text-xs font-semibold">Verifying permission access...</p>
                        </div>
                    ) : accessDenied ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300 my-auto">
                            <div className="w-20 h-20 rounded-3xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center mb-5 shadow-inner">
                                <ShieldAlert className="w-10 h-10 stroke-[2]" />
                            </div>
                            <h2 className="text-xl font-black text-foreground tracking-tight">Access Denied</h2>
                            <p className="text-xs text-muted-foreground max-w-md mt-2 leading-relaxed font-medium">
                                You do not have sufficient module permission privileges to access this page. Please contact your system administrator if you believe this is an error.
                            </p>
                            <div className="mt-6 flex items-center gap-3">
                                <Link
                                    href="/dashboard"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-600 text-black transition-all shadow-md cursor-pointer"
                                >
                                    <ArrowLeft className="w-4 h-4 stroke-[3]" />
                                    Return to Dashboard
                                </Link>
                            </div>
                        </div>
                    ) : (
                        children
                    )}
                </main>
            </div>

            <MobileBottomNav />

            <Toaster
                richColors
                position="top-right"
                toastOptions={{
                    style: {
                        fontFamily: "Jost, sans-serif",
                    },
                }}
            />
        </div>
    );
}
