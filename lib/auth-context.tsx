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
        const userData = localStorage.getItem("user");
        
        if (auth === "true" && userData) {
            setIsAuthenticated(true);
            setUser(JSON.parse(userData));
        }
        setIsLoading(false);
    }, []);

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

        const userData: User = {
            id: adminInfo.id || adminInfo.admin_id || data.admin_id || 1,
            username: adminInfo.username || usernameOrEmail,
            email: adminInfo.email || usernameOrEmail,
            name: adminInfo.name || "Admin User",
            role: adminInfo.role || "Admin",
            permissions: adminInfo.permissions || []
        };

        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("user", JSON.stringify(userData));
        if (token) {
            localStorage.setItem("admin_token", token);
        }

        setUser(userData);
        setIsAuthenticated(true);
        router.push("/dashboard");
    };

    const logout = () => {
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem("user");
        
        setIsAuthenticated(false);
        setUser(null);
        router.push("/login");
    };

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
