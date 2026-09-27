import assert from "node:assert/strict";
import test from "node:test";
import { compareVersions, parseAnnouncementsFeed } from "../lib/announcements";

const NOW = Date.parse("2026-09-27T12:00:00Z");

function item(overrides: Record<string, unknown> = {}) {
  return {
    id: "2026-09-27-maintenance",
    type: "warning",
    title: "Scheduled Maintenance",
    message: "ZinaLog services will undergo scheduled maintenance.",
    publishedAt: "2026-09-27T10:00:00Z",
    expiresAt: null,
    minVersion: null,
    maxVersion: null,
    dismissible: true,
    url: null,
    ...overrides,
  };
}

function feed(...notifications: unknown[]) {
  return { version: 1, notifications };
}

test("parseAnnouncementsFeed returns only display fields for valid items", () => {
  const [a] = parseAnnouncementsFeed(
    feed(item({ url: "https://zinalog.dev/x" })),
    "0.2.4",
    NOW
  );
  assert.deepEqual(a, {
    id: "2026-09-27-maintenance",
    type: "warning",
    title: "Scheduled Maintenance",
    message: "ZinaLog services will undergo scheduled maintenance.",
    publishedAt: "2026-09-27T10:00:00.000Z",
    dismissible: true,
    url: "https://zinalog.dev/x",
    releaseVersion: null,
  });
});

test("parseAnnouncementsFeed rejects unknown feed versions and bad shapes", () => {
  assert.deepEqual(parseAnnouncementsFeed(null, "0.2.4", NOW), []);
  assert.deepEqual(parseAnnouncementsFeed([], "0.2.4", NOW), []);
  assert.deepEqual(
    parseAnnouncementsFeed(
      { version: 2, notifications: [item()] },
      "0.2.4",
      NOW
    ),
    []
  );
  assert.deepEqual(
    parseAnnouncementsFeed({ version: 1, notifications: {} }, "0.2.4", NOW),
    []
  );
});

test("parseAnnouncementsFeed skips invalid items but keeps valid ones", () => {
  const result = parseAnnouncementsFeed(
    feed(
      item({ id: "ok" }),
      item({ id: "bad-type", type: "critical" }),
      item({ id: "" }),
      item({ id: "no-title", title: "" }),
      item({ id: "bad-dismissible", dismissible: "yes" }),
      item({ id: "extra-key", html: "<b>x</b>" }),
      item({ id: "http-url", url: "http://example.com" }),
      item({ id: "bad-date", publishedAt: "yesterday" }),
      "not an object"
    ),
    "0.2.4",
    NOW
  );
  assert.deepEqual(
    result.map((a) => a.id),
    ["ok"]
  );
});

test("parseAnnouncementsFeed hides expired and future-dated items", () => {
  const result = parseAnnouncementsFeed(
    feed(
      item({ id: "expired", expiresAt: "2026-09-27T11:00:00Z" }),
      item({ id: "active", expiresAt: "2026-09-30T10:00:00Z" }),
      item({ id: "future", publishedAt: "2026-09-28T00:00:00Z" })
    ),
    "0.2.4",
    NOW
  );
  assert.deepEqual(
    result.map((a) => a.id),
    ["active"]
  );
});

test("parseAnnouncementsFeed applies inclusive version bounds", () => {
  const result = parseAnnouncementsFeed(
    feed(
      item({ id: "min-ok", minVersion: "0.2.4" }),
      item({ id: "min-high", minVersion: "0.3.0" }),
      item({ id: "max-ok", maxVersion: "0.2.4" }),
      item({ id: "max-low", maxVersion: "0.2.3" }),
      item({ id: "range", minVersion: "0.2", maxVersion: "1.0.0" })
    ),
    "0.2.4",
    NOW
  );
  assert.deepEqual(result.map((a) => a.id).sort(), [
    "max-ok",
    "min-ok",
    "range",
  ]);
});

test("parseAnnouncementsFeed sorts newest first and drops duplicate ids", () => {
  const result = parseAnnouncementsFeed(
    feed(
      item({ id: "old", publishedAt: "2026-09-01T00:00:00Z" }),
      item({ id: "new", publishedAt: "2026-09-26T00:00:00Z" }),
      item({ id: "old", title: "Duplicate" })
    ),
    "0.2.4",
    NOW
  );
  assert.deepEqual(
    result.map((a) => a.id),
    ["new", "old"]
  );
  assert.equal(result[1].title, "Scheduled Maintenance");
});

function release(version: string, overrides: Record<string, unknown> = {}) {
  return item({
    id: `release-${version}`,
    type: "release",
    title: `ZinaLog ${version}`,
    releaseVersion: version,
    ...overrides,
  });
}

test("release announcements show only while the install is older", () => {
  const ids = (version: string) =>
    parseAnnouncementsFeed(feed(release("0.3.0")), version, NOW).map(
      (a) => a.id
    );
  assert.deepEqual(ids("0.2.4"), ["release-0.3.0"]);
  assert.deepEqual(ids("0.3.0"), []);
  assert.deepEqual(ids("0.3.1"), []);
});

test("release announcements ignore expiresAt", () => {
  const [a] = parseAnnouncementsFeed(
    feed(release("0.3.0", { expiresAt: "2026-01-01T00:00:00Z" })),
    "0.2.4",
    NOW
  );
  assert.equal(a.id, "release-0.3.0");
  assert.equal(a.releaseVersion, "0.3.0");
});

test("only the newest release announcement is shown", () => {
  const result = parseAnnouncementsFeed(
    feed(
      release("0.3.0"),
      release("0.10.0", { publishedAt: "2026-09-01T00:00:00Z" }),
      release("0.4.0"),
      item({ id: "other" })
    ),
    "0.2.4",
    NOW
  );
  assert.deepEqual(result.map((a) => a.id).sort(), ["other", "release-0.10.0"]);
});

test("releaseVersion is required for releases and rejected elsewhere", () => {
  const result = parseAnnouncementsFeed(
    feed(
      release("0.3.0", { id: "missing", releaseVersion: null }),
      release("0.3.0", { id: "garbage", releaseVersion: "latest" }),
      item({ id: "info-with-version", releaseVersion: "0.3.0" })
    ),
    "0.2.4",
    NOW
  );
  assert.deepEqual(result, []);
});

test("compareVersions handles partial and prefixed versions", () => {
  assert.equal(compareVersions("0.2.4", "0.2.4"), 0);
  assert.equal(compareVersions("v1.0", "1.0.0"), 0);
  assert.equal(compareVersions("0.10.0", "0.9.9"), 1);
  assert.equal(compareVersions("0.2.4 (abc1234)", "0.3"), -1);
  assert.equal(compareVersions("nope", "1.0.0"), null);
});
