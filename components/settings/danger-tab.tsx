"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle, Trash2, XCircle } from "lucide-react";
import ConfirmModal from "@/components/confirm-modal";
import { inputClass, SectionHeader } from "./shared";

export default function DangerTab() {
  const [purgeDays, setPurgeDays] = useState("30");
  const [purgeResult, setPurgeResult] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);
  const [purging, setPurging] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const doPurge = async () => {
    setShowConfirm(false);
    setPurging(true);
    setPurgeResult(null);
    const res = await fetch(`/api/settings?days=${purgeDays}`, {
      method: "DELETE",
    });
    const data = await res.json();
    setPurgeResult({
      ok: res.ok,
      msg: data.message ?? (res.ok ? "Done" : "Error"),
    });
    setPurging(false);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-(--bg-card) border border-[rgba(248,81,73,0.25)] rounded-[10px] px-6 py-5.5">
        <SectionHeader
          icon={<AlertTriangle size={15} />}
          title="Danger Zone"
          description="These actions are permanent and cannot be undone. Proceed with caution."
        />
        <div className="bg-(--bg-surface) border border-(--border) rounded-lg px-4.5 py-4">
          <div className="text-[13px] font-semibold text-foreground mb-1">
            Purge old logs
          </div>
          <p className="text-[12px] text-(--text-dim) mt-0 mx-0 mb-4 leading-[1.6]">
            Permanently delete all log entries older than the specified number
            of days. The deleted logs cannot be recovered.
          </p>
          <div className="flex items-center gap-2.5">
            <span className="text-[13px] text-(--text-muted) whitespace-nowrap">
              Delete logs older than
            </span>
            <div className="relative w-22">
              <input
                type="number"
                min="1"
                value={purgeDays}
                onChange={(e) => setPurgeDays(e.target.value)}
                className={`${inputClass} pr-5.5`}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-(--text-dim) pointer-events-none">
                d
              </span>
            </div>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={purging}
              className={`flex items-center gap-1.75 bg-[rgba(248,81,73,0.1)] border border-[rgba(248,81,73,0.3)] rounded-lg px-4 py-2.25 text-[13px] font-semibold text-(--error) whitespace-nowrap ${
                purging ? "cursor-not-allowed opacity-[0.65]" : "cursor-pointer"
              }`}
            >
              <Trash2 size={13} />
              {purging ? "Deleting…" : "Purge logs"}
            </button>
          </div>
          {purgeResult && (
            <div
              className={`mt-3.5 flex items-center gap-2 text-[12px] px-3.5 py-2.25 border rounded-md ${
                purgeResult.ok
                  ? "text-(--success) bg-[rgba(63,185,80,0.08)] border-[rgba(63,185,80,0.2)]"
                  : "text-(--error) bg-[rgba(248,81,73,0.08)] border-[rgba(248,81,73,0.2)]"
              }`}
            >
              {purgeResult.ok ? (
                <CheckCircle size={13} />
              ) : (
                <XCircle size={13} />
              )}
              {purgeResult.msg}
            </div>
          )}
        </div>
      </div>

      {showConfirm && (
        <ConfirmModal
          title="Purge Old Logs"
          message={`This will permanently delete all logs older than ${purgeDays} day${purgeDays === "1" ? "" : "s"}. This action cannot be undone.`}
          confirmLabel="Yes, purge logs"
          danger
          onConfirm={doPurge}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
