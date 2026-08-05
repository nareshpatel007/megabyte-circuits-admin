"use client";

import { useState } from "react";
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
    Shield,
    CreditCard,
    FileArchive,
    ChevronDown,
    ListFilter,
    Sliders,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
    href?: string;
    label: string;
    icon: any;
    children?: { href: string; label: string; icon?: any }[];
}

const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/orders", label: "Orders", icon: ShoppingCart },
    { href: "/payments", label: "Payments", icon: CreditCard },
    { href: "/gerber-files", label: "Gerber Files", icon: FileArchive },
    // { href: "/pricing", label: "Pricing Config", icon: Settings2 },
    { href: "/inventory", label: "Inventory", icon: Package },
    { href: "/clients", label: "Clients", icon: Users },
    { href: "/staff", label: "Staff", icon: UserCog },
    { href: "/roles", label: "Roles", icon: Shield },
    {
        label: "Settings",
        icon: Settings,
        children: [
            { href: "/settings", label: "General Settings", icon: Sliders },
            { href: "/settings/statuses", label: "Order Statuses", icon: ListFilter },
        ],
    },
];

interface SidebarProps {
    collapsed: boolean;
    onCollapse: (v: boolean) => void;
    mobileOpen: boolean;
    onMobileClose: () => void;
}

export default function Sidebar({ collapsed, onCollapse, mobileOpen, onMobileClose }: SidebarProps) {
    const pathname = usePathname();
    const [settingsOpen, setSettingsOpen] = useState(true);

    const renderContent = (mobile = false) => {
        const isCollapsed = !mobile && collapsed;
        return (
            <div
                className={cn(
                    "flex flex-col h-full transition-all duration-300 ease-in-out overflow-hidden",
                    "bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
                    isCollapsed ? "w-[64px]" : "w-[240px]"
                )}
                style={{
                    background: "linear-gradient(180deg, hsl(142 70% 8%) 0%, hsl(142 65% 12%) 50%, hsl(142 60% 15%) 100%)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 20px rgba(0,0,0,0.3)",
                }}
            >
                {/* Logo Row */}
                <div
                    className={cn(
                        "flex items-center h-[64px] px-4 border-b border-white/5 shrink-0 gap-2.5",
                        isCollapsed ? "justify-center" : "justify-between",
                        "bg-gradient-to-b from-white/5 to-transparent"
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
                        className="mx-auto mt-3 p-1.5 rounded-lg text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all duration-200"
                        title="Expand sidebar"
                    >
                        <PanelLeftOpen className="w-4 h-4" />
                    </button>
                )}

                {/* Nav Links */}
                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin">
                    {navItems.map((item) => {
                        if (item.children) {
                            const isChildActive = item.children.some((child) => pathname === child.href);
                            return (
                                <div key={item.label} className="space-y-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (isCollapsed) onCollapse(false);
                                            setSettingsOpen(!settingsOpen);
                                        }}
                                        className={cn(
                                            "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 relative group cursor-pointer",
                                            isChildActive
                                                ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/15"
                                                : "text-white/90 hover:text-white hover:bg-white/10 border border-transparent"
                                        )}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <item.icon className={cn("w-4.5 h-4.5 shrink-0 transition-colors", isChildActive ? "text-emerald-400" : "text-white/80 group-hover:text-white")} />
                                            {!isCollapsed && <span className="truncate">{item.label}</span>}
                                        </div>
                                        {!isCollapsed && (
                                            <ChevronDown className={cn("w-4 h-4 shrink-0 transition-transform duration-200 text-white/60", settingsOpen && "rotate-180")} />
                                        )}
                                    </button>

                                    {settingsOpen && !isCollapsed && (
                                        <div className="pl-4 space-y-1 pt-0.5">
                                            {item.children.map((child) => {
                                                const childActive = pathname === child.href;
                                                const ChildIcon = child.icon;
                                                return (
                                                    <Link
                                                        key={child.href}
                                                        href={child.href}
                                                        onClick={() => mobile && onMobileClose()}
                                                        className={cn(
                                                            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 relative group",
                                                            childActive
                                                                ? "text-emerald-400 bg-emerald-500/15 font-bold"
                                                                : "text-white/70 hover:text-white hover:bg-white/5"
                                                        )}
                                                    >
                                                        {ChildIcon && <ChildIcon className={cn("w-3.5 h-3.5 shrink-0", childActive ? "text-emerald-400" : "text-white/60 group-hover:text-white")} />}
                                                        <span className="truncate">{child.label}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        const active = pathname ? (pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href!))) : false;
                        return (
                            <Link
                                key={item.href}
                                href={item.href!}
                                onClick={() => mobile && onMobileClose()}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 relative group",
                                    active
                                        ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/15"
                                        : "text-white/90 hover:text-white hover:bg-white/10 border border-transparent"
                                )}
                            >
                                <item.icon className={cn("w-4.5 h-4.5 shrink-0 transition-colors", active ? "text-emerald-400" : "text-white/80 group-hover:text-white")} />
                                {!isCollapsed && <span className="truncate">{item.label}</span>}
                            </Link>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="hidden md:flex h-screen sticky top-0 shrink-0">
                {renderContent(false)}
            </div>

            {mobileOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onMobileClose} />
                    <div className="absolute left-0 top-0 h-full z-50">
                        {renderContent(true)}
                    </div>
                </div>
            )}
        </>
    );
}
