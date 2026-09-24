"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Menu, Bell, Sun, Moon, User, LogOut, ChevronDown, Settings, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import GlobalSearch from "@/components/layout/global-search";

interface HeaderProps {
    onMenuClick: () => void;
}

interface AdminNotificationItem {
    id: number;
    title: string;
    message: string;
    category: string;
    theme: string;
    action_url: string | null;
    is_read: boolean;
    created_at: string;
}

export default function Header({ onMenuClick }: HeaderProps) {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const { user, logout } = useAuth();
    const [userOpen, setUserOpen] = useState(false);
    const [bellOpen, setBellOpen] = useState(false);

    const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);

    const userRef = useRef<HTMLDivElement>(null);
    const bellRef = useRef<HTMLDivElement>(null);

    const getAuthHeaders = useCallback(() => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("admin_token") : null;
        return {
            "Content-Type": "application/json",
            "Accept": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        };
    }, []);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/notifications?per_page=5", {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.status && Array.isArray(data.data)) {
                setNotifications(data.data);
                setUnreadCount(data.unread_count || 0);
            }
        } catch (e) {
            // Background fetch error
        }
    }, [getAuthHeaders]);

    const handleMarkAsRead = async (id: number, actionUrl?: string | null) => {
        try {
            await fetch(`/api/admin/notifications/${id}/read`, {
                method: "POST",
                headers: getAuthHeaders()
            });
            fetchNotifications();
            if (actionUrl) {
                router.push(actionUrl);
            }
        } catch (e) {}
    };

    const handleMarkAllAsRead = async () => {
        try {
            await fetch("/api/admin/notifications/read-all", {
                method: "POST",
                headers: getAuthHeaders()
            });
            fetchNotifications();
            toast.success("All notifications marked as read");
        } catch (e) {}
    };

    useEffect(() => {
        fetchNotifications();

        // Real-time EventSource Stream for Admin Notifications
        const token = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("admin_token") : null;
        const streamUrl = token ? `/api/admin/notifications/stream?token=${encodeURIComponent(token)}` : "/api/admin/notifications/stream";
        const es = new EventSource(streamUrl);
        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.notifications && data.notifications.length > 0) {
                    fetchNotifications();
                    data.notifications.forEach((n: any) => {
                        toast.info(n.title, { description: n.message });
                    });
                }
            } catch (e) {}
        };

        const pollInterval = setInterval(fetchNotifications, 15000);

        return () => {
            es.close();
            clearInterval(pollInterval);
        };
    }, [fetchNotifications]);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
            if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    return (
        <header
            className={cn(
                "h-[64px] flex items-center px-4 md:px-6 gap-3 shrink-0 border-b border-white/10",
                "bg-card/90 backdrop-blur-xl sticky top-0 z-30",
                theme === "light" ? "card-shadow" : "card-shadow-dark"
            )}
        >
            {/* Mobile hamburger */}
            <button
                onClick={onMenuClick}
                className="md:hidden p-2.5 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all duration-200"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Left aligned Global Search Bar */}
            <GlobalSearch />

            <div className="flex-1" />

            {/* Right controls */}
            <div className="flex items-center gap-1.5">
                {/* Theme toggle */}
                <button
                    onClick={toggleTheme}
                    className="relative p-2.5 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all duration-200 cursor-pointer"
                    title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                >
                    <Sun
                        className={cn(
                            "w-4 h-4 absolute transition-all duration-300",
                            theme === "dark" ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
                        )}
                    />
                    <Moon
                        className={cn(
                            "w-4 h-4 transition-all duration-300",
                            theme === "dark" ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
                        )}
                    />
                </button>

                {/* Bell / Notifications */}
                <div className="relative" ref={bellRef}>
                    <button
                        onClick={() => { setBellOpen(!bellOpen); setUserOpen(false); }}
                        className="relative p-2.5 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all duration-200 cursor-pointer"
                        title="Notifications"
                    >
                        <Bell className="w-4 h-4" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                        )}
                    </button>

                    {bellOpen && (
                        <div className={cn(
                            "absolute right-0 top-full mt-2 w-80 rounded-2xl border border-white/10 overflow-hidden shadow-2xl z-50",
                            "bg-slate-900/95 backdrop-blur-xl",
                            theme === "light" ? "card-shadow" : "card-shadow-dark"
                        )}>
                            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-gradient-to-b from-white/5 to-transparent">
                                <span className="text-xs font-bold text-white">Notifications</span>
                                {unreadCount > 0 ? (
                                    <button
                                        onClick={handleMarkAllAsRead}
                                        className="text-[11px] text-emerald-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                                    >
                                        <Check className="w-3 h-3" />
                                        <span>Mark all read</span>
                                    </button>
                                ) : (
                                    <span className="text-[11px] text-slate-400 font-medium">0 unread</span>
                                )}
                            </div>
                            <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-6 text-center text-slate-400 text-xs">
                                        <p className="font-semibold text-white">No notifications</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">All system events are clear!</p>
                                    </div>
                                ) : (
                                    notifications.map((n) => (
                                        <div
                                            key={n.id}
                                            onClick={() => {
                                                handleMarkAsRead(n.id, n.action_url);
                                                setBellOpen(false);
                                            }}
                                            className={cn(
                                                "px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer text-xs",
                                                !n.is_read && "bg-emerald-500/10"
                                            )}
                                        >
                                            <div className="flex items-start gap-2.5">
                                                {!n.is_read && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                                                )}
                                                <div className={cn(n.is_read && "ml-3.5")}>
                                                    <p className="text-xs font-bold text-slate-100 leading-snug">{n.title}</p>
                                                    <p className="text-[11px] font-medium text-slate-400 leading-relaxed mt-0.5 line-clamp-2">{n.message}</p>
                                                    <p className="text-[10px] text-slate-500 font-mono mt-1">
                                                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="px-4 py-2.5 border-t border-white/10 bg-slate-950/40 text-center">
                                <Link
                                    href="/settings/notifications"
                                    onClick={() => setBellOpen(false)}
                                    className="text-xs font-bold text-emerald-400 hover:underline cursor-pointer block"
                                >
                                    Notification Settings
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* User avatar + dropdown */}
                <div className="relative" ref={userRef}>
                    <button
                        onClick={() => { setUserOpen(!userOpen); setBellOpen(false); }}
                        className="flex items-center gap-2 pl-1 pr-2 py-1.5 rounded-xl hover:bg-white/5 transition-all duration-200 cursor-pointer"
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                            <User className="w-4 h-4 text-white" />
                        </div>
                        <div className="hidden sm:block text-left">
                            <p className="text-xs font-semibold text-foreground leading-tight">{user?.name || "Admin User"}</p>
                            <p className="text-[10px] text-muted-foreground">Administrator</p>
                        </div>
                        <ChevronDown
                            className={cn(
                                "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
                                userOpen && "rotate-180"
                            )}
                        />
                    </button>

                    {userOpen && (
                        <div className={cn(
                            "absolute right-0 top-full mt-2 w-56 rounded-2xl border border-white/10 overflow-hidden shadow-2xl z-50 py-1.5",
                            "bg-slate-900/95 backdrop-blur-xl",
                            theme === "light" ? "card-shadow" : "card-shadow-dark"
                        )}>
                            <div className="px-4 py-2 border-b border-white/10">
                                <p className="text-xs font-bold text-white">{user?.name || "Admin User"}</p>
                                <p className="text-[10px] text-slate-400 font-mono truncate">{user?.email || "admin@megabyte.com"}</p>
                            </div>
                            <Link
                                href="/settings"
                                onClick={() => setUserOpen(false)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                <Settings className="w-3.5 h-3.5" />
                                <span>Settings</span>
                            </Link>
                            <button
                                onClick={() => { logout(); setUserOpen(false); }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>Logout</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
