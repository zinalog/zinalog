import type { Issue } from "@/lib/db";

const STYLES = {
  regressed: {
    label: "Regressed",
    color: "var(--error)",
    background: "rgba(248,81,73,0.1)",
  },
  resolved: {
    label: "Resolved",
    color: "var(--success)",
    background: "rgba(63,185,80,0.1)",
  },
  ignored: {
    label: "Ignored",
    color: "var(--text-dim)",
    background: "var(--bg-surface)",
  },
} as const;

// Open issues show no badge unless they came back after being resolved.
export default function IssueStatusBadge({
  issue,
}: {
  issue: Pick<Issue, "status" | "regressed_log_id">;
}) {
  const key =
    issue.status === "open"
      ? issue.regressed_log_id !== null
        ? "regressed"
        : null
      : issue.status;
  if (!key) return null;

  const style = STYLES[key];
  return (
    <span
      className="inline-block rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.5px] whitespace-nowrap"
      style={{ color: style.color, background: style.background }}
    >
      {style.label}
    </span>
  );
}
