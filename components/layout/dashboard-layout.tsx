"use client";

import { useState } from "react";
import Sidebar from "./sidebar";
import Header from "./header";
import { Toaster } from "sonner";
import { useTheme } from "@/lib/theme-context";

interface DashboardLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
}

export default function DashboardLayout({ children, title, subtitle, action }: DashboardLayoutProps) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const { theme } = useTheme();

    return (
        <div className="flex h-screen bg-background overflow-hidden">
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

                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    {children}
                </main>
            </div>

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
