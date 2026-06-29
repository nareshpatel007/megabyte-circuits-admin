"use client";

import { useState, useRef, useEffect } from "react";
import { Menu, Bell, Sun, Moon, User, LogOut, ChevronDown, Settings } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
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
        "h-[60px] flex items-center px-4 md:px-6 gap-3 shrink-0 border-b border-border",
        "bg-card/80 glass sticky top-0 z-30",
        theme === "light" ? "card-shadow" : "card-shadow-dark"
      )}
    >
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1" />

      {/* Right controls */}
      <div className="flex items-center gap-1.5">

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="relative p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-200"
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
            className="relative p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-500 ring-2 ring-card animate-pulse" />
            )}
          </button>

          {bellOpen && (
            <div className={cn(
              "absolute right-0 top-full mt-2 w-80 rounded-2xl border border-border overflow-hidden shadow-2xl z-50",
              "bg-card",
              theme === "light" ? "card-shadow" : "card-shadow-dark"
            )}>
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="text-sm font-600 text-foreground">Notifications</span>
                <span className="text-xs text-primary font-500">{unreadCount} new</span>
              </div>
              <div className="divide-y divide-border">
                {notifications.map((n) => (
                  <div key={n.id} className={cn("px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer", n.unread && "bg-primary/5")}>
                    <div className="flex items-start gap-2.5">
                      {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0" />}
                      <div className={cn(!n.unread && "ml-4")}>
                        <p className="text-xs font-500 text-foreground leading-relaxed">{n.text}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 border-t border-border">
                <button className="text-xs text-primary hover:underline">View all notifications</button>
              </div>
            </div>
          )}
        </div>

        {/* User avatar + dropdown */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => { setUserOpen(!userOpen); setBellOpen(false); }}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-accent transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-md shrink-0">
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
              "absolute right-0 top-full mt-2 w-56 rounded-2xl border border-border overflow-hidden shadow-2xl z-50",
              "bg-card",
              theme === "light" ? "card-shadow" : "card-shadow-dark"
            )}>
              {/* User info */}
              <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-600 text-foreground">Admin User</p>
                  <p className="text-[11px] text-muted-foreground">admin@pcbmfg.in</p>
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
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="border-t border-border py-1.5">
                <button
                  onClick={() => { toast.error("Logged out"); setUserOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
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
