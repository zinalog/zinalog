// Global announcements published at github.com/zinalog/notifications.
// Named "announcements" to avoid clashing with lib/notifications.ts, which
// delivers alert notifications to Slack/Telegram/etc.
//
// The feed is public and remote, so every item is validated against the
// published schema before it reaches the UI, and any failure (network,
// bad JSON, unknown format version) degrades to an empty list.

export const ANNOUNCEMENTS_URL =
  "https://raw.githubusercontent.com/zinalog/notifications/main/notifications.json";

const SUPPORTED_FEED_VERSION = 1;
const CACHE_TTL_MS = 60 * 60 * 1000;
const FAILURE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;

export const ANNOUNCEMENT_TYPES = [
  "info",
  "warning",
  "error",
  "success",
  "release",
] as const;
export type AnnouncementType = (typeof ANNOUNCEMENT_TYPES)[number];

// Only the fields the UI renders. Version bounds and expiry are applied on
// the server and not sent to the browser. releaseVersion is set only for
// "release" announcements.
export interface Announcement {
  id: string;
  type: AnnouncementType;
  title: string;
  message: string;
  publishedAt: string;
  dismissible: boolean;
  url: string | null;
  releaseVersion: string | null;
}

const ALLOWED_KEYS = new Set([
  "id",
  "type",
  "title",
  "message",
  "publishedAt",
  "expiresAt",
  "minVersion",
  "maxVersion",
  "dismissible",
  "url",
  "releaseVersion",
]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNullableString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function parseTimestamp(value: string): number | null {
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

function parseVersion(value: string): number[] | null {
  const match = value.trim().match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) return null;
  return [match[1], match[2], match[3]].map((part) => Number(part ?? 0));
}

export function compareVersions(a: string, b: string): number | null {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return null;
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return left[i] < right[i] ? -1 : 1;
  }
  return 0;
}

function appliesToVersion(
  appVersion: string,
  minVersion: string | null | undefined,
  maxVersion: string | null | undefined
): boolean {
  if (minVersion) {
    const cmp = compareVersions(appVersion, minVersion);
    if (cmp === null || cmp < 0) return false;
  }
  if (maxVersion) {
    const cmp = compareVersions(appVersion, maxVersion);
    if (cmp === null || cmp > 0) return false;
  }
  return true;
}

function parseAnnouncement(
  raw: unknown,
  appVersion: string,
  now: number
): Announcement | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  if (Object.keys(item).some((key) => !ALLOWED_KEYS.has(key))) return null;

  const { id, type, title, message, publishedAt, dismissible } = item;
  if (
    !isNonEmptyString(id) ||
    !ANNOUNCEMENT_TYPES.includes(type as AnnouncementType) ||
    !isNonEmptyString(title) ||
    !isNonEmptyString(message) ||
    !isNonEmptyString(publishedAt) ||
    typeof dismissible !== "boolean" ||
    !isNullableString(item.expiresAt) ||
    !isNullableString(item.minVersion) ||
    !isNullableString(item.maxVersion) ||
    !isNullableString(item.url) ||
    !isNullableString(item.releaseVersion)
  ) {
    return null;
  }

  const published = parseTimestamp(publishedAt);
  if (published === null || published > now) return null;

  // A release announcement stays up until this install is on that version or
  // newer, whatever its expiresAt says. Other types must not carry one.
  let releaseVersion: string | null = null;
  if (type === "release") {
    if (!isNonEmptyString(item.releaseVersion)) return null;
    const cmp = compareVersions(appVersion, item.releaseVersion);
    if (cmp === null || cmp >= 0) return null;
    releaseVersion = item.releaseVersion.trim();
  } else if (item.releaseVersion) {
    return null;
  } else if (item.expiresAt) {
    const expires = parseTimestamp(item.expiresAt);
    if (expires === null || expires <= now) return null;
  }

  if (!appliesToVersion(appVersion, item.minVersion, item.maxVersion)) {
    return null;
  }

  let url: string | null = null;
  if (item.url) {
    try {
      const parsed = new URL(item.url);
      if (parsed.protocol !== "https:") return null;
      url = parsed.toString();
    } catch {
      return null;
    }
  }

  return {
    id,
    type: type as AnnouncementType,
    title,
    message,
    publishedAt: new Date(published).toISOString(),
    dismissible,
    url,
    releaseVersion,
  };
}

// Invalid items are skipped individually so one bad entry can't hide the
// rest of the feed. An unrecognised top-level shape or format version yields
// nothing, since its items may not mean what this parser assumes.
export function parseAnnouncementsFeed(
  data: unknown,
  appVersion: string,
  now: number = Date.now()
): Announcement[] {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  const feed = data as Record<string, unknown>;
  if (feed.version !== SUPPORTED_FEED_VERSION) return [];
  if (!Array.isArray(feed.notifications)) return [];

  const seen = new Set<string>();
  const announcements: Announcement[] = [];
  let latestRelease: Announcement | null = null;
  for (const raw of feed.notifications) {
    const announcement = parseAnnouncement(raw, appVersion, now);
    if (!announcement || seen.has(announcement.id)) continue;
    seen.add(announcement.id);
    // Only the newest release is worth announcing; older ones are superseded.
    if (announcement.releaseVersion) {
      if (
        !latestRelease?.releaseVersion ||
        (compareVersions(
          announcement.releaseVersion,
          latestRelease.releaseVersion
        ) ?? 0) > 0
      ) {
        latestRelease = announcement;
      }
      continue;
    }
    announcements.push(announcement);
  }
  if (latestRelease) announcements.push(latestRelease);

  return announcements.sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
  );
}

// Kept on globalThis rather than in module scope: Next.js can load this
// module separately for each route, and every route must see the same feed.
interface FeedCache {
  entry: { data: unknown; expiresAt: number } | null;
  inflight: Promise<unknown> | null;
}

declare global {
  var __announcementsCache: FeedCache | undefined;
}

function feedCache(): FeedCache {
  globalThis.__announcementsCache ??= { entry: null, inflight: null };
  return globalThis.__announcementsCache;
}

async function fetchFeed(): Promise<unknown> {
  const state = feedCache();
  try {
    const res = await fetch(ANNOUNCEMENTS_URL, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: unknown = await res.json();
    state.entry = { data, expiresAt: Date.now() + CACHE_TTL_MS };
  } catch {
    // Keep serving the last good feed if there is one; otherwise cache the
    // failure briefly so an unreachable GitHub isn't hit on every request.
    state.entry = {
      data: state.entry?.data ?? null,
      expiresAt: Date.now() + FAILURE_TTL_MS,
    };
  }
  return state.entry.data;
}

export async function getAnnouncements(
  appVersion: string
): Promise<Announcement[]> {
  const state = feedCache();
  let data: unknown;
  if (state.entry && state.entry.expiresAt > Date.now()) {
    data = state.entry.data;
  } else {
    state.inflight ??= fetchFeed().finally(() => {
      state.inflight = null;
    });
    data = await state.inflight;
  }

  // Expiry is re-evaluated on every call, not just when the feed is fetched.
  return parseAnnouncementsFeed(data, appVersion);
}
