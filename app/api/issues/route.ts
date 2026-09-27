import { NextRequest, NextResponse } from "next/server";
import { countIssuesByStatus, isIssueStatus, listIssues } from "@/lib/db";
import { requireApiUser } from "@/lib/session-auth";

const VALID_LEVELS = ["info", "warning", "error", "debug"];

export async function GET(req: NextRequest) {
  const auth = await requireApiUser("viewer");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const level = searchParams.get("level") ?? "error";
  if (!VALID_LEVELS.includes(level)) {
    return NextResponse.json(
      { error: `Invalid level. Must be one of: ${VALID_LEVELS.join(", ")}` },
      { status: 400 }
    );
  }

  const rawStatus = searchParams.get("status") ?? "open";
  if (rawStatus !== "all" && !isIssueStatus(rawStatus)) {
    return NextResponse.json(
      { error: "Invalid status. Must be one of: open, resolved, ignored, all" },
      { status: 400 }
    );
  }

  const [issues, counts] = await Promise.all([
    listIssues({ level, status: rawStatus }, auth.user.allowed_services),
    countIssuesByStatus(level, auth.user.allowed_services),
  ]);

  return NextResponse.json({ issues, counts });
}
