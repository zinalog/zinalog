import { getDb } from "./core";

export async function listDismissedAnnouncementIds(
  userId: number
): Promise<Set<string>> {
  const database = await getDb();
  const rows = await database.all<{ announcement_id: string }[]>(
    "SELECT announcement_id FROM announcement_dismissals WHERE user_id = ?",
    [userId]
  );
  return new Set(rows.map((row) => row.announcement_id));
}

export async function dismissAnnouncement(
  userId: number,
  announcementId: string
): Promise<void> {
  const database = await getDb();
  await database.run(
    `INSERT OR IGNORE INTO announcement_dismissals (user_id, announcement_id)
     VALUES (?, ?)`,
    [userId, announcementId]
  );
}
