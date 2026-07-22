import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
    text?: string;
    size?: "sm" | "md" | "lg";
    className?: string;
}

export default function LoadingSpinner({
    text = "Loading...",
    size = "md",
    className = "",
}: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: "w-4 h-4",
        md: "w-6 h-6",
        lg: "w-10 h-10",
    };

    return (
        <div className={`flex flex-col items-center justify-center py-12 px-4 gap-3 text-muted-foreground ${className}`}>
            <Loader2 className={`${sizeClasses[size]} animate-spin text-emerald-500`} />
            {text && (
                <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground/80 animate-pulse">
                    {text}
                </p>
            )}
        </div>
    );
}
