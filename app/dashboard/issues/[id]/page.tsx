import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Hash } from "lucide-react";
import {
  getIssue,
  getIssueHourlyCounts,
  listIssueSamples,
  type Log,
} from "@/lib/db";
import { requireUser } from "@/lib/session-auth";
import IssueActions from "@/components/issue-actions";
import IssueSparkline from "@/components/issue-sparkline";
import IssueStatusBadge from "@/components/issue-status-badge";
import LevelBadge from "@/components/level-badge";
import StatCard from "@/components/stat-card";

const LEVEL_PAGES: Record<string, { href: string; color: string }> = {
  error: { href: "/dashboard/logs/errors", color: "var(--error)" },
  warning: { href: "/dashboard/logs/warn", color: "var(--warning)" },
  info: { href: "/dashboard/logs/info", color: "var(--accent)" },
  debug: { href: "/dashboard/logs/debug", color: "var(--debug)" },
};

function formatTime(dt: string): string {
  const d = new Date(dt + (dt.endsWith("Z") ? "" : "Z"));
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

function formatDateTime(dt: string): string {
  return new Date(dt + (dt.endsWith("Z") ? "" : "Z")).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatMetadata(metadata: string): string {
  try {
    return JSON.stringify(JSON.parse(metadata), null, 2);
  } catch {
    return metadata;
  }
}

function Sample({ log }: { log: Log }) {
  const hasDetails = Boolean(log.stack || log.metadata);
  const summary = (
    <div className="flex items-start gap-3 min-w-0">
      <span className="shrink-0 text-[11px] font-mono text-(--text-dim) pt-0.5">
        {formatDateTime(log.created_at)}
      </span>
      <span className="text-[13px] text-foreground wrap-break-word min-w-0">
        {log.message}
      </span>
    </div>
  );

  if (!hasDetails) {
    return <div className="px-4 py-3">{summary}</div>;
  }

  return (
    <details className="px-4 py-3 group">
      <summary className="cursor-pointer list-none">{summary}</summary>
      <div className="flex flex-col gap-2 mt-3">
        {log.stack && (
          <pre className="m-0 bg-(--bg-surface) border border-(--border) rounded-md p-3 text-[11px] font-mono text-(--error) overflow-x-auto">
            {log.stack}
          </pre>
        )}
        {log.metadata && (
          <pre className="m-0 bg-(--bg-surface) border border-(--border) rounded-md p-3 text-[11px] font-mono text-(--text-muted) overflow-x-auto">
            {formatMetadata(log.metadata)}
          </pre>
        )}
      </div>
    </details>
  );
}

export default async function IssuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await requireUser("viewer");
  const { id } = await params;
  const issueId = Number.parseInt(id, 10);
  if (!Number.isFinite(issueId)) notFound();

  const issue = await getIssue(issueId, currentUser.allowed_services);
  if (!issue) notFound();

  const [hourly, samples] = await Promise.all([
    getIssueHourlyCounts(issue.fingerprint),
    listIssueSamples(issue.fingerprint),
  ]);
  const lastWeek = hourly.reduce((acc, h) => acc + h.count, 0);
  const levelPage = LEVEL_PAGES[issue.level] ?? LEVEL_PAGES.error;
  const canTriage =
    currentUser.role === "admin" || currentUser.role === "operator";

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={levelPage.href}
        className="flex items-center gap-1.5 text-[13px] text-(--text-muted) no-underline w-fit"
      >
        <ArrowLeft size={14} />
        Back to issues
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <LevelBadge level={issue.level} />
          <IssueStatusBadge issue={issue} />
          {issue.service && (
            <span className="text-[12px] text-(--accent)">{issue.service}</span>
          )}
        </div>
        <h1 className="text-[20px] font-bold leading-[1.4] wrap-break-word m-0">
          {issue.title}
        </h1>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[12px] text-(--text-dim)">
            {issue.status_changed_at && issue.status !== "open"
              ? `${issue.status === "resolved" ? "Resolved" : "Ignored"} ${formatTime(issue.status_changed_at)}${issue.status_changed_by ? ` by ${issue.status_changed_by}` : ""}`
              : null}
          </div>
          {canTriage && (
            <IssueActions issueId={issue.id} status={issue.status} />
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Occurrences"
          value={issue.count}
          subtitle="All time"
          icon={<Hash size={16} />}
        />
        <StatCard title="Last 7 days" value={lastWeek} />
        <StatCard
          title="First seen"
          value={formatTime(issue.first_seen)}
          subtitle={formatDateTime(issue.first_seen)}
          icon={<Clock size={16} />}
        />
        <StatCard
          title="Last seen"
          value={formatTime(issue.last_seen)}
          subtitle={formatDateTime(issue.last_seen)}
          icon={<Clock size={16} />}
        />
      </div>

      {/* Sparkline */}
      <div className="bg-(--bg-card) border border-(--border) rounded-[10px] px-5 py-4">
        <div className="text-[12px] text-(--text-muted) font-medium uppercase tracking-[0.5px] mb-2">
          Occurrences per hour, last 7 days
        </div>
        <IssueSparkline hourly={hourly} color={levelPage.color} />
      </div>

      {/* Samples */}
      <div className="bg-(--bg-card) border border-(--border) rounded-[10px] overflow-hidden">
        <div className="px-4 py-3 border-b border-(--border) text-[12px] text-(--text-muted) font-medium uppercase tracking-[0.5px]">
          Recent occurrences
        </div>
        {samples.length === 0 ? (
          <div className="px-4 py-8 text-center text-[13px] text-(--text-dim)">
            No stored occurrences. Older logs have been removed by retention or
            the max logs limit.
          </div>
        ) : (
          <div className="divide-y divide-(--border)">
            {samples.map((log) => (
              <Sample key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
