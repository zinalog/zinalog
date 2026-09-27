import { NextRequest, NextResponse } from "next/server";
import { getAnnouncements } from "@/lib/announcements";
import { dismissAnnouncement } from "@/lib/db";
import { requireApiUser } from "@/lib/session-auth";
import { APP_VERSION } from "@/lib/version";

// Feed ids are short slugs like "2026-09-27-maintenance".
const MAX_ID_LENGTH = 200;

export async function POST(req: NextRequest) {
  const auth = await requireApiUser("viewer");
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (id === "" || id.length > MAX_ID_LENGTH) {
    return NextResponse.json(
      { error: `Field 'id' must be 1-${MAX_ID_LENGTH} characters` },
      { status: 400 }
    );
  }

  // The dismissal is recorded even if this server can't currently confirm the
  // id against the feed (fetch failed, stale cache): the row only affects
  // this user's own view. A notice the feed marks non-dismissible is refused.
  const announcements = await getAnnouncements(APP_VERSION);
  if (announcements.some((a) => a.id === id && !a.dismissible)) {
    return NextResponse.json(
      { error: "Announcement cannot be dismissed" },
      { status: 400 }
    );
  }

  await dismissAnnouncement(auth.user.id, id);
  return NextResponse.json({ status: "dismissed" });
}
