import { NextResponse } from "next/server";
import { getAnnouncements } from "@/lib/announcements";
import { requireApiUser } from "@/lib/session-auth";
import { APP_VERSION } from "@/lib/version";

export async function GET() {
  const auth = await requireApiUser("viewer");
  if (!auth.ok) return auth.response;

  const announcements = await getAnnouncements(APP_VERSION);
  return NextResponse.json({ announcements });
}
