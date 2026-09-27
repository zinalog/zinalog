import {
  addAllowedServicesCondition,
  getDb,
  type Log,
  type SqliteDatabase,
} from "./core";

export const ISSUE_STATUSES = ["open", "resolved", "ignored"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export function isIssueStatus(value: unknown): value is IssueStatus {
  return ISSUE_STATUSES.includes(value as IssueStatus);
}

export interface Issue {
  id: number;
  fingerprint: string;
  level: string;
  service: string | null;
  title: string;
  status: IssueStatus;
  count: number;
  first_seen: string;
  last_seen: string;
  last_log_id: number | null;
  regressed_log_id: number | null;
  status_changed_at: string | null;
  status_changed_by: string | null;
  last_alerted_at: string | null;
}

/** What recording one occurrence did to its issue; drives alerting. */
export interface IssueEvent {
  id: number;
  status: IssueStatus;
  isNew: boolean;
  isRegression: boolean;
}

// Counts the occurrence against its issue, creating the issue if needed and
// reopening it if it was resolved. Done as one statement so concurrent logs
// for the same fingerprint can't both see themselves as "new" or as the
// regression. In an upsert's SET clause, bare column names are the row's
// values *before* this update, which is what the status checks rely on.
export async function recordIssueOccurrence(
  database: SqliteDatabase,
  log: {
    id: number;
    fingerprint: string;
    level: string;
    service: string | null;
    message: string;
  }
): Promise<IssueEvent> {
  const row = (await database.get(
    `INSERT INTO issues (
       fingerprint, level, service, title, count,
       first_seen, last_seen, last_log_id
     ) VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'), ?)
     ON CONFLICT(fingerprint) DO UPDATE SET
       count = count + 1,
       last_seen = MAX(last_seen, excluded.last_seen),
       title = excluded.title,
       last_log_id = excluded.last_log_id,
       regressed_log_id = CASE WHEN status = 'resolved'
                               THEN excluded.last_log_id
                               ELSE regressed_log_id END,
       status = CASE WHEN status = 'resolved' THEN 'open' ELSE status END
     RETURNING id, status, count,
               regressed_log_id = last_log_id AS regressed`,
    [log.fingerprint, log.level, log.service, log.message, log.id]
  )) as {
    id: number;
    status: IssueStatus;
    count: number;
    regressed: number | null;
  };

  return {
    id: row.id,
    status: row.status,
    isNew: row.count === 1,
    isRegression: row.regressed === 1,
  };
}

export async function listIssues(
  filters: {
    level: string;
    status?: IssueStatus | "all";
    limit?: number;
  },
  allowedServices: string[] | null = null
): Promise<Issue[]> {
  const conditions = ["level = ?"];
  const params: unknown[] = [filters.level];
  if (filters.status && filters.status !== "all") {
    conditions.push("status = ?");
    params.push(filters.status);
  }
  addAllowedServicesCondition(conditions, params, allowedServices);

  const database = await getDb();
  return (await database.all(
    `SELECT * FROM issues
     WHERE ${conditions.join(" AND ")}
     ORDER BY last_seen DESC, id DESC
     LIMIT ?`,
    [...params, filters.limit ?? 100]
  )) as Issue[];
}

export async function countIssuesByStatus(
  level: string,
  allowedServices: string[] | null = null
): Promise<Record<IssueStatus, number>> {
  const conditions = ["level = ?"];
  const params: unknown[] = [level];
  addAllowedServicesCondition(conditions, params, allowedServices);

  const database = await getDb();
  const rows = (await database.all(
    `SELECT status, COUNT(*) AS count FROM issues
     WHERE ${conditions.join(" AND ")}
     GROUP BY status`,
    params
  )) as Array<{ status: IssueStatus; count: number }>;

  const counts: Record<IssueStatus, number> = {
    open: 0,
    resolved: 0,
    ignored: 0,
  };
  for (const row of rows) counts[row.status] = row.count;
  return counts;
}

export async function getIssue(
  id: number,
  allowedServices: string[] | null = null
): Promise<Issue | null> {
  const conditions = ["id = ?"];
  const params: unknown[] = [id];
  addAllowedServicesCondition(conditions, params, allowedServices);

  const database = await getDb();
  return (
    ((await database.get(
      `SELECT * FROM issues WHERE ${conditions.join(" AND ")}`,
      params
    )) as Issue | undefined) ?? null
  );
}

export async function updateIssueStatus(
  id: number,
  status: IssueStatus,
  changedBy: string | null
): Promise<boolean> {
  const database = await getDb();
  // A manual status change is a fresh triage decision, so any earlier
  // regression marker no longer applies.
  const result = await database.run(
    `UPDATE issues
     SET status = ?,
         regressed_log_id = NULL,
         status_changed_at = datetime('now'),
         status_changed_by = ?
     WHERE id = ?`,
    [status, changedBy, id]
  );
  return (result.changes ?? 0) > 0;
}

/**
 * Claims the right to send a new-issue or regression alert for this issue,
 * at most once per cooldown window. Atomic, so concurrent requests can't
 * both send.
 */
export async function claimIssueAlert(
  id: number,
  cooldownMinutes: number
): Promise<boolean> {
  const database = await getDb();
  const result = await database.run(
    `UPDATE issues
     SET last_alerted_at = datetime('now')
     WHERE id = ?
     AND (
       last_alerted_at IS NULL
       OR last_alerted_at <= datetime('now', '-' || ? || ' minutes')
     )`,
    [id, Math.max(0, Math.floor(cooldownMinutes))]
  );
  return (result.changes ?? 0) > 0;
}

/**
 * Hourly occurrence counts for the last `hours` hours, oldest first, with
 * empty hours filled in. Read from logs, so it only reaches back as far as
 * retention and max_logs have kept rows.
 */
export async function getIssueHourlyCounts(
  fingerprint: string,
  hours = 24 * 7
): Promise<Array<{ hour: string; count: number }>> {
  const database = await getDb();
  const rows = (await database.all(
    `SELECT strftime('%Y-%m-%d %H:00:00', created_at) AS hour,
            COUNT(*) AS count
     FROM logs
     WHERE fingerprint = ?
     AND created_at >= datetime('now', '-' || ? || ' hours')
     GROUP BY hour`,
    [fingerprint, hours]
  )) as Array<{ hour: string; count: number }>;
  const byHour = new Map(rows.map((row) => [row.hour, row.count]));

  const currentHour = new Date();
  currentHour.setUTCMinutes(0, 0, 0);
  const series: Array<{ hour: string; count: number }> = [];
  for (let i = hours - 1; i >= 0; i--) {
    const hour = new Date(currentHour.getTime() - i * 60 * 60 * 1000)
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);
    series.push({ hour, count: byHour.get(hour) ?? 0 });
  }
  return series;
}

export async function listIssueSamples(
  fingerprint: string,
  limit = 20
): Promise<Log[]> {
  const database = await getDb();
  return (await database.all(
    `SELECT * FROM logs
     WHERE fingerprint = ?
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    [fingerprint, limit]
  )) as Log[];
}
