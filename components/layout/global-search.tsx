"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Package, Users, ShoppingBag, Layers, ArrowRight, Loader2, CreditCard, FileArchive } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface SearchItem {
    id: string;
    title: string;
    subtitle: string;
    category: "Orders" | "Payments" | "Clients" | "Inventory" | "Pages" | "Gerber Files";
    url: string;
    icon: any;
}

const STATIC_PAGES: SearchItem[] = [
    { id: "p-1", title: "Orders Management", subtitle: "View and manage PCB orders pipeline", category: "Pages", url: "/orders", icon: ShoppingBag },
    { id: "p-2", title: "New PCB Order", subtitle: "Create custom order with Gerber file analysis", category: "Pages", url: "/orders/create", icon: ShoppingBag },
    { id: "p-3", title: "Clients Directory", subtitle: "Manage registered client accounts", category: "Pages", url: "/clients", icon: Users },
    { id: "p-4", title: "Inventory & Stock", subtitle: "Component stock & PCB substrates", category: "Pages", url: "/inventory", icon: Package },
    { id: "p-5", title: "Dashboard Overview", subtitle: "System metrics & summary statistics", category: "Pages", url: "/dashboard", icon: Layers },
    { id: "p-6", title: "Pricing & Calculator", subtitle: "Layer, material & surface finish rates", category: "Pages", url: "/pricing", icon: Layers },
    { id: "p-7", title: "Staff & Permissions", subtitle: "Manage admin users & role access", category: "Pages", url: "/staff", icon: Users },
];

export default function GlobalSearch() {
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [filteredResults, setFilteredResults] = useState<SearchItem[]>([]);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Helper function to extract meta values from order objects
    const getMetaVal = (order: any, key: string) => {
        if (!order || !order.metas || !Array.isArray(order.metas)) return "";
        const found = order.metas.find((m: any) => m && m.meta_key && m.meta_key.toLowerCase() === key.toLowerCase());
        return found ? (found.meta_value || "") : "";
    };

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

        const timer = setTimeout(async () => {
            try {
                const token = localStorage.getItem("admin_token");
                const headers = { Authorization: `Bearer ${token}` };
                const q = encodeURIComponent(trimmed);
                const queryLower = trimmed.toLowerCase();

                // Fetch matching orders, clients, inventory, gerber files, and payments in parallel
                const [ordersRes, usersRes, invRes, gerberRes, paymentsRes] = await Promise.all([
                    fetch(`/api/admin/orders?search=${q}&q=${q}`, { headers }).catch(() => null),
                    fetch(`/api/admin/users?search=${q}&q=${q}`, { headers }).catch(() => null),
                    fetch(`/api/admin/inventory?search=${q}&q=${q}`, { headers }).catch(() => null),
                    fetch(`/api/admin/gerber-files?search=${q}&q=${q}`, { headers }).catch(() => null),
                    fetch(`/api/admin/payments?search=${q}&q=${q}&status=all`, { headers }).catch(() => null),
                ]);

                const results: SearchItem[] = [];

                // 1. Process Orders (with strict client-side field matching)
                if (ordersRes && ordersRes.ok) {
                    const ordersData = await ordersRes.json();
                    const rawOrders = ordersData.data || ordersData.orders || [];
                    rawOrders.forEach((o: any) => {
                        const orderNum = (o.order_number || o.id || "").toString();
                        const boardName = (o.board_name || "").toString();
                        const email = (o.user_email || "").toString();
                        const mobile = (o.user_mobile || "").toString();
                        const customer = (o.customer_name || "").toString();

                        const gerberName = getMetaVal(o, 'gerber_file_name') || getMetaVal(o, 'gerber_name') || getMetaVal(o, 'file_name') || getMetaVal(o, 'gerber_file');
                        const gerberUrl = getMetaVal(o, 'gerber_file_url') || getMetaVal(o, 'gerber_url') || getMetaVal(o, 'gerber_path');
                        const paymentId = getMetaVal(o, 'payment_id') || getMetaVal(o, 'razorpay_payment_id') || getMetaVal(o, 'transaction_id') || (o.payment_id || "");
                        const paymentStatus = getMetaVal(o, 'payment_status') || (o.payment_status || "");
                        const paymentMode = getMetaVal(o, 'payment_mode') || getMetaVal(o, 'payment_method') || (o.payment_mode || "");
                        const status = (o.status || "").toString();

                        // Strict matching check across exact fields
                        const matchesField =
                            orderNum.toLowerCase().includes(queryLower) ||
                            boardName.toLowerCase().includes(queryLower) ||
                            email.toLowerCase().includes(queryLower) ||
                            mobile.toLowerCase().includes(queryLower) ||
                            customer.toLowerCase().includes(queryLower) ||
                            gerberName.toLowerCase().includes(queryLower) ||
                            gerberUrl.toLowerCase().includes(queryLower) ||
                            paymentId.toLowerCase().includes(queryLower) ||
                            paymentStatus.toLowerCase().includes(queryLower) ||
                            paymentMode.toLowerCase().includes(queryLower) ||
                            status.toLowerCase().includes(queryLower);

                        if (matchesField) {
                            let subtitleParts = [`Status: ${status || 'Pending'}`];
                            if (customer || email) subtitleParts.push(customer || email);
                            if (mobile) subtitleParts.push(mobile);
                            if (gerberName) subtitleParts.push(`Gerber: ${gerberName}`);
                            if (paymentId) subtitleParts.push(`Pay ID: ${paymentId}`);

                            results.push({
                                id: `order-${o.id}`,
                                title: `#${orderNum} · ${boardName || 'PCB Order'}`,
                                subtitle: subtitleParts.join(" • "),
                                category: "Orders",
                                url: `/orders/${orderNum}`,
                                icon: paymentId ? CreditCard : gerberName ? FileArchive : ShoppingBag
                            });
                        }
                    });
                }

                // 2. Process Gerber Files (specifically standalone / unattached files not linked to orders)
                if (gerberRes && gerberRes.ok) {
                    const gerberData = await gerberRes.json();
                    const rawGerbers = gerberData.data || gerberData.files || [];
                    rawGerbers.forEach((g: any) => {
                        const originalName = (g.original_name || g.file_name || "").toString();
                        const fileName = (g.file_name || "").toString();
                        const clientName = (g.client_name || g.client_email || "").toString();

                        const matchesField =
                            originalName.toLowerCase().includes(queryLower) ||
                            fileName.toLowerCase().includes(queryLower);

                        // If file matches search & is not attached to an order (or as standalone item)
                        if (matchesField && !g.order_id && !g.order_number) {
                            let subtitleParts = ["Standalone Gerber File"];
                            if (clientName) subtitleParts.push(`Uploaded by: ${clientName}`);
                            if (g.file_size) subtitleParts.push(g.file_size);

                            results.push({
                                id: `gerber-${g.id}`,
                                title: originalName || fileName || "Gerber Archive",
                                subtitle: subtitleParts.join(" • "),
                                category: "Gerber Files",
                                url: `/gerber-files?search=${encodeURIComponent(originalName || fileName)}`,
                                icon: FileArchive
                            });
                        }
                    });
                }

                // 3. Process Clients (with strict field matching)
                if (usersRes && usersRes.ok) {
                    const usersData = await usersRes.json();
                    const rawUsers = usersData.data || usersData.users || [];
                    rawUsers.forEach((c: any) => {
                        const fullName = (c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || "").toString();
                        const email = (c.email || "").toString();
                        const phone = (c.phone_number || "").toString();
                        const company = (c.company_name || "").toString();

                        const matchesField =
                            fullName.toLowerCase().includes(queryLower) ||
                            email.toLowerCase().includes(queryLower) ||
                            phone.toLowerCase().includes(queryLower) ||
                            company.toLowerCase().includes(queryLower);

                        if (matchesField) {
                            let subtitleParts = [email || "No email"];
                            if (phone) subtitleParts.push(phone);
                            if (company) subtitleParts.push(company);

                            results.push({
                                id: `client-${c.id}`,
                                title: fullName || "Client Account",
                                subtitle: subtitleParts.join(" • "),
                                category: "Clients",
                                url: `/clients/${c.id}`,
                                icon: Users
                            });
                        }
                    });
                }

                // 4. Process Inventory (with strict field matching)
                if (invRes && invRes.ok) {
                    const invData = await invRes.json();
                    const rawInv = invData.data || invData.items || [];
                    rawInv.forEach((item: any) => {
                        const itemName = (item.name || item.item_name || "").toString();
                        const category = (item.category || "").toString();
                        const sku = (item.sku || item.part_number || "").toString();
                        const location = (item.storage_location || item.bin || "").toString();

                        const matchesField =
                            itemName.toLowerCase().includes(queryLower) ||
                            category.toLowerCase().includes(queryLower) ||
                            sku.toLowerCase().includes(queryLower) ||
                            location.toLowerCase().includes(queryLower);

                        if (matchesField) {
                            const quantity = item.quantity ?? item.stock ?? "N/A";
                            results.push({
                                id: `inventory-${item.id}`,
                                title: itemName || "Inventory Item",
                                subtitle: `Stock: ${quantity} pcs • Category: ${category}`,
                                category: "Inventory",
                                url: `/inventory`,
                                icon: Package
                            });
                        }
                    });
                }

                // 5. Process Payment Transactions
                if (paymentsRes && paymentsRes.ok) {
                    const paymentsData = await paymentsRes.json();
                    const rawPayments = paymentsData.data || [];
                    rawPayments.forEach((p: any) => {
                        const razorpayId = (p.razorpay_payment_id || "").toString();
                        const txnNum = (p.transaction_number || "").toString();
                        const razorpayOrder = (p.razorpay_order_id || "").toString();
                        const customerName = (p.user_name || "").toString();
                        const customerEmail = (p.user_email || "").toString();
                        const orderNum = (p.order_number || p.order_id || "").toString();
                        const amount = parseFloat(String(p.amount || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 });
                        const status = (p.status || "").toString();

                        const matchesField =
                            razorpayId.toLowerCase().includes(queryLower) ||
                            txnNum.toLowerCase().includes(queryLower) ||
                            razorpayOrder.toLowerCase().includes(queryLower) ||
                            customerName.toLowerCase().includes(queryLower) ||
                            customerEmail.toLowerCase().includes(queryLower) ||
                            orderNum.toLowerCase().includes(queryLower);

                        if (matchesField) {
                            let subtitleParts = [`₹${amount}`, `Status: ${status}`];
                            if (customerName || customerEmail) subtitleParts.push(customerName || customerEmail);
                            if (orderNum) subtitleParts.push(`Order #${orderNum}`);

                            const displayId = razorpayId || txnNum || `#${p.id}`;

                            results.push({
                                id: `payment-${p.id}`,
                                title: `Payment: ${displayId}`,
                                subtitle: subtitleParts.join(" • "),
                                category: "Payments",
                                url: `/payments?search=${encodeURIComponent(displayId)}`,
                                icon: CreditCard
                            });
                        }
                    });
                }

                // 6. Process Static Pages match
                STATIC_PAGES.forEach((page) => {
                    if (
                        page.title.toLowerCase().includes(queryLower) ||
                        page.subtitle.toLowerCase().includes(queryLower)
                    ) {
                        results.push(page);
                    }
                });

                // Deduplicate results based on category + title + url
                const seenKeys = new Set<string>();
                const uniqueResults = results.filter((item) => {
                    const key = `${item.category}:${item.title.toLowerCase()}:${item.url}`;
                    if (seenKeys.has(key)) return false;
                    seenKeys.add(key);
                    return true;
                });

                setFilteredResults(uniqueResults);
                setIsOpen(true);
            } catch (err) {
                console.error("Global search error:", err);
            } finally {
                setIsSearching(false);
            }
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
                    placeholder="Search order #, client name/email/phone, gerber, inventory..."
                    className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-transparent text-white placeholder:text-zinc-500 focus:outline-none"
                />

                {isSearching ? (
                    <Loader2 className="absolute right-3 w-4 h-4 text-emerald-400 animate-spin" />
                ) : query ? (
                    <button
                        onClick={() => { setQuery(""); setIsOpen(false); }}
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
                    <div className="max-h-[380px] overflow-y-auto p-1.5 space-y-1">
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
                                                <p className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                                                    {item.title}
                                                </p>
                                                <p className="text-[11px] text-zinc-400 group-hover:text-zinc-300 truncate">
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

