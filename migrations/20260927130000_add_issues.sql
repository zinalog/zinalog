-- migrate:up
-- One row per fingerprint. Unlike the logs table, which is trimmed by
-- max_logs and retention, issues keep durable counts and the triage status
-- (open / resolved / ignored) that drives new-issue and regression alerts.
CREATE TABLE IF NOT EXISTS issues (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  fingerprint        TEXT NOT NULL UNIQUE,
  level              TEXT NOT NULL,
  service            TEXT,
  title              TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'open'
                       CHECK (status IN ('open', 'resolved', 'ignored')),
  count              INTEGER NOT NULL DEFAULT 0,
  first_seen         DATETIME NOT NULL,
  last_seen          DATETIME NOT NULL,
  last_log_id        INTEGER,
  -- Set to the log that reopened a resolved issue; cleared on manual triage.
  regressed_log_id   INTEGER,
  status_changed_at  DATETIME,
  status_changed_by  TEXT,
  last_alerted_at    DATETIME
);

CREATE INDEX IF NOT EXISTS idx_issues_level_status_last_seen
  ON issues(level, status, last_seen);
CREATE INDEX IF NOT EXISTS idx_logs_fingerprint_created_at
  ON logs(fingerprint, created_at);

-- Seed from logs that already have a fingerprint. Rows still missing one are
-- counted in by the background backfill in lib/db/core.ts.
INSERT INTO issues (
  fingerprint, level, service, title, count, first_seen, last_seen, last_log_id
)
SELECT g.fingerprint, l.level, l.service, l.message,
       g.count, g.first_seen, g.last_seen, g.latest_id
FROM (
  SELECT fingerprint,
         COUNT(*) AS count,
         MIN(created_at) AS first_seen,
         MAX(created_at) AS last_seen,
         MAX(id) AS latest_id
  FROM logs
  WHERE fingerprint IS NOT NULL
  GROUP BY fingerprint
) g
JOIN logs l ON l.id = g.latest_id;

-- migrate:down
DROP INDEX IF EXISTS idx_logs_fingerprint_created_at;
DROP INDEX IF EXISTS idx_issues_level_status_last_seen;
DROP TABLE IF EXISTS issues;
