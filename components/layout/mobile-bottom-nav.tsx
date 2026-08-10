"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Settings,
    MoreHorizontal,
    Users,
    UserCog,
    Shield,
    CreditCard,
    FileArchive,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

interface NavItem {
    href: string;
    label: string;
    icon: any;
    permission?: string | string[];
}

const mainNavItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
    { href: "/orders", label: "Orders", icon: ShoppingCart, permission: "orders.view" },
    { href: "/inventory", label: "Inventory", icon: Package, permission: "inventory.view" },
    { href: "/settings", label: "Settings", icon: Settings, permission: ["settings.general", "settings.order_status"] },
];

const secondaryNavItems: NavItem[] = [
    { href: "/payments", label: "Payments", icon: CreditCard, permission: "payments.view" },
    { href: "/gerber-files", label: "Gerber Files", icon: FileArchive, permission: "gerber.view" },
    { href: "/clients", label: "Clients", icon: Users, permission: "clients.view" },
    { href: "/staff", label: "Staff", icon: UserCog, permission: "staff.view" },
    { href: "/roles", label: "Roles", icon: Shield, permission: "role.view" },
];

export default function MobileBottomNav() {
    const pathname = usePathname();
    const [moreOpen, setMoreOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const [userPermissions, setUserPermissions] = useState<string[]>([]);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    useEffect(() => {
        const checkPermissions = () => {
            const userDataStr = localStorage.getItem("user");
            if (userDataStr) {
                try {
                    const u = JSON.parse(userDataStr);
                    if (u.role && u.role.toLowerCase() === "super admin") {
                        setIsSuperAdmin(true);
                    }
                    if (Array.isArray(u.permissions)) {
                        setUserPermissions(u.permissions);
                    }
                } catch (e) {}
            }
        };

        checkPermissions();
        window.addEventListener("storage", checkPermissions);
        return () => window.removeEventListener("storage", checkPermissions);
    }, []);

    const hasPermission = (perm?: string | string[]) => {
        if (!perm || isSuperAdmin) return true;
        if (Array.isArray(perm)) {
            return perm.some((p) => userPermissions.includes(p));
        }
        return userPermissions.includes(perm);
    };

    const filteredMainNavItems = mainNavItems.filter((item) => hasPermission(item.permission));
    const filteredSecondaryNavItems = secondaryNavItems.filter((item) => hasPermission(item.permission));

    // Close popover when clicking outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMoreOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const isSecondaryActive = filteredSecondaryNavItems.some(
        (item) => pathname === item.href || (pathname && pathname.startsWith(item.href))
    );

    if (filteredMainNavItems.length === 0 && filteredSecondaryNavItems.length === 0) {
        return null;
    }

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
            {/* Popover for extra menu items */}
            {moreOpen && filteredSecondaryNavItems.length > 0 && (
                <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMoreOpen(false)}>
                    <div
                        ref={menuRef}
                        className="absolute bottom-16 right-4 left-4 p-4 rounded-2xl bg-card border border-white/10 shadow-2xl space-y-2 z-50 animate-in slide-in-from-bottom-5 duration-200"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: "linear-gradient(180deg, hsl(142 70% 8%) 0%, hsl(142 65% 12%) 100%)",
                        }}
                    >
                        <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">More Options</span>
                            <button
                                onClick={() => setMoreOpen(false)}
                                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {filteredSecondaryNavItems.map((item) => {
                                const active = pathname
                                    ? pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                                    : false;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setMoreOpen(false)}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-3 rounded-xl gap-1.5 text-xs font-medium transition-all",
                                            active
                                                ? "text-emerald-400 bg-emerald-500/15 border border-emerald-500/30"
                                                : "text-zinc-300 hover:text-white hover:bg-white/5 border border-transparent"
                                        )}
                                    >
                                        <item.icon className={cn("w-5 h-5", active ? "text-emerald-400" : "text-zinc-400")} />
                                        <span className="truncate max-w-full">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Bar Navigation */}
            <nav
                className="h-16 px-2 flex items-center justify-around border-t border-white/10 shadow-2xl"
                style={{
                    background: "linear-gradient(180deg, hsl(142 70% 8%) 0%, hsl(142 65% 12%) 100%)",
                    backdropFilter: "blur(16px)",
                }}
            >
                {filteredMainNavItems.map((item) => {
                    const active = pathname
                        ? pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                        : false;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center flex-1 py-1.5 gap-1 rounded-xl text-[11px] font-medium transition-all relative",
                                active
                                    ? "text-emerald-400 font-semibold"
                                    : "text-zinc-400 hover:text-zinc-200"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5 transition-transform duration-200", active && "scale-110 text-emerald-400")} />
                            <span>{item.label}</span>
                            {active && (
                                <span className="absolute -top-1.5 w-8 h-1 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                            )}
                        </Link>
                    );
                })}

                {/* More Menu Trigger */}
                {filteredSecondaryNavItems.length > 0 && (
                    <button
                        onClick={() => setMoreOpen(!moreOpen)}
                        className={cn(
                            "flex flex-col items-center justify-center flex-1 py-1.5 gap-1 rounded-xl text-[11px] font-medium transition-all relative",
                            isSecondaryActive || moreOpen
                                ? "text-emerald-400 font-semibold"
                                : "text-zinc-400 hover:text-zinc-200"
                        )}
                    >
                        <MoreHorizontal className={cn("w-5 h-5 transition-transform duration-200", (isSecondaryActive || moreOpen) && "scale-110 text-emerald-400")} />
                        <span>More</span>
                        {isSecondaryActive && (
                            <span className="absolute -top-1.5 w-8 h-1 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                        )}
                    </button>
                )}
            </nav>
        </div>
    );
}

