"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Package, Users, ShoppingBag, Layers, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface SearchItem {
    id: string;
    title: string;
    subtitle: string;
    category: "Orders" | "Clients" | "Inventory" | "Pages";
    url: string;
    icon: any;
}

const mockSearchData: SearchItem[] = [
    { id: "o-1", title: "PCB-2025-021", subtitle: "Double Layer Rigid PCB - 50 Units", category: "Orders", url: "/orders", icon: ShoppingBag },
    { id: "o-2", title: "PCB-2025-019", subtitle: "Multilayer PCB Assembly", category: "Orders", url: "/orders", icon: ShoppingBag },
    { id: "o-3", title: "PCB-2025-015", subtitle: "Flex PCB - Prototype", category: "Orders", url: "/orders", icon: ShoppingBag },
    { id: "c-1", title: "TechCorp India Ltd", subtitle: "Premium Client • 14 Active Orders", category: "Clients", url: "/clients", icon: Users },
    { id: "c-2", title: "ElectroFab Solutions", subtitle: "Enterprise Client • Mumbai", category: "Clients", url: "/clients", icon: Users },
    { id: "i-1", title: "100nF 0402 Ceramic Capacitor", subtitle: "Stock: 4,500 pcs • Bin A-12", category: "Inventory", url: "/inventory", icon: Package },
    { id: "i-2", title: "FR4 Double Sided Substrate 1.6mm", subtitle: "Stock: 120 Sheets • Storage B", category: "Inventory", url: "/inventory", icon: Package },
    { id: "p-1", title: "Dashboard Overview", subtitle: "System metrics & summary", category: "Pages", url: "/dashboard", icon: Layers },
    { id: "p-2", title: "Pricing & Quotation Calculator", subtitle: "Configure layer & material rates", category: "Pages", url: "/pricing", icon: Layers },
    { id: "p-3", title: "Staff & Role Management", subtitle: "Admin permissions & staff list", category: "Pages", url: "/staff", icon: Layers },
];

export default function GlobalSearch() {
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [filteredResults, setFilteredResults] = useState<SearchItem[]>([]);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Debounce search calculation when query changes
    useEffect(() => {
        const trimmed = query.trim();

        // Auto close if text is empty
        if (!trimmed) {
            setIsOpen(false);
            setFilteredResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);

        const timer = setTimeout(() => {
            const results = mockSearchData.filter((item) =>
                item.title.toLowerCase().includes(trimmed.toLowerCase()) ||
                item.subtitle.toLowerCase().includes(trimmed.toLowerCase()) ||
                item.category.toLowerCase().includes(trimmed.toLowerCase())
            );

            setFilteredResults(results);
            setIsSearching(false);
            setIsOpen(true);
        }, 300); // 300ms debounce delay after typing

        return () => clearTimeout(timer);
    }, [query]);

    // Close dropdown on outside click or ESC key
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    const handleSelect = (url: string) => {
        setIsOpen(false);
        setQuery("");
        router.push(url);
    };

    return (
        <div ref={containerRef} className="relative w-64 sm:w-80 md:w-96 lg:w-[420px]">
            {/* Inline Header Search Input */}
            <div className={cn(
                "relative flex items-center w-full rounded-xl transition-all duration-200",
                "bg-white/5 border border-white/10 text-white shadow-sm",
                "focus-within:border-emerald-500/60 focus-within:ring-1 focus-within:ring-emerald-500/60 focus-within:bg-zinc-900/90"
            )}>
                <Search className="absolute left-3.5 w-4 h-4 text-zinc-400 pointer-events-none" />
                
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => { if (query.trim() && filteredResults.length > 0) setIsOpen(true); }}
                    placeholder="Search orders, clients, parts..."
                    className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-transparent text-white placeholder:text-zinc-500 focus:outline-none"
                />

                {isSearching ? (
                    <Loader2 className="absolute right-3 w-4 h-4 text-emerald-400 animate-spin" />
                ) : query ? (
                    <button
                        onClick={() => setQuery("")}
                        className="absolute right-3 p-0.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Clear search"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                ) : null}
            </div>

            {/* Seamless Results Dropdown */}
            {isOpen && (
                <div className={cn(
                    "absolute left-0 top-full mt-2 z-50 w-full rounded-2xl border border-white/10 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150",
                    "bg-zinc-900/95 backdrop-blur-xl"
                )}>
                    <div className="max-h-[360px] overflow-y-auto p-1.5 space-y-1">
                        {filteredResults.length === 0 ? (
                            <div className="py-8 text-center text-zinc-500 text-xs">
                                No matching results found for &quot;<span className="text-zinc-300">{query}</span>&quot;
                            </div>
                        ) : (
                            filteredResults.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => handleSelect(item.url)}
                                        className="group flex items-center justify-between px-3 py-2 rounded-xl hover:bg-emerald-500/10 hover:border-emerald-500/20 border border-transparent transition-all cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="p-1.5 rounded-lg bg-zinc-800/80 group-hover:bg-emerald-500/20 text-zinc-400 group-hover:text-emerald-400 transition-colors shrink-0">
                                                <Icon className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="truncate">
                                                <p className="text-xs font-500 text-zinc-200 group-hover:text-white truncate">
                                                    {item.title}
                                                </p>
                                                <p className="text-[11px] text-zinc-500 group-hover:text-zinc-400 truncate">
                                                    {item.subtitle}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition-colors">
                                                {item.category}
                                            </span>
                                            <ArrowRight className="w-3.5 h-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 group-hover:text-emerald-400 transition-all -translate-x-1 group-hover:translate-x-0" />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="px-3.5 py-2 border-t border-white/10 bg-zinc-950/40 flex items-center justify-between text-[10px] text-zinc-500">
                        <span>Showing {filteredResults.length} matches</span>
                        <span>Click item to navigate</span>
                    </div>
                </div>
            )}
        </div>
    );
}

