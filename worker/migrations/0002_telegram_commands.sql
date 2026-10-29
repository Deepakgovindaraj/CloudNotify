ALTER TABLE user_channels
  ADD COLUMN telegram_notifications_enabled INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS telegram_link_codes (
  code_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_expiry
  ON telegram_link_codes (expires_at);

CREATE TABLE IF NOT EXISTS telegram_updates (
  update_id INTEGER PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
