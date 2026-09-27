-- migrate:up
-- Groups are keyed by a fingerprint computed on ingest (lib/fingerprint.ts)
-- instead of the raw message, so logs that differ only in ids, numbers or
-- other variable values land in the same group. Existing rows are backfilled
-- at startup by backfillLogFingerprints in lib/db/core.ts.
ALTER TABLE logs ADD COLUMN fingerprint TEXT;

CREATE INDEX IF NOT EXISTS idx_logs_level_fingerprint ON logs(level, fingerprint);

-- migrate:down
DROP INDEX IF EXISTS idx_logs_level_fingerprint;
ALTER TABLE logs DROP COLUMN fingerprint;
