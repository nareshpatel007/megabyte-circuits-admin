"use client";

import { useState, useRef, useEffect } from "react";
import { Menu, Bell, Sun, Moon, User, LogOut, ChevronDown, Settings } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface HeaderProps {
    onMenuClick: () => void;
}

const notifications = [
    { id: 1, text: "New order PCB-2025-021 placed", time: "2m ago", unread: true },
    { id: 2, text: "Low stock: 100nF 0402 Capacitor", time: "18m ago", unread: true },
    { id: 3, text: "Order PCB-2025-019 shipped", time: "1h ago", unread: false },
];

export default function Header({ onMenuClick }: HeaderProps) {
    const { theme, toggleTheme } = useTheme();
    const { logout } = useAuth();
    const [userOpen, setUserOpen] = useState(false);
    const [bellOpen, setBellOpen] = useState(false);
    const userRef = useRef<HTMLDivElement>(null);
    const bellRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
            if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const unreadCount = notifications.filter((n) => n.unread).length;

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

            <div className="flex-1" />

            {/* Right controls */}
            <div className="flex items-center gap-1.5">

                {/* Theme toggle */}
                <button
                    onClick={toggleTheme}
                    className="relative p-2.5 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all duration-200"
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

                {/* Bell / notifications */}
                <div className="relative" ref={bellRef}>
                    <button
                        onClick={() => { setBellOpen(!bellOpen); setUserOpen(false); }}
                        className="relative p-2.5 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all duration-200"
                    >
                        <Bell className="w-4 h-4" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-card animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                        )}
                    </button>

                    {bellOpen && (
                        <div className={cn(
                            "absolute right-0 top-full mt-2 w-80 rounded-2xl border border-white/10 overflow-hidden shadow-2xl z-50",
                            "bg-card/95 backdrop-blur-xl",
                            theme === "light" ? "card-shadow" : "card-shadow-dark"
                        )}>
                            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-gradient-to-b from-white/5 to-transparent">
                                <span className="text-sm font-600 text-foreground">Notifications</span>
                                <span className="text-xs text-emerald-400 font-500">{unreadCount} new</span>
                            </div>
                            <div className="divide-y divide-white/5">
                                {notifications.map((n) => (
                                    <div key={n.id} className={cn("px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer", n.unread && "bg-emerald-500/5")}>
                                        <div className="flex items-start gap-2.5">
                                            {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />}
                                            <div className={cn(!n.unread && "ml-4")}>
                                                <p className="text-xs font-500 text-foreground leading-relaxed">{n.text}</p>
                                                <p className="text-[10px] text-zinc-500 mt-0.5">{n.time}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="px-4 py-2.5 border-t border-white/10">
                                <button className="text-xs text-emerald-400 hover:underline">View all notifications</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* User avatar + dropdown */}
                <div className="relative" ref={userRef}>
                    <button
                        onClick={() => { setUserOpen(!userOpen); setBellOpen(false); }}
                        className="flex items-center gap-2 pl-1 pr-2 py-1.5 rounded-xl hover:bg-white/5 transition-all duration-200"
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                            <User className="w-4 h-4 text-white" />
                        </div>
                        <div className="hidden sm:block text-left">
                            <p className="text-xs font-600 text-foreground leading-tight">Admin User</p>
                            <p className="text-[10px] text-muted-foreground">Super Admin</p>
                        </div>
                        <ChevronDown
                            className={cn(
                                "w-3 h-3 text-muted-foreground transition-transform duration-200 hidden sm:block",
                                userOpen && "rotate-180"
                            )}
                        />
                    </button>

                    {userOpen && (
                        <div className={cn(
                            "absolute right-0 top-full mt-2 w-56 rounded-2xl border border-white/10 overflow-hidden shadow-2xl z-50",
                            "bg-card/95 backdrop-blur-xl",
                            theme === "light" ? "card-shadow" : "card-shadow-dark"
                        )}>
                            {/* User info */}
                            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3 bg-gradient-to-b from-white/5 to-transparent">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                                    <User className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-600 text-foreground">Admin User</p>
                                    <p className="text-[11px] text-zinc-500">admin@pcbmfg.in</p>
                                </div>
                            </div>

                            <div className="py-1.5">
                                {[
                                    { icon: User, label: "Profile" },
                                    { icon: Settings, label: "Preferences" },
                                ].map(({ icon: Icon, label }) => (
                                    <button
                                        key={label}
                                        onClick={() => { toast.success(`${label} coming soon`); setUserOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all duration-200"
                                    >
                                        <Icon className="w-4 h-4" />
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <div className="border-t border-white/10 py-1.5">
                                <button
                                    onClick={() => { logout(); setUserOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-all duration-200"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
