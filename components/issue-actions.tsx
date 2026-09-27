"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, EyeOff, RotateCcw } from "lucide-react";
import type { IssueStatus } from "@/lib/db";

const BUTTON_CLASS =
  "flex items-center gap-1.5 bg-(--bg-card) border border-(--border) rounded-md py-1.5 px-3 text-[12px] cursor-pointer disabled:opacity-50 disabled:cursor-default";

export default function IssueActions({
  issueId,
  status,
}: {
  issueId: number;
  status: IssueStatus;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(next: IssueStatus) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? `Request failed (${res.status})`);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {status === "open" ? (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() => setStatus("resolved")}
            className={`${BUTTON_CLASS} text-(--success)`}
          >
            <CheckCircle2 size={13} />
            Resolve
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setStatus("ignored")}
            className={`${BUTTON_CLASS} text-(--text-muted)`}
          >
            <EyeOff size={13} />
            Ignore
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => setStatus("open")}
          className={`${BUTTON_CLASS} text-(--text-muted)`}
        >
          <RotateCcw size={13} />
          {status === "ignored" ? "Stop ignoring" : "Reopen"}
        </button>
      )}
      {error && <span className="text-[12px] text-(--error)">{error}</span>}
    </div>
  );
}
