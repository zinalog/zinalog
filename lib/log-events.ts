import { EventEmitter } from "node:events";
import type { Log } from "./db";

// Kept on globalThis rather than in module scope: Next.js can load this
// module separately for each route, so /api/logs (which emits) and
// /api/stream (which listens) would otherwise get different emitters and
// live-stream subscribers would never see new logs.
declare global {
  var __logEvents: EventEmitter | undefined;
}

function emitter(): EventEmitter {
  if (!globalThis.__logEvents) {
    globalThis.__logEvents = new EventEmitter();
    // Unbounded on purpose: each SSE connection registers exactly one
    // listener, and the number of concurrent dashboard viewers is expected
    // to stay small.
    globalThis.__logEvents.setMaxListeners(0);
  }
  return globalThis.__logEvents;
}

export function emitNewLog(log: Log): void {
  emitter().emit("log", log);
}

export function onNewLog(listener: (log: Log) => void): void {
  emitter().on("log", listener);
}

export function offNewLog(listener: (log: Log) => void): void {
  emitter().off("log", listener);
}
