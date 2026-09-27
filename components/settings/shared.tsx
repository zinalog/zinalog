"use client";

import { useState } from "react";
import {
  Save,
  CheckCircle,
  Eye,
  EyeOff,
  Send,
  ToggleLeft,
  ToggleRight,
  XCircle,
} from "lucide-react";
import type { NotifChannel } from "./types";

export const inputClass =
  "w-full bg-(--bg-surface) border border-(--border) rounded-lg px-3 py-2.25 text-[13px] text-foreground outline-none transition-colors duration-150 box-border";

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        <label className="text-[12px] font-medium text-(--text-muted) tracking-[0.3px]">
          {label}
        </label>
        {required && <span className="text-(--error) text-[11px]">*</span>}
      </div>
      {children}
      {hint && (
        <p className="text-[11px] text-(--text-dim) leading-normal m-0">
          {hint}
        </p>
      )}
    </div>
  );
}

export function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2.5 mb-1.5">
        <div className="w-8 h-8 rounded-lg bg-[rgba(88,166,255,0.1)] border border-[rgba(88,166,255,0.15)] flex items-center justify-center text-(--accent) shrink-0">
          {icon}
        </div>
        <h2 className="text-[15px] font-semibold text-foreground m-0">
          {title}
        </h2>
      </div>
      <p className="text-[12px] text-(--text-dim) mt-0 mr-0 mb-0 ml-10.5 leading-[1.6]">
        {description}
      </p>
    </div>
  );
}

export function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete ?? "new-password"}
        className={`${inputClass} pr-9.5`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-(--text-dim) p-0 flex"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

export function SaveBar({
  onSave,
  saving,
  saved,
  extra,
}: {
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 pt-5 border-t border-(--border) mt-2">
      <button
        onClick={onSave}
        disabled={saving}
        className={`
    flex items-center gap-1.75 rounded-lg px-5 py-2.25
    text-[13px] font-semibold transition-all duration-200
    ${
      saved
        ? "bg-[rgba(63,185,80,0.15)] border border-[rgba(63,185,80,0.3)] text-(--success)"
        : "bg-(--accent-glow) text-white"
    }
    ${saving ? "cursor-not-allowed opacity-[0.65]" : "cursor-pointer"}
  `}
      >
        {saved ? <CheckCircle size={14} /> : <Save size={14} />}
        {saved ? "Saved" : saving ? "Saving…" : "Save changes"}
      </button>
      {extra}
    </div>
  );
}

export function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex items-center gap-2 bg-transparent border-0 cursor-pointer p-0 shrink-0"
    >
      <span
        className={`text-[12px] font-medium ${value ? "text-(--success)" : "text-(--text-dim)"}`}
      >
        {value ? "Enabled" : "Disabled"}
      </span>
      {value ? (
        <ToggleRight size={22} color="var(--success)" />
      ) : (
        <ToggleLeft size={22} color="var(--text-dim)" />
      )}
    </button>
  );
}

export function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3.5 py-2.5 bg-[rgba(88,166,255,0.05)] border border-[rgba(88,166,255,0.15)] rounded-lg text-[12px] text-(--text-muted) leading-[1.6]">
      {children}
    </div>
  );
}

export function TestButton({
  channel,
  testing,
  status,
  onTest,
}: {
  channel: NotifChannel;
  testing: NotifChannel | null;
  status: { ok: boolean; msg: string } | null;
  onTest: (c: NotifChannel) => void;
}) {
  const isLoading = testing === channel;
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onTest(channel)}
        disabled={isLoading}
        className={`flex items-center gap-1.75 bg-(--bg-surface) border border-(--border) rounded-lg px-4 py-2.25 text-[13px] text-(--text-muted) ${
          isLoading ? "cursor-not-allowed opacity-[0.65]" : "cursor-pointer"
        }`}
      >
        <Send size={13} />
        {isLoading ? "Sending…" : "Send test"}
      </button>
      {status && (
        <div
          className={`flex items-center gap-1.5 text-[12px] px-3 py-1.5 border rounded-md ${
            status.ok
              ? "text-(--success) bg-[rgba(63,185,80,0.08)] border-[rgba(63,185,80,0.2)]"
              : "text-(--error) bg-[rgba(248,81,73,0.08)] border-[rgba(248,81,73,0.2)]"
          }`}
        >
          {status.ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
          {status.msg}
        </div>
      )}
    </div>
  );
}
