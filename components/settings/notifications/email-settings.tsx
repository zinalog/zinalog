"use client";

import { Mail, Send, Server, XCircle } from "lucide-react";
import {
  Field,
  PasswordInput,
  SaveBar,
  SectionHeader,
  TestButton,
} from "../shared";
import type { AllSettings, NotifChannel } from "../types";

export default function EmailSettings({
  settings,
  set,
  saveNotifications,
  savingNotif,
  savedNotif,
  testStatus,
  testing,
  sendTest,
}: {
  settings: AllSettings;
  set: <K extends keyof AllSettings>(key: K, val: AllSettings[K]) => void;
  saveNotifications: () => void;
  savingNotif: boolean;
  savedNotif: boolean;
  testStatus: { ok: boolean; msg: string } | null;
  testing: NotifChannel | null;
  sendTest: (channel: NotifChannel) => void;
}) {
  return (
    <div className="bg-(--bg-card) border border-(--border) rounded-[10px] px-6 py-5.5">
      <SectionHeader
        icon={<Mail size={15} />}
        title="Email Alerts"
        description="Send alert emails via SMTP or Resend when log thresholds are exceeded."
      />

      <div className="grid grid-cols-3 gap-2.5">
        {(["disabled", "smtp", "resend"] as const).map((p) => {
          const active = settings.email_provider === p;
          return (
            <button
              key={p}
              onClick={() => set("email_provider", p)}
              className={`px-2.5 py-3 rounded-lg text-[13px] cursor-pointer border flex flex-col items-center gap-2 transition-all duration-150 ${
                active
                  ? "font-semibold border-(--accent) bg-[rgba(88,166,255,0.08)] text-(--accent)"
                  : "font-normal border-(--border) bg-(--bg-surface) text-(--text-muted)"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-md flex items-center justify-center ${
                  active
                    ? "bg-[rgba(88,166,255,0.15)]"
                    : "bg-[rgba(255,255,255,0.04)]"
                }`}
              >
                {p === "disabled" ? (
                  <XCircle size={14} />
                ) : p === "smtp" ? (
                  <Server size={14} />
                ) : (
                  <Send size={14} />
                )}
              </div>
              {p === "disabled" ? "Disabled" : p === "smtp" ? "SMTP" : "Resend"}
            </button>
          );
        })}
      </div>

      {settings.email_provider !== "disabled" && (
        <div className="flex flex-col gap-3.5">
          <div className="h-px bg-(--border)" />
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="From address" required>
              <input
                type="email"
                value={settings.email_from}
                onChange={(e) => set("email_from", e.target.value)}
                className="w-full bg-(--bg-surface) border border-(--border) rounded-lg px-3 py-2.25 text-[13px] text-foreground outline-none box-border transition-colors"
                placeholder="alerts@yourapp.com"
              />
            </Field>
            <Field label="Recipient" required>
              <input
                type="email"
                value={settings.email_to}
                onChange={(e) => set("email_to", e.target.value)}
                className="w-full bg-(--bg-surface) border border-(--border) rounded-lg px-3 py-2.25 text-[13px] text-foreground outline-none box-border transition-colors"
                placeholder="you@example.com"
              />
            </Field>
          </div>
          {settings.email_provider === "smtp" && (
            <>
              <div className="grid grid-cols-[1fr_90px] gap-3.5">
                <Field label="SMTP host" required>
                  <input
                    type="text"
                    value={settings.smtp_host}
                    onChange={(e) => set("smtp_host", e.target.value)}
                    className="w-full bg-(--bg-surface) border border-(--border) rounded-lg px-3 py-2.25 text-[13px] text-foreground outline-none box-border transition-colors"
                    placeholder="smtp.example.com"
                  />
                </Field>
                <Field label="Port" required>
                  <input
                    type="number"
                    value={settings.smtp_port}
                    onChange={(e) => set("smtp_port", e.target.value)}
                    className="w-full bg-(--bg-surface) border border-(--border) rounded-lg px-3 py-2.25 text-[13px] text-foreground outline-none box-border transition-colors"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <Field label="Username" hint="Leave blank if no auth">
                  <input
                    type="text"
                    value={settings.smtp_user}
                    onChange={(e) => set("smtp_user", e.target.value)}
                    className="w-full bg-(--bg-surface) border border-(--border) rounded-lg px-3 py-2.25 text-[13px] text-foreground outline-none box-border transition-colors"
                    placeholder="username"
                    autoComplete="off"
                  />
                </Field>
                <Field label="Password">
                  <PasswordInput
                    value={settings.smtp_pass}
                    onChange={(v) => set("smtp_pass", v)}
                    placeholder="••••••••"
                  />
                </Field>
              </div>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-(--bg-surface) rounded-lg border border-(--border)">
                <input
                  id="smtp-tls"
                  type="checkbox"
                  checked={settings.smtp_secure === "1"}
                  onChange={(e) =>
                    set("smtp_secure", e.target.checked ? "1" : "0")
                  }
                  className="accent-(--accent) w-3.75 h-3.75 cursor-pointer"
                />
                <label
                  htmlFor="smtp-tls"
                  className="text-[13px] text-(--text-muted) cursor-pointer select-none"
                >
                  Use TLS / Secure connection
                </label>
                <span className="ml-auto text-[11px] text-(--text-dim)">
                  Recommended for port 465
                </span>
              </div>
            </>
          )}
          {settings.email_provider === "resend" && (
            <Field
              label="Resend API key"
              hint="Generate at resend.com/api-keys"
              required
            >
              <PasswordInput
                value={settings.resend_api_key}
                onChange={(v) => set("resend_api_key", v)}
                placeholder="re_••••••••••••••••••••"
              />
            </Field>
          )}
        </div>
      )}

      <SaveBar
        onSave={saveNotifications}
        saving={savingNotif}
        saved={savedNotif}
        extra={
          settings.email_provider !== "disabled" ? (
            <TestButton
              channel="email"
              testing={testing}
              status={testStatus}
              onTest={sendTest}
            />
          ) : undefined
        }
      />
    </div>
  );
}
