"use client";

import { ChevronRight, Hash } from "lucide-react";
import {
  Field,
  InfoBox,
  SaveBar,
  SectionHeader,
  TestButton,
  Toggle,
} from "../shared";
import type { AllSettings, NotifChannel } from "../types";

export default function SlackSettings({
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
          icon={<Hash size={15} />}
          title="Slack"
          description="Post alerts to a Slack channel using an incoming webhook."
        />
        <Toggle
          value={settings.slack_enabled === "1"}
          onChange={(v) => set("slack_enabled", v ? "1" : "0")}
        />
      </div>
      <div
        className={`flex flex-col gap-3.5 ${
          settings.slack_enabled === "1"
            ? "opacity-100"
            : "opacity-45 pointer-events-none"
        }`}
      >
        <Field
          label="Webhook URL"
          hint={
            <>
              Create at api.slack.com/apps{" "}
              <ChevronRight size={11} className="inline align-middle" />{" "}
              Incoming Webhooks
            </>
          }
          required
        >
          <input
            type="url"
            value={settings.slack_webhook_url}
            onChange={(e) => set("slack_webhook_url", e.target.value)}
            className="w-full bg-(--bg-surface) border border-(--border) rounded-lg px-3 py-2.25 text-[13px] text-foreground outline-none box-border transition-colors"
            placeholder="https://hooks.slack.com/services/..."
          />
        </Field>
        <InfoBox>
          Go to <strong>api.slack.com/apps</strong>{" "}
          <ChevronRight size={11} className="inline align-middle" /> Create an
          app <ChevronRight size={11} className="inline align-middle" />{" "}
          Incoming Webhooks{" "}
          <ChevronRight size={11} className="inline align-middle" /> Activate
          and copy the webhook URL.
        </InfoBox>
      </div>
      <SaveBar
        onSave={saveNotifications}
        saving={savingNotif}
        saved={savedNotif}
        extra={
          settings.slack_enabled === "1" ? (
            <TestButton
              channel="slack"
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
