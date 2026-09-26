"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X, Check, Loader2, Layers } from "lucide-react";

export interface ComboOrderItem {
    id: number;
    order_number: string;
    customer_name?: string | null;
    status?: string;
}

interface ComboSelectProps {
    currentOrderId?: number | null;
    currentOrderNumber?: string | null;
    value: ComboOrderItem[];
    onChange: (items: ComboOrderItem[]) => void;
    placeholder?: string;
}

export function ComboSelect({
    currentOrderId,
    currentOrderNumber,
    value = [],
    onChange,
    placeholder = "Search and select combo orders..."
}: ComboSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState<ComboOrderItem[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Fetch matching orders from API
    useEffect(() => {
        if (!isOpen) return;

        let active = true;
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
                const params = new URLSearchParams();
                if (searchQuery.trim()) {
                    params.set("search", searchQuery.trim());
                }
                params.set("per_page", "25");

                const res = await fetch(`/api/admin/orders?${params.toString()}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const json = await res.json();
                if (active && (json.status || json.success) && Array.isArray(json.data)) {
                    const list: ComboOrderItem[] = json.data.map((o: any) => ({
                        id: o.id,
                        order_number: o.order_number || `M${o.id}`,
                        customer_name: o.customer_name || o.user?.name || o.user?.company_name || null,
                        status: o.status || "Pending"
                    }));
                    setOptions(list);
                }
            } catch (err) {
                console.error("Failed to fetch orders for combo selector:", err);
            } finally {
                if (active) setLoading(false);
            }
        }, 200);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [searchQuery, isOpen]);

    const handleToggle = (item: ComboOrderItem) => {
        // Exclude current order
        if (
            (currentOrderId && item.id === currentOrderId) ||
            (currentOrderNumber && item.order_number.toUpperCase() === currentOrderNumber.toUpperCase())
        ) {
            return;
        }

        const exists = value.some((v) => v.id === item.id || v.order_number.toUpperCase() === item.order_number.toUpperCase());
        if (exists) {
            onChange(value.filter((v) => v.id !== item.id && v.order_number.toUpperCase() !== item.order_number.toUpperCase()));
        } else {
            onChange([...value, item]);
        }
    };

    const handleRemove = (e: React.MouseEvent, item: ComboOrderItem) => {
        e.stopPropagation();
        onChange(value.filter((v) => v.id !== item.id && v.order_number.toUpperCase() !== item.order_number.toUpperCase()));
    };

    const isSelected = (item: ComboOrderItem) => {
        return value.some((v) => v.id === item.id || v.order_number.toUpperCase() === item.order_number.toUpperCase());
    };

    const isCurrent = (item: ComboOrderItem) => {
        return (
            (currentOrderId && item.id === currentOrderId) ||
            (currentOrderNumber && item.order_number.toUpperCase() === currentOrderNumber.toUpperCase())
        );
    };

    return (
        <div ref={containerRef} className="relative w-full">
            {/* Selected items tags & input trigger */}
            <div
                onClick={() => setIsOpen(true)}
                className="w-full min-h-[42px] px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl flex flex-wrap items-center gap-1.5 cursor-pointer shadow-xs focus-within:ring-2 focus-within:ring-blue-500"
            >
                {value.length > 0 ? (
                    value.map((item) => (
                        <span
                            key={item.id || item.order_number}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                        >
                            <Layers className="w-3 h-3 text-blue-500" />
                            {item.order_number}
                            <button
                                type="button"
                                onClick={(e) => handleRemove(e, item)}
                                className="hover:text-blue-900 dark:hover:text-white transition-colors p-0.5 rounded-full hover:bg-blue-200/50"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))
                ) : (
                    <span className="text-slate-400 dark:text-slate-500 font-normal">{placeholder}</span>
                )}
            </div>

            {/* Dropdown menu */}
            {isOpen && (
                <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden text-xs">
                    {/* Search box inside dropdown */}
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-850">
                        <Search className="w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by order # or customer..."
                            autoFocus
                            className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Options list */}
                    <div className="max-h-56 overflow-y-auto py-1">
                        {loading ? (
                            <div className="p-4 flex items-center justify-center gap-2 text-slate-400">
                                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                <span>Loading orders...</span>
                            </div>
                        ) : options.length === 0 ? (
                            <div className="p-4 text-center text-slate-400">No orders found.</div>
                        ) : (
                            options.map((item) => {
                                const selected = isSelected(item);
                                const current = isCurrent(item);

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => !current && handleToggle(item)}
                                        className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                                            current
                                                ? "opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-800"
                                                : selected
                                                ? "bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                                                : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                        }`}
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-bold flex items-center gap-1.5">
                                                {item.order_number}
                                                {current && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-normal">
                                                        Current Order
                                                    </span>
                                                )}
                                            </span>
                                            {item.customer_name && (
                                                <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                                                    {item.customer_name}
                                                </span>
                                            )}
                                        </div>

                                        {selected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 font-bold" />}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
