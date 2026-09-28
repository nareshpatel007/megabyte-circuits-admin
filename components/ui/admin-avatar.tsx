"use client";

import { useState } from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminAvatarProps {
    src?: string | null;
    name?: string | null;
    className?: string;
    iconClassName?: string;
    alt?: string;
}

export function AdminAvatar({
    src,
    name,
    className = "w-8 h-8",
    iconClassName = "w-4 h-4 text-white",
    alt = "Admin Avatar"
}: AdminAvatarProps) {
    const [imageError, setImageError] = useState(false);

    const hasImage = Boolean(src) && !imageError;

    if (hasImage && src) {
        return (
            <div className={cn("relative overflow-hidden rounded-full shrink-0 border border-white/20 bg-slate-800 shadow-md", className)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={src}
                    alt={name || alt}
                    onError={() => setImageError(true)}
                    className="w-full h-full object-cover"
                />
            </div>
        );
    }

    return (
        <div
            className={cn(
                "rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0",
                className
            )}
        >
            <User className={iconClassName} />
        </div>
    );
}
