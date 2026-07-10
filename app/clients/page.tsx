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
      <div className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Clients", value: mockClients.length },
            { label: "Active", value: mockClients.filter((c) => c.status === "Active").length },
            { label: "Inactive", value: mockClients.filter((c) => c.status === "Inactive").length },
            {
              label: "Total Orders",
              value: mockClients.reduce((s, c) => s + c.totalOrders, 0),
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
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
              className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="sm:w-40 px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/40">
                  {["Client", "GSTIN", "Orders", "Total Spent", "Joined", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                      No clients match your search.
                    </td>
                  </tr>
                ) : (
                  filtered.map((client) => (
                    <tr
                      key={client.id}
                      className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground">{client.name}</p>
                          <p className="text-xs text-muted-foreground">{client.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{client.gstin}</td>
                      <td className="px-4 py-3 text-foreground font-medium whitespace-nowrap">{client.totalOrders}</td>
                      <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                        ₹{client.totalSpent.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{client.joinedDate}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                            client.status === "Active"
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : "bg-red-500/20 text-red-400 border-red-500/30"
                          }`}
                        >
                          {client.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          href={`/clients/${client.id}`}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          View <ChevronRight className="w-3 h-3" />
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
