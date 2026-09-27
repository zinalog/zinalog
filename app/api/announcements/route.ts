import { NextResponse } from "next/server";
import { getAnnouncements } from "@/lib/announcements";
import { isAnnouncementsEnabled, listDismissedAnnouncementIds } from "@/lib/db";
import { requireApiUser } from "@/lib/session-auth";
import { APP_VERSION } from "@/lib/version";

export async function GET() {
  const auth = await requireApiUser("viewer");
  if (!auth.ok) return auth.response;

  // Turned off in Settings: skip the remote fetch entirely and tell the
  // bell to hide itself.
  if (!(await isAnnouncementsEnabled())) {
    return NextResponse.json({ enabled: false, announcements: [] });
  }

  const [announcements, dismissed] = await Promise.all([
    getAnnouncements(APP_VERSION),
    listDismissedAnnouncementIds(auth.user.id),
  ]);

  // Non-dismissible announcements always show, even if a dismissal was
  // recorded while the feed still marked them dismissible.
  return NextResponse.json({
    enabled: true,
    announcements: announcements.filter(
      (a) => !a.dismissible || !dismissed.has(a.id)
    ),
  });
}
