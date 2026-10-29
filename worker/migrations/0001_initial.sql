CREATE TABLE IF NOT EXISTS notifications (
  notification_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  scheduled_date TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  channel TEXT NOT NULL,
  recurring INTEGER NOT NULL DEFAULT 0,
  recurrence TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TEXT,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_notifications_owner
  ON notifications (owner_email, scheduled_date, scheduled_time);

CREATE INDEX IF NOT EXISTS idx_notifications_due
  ON notifications (status, scheduled_date, scheduled_time);

CREATE TABLE IF NOT EXISTS user_channels (
  email TEXT PRIMARY KEY,
  telegram_chat_id TEXT,
  telegram_username TEXT,
  telegram_connected INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
