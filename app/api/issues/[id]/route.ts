import { NextRequest, NextResponse } from "next/server";
import {
  getIssue,
  getIssueHourlyCounts,
  isIssueStatus,
  listIssueSamples,
  updateIssueStatus,
} from "@/lib/db";
import { getClientIp } from "@/lib/auth";
import { auditUserEvent } from "@/lib/auth/session";
import { requireApiUser } from "@/lib/session-auth";

function parseId(id: string): number | null {
  const numId = Number.parseInt(id, 10);
  return Number.isFinite(numId) ? numId : null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser("viewer");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const issueId = parseId(id);
  if (issueId === null) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const issue = await getIssue(issueId, auth.user.allowed_services);
  if (!issue) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  const [hourly, samples] = await Promise.all([
    getIssueHourlyCounts(issue.fingerprint),
    listIssueSamples(issue.fingerprint),
  ]);

  return NextResponse.json({ issue, hourly, samples });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser("operator");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const issueId = parseId(id);
  if (issueId === null) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isIssueStatus(body.status)) {
    return NextResponse.json(
      { error: "Field 'status' must be one of: open, resolved, ignored" },
      { status: 400 }
    );
  }

  // Scoped by the user's service access, so an operator can't triage issues
  // from services they can't see.
  const issue = await getIssue(issueId, auth.user.allowed_services);
  if (!issue) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  await updateIssueStatus(issue.id, body.status, auth.user.username);
  await auditUserEvent({
    actor: auth.user,
    action: "issue_status_changed",
    resource: `issue:${issue.id}`,
    ipAddress: getClientIp(req),
    userAgent: req.headers.get("user-agent"),
    details: {
      from: issue.status,
      to: body.status,
      service: issue.service,
      title: issue.title.slice(0, 200),
    },
  });

  return NextResponse.json({
    issue: await getIssue(issue.id, auth.user.allowed_services),
  });
}
