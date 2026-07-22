"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, ArrowRight, Cpu, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            await login(email, password);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Login failed. Please check your credentials.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 relative overflow-hidden font-sans">
            {/* Tech grid overlay */}
            <div
                className="absolute inset-0 z-0 opacity-15 pointer-events-none"
                style={{
                    backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)",
                    backgroundSize: "24px 24px"
                }}
            />

            {/* Premium circuit-inspired glowing background spheres */}
            <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] bg-green-600/10 rounded-full blur-[140px] pointer-events-none" />

            {/* Futuristic Vector Circuit paths in background */}
            <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="circuit-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
                        <stop offset="50%" stopColor="#10b981" stopOpacity="1" />
                        <stop offset="100%" stopColor="#047857" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d="M -100 100 L 200 100 L 300 200 L 300 400 L 400 500 L 800 500" fill="none" stroke="url(#circuit-grad-1)" strokeWidth="1.5" />
                <path d="M 1200 100 L 1000 100 L 900 200 L 900 600 L 700 800" fill="none" stroke="url(#circuit-grad-1)" strokeWidth="1.5" />
                <circle cx="300" cy="200" r="3" fill="#10b981" className="animate-pulse" />
                <circle cx="400" cy="500" r="3" fill="#047857" className="animate-pulse" />
                <circle cx="900" cy="200" r="3" fill="#10b981" className="animate-pulse" />
            </svg>

            {/* Login card container */}
            <div className="relative z-10 w-full max-w-[440px] transition-all duration-300">
                {/* Glow ring behind card */}
                <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500/30 to-green-600/30 rounded-3xl blur-2xl opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />

                <div className="relative bg-zinc-900/70 backdrop-blur-2xl rounded-2xl border border-zinc-800/80 shadow-2xl p-8 sm:p-10 flex flex-col items-center">

                    {/* Premium Circuit Badge/Logo */}
                    <div className="mb-6 flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 shadow-inner relative group overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Cpu className="w-7 h-7 text-emerald-400 animate-pulse" />
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]" />
                    </div>

                    <h1 className="text-2xl font-bold tracking-tight text-white text-center mb-1 bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                        Megabyte Circuits
                    </h1>
                    <p className="text-sm text-zinc-400 text-center mb-8 font-medium">
                        Admin Control Panel
                    </p>

                    {error && (
                        <div className="w-full mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6 w-full">
                        <div className="space-y-2">
                            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest block">
                                Email Address
                            </label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@pcbmfg.in"
                                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-zinc-950/40 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 focus:bg-zinc-950/80 transition-all duration-200 text-sm"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest block">
                                    Password
                                </label>
                                <a href="#" className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                                    Forgot password?
                                </a>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-12 py-3.5 rounded-xl bg-zinc-950/40 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 focus:bg-zinc-950/80 transition-all duration-200 text-sm"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 focus:outline-none transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                type="checkbox"
                                className="h-4 w-4 rounded border-zinc-800 bg-zinc-950/40 text-emerald-500 focus:ring-emerald-500/30 accent-emerald-500 cursor-pointer"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-xs text-zinc-400 cursor-pointer select-none hover:text-zinc-300 transition-colors">
                                Remember this device for 30 days
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 rounded-xl font-semibold text-sm text-zinc-950 bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-300 hover:to-green-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                                    Authenticating...
                                </>
                            ) : (
                                <>
                                    Access Terminal
                                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <span className="text-xs text-zinc-500">
                            Authorized access only. Logging active.
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
