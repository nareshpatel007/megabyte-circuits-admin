"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Eye, EyeOff, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

function MaskedInput({
  label,
  placeholder,
  defaultValue,
}: {
  label: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  const [show, setShow] = useState(false);
  const [val, setVal] = useState(defaultValue || "");
  return (
    <div>
      <label className="block text-xs font-medium text-foreground mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-10 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function PlainInput({
  label,
  placeholder,
  defaultValue,
  type = "text",
}: {
  label: string;
  placeholder?: string;
  defaultValue?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-foreground mb-1">{label}</label>
      <input
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}

function ToggleRow({ label, description, defaultOn = false }: { label: string; description: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-start justify-between py-3 border-b border-border/50 last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => setOn(!on)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ml-4 ${
          on ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            on ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function SettingsSection({
  title,
  children,
  onSave,
}: {
  title: string;
  children: React.ReactNode;
  onSave: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <button
          onClick={onSave}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 text-xs font-medium rounded-lg hover:bg-primary/20 transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          Save
        </button>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <DashboardLayout title="App & Integration Settings" subtitle="Manage API keys and service configurations">
      <div className="max-w-3xl space-y-5">
        {/* Warning Banner */}
        <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-xs font-medium">
            API keys are sensitive. Changes take effect immediately across all production services.
          </p>
        </div>

        {/* Razorpay */}
        <SettingsSection
          title="Razorpay / Payment Gateway"
          onSave={() => toast.success("Razorpay settings saved.")}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MaskedInput label="API Key ID" placeholder="rzp_live_..." defaultValue="rzp_live_xXxXxXxX" />
            <MaskedInput label="API Key Secret" placeholder="Your API secret" defaultValue="secret_key_here" />
            <MaskedInput label="Webhook Secret" placeholder="Webhook signing secret" defaultValue="wh_secret_here" />
            <PlainInput label="Webhook URL" defaultValue="https://api.pcbmfg.in/webhooks/razorpay" />
          </div>
        </SettingsSection>

        {/* JLC PCB */}
        <SettingsSection
          title="JLC PCB Developer API"
          onSave={() => toast.success("JLC PCB settings saved.")}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MaskedInput label="Developer API Key" placeholder="jlcpcb_api_..." defaultValue="jlc_dev_apikey_prod" />
            <PlainInput label="Account Email" defaultValue="api@pcbmfg.in" type="email" />
            <PlainInput label="API Base URL" defaultValue="https://api.jlcpcb.com/v2" />
            <MaskedInput label="Client Secret" placeholder="OAuth client secret" defaultValue="oauth_secret_xxx" />
          </div>
        </SettingsSection>

        {/* SMTP */}
        <SettingsSection
          title="SMTP / Email Server"
          onSave={() => toast.success("SMTP settings saved.")}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PlainInput label="SMTP Host" defaultValue="smtp.sendgrid.net" />
            <PlainInput label="Port" defaultValue="587" type="number" />
            <PlainInput label="From Email" defaultValue="noreply@pcbmfg.in" type="email" />
            <MaskedInput label="SMTP Password" placeholder="SMTP password or API key" defaultValue="smtp_pass_here" />
          </div>
        </SettingsSection>

        {/* Stripe */}
        <SettingsSection
          title="Stripe (International Payments)"
          onSave={() => toast.success("Stripe settings saved.")}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MaskedInput label="Publishable Key" placeholder="pk_live_..." defaultValue="pk_live_xxxxxxxxxxxxxxxx" />
            <MaskedInput label="Secret Key" placeholder="sk_live_..." defaultValue="sk_live_xxxxxxxxxxxxxxxx" />
            <MaskedInput label="Webhook Signing Secret" placeholder="whsec_..." defaultValue="whsec_xxxxxxxxxx" />
            <PlainInput label="Webhook Endpoint" defaultValue="https://api.pcbmfg.in/webhooks/stripe" />
          </div>
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection
          title="Notification Settings"
          onSave={() => toast.success("Notification preferences saved.")}
        >
          <div>
            <ToggleRow
              label="Email Alerts"
              description="Receive email notifications for critical events"
              defaultOn
            />
            <ToggleRow
              label="New Order Notifications"
              description="Get notified when a new order is placed"
              defaultOn
            />
            <ToggleRow
              label="Low Stock Alerts"
              description="Alert when component inventory drops below threshold"
              defaultOn
            />
            <ToggleRow
              label="API Health Alerts"
              description="Notify when JLCPCB or payment API becomes unavailable"
              defaultOn
            />
            <ToggleRow
              label="Daily Summary Report"
              description="Receive a daily summary of orders and revenue"
            />
          </div>
        </SettingsSection>
      </div>
    </DashboardLayout>
  );
}
