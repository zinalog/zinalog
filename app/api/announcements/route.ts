import { NextResponse } from "next/server";
import { getAnnouncements } from "@/lib/announcements";
import { listDismissedAnnouncementIds } from "@/lib/db";
import { requireApiUser } from "@/lib/session-auth";
import { APP_VERSION } from "@/lib/version";

export async function GET() {
  const auth = await requireApiUser("viewer");
  if (!auth.ok) return auth.response;

  const [announcements, dismissed] = await Promise.all([
    getAnnouncements(APP_VERSION),
    listDismissedAnnouncementIds(auth.user.id),
  ]);

  // Non-dismissible announcements always show, even if a dismissal was
  // recorded while the feed still marked them dismissible.
  return NextResponse.json({
    announcements: announcements.filter(
      (a) => !a.dismissible || !dismissed.has(a.id)
    ),
  });
}
