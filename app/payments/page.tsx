"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Search, Download, CreditCard, ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, RefreshCw, CheckCircle2, Clock, AlertCircle, User, Mail, Phone, Copy, Check } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";

interface PaymentTransaction {
    id: number;
    user_id: number | null;
    transaction_number: string;
    razorpay_payment_id: string | null;
    razorpay_order_id: string | null;
    amount: number | string;
    currency: string;
    status: string;
    payment_method: string | null;
    user_name: string | null;
    user_email: string | null;
    user_mobile: string | null;
    payload: string | null;
    created_at: string;
}

interface PaymentResponse {
    status: boolean;
    data: PaymentTransaction[];
    meta: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
        total_completed_amount: number;
    };
}

const PAGE_SIZE = 10;

export default function PaymentsPage() {
    const [payments, setPayments] = useState<PaymentTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("success");
    const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [page, setPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [totalAmountSum, setTotalAmountSum] = useState(0);
    const [selectedPayment, setSelectedPayment] = useState<PaymentTransaction | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const fetchPayments = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("admin_token");
            const params = new URLSearchParams();
            params.append("page", page.toString());
            params.append("per_page", PAGE_SIZE.toString());
            if (statusFilter) params.append("status", statusFilter);
            if (paymentMethodFilter !== "all") params.append("payment_method", paymentMethodFilter);
            if (search) params.append("search", search);
            if (startDate) params.append("start_date", format(startDate, "yyyy-MM-dd"));
            if (endDate) params.append("end_date", format(endDate, "yyyy-MM-dd"));

            const res = await fetch(`/api/admin/payments?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (res.ok) {
                const data: PaymentResponse = await res.json();
                if (data.status) {
                    setPayments(data.data || []);
                    setTotalItems(data.meta?.total || 0);
                    setTotalPages(data.meta?.last_page || 1);
                    setTotalAmountSum(data.meta?.total_completed_amount || 0);
                } else {
                    toast.error("Failed to load payments");
                }
            } else {
                toast.error("Error connecting to payments server");
            }
        } catch (error) {
            console.error("Fetch payments error:", error);
            toast.error("Error loading payments");
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, paymentMethodFilter, search, startDate, endDate]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const handleCopy = (text: string, fieldName: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        toast.success(`Copied ${fieldName} to clipboard`);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleExportCSV = () => {
        if (payments.length === 0) {
            toast.error("No payment data to export");
            return;
        }

        const headers = ["Txn Number", "Payment ID", "Order ID", "Customer", "Email", "Mobile", "Amount (INR)", "Method", "Status", "Date"];
        const rows = payments.map((p) => [
            p.transaction_number || "-",
            p.razorpay_payment_id || "-",
            p.razorpay_order_id || "-",
            p.user_name || "Guest Customer",
            p.user_email || "-",
            p.user_mobile || "-",
            parseFloat(String(p.amount || 0)).toFixed(2),
            p.payment_method || "Razorpay",
            p.status,
            p.created_at ? format(parseISO(p.created_at), "yyyy-MM-dd HH:mm") : "-"
        ]);

        const csvContent = [headers.join(","), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Completed_Payments_${format(new Date(), "yyyyMMdd")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Payments exported successfully");
    };

    return (
        <DashboardLayout
            title="Completed Payments"
            subtitle="View and manage all successfully processed transactions across the system"
            action={
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchPayments}
                        className="p-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-zinc-300 hover:text-white transition-all"
                        title="Refresh data"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-600 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 transition-all shadow-lg shadow-emerald-500/20"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Export CSV
                    </button>
                </div>
            }
        >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Completed Payments</p>
                        <h3 className="text-2xl font-black text-foreground mt-0.5">{totalItems}</h3>
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                        <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Total Received</p>
                        <h3 className="text-2xl font-black text-emerald-500 mt-0.5">
                            ₹{totalAmountSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                    </div>
                </div>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs mb-6 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Search Txn #, Payment ID, Customer name or email..."
                            className="w-full pl-10 pr-4 py-2 rounded-xl bg-card border border-border/80 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium transition-all shadow-xs"
                        />
                        {search && (
                            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="px-3 py-2 rounded-xl bg-card border border-border/80 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold cursor-pointer shadow-xs"
                    >
                        <option value="success">Completed (Success)</option>
                        <option value="all">All Statuses</option>
                        <option value="initiated">Initiated</option>
                        <option value="failed">Failed</option>
                    </select>

                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border/80 text-xs text-foreground hover:bg-muted font-semibold transition-all shadow-xs cursor-pointer">
                                    <CalendarIcon className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>{startDate ? format(startDate, "MMM dd, yyyy") : "Start Date"}</span>
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 z-50 bg-card border border-border/80 shadow-2xl" align="start">
                                <Calendar mode="single" selected={startDate} onSelect={(d) => { setStartDate(d); setPage(1); }} />
                            </PopoverContent>
                        </Popover>

                        <span className="text-xs text-muted-foreground font-medium">to</span>

                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border/80 text-xs text-foreground hover:bg-muted font-semibold transition-all shadow-xs cursor-pointer">
                                    <CalendarIcon className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>{endDate ? format(endDate, "MMM dd, yyyy") : "End Date"}</span>
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 z-50 bg-card border border-border/80 shadow-2xl" align="start">
                                <Calendar mode="single" selected={endDate} onSelect={(d) => { setEndDate(d); setPage(1); }} />
                            </PopoverContent>
                        </Popover>

                        {(startDate || endDate) && (
                            <button
                                onClick={() => { setStartDate(undefined); setEndDate(undefined); setPage(1); }}
                                className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                title="Clear dates"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="rounded-xl bg-card border border-border/80 shadow-xs overflow-hidden">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3">
                        <LoadingSpinner className="w-8 h-8 text-emerald-500" />
                        <p className="text-xs text-muted-foreground">Loading completed payments...</p>
                    </div>
                ) : payments.length === 0 ? (
                    <div className="py-20 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">No completed payments found</p>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                            Try adjusting your filters or date range to find specific payment transactions.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border/80 bg-muted/80 text-[11px] font-extrabold text-foreground uppercase tracking-wider">
                                    <th className="py-3.5 px-4">Customer</th>
                                    <th className="py-3.5 px-4">Razorpay Payment ID</th>
                                    <th className="py-3.5 px-4">Amount</th>
                                    <th className="py-3.5 px-4">Status</th>
                                    <th className="py-3.5 px-4">Date & Time</th>
                                    <th className="py-3.5 px-4 text-right">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40 text-xs">
                                {payments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-muted/20 transition-colors group">
                                        <td className="py-3.5 px-4">
                                            <div>
                                                <p className="font-semibold text-foreground">{payment.user_name || "Customer"}</p>
                                                <p className="text-[11px] text-muted-foreground">{payment.user_email || "-"}</p>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 font-mono text-foreground font-semibold">
                                            {payment.razorpay_payment_id ? (
                                                <div className="flex items-center gap-1.5">
                                                    <span>{payment.razorpay_payment_id}</span>
                                                    <button
                                                        onClick={() => handleCopy(payment.razorpay_payment_id!, `Payment ID ${payment.id}`)}
                                                        className="text-muted-foreground hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="Copy Payment ID"
                                                    >
                                                        {copiedField === `Payment ID ${payment.id}` ? (
                                                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                        ) : (
                                                            <Copy className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 font-bold text-foreground">
                                            ₹{parseFloat(String(payment.amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            {payment.status === "success" || payment.status === "completed" ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Completed
                                                </span>
                                            ) : payment.status === "initiated" ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                    <Clock className="w-3 h-3" />
                                                    Initiated
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                                                    <AlertCircle className="w-3 h-3" />
                                                    {payment.status}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-muted-foreground text-[11px] font-medium">
                                            {payment.created_at ? format(parseISO(payment.created_at), "MMM dd, yyyy • hh:mm a") : "-"}
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <button
                                                onClick={() => setSelectedPayment(payment)}
                                                className="px-3 py-1.5 rounded-xl border border-border/80 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all cursor-pointer"
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && payments.length > 0 && (
                    <div className="p-4 border-t border-border/60 flex items-center justify-between gap-4 flex-wrap bg-card text-xs text-muted-foreground font-medium">
                        <p>
                            Showing <strong className="text-foreground">{((page - 1) * PAGE_SIZE) + 1}</strong> to{" "}
                            <strong className="text-foreground">{Math.min(page * PAGE_SIZE, totalItems)}</strong> of{" "}
                            <strong className="text-foreground">{totalItems}</strong> transactions
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                                disabled={page === 1}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold cursor-pointer"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Previous
                            </button>
                            <span className="font-extrabold text-foreground px-2">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                                disabled={page >= totalPages}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold cursor-pointer"
                            >
                                Next
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {selectedPayment && (
                <Dialog.Root open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
                    <Dialog.Portal>
                        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 animate-in fade-in duration-200" />
                        <Dialog.Content className="fixed left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] w-full max-w-lg p-6 rounded-2xl bg-card border border-white/10 shadow-2xl z-50 space-y-5 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                <div>
                                    <Dialog.Title className="text-lg font-bold text-foreground">
                                        Payment Transaction Details
                                    </Dialog.Title>
                                    <p className="text-xs text-emerald-400 font-mono mt-0.5">{selectedPayment.transaction_number}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedPayment(null)}
                                    className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-4 text-xs">
                                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-emerald-300 font-medium">Total Paid Amount</p>
                                        <h3 className="text-2xl font-bold text-emerald-400 mt-0.5">
                                            ₹{parseFloat(String(selectedPayment.amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </h3>
                                    </div>
                                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                        Completed
                                    </span>
                                </div>

                                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer Details</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-foreground font-medium">
                                        <div className="flex items-center gap-2">
                                            <User className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                            <span className="truncate">{selectedPayment.user_name || "Guest Customer"}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                            <span className="truncate">{selectedPayment.user_email || "N/A"}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                            <span>{selectedPayment.user_mobile || "N/A"}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-2.5">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gateway Identifiers</p>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Razorpay Payment ID:</span>
                                            <div className="flex items-center gap-1.5 font-mono text-foreground font-medium">
                                                <span>{selectedPayment.razorpay_payment_id || "-"}</span>
                                                {selectedPayment.razorpay_payment_id && (
                                                    <button onClick={() => handleCopy(selectedPayment.razorpay_payment_id!, "Payment ID")} className="text-muted-foreground hover:text-emerald-500 cursor-pointer">
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Razorpay Order ID:</span>
                                            <div className="flex items-center gap-1.5 font-mono text-foreground font-medium">
                                                <span>{selectedPayment.razorpay_order_id || "-"}</span>
                                                {selectedPayment.razorpay_order_id && (
                                                    <button onClick={() => handleCopy(selectedPayment.razorpay_order_id!, "Order ID")} className="text-muted-foreground hover:text-emerald-500 cursor-pointer">
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Transaction Date:</span>
                                            <span className="text-foreground font-medium">
                                                {selectedPayment.created_at ? format(parseISO(selectedPayment.created_at), "MMMM dd, yyyy • hh:mm:ss a") : "-"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end">
                                <button
                                    onClick={() => setSelectedPayment(null)}
                                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-xl transition-all cursor-pointer border border-border/80"
                                >
                                    Close
                                </button>
                            </div>
                        </Dialog.Content>
                    </Dialog.Portal>
                </Dialog.Root>
            )}
        </DashboardLayout>
    );
}
