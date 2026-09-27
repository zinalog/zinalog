import { NextRequest, NextResponse } from "next/server";
import { getAnnouncements } from "@/lib/announcements";
import { dismissAnnouncement, isAnnouncementsEnabled } from "@/lib/db";
import { requireApiUser } from "@/lib/session-auth";
import { APP_VERSION } from "@/lib/version";

export async function POST(req: NextRequest) {
  const auth = await requireApiUser("viewer");
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  const id = body?.id;
  if (typeof id !== "string" || id.trim() === "") {
    return NextResponse.json(
      { error: "Field 'id' is required" },
      { status: 400 }
    );
  }

  // Only record dismissals for announcements that are currently live and
  // dismissible, so the table can't be filled with arbitrary ids.
  const announcements = (await isAnnouncementsEnabled())
    ? await getAnnouncements(APP_VERSION)
    : [];
  const announcement = announcements.find((a) => a.id === id);
  if (!announcement) {
    return NextResponse.json(
      { error: "Announcement not found" },
      { status: 404 }
    );
  }
  if (!announcement.dismissible) {
    return NextResponse.json(
      { error: "Announcement cannot be dismissed" },
      { status: 400 }
    );
  }

  await dismissAnnouncement(auth.user.id, id);
  return NextResponse.json({ status: "dismissed" });
}
