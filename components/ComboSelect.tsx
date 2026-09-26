"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X, Check, Loader2, Layers, ChevronDown } from "lucide-react";

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
    placeholder = "Select combo orders..."
}: ComboSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState<ComboOrderItem[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside or pressing Escape
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
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
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full min-h-[40px] px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 shadow-xs flex items-center justify-between hover:border-slate-400 transition-all focus:outline-none ${
                    isOpen ? "ring-2 ring-purple-500/20 border-purple-500 shadow-sm" : ""
                }`}
            >
                <div className="flex flex-wrap items-center gap-1.5 max-w-[calc(100%-24px)]">
                    {value.length > 0 ? (
                        value.map((item) => (
                            <span
                                key={item.id || item.order_number}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs"
                            >
                                <Layers className="w-3 h-3 text-purple-500 shrink-0" />
                                <span className="font-mono">{item.order_number}</span>
                                <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => handleRemove(e, item)}
                                    className="hover:text-purple-900 transition-colors p-0.5 rounded-md hover:bg-purple-200/60 ml-0.5 cursor-pointer"
                                >
                                    <X className="w-3 h-3" />
                                </span>
                            </span>
                        ))
                    ) : (
                        <span className="text-slate-400 font-normal truncate">{placeholder}</span>
                    )}
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ml-1 ${isOpen ? "rotate-180 text-purple-600" : ""}`} />
            </button>

            {/* Dropdown menu */}
            {isOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200/90 rounded-xl shadow-2xl overflow-hidden text-xs max-w-full">
                    {/* Search box inside dropdown */}
                    <div className="p-2.5 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
                        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by order # or customer..."
                            autoFocus
                            className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none font-medium"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/50 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Options list */}
                    <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
                        {loading ? (
                            <div className="p-4 flex items-center justify-center gap-2 text-slate-400 italic">
                                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                                <span>Searching orders...</span>
                            </div>
                        ) : options.length === 0 ? (
                            <div className="p-4 text-center text-slate-400 italic">No matching orders found.</div>
                        ) : (
                            options.map((item) => {
                                const selected = isSelected(item);
                                const current = isCurrent(item);

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => !current && handleToggle(item)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                                            current
                                                ? "opacity-50 cursor-not-allowed bg-slate-50 text-slate-400"
                                                : selected
                                                ? "bg-purple-50 text-purple-900 font-bold border border-purple-100"
                                                : "hover:bg-slate-100 text-slate-800 font-medium"
                                        }`}
                                    >
                                        <div className="min-w-0 pr-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-900 font-mono">{item.order_number}</span>
                                                {current && (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-normal">
                                                        Current Order
                                                    </span>
                                                )}
                                                {item.status && !current && (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-normal">
                                                        {item.status}
                                                    </span>
                                                )}
                                            </div>
                                            {item.customer_name && (
                                                <p className="text-[11px] text-slate-500 font-normal truncate mt-0.5 max-w-[220px]">
                                                    {item.customer_name}
                                                </p>
                                            )}
                                        </div>

                                        {selected && (
                                            <div className="p-1 rounded-full bg-purple-100 text-purple-700 shrink-0 ml-2">
                                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                            </div>
                                        )}
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
