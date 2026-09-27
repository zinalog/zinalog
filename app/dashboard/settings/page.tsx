"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Bell, ChevronRight, Settings } from "lucide-react";
import DangerTab from "@/components/settings/danger-tab";
import GeneralTab from "@/components/settings/general-tab";
import { ANNOUNCEMENTS_REFRESH_EVENT } from "@/components/announcements-bell";
import NotificationsTab from "@/components/settings/notifications-tab";
import type {
  AllSettings,
  GeneralSettings,
  Tab,
  TestStatus,
  NotifChannel,
} from "@/components/settings/types";

const NAV: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "general", label: "General", icon: <Settings size={14} /> },
  { id: "notifications", label: "Notifications", icon: <Bell size={14} /> },
  { id: "danger", label: "Danger Zone", icon: <AlertTriangle size={14} /> },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [general, setGeneral] = useState<GeneralSettings>({
    retention_days: "30",
    max_logs: "100000",
    session_idle_timeout_minutes: "30",
    announcements_enabled: "1",
  });
  const [settings, setSettingsState] = useState<AllSettings>({
    email_provider: "disabled",
    email_from: "zinalog@example.com",
    email_to: "",
    smtp_host: "",
    smtp_port: "587",
    smtp_secure: "0",
    smtp_user: "",
    smtp_pass: "",
    resend_api_key: "",
    alert_levels: "error",
    alert_threshold: "1",
    alert_cooldown: "15",
    telegram_enabled: "0",
    telegram_bot_token: "",
    telegram_chat_id: "",
    slack_enabled: "0",
    slack_webhook_url: "",
    discord_enabled: "0",
    discord_webhook_url: "",
    webhook_enabled: "0",
    webhook_url: "",
    webhook_headers: "",
    webhook_method: "POST",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [savedNotif, setSavedNotif] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>({
    email: null,
    telegram: null,
    slack: null,
    discord: null,
    webhook: null,
  });
  const [testing, setTesting] = useState<NotifChannel | null>(null);

  const set = <K extends keyof AllSettings>(key: K, val: AllSettings[K]) =>
    setSettingsState((s) => ({ ...s, [key]: val }));

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/alerts").then((r) => r.json()),
    ]).then(([ret, notif]) => {
      setGeneral(ret);
      setSettingsState((s) => ({ ...s, ...notif }));
      setLoading(false);
    });
  }, []);

  const saveGeneral = async () => {
    setSaving(true);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(general),
    });
    // Let the sidebar bell pick up an on/off change without a reload.
    window.dispatchEvent(new Event(ANNOUNCEMENTS_REFRESH_EVENT));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const saveNotifications = async () => {
    setSavingNotif(true);
    await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSavingNotif(false);
    setSavedNotif(true);
    setTimeout(() => setSavedNotif(false), 2500);
  };

  const sendTest = async (channel: NotifChannel) => {
    setTesting(channel);
    setTestStatus((s) => ({ ...s, [channel]: null }));
    const res = await fetch(`/api/alerts/test?channel=${channel}`, {
      method: "POST",
    });
    const data = await res.json();
    setTestStatus((s) => ({
      ...s,
      [channel]: res.ok
        ? { ok: true, msg: `Test sent via ${channel}` }
        : { ok: false, msg: data.error ?? "Failed" },
    }));
    setTesting(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-75">
        <div className="flex flex-col items-center gap-3 text-(--text-dim)">
          <div className="w-7 h-7 border-2 border-(--border) border-t-(--accent) rounded-full animate-[spin_0.7s_linear_infinite]" />
          <span className="text-[13px]">Loading settings…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Page Header */}
      <div className="mb-7">
        <h1 className="text-[20px] font-bold text-foreground mt-0 mx-0 mb-1">
          Settings
        </h1>
        <p className="text-[13px] text-(--text-dim) m-0">
          Manage session behavior, log retention, notification channels, and
          system configuration
        </p>
      </div>

      <div className="settings-layout flex gap-6 items-start">
        {/* Left Nav */}
        <nav className="settings-nav w-50 shrink-0 bg-(--bg-card) border border-(--border) rounded-[10px] overflow-hidden">
          {NAV.map((item) => {
            const active = activeTab === item.id;
            const isDanger = item.id === "danger";
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.75 border-0 border-b border-l-2 border-(--border) last:border-b-0 cursor-pointer text-[13px] text-left transition-all duration-150 box-border ${
                  active
                    ? isDanger
                      ? "bg-[rgba(248,81,73,0.08)] border-l-(--error) font-semibold text-(--error)"
                      : "bg-[rgba(88,166,255,0.08)] border-l-(--accent) font-semibold text-(--accent)"
                    : "bg-transparent border-l-transparent font-normal text-(--text-muted)"
                }`}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight size={12} className="opacity-50" />}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === "general" && (
            <GeneralTab
              general={general}
              setGeneral={setGeneral}
              saveGeneral={saveGeneral}
              saving={saving}
              saved={saved}
            />
          )}

          {activeTab === "notifications" && (
            <NotificationsTab
              settings={settings}
              set={set}
              saveNotifications={saveNotifications}
              savingNotif={savingNotif}
              savedNotif={savedNotif}
              testStatus={testStatus}
              testing={testing}
              sendTest={sendTest}
            />
          )}

          {activeTab === "danger" && <DangerTab />}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
