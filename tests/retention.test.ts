import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

type RetentionModule = typeof import("../lib/retention");

const cjsRequire = createRequire(__filename);
const compiledRetentionPath = path.resolve(__dirname, "../lib/retention.js");
const compiledDbPath = path.resolve(__dirname, "../lib/db.js");

function mockModule(
  modulePath: string,
  exports: Record<string, unknown>
): void {
  cjsRequire.cache[modulePath] = {
    id: modulePath,
    path: path.dirname(modulePath),
    filename: modulePath,
    loaded: true,
    exports,
  } as NodeModule;
}

function loadRetentionWithMocks(options: {
  retentionDays?: number;
  deleteOldLogs?: (days: number) => Promise<number>;
  deleteOldMonitorChecks?: (days: number) => Promise<number>;
}): {
  retention: RetentionModule;
  calls: { logDays: number[]; monitorCheckDays: number[] };
} {
  delete cjsRequire.cache[compiledRetentionPath];
  delete cjsRequire.cache[compiledDbPath];
  delete global.__retentionSweepStarted;

  const calls = {
    logDays: [] as number[],
    monitorCheckDays: [] as number[],
  };

  mockModule(compiledDbPath, {
    getRetentionDays: async () => options.retentionDays ?? 30,
    deleteOldLogs:
      options.deleteOldLogs ??
      (async (days: number) => {
        calls.logDays.push(days);
        return 2;
      }),
    deleteOldMonitorChecks:
      options.deleteOldMonitorChecks ??
      (async (days: number) => {
        calls.monitorCheckDays.push(days);
        return 3;
      }),
  });

  return {
    retention: cjsRequire(compiledRetentionPath) as RetentionModule,
    calls,
  };
}

test("runRetentionSweep applies configured retention to logs and monitor checks", async () => {
  const { retention, calls } = loadRetentionWithMocks({ retentionDays: 14 });

  assert.deepEqual(await retention.runRetentionSweep(), {
    logsDeleted: 2,
    monitorChecksDeleted: 3,
  });
  assert.deepEqual(calls.logDays, [14]);
  assert.deepEqual(calls.monitorCheckDays, [14]);
});

test("ensureRetentionSweepStarted starts once, unreferences, and runs immediately", async () => {
  const { retention, calls } = loadRetentionWithMocks({ retentionDays: 7 });
  const originalSetInterval = global.setInterval;
  let intervalCalls = 0;
  let unrefCalls = 0;

  (global as unknown as { setInterval: unknown }).setInterval = () => {
    intervalCalls += 1;
    return {
      unref: () => {
        unrefCalls += 1;
      },
    } as unknown as NodeJS.Timeout;
  };

  try {
    retention.ensureRetentionSweepStarted();
    retention.ensureRetentionSweepStarted();
    await new Promise((resolve) => setTimeout(resolve, 0));
  } finally {
    global.setInterval = originalSetInterval;
  }

  assert.equal(intervalCalls, 1);
  assert.equal(unrefCalls, 1);
  assert.deepEqual(calls.logDays, [7]);
  assert.deepEqual(calls.monitorCheckDays, [7]);
});
