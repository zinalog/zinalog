import assert from "node:assert/strict";
import test from "node:test";
import {
  computeFingerprint,
  extractStackSignature,
  normalizeMessage,
} from "../lib/fingerprint";
import { alertHeadline } from "../lib/alert-format";

test("normalizeMessage replaces variable values with placeholders", () => {
  const cases: Array<[string, string]> = [
    ["User 123 not found", "User <num> not found"],
    [
      "Order 3f2504e0-4f89-11d3-9a0c-0305e82c3301 failed",
      "Order <uuid> failed",
    ],
    ["Invite sent to jane.doe+x@example.co.uk", "Invite sent to <email>"],
    ['Missing key "user_id" in payload', "Missing key <str> in payload"],
    ["Cannot find module 'lodash'", "Cannot find module <str>"],
    ["GET https://api.example.com/v1/users?id=9 failed", "GET <url> failed"],
    ["Connection refused 10.0.0.12:5432", "Connection refused <ip>"],
    ["Expired at 2026-09-27T10:15:30.123Z", "Expired at <date>"],
    ["Segfault at 0x7ffd5e8c", "Segfault at <hex>"],
    ["Commit 9fceb02d0ae598e95dc970b74767f19372d61af8", "Commit <hex>"],
    ["Took 12.5ms", "Took <num>ms"],
    ["Took 500 ms", "Took <num> ms"],
  ];

  for (const [input, expected] of cases) {
    assert.equal(normalizeMessage(input), expected, input);
  }
});

test("normalizeMessage leaves apostrophes and identifiers alone", () => {
  assert.equal(
    normalizeMessage("Can't load user's profile via http2 from S3"),
    "Can't load user's profile via http2 from S3"
  );
  assert.equal(normalizeMessage("  multiple   spaces\n"), "multiple spaces");
});

test("extractStackSignature ignores line numbers, paths and dependency frames", () => {
  const stackA = [
    "TypeError: Cannot read properties of undefined (reading 'id')",
    "    at getUser (/srv/app/lib/users.js:10:5)",
    "    at async handler (/srv/app/api/route.js:22:9)",
    "    at Layer.handle (/srv/app/node_modules/express/lib/router/layer.js:95:5)",
    "    at node:internal/process/task_queues:95:5",
  ].join("\n");
  const stackB = [
    "TypeError: Cannot read properties of undefined (reading 'email')",
    "    at getUser (/home/ci/build/lib/users.js:14:7)",
    "    at async handler (/home/ci/build/api/route.js:30:1)",
  ].join("\n");

  const a = extractStackSignature(stackA);
  assert.equal(a.errorType, "TypeError");
  assert.deepEqual(a.frames, ["getUser lib/users.js", "handler api/route.js"]);
  assert.deepEqual(extractStackSignature(stackB), a);
});

test("extractStackSignature handles gecko frames and bundler hashes", () => {
  const signature = extractStackSignature(
    [
      "render@https://app.example.com/_next/static/chunks/page-3f2a9c1b.js:1:2044",
      "@https://app.example.com/_next/static/chunks/1234-abcd5678.js:1:99",
    ].join("\n")
  );
  assert.equal(signature.errorType, null);
  assert.deepEqual(signature.frames, [
    "render chunks/page-<hash>.js",
    "<anonymous> chunks/<num>-<hash>.js",
  ]);
});

test("extractStackSignature falls back to dependency frames", () => {
  const signature = extractStackSignature(
    [
      "Error: boom",
      "    at parse (/srv/app/node_modules/pg/lib/parser.js:1:1)",
    ].join("\n")
  );
  assert.deepEqual(signature.frames, ["parse lib/parser.js"]);
});

test("computeFingerprint groups logs that differ only in variable values", () => {
  const base = { level: "error", service: "billing-api" };
  const a = computeFingerprint({ ...base, message: "User 1 not found" });
  const b = computeFingerprint({ ...base, message: "User 2 not found" });
  assert.equal(a, b);
  assert.match(a, /^v1:[0-9a-f]{32}$/);

  assert.notEqual(
    a,
    computeFingerprint({ ...base, message: "User 1 was deleted" })
  );
  assert.notEqual(
    a,
    computeFingerprint({
      ...base,
      level: "warning",
      message: "User 1 not found",
    })
  );
  assert.notEqual(
    a,
    computeFingerprint({
      ...base,
      service: "checkout-api",
      message: "User 1 not found",
    })
  );
});

test("computeFingerprint separates same message thrown from different code", () => {
  const base = { level: "error", service: "api", message: "Request failed" };
  const fromUsers = computeFingerprint({
    ...base,
    stack: "Error: Request failed\n    at loadUsers (/app/users.js:1:1)",
  });
  const fromOrders = computeFingerprint({
    ...base,
    stack: "Error: Request failed\n    at loadOrders (/app/orders.js:1:1)",
  });
  assert.notEqual(fromUsers, fromOrders);
});

test("computeFingerprint client override is scoped to level and service", () => {
  const base = { level: "error", clientFingerprint: "payment-timeout" };
  const a = computeFingerprint({ ...base, service: "billing", message: "a 1" });
  const b = computeFingerprint({ ...base, service: "billing", message: "b" });
  const other = computeFingerprint({
    ...base,
    service: "search",
    message: "a",
  });

  assert.equal(a, b);
  assert.notEqual(a, other);
  assert.notEqual(
    a,
    computeFingerprint({ level: "error", service: "billing", message: "a 1" })
  );
});

test("alertHeadline prefixes issue-based alerts", () => {
  assert.equal(alertHeadline({ message: "boom" }), "boom");
  assert.equal(
    alertHeadline({ message: "boom", alert_reason: "new_issue" }),
    "New issue: boom"
  );
  assert.equal(
    alertHeadline({ message: "boom", alert_reason: "regression" }),
    "Regression: boom"
  );
});
