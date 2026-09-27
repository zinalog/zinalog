import Link from "next/link";
import {
  countIssuesByStatus,
  isIssueStatus,
  listIssues,
  type IssueStatus,
} from "@/lib/db";
import { Clock, Hash } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { requireUser } from "@/lib/session-auth";
import IssueActions from "./issue-actions";
import IssueStatusBadge from "./issue-status-badge";

function formatTime(dt: string): string {
  const d = new Date(dt + (dt.endsWith("Z") ? "" : "Z"));
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

const STATUS_TABS: Array<{ value: IssueStatus | "all"; label: string }> = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "ignored", label: "Ignored" },
  { value: "all", label: "All" },
];

interface Props {
  level: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  Icon: LucideIcon;
  emptyText: string;
  statLabel: string;
  searchParams: Promise<{ status?: string | string[] }>;
}

export default async function LogGroupPage({
  level,
  label,
  color,
  bgColor,
  borderColor,
  Icon,
  emptyText,
  statLabel,
  searchParams,
}: Props) {
  const currentUser = await requireUser("viewer");
  const { status: rawStatus } = await searchParams;
  const status: IssueStatus | "all" =
    rawStatus === "all" || isIssueStatus(rawStatus) ? rawStatus : "open";

  const [issues, counts] = await Promise.all([
    listIssues({ level, status }, currentUser.allowed_services),
    countIssuesByStatus(level, currentUser.allowed_services),
  ]);
  const totalIssues = counts.open + counts.resolved + counts.ignored;
  const canTriage =
    currentUser.role === "admin" || currentUser.role === "operator";

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold mb-1">{label} Issues</h1>
        <p className="text-[13px] text-(--text-muted)">
          Similar {label.toLowerCase()} logs grouped together, ignoring ids,
          numbers and other values that vary
        </p>
      </div>

      {/* Stats bar */}
      <div className="flex gap-5 px-4.5 py-3.5 bg-(--bg-card) border border-(--border) rounded-lg">
        <div>
          <span className="text-[11px] text-(--text-dim) uppercase tracking-[0.5px]">
            Open {statLabel} Issues
          </span>
          <div className="text-[22px] font-bold mt-0.5" style={{ color }}>
            {counts.open.toLocaleString()}
          </div>
        </div>

        <div className="w-px bg-(--border) self-stretch" />

        <div>
          <span className="text-[11px] text-(--text-dim) uppercase tracking-[0.5px]">
            Occurrences Shown
          </span>
          <div className="text-[22px] font-bold text-foreground mt-0.5">
            {issues.reduce((acc, i) => acc + i.count, 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-(--border)">
        {STATUS_TABS.map((tab) => {
          const active = tab.value === status;
          const count = tab.value === "all" ? totalIssues : counts[tab.value];
          return (
            <Link
              key={tab.value}
              href={`?status=${tab.value}`}
              className={`px-3 py-2 text-[13px] no-underline -mb-px border-b-2 ${
                active
                  ? "text-foreground font-semibold"
                  : "text-(--text-muted) border-transparent"
              }`}
              style={active ? { borderColor: color } : undefined}
            >
              {tab.label}
              <span className="ml-1.5 text-[11px] text-(--text-dim)">
                {count.toLocaleString()}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Issues list */}
      {issues.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 py-15 bg-(--bg-card) border border-(--border) rounded-[10px] text-(--text-dim)">
          <Icon size={32} className="mb-3 opacity-40" />
          {totalIssues === 0 ? (
            <>
              <div className="text-[14px]">
                No {label.toLowerCase()} logs recorded yet
              </div>
              <div className="text-[12px] mt-1">{emptyText}</div>
            </>
          ) : (
            <div className="text-[14px]">
              No {status === "all" ? "" : `${status} `}
              {label.toLowerCase()} issues
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className="bg-(--bg-card) border border-(--border) rounded-lg px-4.5 py-4 flex flex-col gap-2.5"
              style={{
                borderLeft: `3px solid ${
                  issue.status === "open" ? color : "var(--border)"
                }`,
              }}
            >
              {/* Top row */}
              <div className="flex justify-between items-start gap-3">
                <Link
                  href={`/dashboard/issues/${issue.id}`}
                  className="text-[14px] font-semibold text-foreground leading-[1.4] wrap-break-word flex-1 min-w-0 no-underline hover:underline"
                >
                  {issue.title}
                </Link>

                <div
                  className="shrink-0 flex items-center gap-1 rounded-[20px] px-2.5 py-0.75 text-[12px] font-bold"
                  style={{
                    background: bgColor,
                    border: `1px solid ${borderColor}`,
                    color,
                  }}
                >
                  <Hash size={11} />
                  {issue.count.toLocaleString()}
                </div>
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-(--text-dim)">
                  <IssueStatusBadge issue={issue} />

                  {issue.service && (
                    <span className="text-(--accent)">{issue.service}</span>
                  )}

                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    Last seen {formatTime(issue.last_seen)}
                  </span>

                  <span>First seen {formatTime(issue.first_seen)}</span>
                </div>

                {canTriage && (
                  <IssueActions issueId={issue.id} status={issue.status} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
