import { deleteOldLogs, getRetentionDays, deleteOldMonitorChecks } from "./db";

declare global {
  var __retentionSweepStarted: boolean | undefined;
}

const RETENTION_SWEEP_MS = 60 * 60 * 1000;

export async function runRetentionSweep(): Promise<{
  logsDeleted: number;
  monitorChecksDeleted: number;
}> {
  const retentionDays = await getRetentionDays();
  const [logsDeleted, monitorChecksDeleted] = await Promise.all([
    deleteOldLogs(retentionDays),
    deleteOldMonitorChecks(retentionDays),
  ]);

  return { logsDeleted, monitorChecksDeleted };
}

function tick(): void {
  runRetentionSweep().catch((err) =>
    console.error("[retention-sweep] tick failed", err)
  );
}

export function ensureRetentionSweepStarted(): void {
  if (global.__retentionSweepStarted) return;
  global.__retentionSweepStarted = true;

  const interval = setInterval(tick, RETENTION_SWEEP_MS);
  interval.unref?.();
  tick();
}
