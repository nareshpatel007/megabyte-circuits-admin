import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
    return (
        <div
            className={cn("animate-pulse rounded-xl bg-zinc-800/40 dark:bg-zinc-800/60", className)}
            {...props}
        />
    );
}

export function DashboardSkeleton() {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Metric Cards Skeletons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-card border border-border/80 rounded-xl p-5 flex items-start gap-4">
                        <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-7 w-28" />
                            <Skeleton className="h-3.5 w-16" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row Skeletons */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                {/* Revenue Chart Skeleton */}
                <div className="xl:col-span-2 bg-card border border-border/80 rounded-xl p-5 md:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-56" />
                        </div>
                        <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-56 w-full rounded-xl" />
                </div>

                {/* Status Breakdown Chart Skeleton */}
                <div className="bg-card border border-border/80 rounded-xl p-5 md:p-6 space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-56 w-full rounded-xl" />
                </div>
            </div>

            {/* Table and System Health Row Skeletons */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                {/* Recent Orders Table Skeleton */}
                <div className="xl:col-span-2 bg-card border border-border/80 rounded-xl p-5 md:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-3 w-44" />
                        </div>
                        <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="space-y-3 pt-2">
                        {[1, 2, 3, 4, 5].map((row) => (
                            <div key={row} className="flex items-center justify-between py-2 border-b border-border/40">
                                <div className="space-y-1.5">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-3 w-36" />
                                </div>
                                <Skeleton className="h-5 w-16 rounded-full" />
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-6 w-6 rounded-lg" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* System Health Skeleton */}
                <div className="bg-card border border-border/80 rounded-xl p-5 md:p-6 space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-48" />
                    </div>
                    <div className="space-y-3 pt-2">
                        {[1, 2, 3, 4].map((item) => (
                            <div key={item} className="p-3.5 rounded-xl border border-border/60 flex items-center justify-between">
                                <div className="space-y-1.5">
                                    <Skeleton className="h-3.5 w-28" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                                <Skeleton className="h-5 w-20 rounded-full" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function OrdersSkeleton() {
    return (
        <div className="w-full space-y-5 animate-in fade-in duration-300">
            {/* Search & Filter Header Bar Skeleton */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                <Skeleton className="h-10 w-full md:w-96 rounded-xl" />
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Skeleton className="h-10 w-44 rounded-xl" />
                    <Skeleton className="h-10 w-36 rounded-xl" />
                    <Skeleton className="h-10 w-36 rounded-xl" />
                </div>
            </div>

            {/* Status Pills Bar Skeleton */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-8 w-24 rounded-lg shrink-0" />
                ))}
            </div>

            {/* Orders Table Card Skeleton */}
            <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border/60 flex items-center justify-between">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-28" />
                </div>
                <div className="p-4 space-y-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
                        <div key={row} className="flex items-center justify-between py-2 border-b border-border/40 gap-4">
                            <div className="space-y-1.5 w-1/5">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                            <div className="space-y-1.5 w-1/4">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-28" />
                            </div>
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-6 w-24 rounded-full" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-8 w-8 rounded-lg" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
    return (
        <div className="w-full bg-card border border-border/80 rounded-xl overflow-hidden shadow-sm animate-in fade-in duration-300">
            <div className="p-4 border-b border-border/60 flex items-center justify-between">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-24" />
            </div>
            <div className="p-4 space-y-4">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 border-b border-border/40 gap-4">
                        <div className="space-y-1.5 w-1/4">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-20 rounded-xl" />
                    </div>
                ))}
            </div>
        </div>
    );
}
export function OrderDetailSkeleton() {
    return (
        <div className="w-full space-y-6 animate-in fade-in duration-300">
            {/* Top Action Bar Skeleton */}
            <div className="flex items-center justify-between">
                <Skeleton className="h-9 w-40 rounded-xl" />
                <Skeleton className="h-7 w-28 rounded-full" />
            </div>

            {/* Highlights Grid Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-card border border-border/80 p-5 rounded-2xl space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-7 w-28" />
                    </div>
                ))}
            </div>

            {/* Gerber Card Skeleton */}
            <div className="bg-card border border-border/80 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Skeleton className="w-20 h-20 rounded-2xl shrink-0" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-44" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                </div>
                <div className="flex gap-3">
                    <Skeleton className="h-10 w-32 rounded-xl" />
                    <Skeleton className="h-10 w-36 rounded-xl" />
                </div>
            </div>

            {/* Customer & Technical Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card border border-border/80 rounded-2xl p-6 space-y-4">
                    <Skeleton className="h-4 w-36" />
                    <div className="space-y-3 pt-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex justify-between py-2 border-b border-border/40">
                                <Skeleton className="h-3 w-24" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-card border border-border/80 rounded-2xl p-6 space-y-4">
                    <Skeleton className="h-4 w-36" />
                    <div className="grid grid-cols-2 gap-3">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="p-3 bg-muted/30 rounded-xl space-y-1.5 border border-border/60">
                                <Skeleton className="h-2.5 w-16" />
                                <Skeleton className="h-3.5 w-24" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Status Change Skeleton */}
            <div className="bg-card border border-border/80 rounded-2xl p-6 space-y-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-10 w-full rounded-xl" />
            </div>
        </div>
    );
}

export function ClientDetailSkeleton() {
    return (
        <div className="w-full space-y-6 animate-in fade-in duration-300">
            {/* Action Bar / Back button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-24 rounded-xl" />
                    <Skeleton className="h-8 w-40 rounded-xl" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-28 rounded-xl" />
                    <Skeleton className="h-10 w-32 rounded-xl" />
                </div>
            </div>

            {/* Profile Overview Banner / Card */}
            <div className="bg-card border border-border/80 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="w-16 h-16 rounded-2xl shrink-0" />
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-36" />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-24 rounded-full" />
                    <Skeleton className="h-8 w-28 rounded-full" />
                </div>
            </div>

            {/* Metric Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-card border border-border/80 p-5 rounded-2xl flex items-center gap-4">
                        <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-6 w-24" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Contact & Company Details Card */}
                <div className="bg-card border border-border/80 rounded-2xl p-6 space-y-4">
                    <Skeleton className="h-5 w-36" />
                    <div className="space-y-3 pt-2">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="flex justify-between py-2 border-b border-border/40">
                                <Skeleton className="h-3.5 w-24" />
                                <Skeleton className="h-3.5 w-36" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Orders & Transactions Tabs Skeleton */}
                <div className="lg:col-span-2 bg-card border border-border/80 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-3 border-b border-border/60 pb-3">
                        <Skeleton className="h-9 w-28 rounded-lg" />
                        <Skeleton className="h-9 w-36 rounded-lg" />
                    </div>
                    <div className="space-y-3 pt-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center justify-between py-3 border-b border-border/40 gap-4">
                                <div className="space-y-1.5 w-1/3">
                                    <Skeleton className="h-4 w-28" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                                <Skeleton className="h-5 w-20 rounded-full" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

