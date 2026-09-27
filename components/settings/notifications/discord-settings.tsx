"use client";

import { ChevronRight, MessageSquare } from "lucide-react";
import {
  Field,
  InfoBox,
  SaveBar,
  SectionHeader,
  TestButton,
  Toggle,
} from "../shared";
import type { AllSettings, NotifChannel } from "../types";

export default function DiscordSettings({
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
      <div className="flex items-start justify-between">
        <SectionHeader
          icon={<MessageSquare size={15} />}
          title="Discord"
          description="Post rich embed alerts to a Discord channel via webhook."
        />
        <Toggle
          value={settings.discord_enabled === "1"}
          onChange={(v) => set("discord_enabled", v ? "1" : "0")}
        />
      </div>
      <div
        className={`flex flex-col gap-3.5 ${
          settings.discord_enabled === "1"
            ? "opacity-100"
            : "opacity-45 pointer-events-none"
        }`}
      >
        <Field
          label="Webhook URL"
          hint={
            <>
              Create in Discord channel settings{" "}
              <ChevronRight size={11} className="inline align-middle" />{" "}
              Integrations{" "}
              <ChevronRight size={11} className="inline align-middle" />{" "}
              Webhooks
            </>
          }
          required
        >
          <input
            type="url"
            value={settings.discord_webhook_url}
            onChange={(e) => set("discord_webhook_url", e.target.value)}
            className="w-full bg-(--bg-surface) border border-(--border) rounded-lg px-3 py-2.25 text-[13px] text-foreground outline-none box-border transition-colors"
            placeholder="https://discord.com/api/webhooks/..."
          />
        </Field>
        <InfoBox>
          In Discord, open a channel{" "}
          <ChevronRight size={11} className="inline align-middle" />{" "}
          <strong>
            Edit Channel{" "}
            <ChevronRight size={11} className="inline align-middle" />{" "}
            Integrations{" "}
            <ChevronRight size={11} className="inline align-middle" /> Webhooks{" "}
            <ChevronRight size={11} className="inline align-middle" /> New
            Webhook
          </strong>
          . Copy the webhook URL.
        </InfoBox>
      </div>
      <SaveBar
        onSave={saveNotifications}
        saving={savingNotif}
        saved={savedNotif}
        extra={
          settings.discord_enabled === "1" ? (
            <TestButton
              channel="discord"
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
