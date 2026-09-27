-- migrate:up
-- Remote announcements a user has dismissed, keyed by the announcement's id
-- from the public feed (ids are never reused there), so a dismissal follows
-- the account across browsers and devices.
CREATE TABLE IF NOT EXISTS announcement_dismissals (
  user_id          INTEGER NOT NULL,
  announcement_id  TEXT NOT NULL,
  dismissed_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, announcement_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- migrate:down
DROP TABLE IF EXISTS announcement_dismissals;
