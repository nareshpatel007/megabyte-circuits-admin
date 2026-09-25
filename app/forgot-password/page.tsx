"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, ArrowLeft, Eye, EyeOff, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

function AdminForgotPasswordContent() {
    const router = useRouter();

    // Steps: "request" | "verify" | "reset" | "success"
    const [step, setStep] = useState<"request" | "verify" | "reset" | "success">("request");

    // Form inputs
    const [identifier, setIdentifier] = useState("");
    const [maskedEmail, setMaskedEmail] = useState("");
    const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
    const [resetToken, setResetToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Timers
    const [countdown, setCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);

    // UI feedback
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // Refs for 6-digit OTP inputs
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Countdown effect
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (step === "verify" && countdown > 0) {
            timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        setCanResend(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [step, countdown]);

    // Handle 1. Request OTP
    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");

        if (!identifier.trim()) {
            setErrorMessage("Please enter your Username, Email Address, or Mobile.");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("/api/admin/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier: identifier.trim() }),
            });

            const data = await res.json();

            if (data.status || data.success) {
                setMaskedEmail(data.masked_email || identifier.trim());
                setSuccessMessage("Verification code sent to your registered email!");
                setStep("verify");
                setCountdown(60);
                setCanResend(false);
            } else {
                setErrorMessage(data.message || "Failed to request verification code.");
            }
        } catch (err) {
            console.error("Admin forgot password error:", err);
            setErrorMessage("Network error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle OTP Input Change & Paste
    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) {
            const digits = value.replace(/\D/g, "").slice(0, 6).split("");
            const newOtp = [...otpDigits];
            digits.forEach((d, i) => {
                newOtp[i] = d;
            });
            setOtpDigits(newOtp);
            const focusIndex = Math.min(digits.length, 5);
            inputRefs.current[focusIndex]?.focus();
            return;
        }

        const digit = value.replace(/\D/g, "");
        const newOtp = [...otpDigits];
        newOtp[index] = digit;
        setOtpDigits(newOtp);

        if (digit && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    // Handle 2. Verify OTP
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");

        const otpCode = otpDigits.join("");
        if (otpCode.length !== 6) {
            setErrorMessage("Please enter the complete 6-digit OTP.");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("/api/admin/auth/verify-password-reset-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier: identifier.trim(), otp: otpCode }),
            });

            const data = await res.json();

            if (data.status || data.success) {
                setResetToken(data.reset_token);
                setSuccessMessage("OTP verified successfully!");
                setStep("reset");
            } else {
                setErrorMessage(data.message || "Invalid or expired OTP code.");
            }
        } catch (err) {
            console.error("Admin verify OTP error:", err);
            setErrorMessage("Error verifying OTP. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Resend OTP
    const handleResendOtp = async () => {
        if (!canResend || isResending) return;

        setErrorMessage("");
        setSuccessMessage("");
        setIsResending(true);

        try {
            const res = await fetch("/api/admin/auth/resend-password-reset-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier: identifier.trim() }),
            });

            const data = await res.json();

            if (data.status || data.success) {
                setSuccessMessage("A new verification code has been sent!");
                setOtpDigits(Array(6).fill(""));
                setCountdown(60);
                setCanResend(false);
                inputRefs.current[0]?.focus();
            } else {
                setErrorMessage(data.message || "Failed to resend OTP.");
            }
        } catch (err) {
            setErrorMessage("Network error while resending OTP.");
        } finally {
            setIsResending(false);
        }
    };

    // Password requirements check
    const hasMinLength = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber;

    // Handle 3. Reset Password
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");

        if (!newPassword) {
            setErrorMessage("Please enter a new password.");
            return;
        }

        if (!isPasswordValid) {
            setErrorMessage("Password does not meet complexity requirements.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setErrorMessage("Passwords do not match.");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("/api/admin/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reset_token: resetToken,
                    password: newPassword,
                    password_confirmation: confirmPassword,
                }),
            });

            const data = await res.json();

            if (data.status || data.success) {
                setSuccessMessage("Password updated successfully!");
                setStep("success");
            } else {
                setErrorMessage(data.message || "Failed to update password.");
            }
        } catch (err) {
            console.error("Admin reset password error:", err);
            setErrorMessage("Error occurred while updating password.");
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

            {/* Glowing background spheres */}
            <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] bg-green-600/10 rounded-full blur-[140px] pointer-events-none" />

            {/* Vector Circuit paths */}
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
            </svg>

            {/* Card container */}
            <div className="relative z-10 w-full max-w-[440px] transition-all duration-300">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500/30 to-green-600/30 rounded-3xl blur-2xl opacity-75 group-hover:opacity-100 transition duration-1000" />

                <div className="relative bg-zinc-900/70 backdrop-blur-2xl rounded-2xl border border-zinc-800/80 shadow-2xl p-8 sm:p-10 flex flex-col items-center">

                    {/* Logo Header */}
                    <div className="mb-6 flex items-center justify-center p-2 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 shadow-inner relative group overflow-hidden">
                        <Image
                            src="/images/logo.png"
                            alt="Megabyte Circuits Logo"
                            width={160}
                            height={48}
                            className="h-10 w-auto object-contain relative z-10"
                            priority
                        />
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]" />
                    </div>

                    <h1 className="text-2xl font-bold tracking-tight text-white text-center mb-1 bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                        {step === "request" && "Forgot Password?"}
                        {step === "verify" && "Verify OTP"}
                        {step === "reset" && "Set New Password"}
                        {step === "success" && "Password Reset Complete"}
                    </h1>
                    <p className="text-xs text-zinc-400 text-center mb-6 font-medium">
                        {step === "request" && "Enter your registered email address to receive a verification code."}
                        {step === "verify" && "Enter the verification code sent to your registered email."}
                        {step === "reset" && "Create a new strong password for your admin account."}
                        {step === "success" && "Your password has been updated successfully."}
                    </p>

                    {/* Masked Email Banner */}
                    {step === "verify" && maskedEmail && (
                        <div className="w-full mb-5 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 text-xs text-center font-medium flex items-center justify-between">
                            <span>Sent to: <strong>{maskedEmail}</strong></span>
                            <button
                                type="button"
                                onClick={() => { setStep("request"); setErrorMessage(""); setSuccessMessage(""); }}
                                className="text-emerald-300 hover:text-white underline text-xs font-semibold"
                            >
                                Change
                            </button>
                        </div>
                    )}

                    {/* Messages */}
                    {errorMessage && (
                        <div className="w-full mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center font-medium flex items-center justify-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}
                    {successMessage && step !== "success" && (
                        <div className="w-full mb-6 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs text-center font-medium flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {/* STEP 1: REQUEST OTP */}
                    {step === "request" && (
                        <form onSubmit={handleRequestOtp} className="space-y-6 w-full">
                            <div className="space-y-2">
                                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest block">
                                    USERNAME / EMAIL ADDRESS / MOBILE
                                </label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
                                    <input
                                        type="text"
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        placeholder="username / email / mobile"
                                        className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-zinc-950/40 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 focus:bg-zinc-950/80 transition-all duration-200 text-sm"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 rounded-xl font-semibold text-sm text-zinc-950 bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-300 hover:to-green-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                                        Sending Code...
                                    </>
                                ) : (
                                    "Send OTP"
                                )}
                            </button>

                            <div className="text-center pt-2">
                                <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-emerald-400 transition-colors font-medium">
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span>Back to Sign In</span>
                                </Link>
                            </div>
                        </form>
                    )}

                    {/* STEP 2: VERIFY OTP */}
                    {step === "verify" && (
                        <form onSubmit={handleVerifyOtp} className="space-y-6 w-full">
                            <div className="space-y-3">
                                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest block text-center">
                                    6-Digit Verification Code
                                </label>
                                <div className="flex items-center justify-between gap-2">
                                    {otpDigits.map((digit, idx) => (
                                        <input
                                            key={idx}
                                            ref={(el) => { inputRefs.current[idx] = el; }}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={6}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                                            className="w-11 h-12 text-center font-bold text-lg rounded-xl bg-zinc-950/60 border border-zinc-800 text-emerald-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                                <span>
                                    {countdown > 0 ? (
                                        `Resend OTP in 00:${countdown.toString().padStart(2, "0")}`
                                    ) : (
                                        "Didn't receive code?"
                                    )}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleResendOtp}
                                    disabled={!canResend || isResending}
                                    className={`font-semibold flex items-center gap-1 transition-colors ${canResend && !isResending ? "text-emerald-400 hover:text-emerald-300 cursor-pointer" : "text-zinc-600 cursor-not-allowed"}`}
                                >
                                    {isResending ? (
                                        <>
                                            <div className="w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                                            <span>Sending...</span>
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="w-3 h-3" />
                                            <span>Resend OTP</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 rounded-xl font-semibold text-sm text-zinc-950 bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-300 hover:to-green-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    "Verify OTP"
                                )}
                            </button>

                            <div className="text-center pt-1">
                                <button
                                    type="button"
                                    onClick={() => { setStep("request"); setErrorMessage(""); setSuccessMessage(""); }}
                                    className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-emerald-400 transition-colors font-medium cursor-pointer"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span>Back to Identification</span>
                                </button>
                            </div>
                        </form>
                    )}

                    {/* STEP 3: RESET PASSWORD */}
                    {step === "reset" && (
                        <form onSubmit={handleResetPassword} className="space-y-5 w-full">
                            <div className="space-y-2">
                                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest block">
                                    New Password
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pl-11 pr-12 py-3.5 rounded-xl bg-zinc-950/40 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 focus:bg-zinc-950/80 transition-all duration-200 text-sm"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                                    >
                                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest block">
                                    Confirm New Password
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pl-11 pr-12 py-3.5 rounded-xl bg-zinc-950/40 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 focus:bg-zinc-950/80 transition-all duration-200 text-sm"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Password Requirements */}
                            <div className="p-3.5 bg-zinc-950/60 rounded-xl border border-zinc-800 text-xs space-y-1.5">
                                <p className="font-semibold text-zinc-300 mb-1">Password Requirements:</p>
                                <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-400" : "text-zinc-500"}`}>
                                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasMinLength ? "text-emerald-400" : "text-zinc-600"}`} />
                                    <span>At least 8 characters</span>
                                </div>
                                <div className={`flex items-center gap-1.5 ${hasUpper ? "text-emerald-400" : "text-zinc-500"}`}>
                                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasUpper ? "text-emerald-400" : "text-zinc-600"}`} />
                                    <span>Uppercase letter</span>
                                </div>
                                <div className={`flex items-center gap-1.5 ${hasLower ? "text-emerald-400" : "text-zinc-500"}`}>
                                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasLower ? "text-emerald-400" : "text-zinc-600"}`} />
                                    <span>Lowercase letter</span>
                                </div>
                                <div className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-400" : "text-zinc-500"}`}>
                                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasNumber ? "text-emerald-400" : "text-zinc-600"}`} />
                                    <span>Number</span>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !isPasswordValid || newPassword !== confirmPassword}
                                className="w-full py-4 rounded-xl font-semibold text-sm text-zinc-950 bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-300 hover:to-green-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    "Update Password"
                                )}
                            </button>
                        </form>
                    )}

                    {/* STEP 4: SUCCESS */}
                    {step === "success" && (
                        <div className="text-center space-y-5 py-4 w-full">
                            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <p className="text-xs sm:text-sm text-zinc-300">
                                Your admin password has been updated successfully.
                            </p>
                            <Link
                                href="/login"
                                className="w-full py-4 rounded-xl font-semibold text-sm text-zinc-950 bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-300 hover:to-green-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all duration-300 inline-flex items-center justify-center gap-2"
                            >
                                Back to Sign In
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function AdminForgotPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-zinc-950">
                <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
        }>
            <AdminForgotPasswordContent />
        </Suspense>
    );
}
