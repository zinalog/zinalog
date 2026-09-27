"use client";

import { useState } from "react";
import { Bell, Globe, Hash, Mail, MessageSquare } from "lucide-react";
import { Field, inputClass, SaveBar, SectionHeader } from "./shared";
import DiscordSettings from "./notifications/discord-settings";
import EmailSettings from "./notifications/email-settings";
import SlackSettings from "./notifications/slack-settings";
import TelegramSettings from "./notifications/telegram-settings";
import WebhookSettings from "./notifications/webhook-settings";
import type { AllSettings, NotifChannel, TestStatus } from "./types";

const LEVEL_OPTIONS = ["error", "warning", "info", "debug"] as const;
// Border is the level colour at ~33% alpha.
const LEVEL_ACTIVE_CLASS: Record<string, string> = {
  error:
    "text-(--error) bg-[rgba(248,81,73,0.12)] border-[color-mix(in_srgb,var(--error)_33%,transparent)]",
  warning:
    "text-(--warning) bg-[rgba(210,153,34,0.12)] border-[color-mix(in_srgb,var(--warning)_33%,transparent)]",
  info: "text-(--info) bg-[rgba(139,148,158,0.12)] border-[color-mix(in_srgb,var(--info)_33%,transparent)]",
  debug:
    "text-(--debug) bg-[rgba(121,192,255,0.12)] border-[color-mix(in_srgb,var(--debug)_33%,transparent)]",
};

const CHANNELS: {
  id: NotifChannel;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    id: "email",
    label: "Email",
    icon: <Mail size={15} />,
    description: "SMTP or Resend",
  },
  {
    id: "telegram",
    label: "Telegram",
    icon: <MessageSquare size={15} />,
    description: "Bot API",
  },
  {
    id: "slack",
    label: "Slack",
    icon: <Hash size={15} />,
    description: "Incoming webhook",
  },
  {
    id: "discord",
    label: "Discord",
    icon: <MessageSquare size={15} />,
    description: "Webhook embed",
  },
  {
    id: "webhook",
    label: "Webhook",
    icon: <Globe size={15} />,
    description: "Custom HTTP",
  },
];

export default function NotificationsTab({
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
  testStatus: TestStatus;
  testing: NotifChannel | null;
  sendTest: (channel: NotifChannel) => void;
}) {
  const [activeChannel, setActiveChannel] = useState<NotifChannel>("email");

  const toggleLevel = (level: string) => {
    const current = settings.alert_levels
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);
    const next = current.includes(level)
      ? current.filter((l) => l !== level)
      : [...current, level];
    set("alert_levels", next.join(","));
  };

  const selectedLevels = settings.alert_levels
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);

  const enabledChannels: Set<NotifChannel> = new Set();
  if (settings.email_provider !== "disabled") enabledChannels.add("email");
  if (settings.telegram_enabled === "1") enabledChannels.add("telegram");
  if (settings.slack_enabled === "1") enabledChannels.add("slack");
  if (settings.discord_enabled === "1") enabledChannels.add("discord");
  if (settings.webhook_enabled === "1") enabledChannels.add("webhook");

  const sharedProps = {
    settings,
    set,
    saveNotifications,
    savingNotif,
    savedNotif,
    testing,
    sendTest,
  };

  return (
    <div className="notif-layout flex gap-4 items-start">
      {/* Channel list */}
      <div className="notif-channel-list w-45 shrink-0 bg-(--bg-card) border border-(--border) rounded-[10px] overflow-hidden">
        {CHANNELS.map((ch) => {
          const active = activeChannel === ch.id;
          const enabled = enabledChannels.has(ch.id);
          return (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.75 border-0 border-b border-l-2 border-(--border) last:border-b-0 cursor-pointer text-left transition-all duration-150 box-border ${
                active
                  ? "bg-[rgba(88,166,255,0.08)] border-l-(--accent)"
                  : "bg-transparent border-l-transparent"
              }`}
            >
              <span
                className={active ? "text-(--accent)" : "text-(--text-dim)"}
              >
                {ch.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div
                  className={`text-[13px] ${
                    active
                      ? "font-semibold text-(--accent)"
                      : "font-normal text-(--text-muted)"
                  }`}
                >
                  {ch.label}
                </div>
                <div className="text-[10px] text-(--text-dim) mt-px">
                  {ch.description}
                </div>
              </div>
              <div
                className={`w-1.75 h-1.75 rounded-full shrink-0 ${
                  enabled ? "bg-(--success)" : "bg-(--border)"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Channel config and alert rules: side by side on wide screens,
          stacked below that. */}
      <div className="flex-1 min-w-0 grid gap-4 items-start xl:grid-cols-2">
        {activeChannel === "email" && (
          <EmailSettings {...sharedProps} testStatus={testStatus.email} />
        )}
        {activeChannel === "telegram" && (
          <TelegramSettings {...sharedProps} testStatus={testStatus.telegram} />
        )}
        {activeChannel === "slack" && (
          <SlackSettings {...sharedProps} testStatus={testStatus.slack} />
        )}
        {activeChannel === "discord" && (
          <DiscordSettings {...sharedProps} testStatus={testStatus.discord} />
        )}
        {activeChannel === "webhook" && (
          <WebhookSettings {...sharedProps} testStatus={testStatus.webhook} />
        )}

        {/*  Alert Rules (shared)  */}
        <div className="bg-(--bg-card) border border-(--border) rounded-[10px] px-6 py-5.5">
          <SectionHeader
            icon={<Bell size={15} />}
            title="Alert Rules"
            description="Shared rules that apply to all enabled notification channels."
          />
          <div className="flex flex-col gap-4.5">
            <Field label="Trigger alerts for">
              <div className="flex flex-wrap gap-2 mt-0.5">
                {LEVEL_OPTIONS.map((lvl) => {
                  const active = selectedLevels.includes(lvl);
                  return (
                    <button
                      key={lvl}
                      onClick={() => toggleLevel(lvl)}
                      className={`px-3.5 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-[0.6px] cursor-pointer border font-mono transition-all duration-150 ${
                        active
                          ? LEVEL_ACTIVE_CLASS[lvl]
                          : "border-(--border) bg-(--bg-surface) text-(--text-dim)"
                      }`}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Occurrence threshold"
                hint="Logs required before alerting"
              >
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={settings.alert_threshold}
                    onChange={(e) => set("alert_threshold", e.target.value)}
                    className={`${inputClass} pr-12`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-(--text-dim) pointer-events-none">
                    logs
                  </span>
                </div>
              </Field>
              <Field
                label="Cooldown period"
                hint="Minimum gap between repeat alerts"
              >
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={settings.alert_cooldown}
                    onChange={(e) => set("alert_cooldown", e.target.value)}
                    className={`${inputClass} pr-11`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-(--text-dim) pointer-events-none">
                    min
                  </span>
                </div>
              </Field>
            </div>
          </div>
          <SaveBar
            onSave={saveNotifications}
            saving={savingNotif}
            saved={savedNotif}
          />
        </div>
      </div>
    </div>
  );
}
