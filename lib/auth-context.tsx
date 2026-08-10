"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface User {
    id: number;
    username?: string;
    email: string;
    name: string;
    role?: string;
    permissions?: string[];
}

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    login: (usernameOrEmail: string, password: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Check authentication on mount
        const auth = localStorage.getItem("isAuthenticated");
        const token = localStorage.getItem("admin_token");
        const userData = localStorage.getItem("user");
        
        const pathname = typeof window !== "undefined" ? window.location.pathname : "";
        if (pathname !== "/login") {
            if (auth !== "true" || !token) {
                setIsAuthenticated(false);
                setUser(null);
                setIsLoading(false);
                router.replace("/login");
                return;
            }
        }

        if (auth === "true" && userData) {
            setIsAuthenticated(true);
            try {
                setUser(JSON.parse(userData));
            } catch (e) {
                setUser(null);
            }
        }
        setIsLoading(false);
    }, [router]);

    const login = async (usernameOrEmail: string, password: string) => {
        const response = await fetch("/api/admin/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                username: usernameOrEmail,
                email: usernameOrEmail,
                password
            }),
        });

        const data = await response.json();

        if (!response.ok || !data.status) {
            throw new Error(data.message || "Invalid credentials");
        }

        const adminInfo = data.data || data.admin || {};
        const token = adminInfo.access_token || data.token || "";

        if (token) {
            localStorage.setItem("admin_token", token);
        }

        // Fetch fresh role permissions list
        let freshPermissions: string[] = adminInfo.permissions || [];
        try {
            const permRes = await fetch("/api/admin/my-permissions", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const permData = await permRes.json();
            if (permRes.ok && permData.status && Array.isArray(permData.permissions)) {
                freshPermissions = permData.permissions;
            }
        } catch (e) {
            console.error("Failed to fetch fresh permissions after login", e);
        }

        const userData: User = {
            id: adminInfo.id || adminInfo.admin_id || data.admin_id || 1,
            username: adminInfo.username || usernameOrEmail,
            email: adminInfo.email || usernameOrEmail,
            name: adminInfo.name || "Admin User",
            role: adminInfo.role || "Admin",
            permissions: freshPermissions
        };

        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("user", JSON.stringify(userData));

        setUser(userData);
        setIsAuthenticated(true);
        router.push("/dashboard");
    };

    const logout = () => {
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem("user");
        localStorage.removeItem("admin_token");
        
        setIsAuthenticated(false);
        setUser(null);
        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
            window.location.href = "/login";
        }
    };

    useEffect(() => {
        if (typeof window === "undefined") return;

        const originalFetch = window.fetch;

        window.fetch = async (...args) => {
            const response = await originalFetch(...args);

            // Do not intercept login endpoint itself to prevent infinite loop or clearing before login attempt completes
            const requestUrl = typeof args[0] === "string" ? args[0] : (args[0] as Request)?.url || "";
            if (requestUrl.includes("/api/admin/login")) {
                return response;
            }

            if (response.status === 401) {
                localStorage.removeItem("isAuthenticated");
                localStorage.removeItem("user");
                localStorage.removeItem("admin_token");
                setIsAuthenticated(false);
                setUser(null);
                if (window.location.pathname !== "/login") {
                    window.location.href = "/login";
                }
            } else {
                try {
                    const clone = response.clone();
                    const data = await clone.json();
                    if (
                        data &&
                        (data.message === "Invalid token" ||
                            data.message === "Unauthenticated." ||
                            (data.success === false && typeof data.message === "string" && data.message.toLowerCase().includes("token")))
                    ) {
                        localStorage.removeItem("isAuthenticated");
                        localStorage.removeItem("user");
                        localStorage.removeItem("admin_token");
                        setIsAuthenticated(false);
                        setUser(null);
                        if (window.location.pathname !== "/login") {
                            window.location.href = "/login";
                        }
                    }
                } catch {
                    // Ignore non-JSON responses
                }
            }

            return response;
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, []);

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
