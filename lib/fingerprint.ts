import { createHash } from "crypto";

// Bump when the normalisation rules change so fingerprints computed under the
// old rules never silently merge with (or split from) groups under new ones.
const FINGERPRINT_VERSION = "v1";

// Normalisation only needs enough of the message to identify its shape;
// capping it also bounds the regex work done per ingested log.
const MAX_NORMALIZED_INPUT = 1024;
const MAX_FRAMES = 5;
export const MAX_CLIENT_FINGERPRINT_LENGTH = 200;

// Order matters: structured tokens (quoted strings, UUIDs, emails, URLs,
// timestamps, IPs, hex) are replaced before bare numbers, otherwise the number
// rule would break them apart first and they would never match.
const MESSAGE_RULES: Array<[RegExp, string]> = [
  // Quotes must not be glued to a word, so apostrophes in "can't" or
  // "user's" are left alone.
  [/(?<!\w)"(?:[^"\\\n]|\\.)*"(?!\w)/g, "<str>"],
  [/(?<!\w)'(?:[^'\\\n]|\\.)*'(?!\w)/g, "<str>"],
  [/(?<!\w)`(?:[^`\\\n]|\\.)*`(?!\w)/g, "<str>"],
  [
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    "<uuid>",
  ],
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "<email>"],
  [/\bhttps?:\/\/[^\s"'<>]+/gi, "<url>"],
  [
    /\b\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?(?!\w)/g,
    "<date>",
  ],
  [/\b\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?\b/g, "<ip>"],
  [/\b0x[0-9a-f]+\b/gi, "<hex>"],
  // Long hex runs (hashes, object ids). Requiring a digit keeps ordinary
  // words made only of a-f letters intact.
  [/\b(?=[0-9a-f]*\d)[0-9a-f]{8,}\b/gi, "<hex>"],
  // No trailing \b so values with units ("500ms", "12.5MB") normalise too;
  // the leading \b keeps identifiers like "http2" or "S3" intact.
  [/\b\d+(?:\.\d+)?/g, "<num>"],
];

export function normalizeMessage(message: string): string {
  let result = message.slice(0, MAX_NORMALIZED_INPUT);
  for (const [pattern, placeholder] of MESSAGE_RULES) {
    result = result.replace(pattern, placeholder);
  }
  return result.replace(/\s+/g, " ").trim();
}

interface StackFrame {
  fn: string;
  file: string;
  inApp: boolean;
}

// V8:    "    at fn (file:line:col)" or "    at file:line:col"
// Gecko: "fn@file:line:col"
const V8_FRAME = /^\s*at\s+(?:(.*?)\s+\((.*)\)|(.*?))\s*$/;
const GECKO_FRAME = /^\s*([^@\s]*)@(.+?)\s*$/;

function normalizeFile(location: string): string {
  let file = location
    .replace(/:\d+(?::\d+)?$/, "") // line/column shift on every deploy
    .replace(/[?#].*$/, "")
    .replace(/^[a-z][\w+.-]*:\/\/[^/]*/i, "") // scheme + host
    .replace(/\\/g, "/");

  // Absolute prefixes differ between machines and containers; the last two
  // segments are enough to identify the file.
  file = file.split("/").filter(Boolean).slice(-2).join("/");

  // Bundler content hashes (chunk-a1b2c3d4.js, 1234-5678abcd.js).
  return file
    .replace(/\b(?=[0-9a-f]*\d)[0-9a-f]{6,}\b/gi, "<hash>")
    .replace(/\b\d+\b/g, "<num>");
}

function parseFrame(line: string): StackFrame | null {
  let fn: string;
  let location: string;

  const v8 = V8_FRAME.exec(line);
  if (v8) {
    fn = v8[1] ?? "";
    location = v8[2] ?? v8[3] ?? "";
  } else {
    const gecko = GECKO_FRAME.exec(line);
    if (!gecko) return null;
    fn = gecko[1];
    location = gecko[2];
  }

  const inApp = !(
    location.includes("node_modules") ||
    location.startsWith("node:") ||
    location.startsWith("internal/") ||
    location === "native" ||
    location === "<anonymous>"
  );

  return {
    fn: fn.replace(/^(?:async|new)\s+/, "") || "<anonymous>",
    file: normalizeFile(location),
    inApp,
  };
}

export function extractStackSignature(stack: string): {
  errorType: string | null;
  frames: string[];
} {
  const lines = stack.split("\n");
  const errorType =
    /^\s*([A-Za-z_$][\w$.]*(?:Error|Exception))\b/.exec(lines[0] ?? "")?.[1] ??
    null;

  const frames = lines
    .map(parseFrame)
    .filter((frame): frame is StackFrame => frame !== null);

  // Prefer the application's own frames; if the error is thrown entirely
  // inside dependencies, fall back to whatever frames there are.
  const inApp = frames.filter((frame) => frame.inApp);
  const chosen = (inApp.length > 0 ? inApp : frames).slice(0, MAX_FRAMES);

  return {
    errorType,
    frames: chosen.map((frame) => `${frame.fn} ${frame.file}`),
  };
}

function hash(parts: string[]): string {
  const digest = createHash("sha256")
    .update(parts.join("\u0000"))
    .digest("hex")
    .slice(0, 32);
  return `${FINGERPRINT_VERSION}:${digest}`;
}

export function computeFingerprint(input: {
  level: string;
  message: string;
  service?: string | null;
  stack?: string | null;
  clientFingerprint?: string | null;
}): string {
  const level = input.level;
  const service = input.service ?? "";

  // Client overrides are namespaced by level and service so one service (or
  // API key) can't push its logs into another service's groups.
  if (input.clientFingerprint) {
    return hash(["client", level, service, input.clientFingerprint]);
  }

  const parts = ["auto", level, service, normalizeMessage(input.message)];

  if (input.stack) {
    const { errorType, frames } = extractStackSignature(input.stack);
    if (frames.length > 0) {
      parts.push(errorType ?? "", ...frames);
    }
  }

  return hash(parts);
}
