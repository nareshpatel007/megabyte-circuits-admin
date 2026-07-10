"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    ShoppingCart,
    Settings2,
    Package,
    Users,
    Settings,
    PanelLeftClose,
    PanelLeftOpen,
    X,
    Smartphone,
    UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/orders", label: "Orders & Quotes", icon: ShoppingCart },
    { href: "/pricing", label: "Pricing Config", icon: Settings2 },
    { href: "/inventory", label: "Inventory", icon: Package },
    { href: "/clients", label: "Clients", icon: Users },
    { href: "/staff", label: "Staff", icon: UserCog },
    { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
    collapsed: boolean;
    onCollapse: (v: boolean) => void;
    mobileOpen: boolean;
    onMobileClose: () => void;
}

export default function Sidebar({ collapsed, onCollapse, mobileOpen, onMobileClose }: SidebarProps) {
    const pathname = usePathname();

    const Content = ({ mobile = false }: { mobile?: boolean }) => {
        const isCollapsed = !mobile && collapsed;
        return (
            <div
                className={cn(
                    "flex flex-col h-full transition-all duration-300 ease-in-out overflow-hidden",
                    "bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
                    isCollapsed ? "w-[64px]" : "w-[240px]"
                )}
                style={{
                    background: "linear-gradient(180deg, hsl(142 60% 5%) 0%, hsl(142 55% 7%) 100%)",
                }}
            >
                {/* Logo Row */}
                <div
                    className={cn(
                        "flex items-center h-[60px] px-3 border-b border-sidebar-border shrink-0 gap-2.5",
                        isCollapsed ? "justify-center" : "justify-between"
                    )}
                >
                    <div className={cn("flex items-center gap-2.5 min-w-0", isCollapsed && "justify-center")}>
                        {!isCollapsed ? (
                            <img src="/images/logo.png" alt="PCB Admin" className="h-12 w-auto object-contain brightness-0 invert" />
                        ) : (
                            <img src="/images/logo.png" alt="PCB Admin" className="h-12 w-8 object-contain brightness-0 invert" />
                        )}
                    </div>

                    {!mobile && (
                        <button
                            onClick={() => onCollapse(!collapsed)}
                            className={cn(
                                "p-1.5 rounded-lg text-sidebar-muted hover:text-white hover:bg-sidebar-accent transition-colors shrink-0",
                                isCollapsed && "hidden"
                            )}
                            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            <PanelLeftClose className="w-4 h-4" />
                        </button>
                    )}

                    {mobile && (
                        <button onClick={onMobileClose} className="p-1.5 rounded-lg text-sidebar-muted hover:text-white hover:bg-sidebar-accent ml-auto">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Expand button when collapsed */}
                {isCollapsed && (
                    <button
                        onClick={() => onCollapse(false)}
                        className="mx-auto mt-3 p-1.5 rounded-lg text-sidebar-muted hover:text-white hover:bg-sidebar-accent transition-colors"
                        title="Expand sidebar"
                    >
                        <PanelLeftOpen className="w-4 h-4" />
                    </button>
                )}

                {/* Nav */}
                <nav className={cn("flex-1 py-4 space-y-0.5 overflow-y-auto", isCollapsed ? "px-2" : "px-3")}>
                    {!isCollapsed && (
                        <p className="text-[9px] font-700 tracking-widest text-sidebar-muted/60 uppercase px-2 mb-3">Main Menu</p>
                    )}
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname ? (pathname === item.href || pathname.startsWith(item.href + "/")) : false;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={mobile ? onMobileClose : undefined}
                                title={isCollapsed ? item.label : undefined}
                                className={cn(
                                    "group flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200",
                                    isCollapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2.5",
                                    isActive
                                        ? "bg-gradient-to-r from-emerald-500/20 to-green-500/10 text-emerald-400 border border-emerald-500/25 shadow-sm"
                                        : "text-sidebar-muted hover:text-white hover:bg-sidebar-accent"
                                )}
                            >
                                <Icon
                                    className={cn(
                                        "w-4 h-4 shrink-0 transition-transform group-hover:scale-110",
                                        isActive && "text-emerald-400"
                                    )}
                                />
                                {!isCollapsed && <span className="truncate">{item.label}</span>}
                                {isActive && !isCollapsed && (
                                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                )}
                            </Link>
                        );
                    })}

                    {!isCollapsed && (
                        <>
                            <div className="my-4 border-t border-sidebar-border" />
                            <p className="text-[9px] font-700 tracking-widest text-sidebar-muted/60 uppercase px-2 mb-3">Tools</p>
                        </>
                    )}
                    {isCollapsed && <div className="my-3 border-t border-sidebar-border" />}

                    <Link
                        href="/mobile-staff"
                        target="_blank"
                        title={isCollapsed ? "Mobile Staff App" : undefined}
                        className={cn(
                            "group flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200",
                            isCollapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2.5",
                            "text-sidebar-muted hover:text-white hover:bg-sidebar-accent"
                        )}
                    >
                        <Smartphone className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                        {!isCollapsed && <span className="truncate">Mobile Staff App</span>}
                    </Link>
                </nav>

                {/* Bottom user hint */}
                {!isCollapsed && (
                    <div className="p-3 border-t border-sidebar-border">
                        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-sidebar-accent/50">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white text-[10px] font-700 shrink-0">
                                AD
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-600 text-white truncate">Admin User</p>
                                <p className="text-[10px] text-sidebar-muted truncate">admin@pcbmfg.in</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <div className="hidden md:flex h-screen sticky top-0 shrink-0">
                <Content />
            </div>

            {mobileOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onMobileClose} />
                    <div className="absolute left-0 top-0 h-full z-50">
                        <Content mobile />
                    </div>
                </div>
            )}
        </>
    );
}
