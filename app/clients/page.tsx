"use client";

import { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { mockClients } from "@/lib/mock-data";
import { Search, ChevronRight } from "lucide-react";

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = mockClients.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.gstin.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

    return (
        <DashboardLayout title="Client Management" subtitle={`${mockClients.length} registered clients`}>
            <div className="space-y-5">
                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: "Total Clients", value: mockClients.length },
                        { label: "Active", value: mockClients.filter((c) => c.status === "Active").length },
                        { label: "Inactive", value: mockClients.filter((c) => c.status === "Inactive").length },
                        {
                            label: "Total Orders",
                            value: mockClients.reduce((s, c) => s + c.totalOrders, 0),
                        },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-card border border-border/80 rounded-xl p-4 text-center hover:shadow-md transition-shadow">
                            <p className="text-2xl font-extrabold text-foreground">{stat.value}</p>
                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-1">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="search"
                            placeholder="Search by name, email, or GSTIN..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border/80 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="sm:w-44 px-3.5 py-2.5 text-sm bg-card border border-border/80 rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium cursor-pointer"
                    >
                        <option value="All">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>

                {/* Table */}
                <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/60 bg-muted/40">
                                    {["Client", "GSTIN", "Orders", "Total Spent", "Joined", "Status", "Actions"].map((h) => (
                                        <th key={h} className="px-5 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-16 text-center text-muted-foreground text-sm font-medium">
                                            No clients match your search.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((client) => (
                                        <tr
                                            key={client.id}
                                            className="border-b border-border/40 hover:bg-muted/30 transition-colors duration-150"
                                        >
                                            <td className="px-5 py-4">
                                                <div>
                                                    <p className="font-semibold text-foreground">{client.name}</p>
                                                    <p className="text-xs text-muted-foreground font-medium mt-0.5">{client.email}</p>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 font-mono text-xs font-semibold text-muted-foreground whitespace-nowrap">{client.gstin}</td>
                                            <td className="px-5 py-4 text-foreground font-semibold whitespace-nowrap">{client.totalOrders}</td>
                                            <td className="px-5 py-4 font-bold text-foreground whitespace-nowrap">
                                                ₹{client.totalSpent.toLocaleString("en-IN")}
                                            </td>
                                            <td className="px-5 py-4 text-muted-foreground font-medium whitespace-nowrap">{client.joinedDate}</td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <span
                                                    className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold ${
                                                        client.status === "Active"
                                                            ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                                                            : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
                                                    }`}
                                                >
                                                    {client.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <Link
                                                    href={`/clients/${client.id}`}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all font-semibold"
                                                >
                                                    View Details <ChevronRight className="w-3.5 h-3.5" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
