"use client";

import { use } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { mockClients, mockOrders } from "@/lib/mock-data";
import { ArrowLeft, Mail, Phone, MapPin, FileText, Download } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  Pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "In Review": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Sent to JLC": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Manufacturing: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Shipped: "bg-green-500/20 text-green-400 border-green-500/30",
  Cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const client = mockClients.find((c) => c.id === id);
  const orders = mockOrders.filter((o) => o.clientId === id);

  if (!client) {
    return (
      <DashboardLayout title="Client Not Found">
        <div className="text-center py-20 text-muted-foreground">
          <p>Client with ID <span className="font-mono text-primary">{id}</span> was not found.</p>
          <Link href="/clients" className="text-primary hover:underline text-sm mt-2 inline-block">
            Back to Clients
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const avgOrderValue = orders.length > 0
    ? Math.round(orders.reduce((s, o) => s + o.amount, 0) / orders.length)
    : 0;

  return (
    <DashboardLayout title={client.name} subtitle={`Client ID: ${client.id}`}>
      <div className="space-y-6 max-w-5xl">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Clients
        </Link>

        {/* Client Info + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Info Card */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-foreground">{client.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      client.status === "Active"
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : "bg-red-500/20 text-red-400 border-red-500/30"
                    }`}
                  >
                    {client.status}
                  </span>
                  <span className="text-xs text-muted-foreground">Joined {client.joinedDate}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Email</p>
                    <p className="text-sm text-foreground">{client.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Phone</p>
                    <p className="text-sm text-foreground">{client.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Address</p>
                    <p className="text-sm text-foreground">{client.address}</p>
                  </div>
                </div>
              </div>
              <div>
                <div className="bg-background border border-border rounded-lg p-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">GSTIN (Tax ID)</p>
                  <p className="text-sm font-mono font-semibold text-foreground">{client.gstin}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-3">
            {[
              { label: "Total Orders", value: client.totalOrders },
              { label: "Total Spent", value: `₹${client.totalSpent.toLocaleString("en-IN")}` },
              { label: "Avg Order Value", value: `₹${avgOrderValue.toLocaleString("en-IN")}` },
            ].map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold text-foreground mt-1">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Order History */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Order History</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{orders.length} orders from this client</p>
          </div>

          {orders.length === 0 ? (
            <div className="px-5 py-12 text-center text-muted-foreground text-sm">
              No orders found for this client.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background/40">
                    {["Order ID", "Date", "PCB Type", "Amount", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-primary whitespace-nowrap">{order.id}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{order.date}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{order.pcbType}</td>
                      <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                        ₹{order.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[order.status]}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toast.success(`Opening invoice for ${order.id}...`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs bg-background border border-border hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            Invoice
                          </button>
                          <button
                            onClick={() => toast.success(`Downloading PDF for ${order.id}...`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs bg-background border border-border hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Download className="w-3 h-3" />
                            PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
