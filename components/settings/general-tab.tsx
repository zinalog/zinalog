"use client";

import { Database, Server, Settings } from "lucide-react";
import { Field, inputBase, SaveBar, SectionHeader } from "./shared";
import type { GeneralSettings } from "./types";

// One labelled row of the General card: title and description on the left,
// controls on the right. Stacks on narrow screens.
function SettingsRow({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 md:gap-6 md:grid-cols-[220px_minmax(0,1fr)] py-5 border-t border-(--border) first:border-t-0 first:pt-0">
      <div>
        <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
          <span className="text-(--accent) flex">{icon}</span>
          {title}
        </div>
        <p className="text-[11.5px] text-(--text-dim) leading-normal mt-1 mb-0">
          {description}
        </p>
      </div>
      <div>{children}</div>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  unit,
}: {
  value: string;
  onChange: (value: string) => void;
  min: string;
  unit?: string;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputBase, paddingRight: unit ? 64 : 12 }}
      />
      {unit && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-(--text-dim) pointer-events-none">
          {unit}
        </span>
      )}
    </div>
  );
}

export default function GeneralTab({
  general,
  setGeneral,
  saveGeneral,
  saving,
  saved,
}: {
  general: GeneralSettings;
  setGeneral: (update: (s: GeneralSettings) => GeneralSettings) => void;
  saveGeneral: () => void;
  saving: boolean;
  saved: boolean;
}) {
  const systemInfo = [
    {
      label: "Database path",
      value: process.env.DATABASE_PATH ?? "./data/logs.db",
    },
    { label: "Port", value: process.env.PORT ?? "4000" },
    { label: "Environment", value: process.env.NODE_ENV ?? "development" },
  ];

  return (
    <div className="bg-(--bg-card) border border-(--border) rounded-[10px] px-6 py-5.5">
      <SectionHeader
        icon={<Settings size={15} />}
        title="General"
        description="Session, log retention and runtime details for this zinalog instance."
      />

      <SettingsRow
        icon={<Settings size={13} />}
        title="Session"
        description="How long a signed-in user can stay idle before logging in again."
      >
        <div className="max-w-90">
          <Field
            label="Idle timeout"
            hint="Users are logged out after this many minutes without activity"
            required
          >
            <NumberInput
              min="1"
              unit="minutes"
              value={general.session_idle_timeout_minutes}
              onChange={(value) =>
                setGeneral((s) => ({
                  ...s,
                  session_idle_timeout_minutes: value,
                }))
              }
            />
          </Field>
        </div>
      </SettingsRow>

      <SettingsRow
        icon={<Database size={13} />}
        title="Log Retention"
        description="How long logs are kept and the maximum number stored."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Retention period"
            hint="Logs older than this are automatically purged"
            required
          >
            <NumberInput
              min="1"
              unit="days"
              value={general.retention_days}
              onChange={(value) =>
                setGeneral((s) => ({ ...s, retention_days: value }))
              }
            />
          </Field>
          <Field
            label="Max log count"
            hint="Oldest entries are removed when this is exceeded"
            required
          >
            <NumberInput
              min="1000"
              value={general.max_logs}
              onChange={(value) =>
                setGeneral((s) => ({ ...s, max_logs: value }))
              }
            />
          </Field>
        </div>
      </SettingsRow>

      <SettingsRow
        icon={<Server size={13} />}
        title="System Information"
        description="Read-only runtime environment details."
      >
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-3 m-0">
          {systemInfo.map((item) => (
            <div key={item.label} className="min-w-0">
              <dt className="text-[11px] text-(--text-dim)">{item.label}</dt>
              <dd
                title={item.value}
                className="m-0 mt-0.5 text-[12px] text-(--text-muted) font-mono truncate"
              >
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </SettingsRow>

      <SaveBar onSave={saveGeneral} saving={saving} saved={saved} />
    </div>
  );
}
