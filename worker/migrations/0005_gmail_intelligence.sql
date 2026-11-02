ALTER TABLE notifications
  ADD COLUMN processing_started_at TEXT;

CREATE TABLE IF NOT EXISTS gmail_connections (
  owner_email TEXT PRIMARY KEY,
  gmail_email TEXT NOT NULL,
  refresh_token_ciphertext TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CONNECTED',
  connected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gmail_oauth_states (
  state_hash TEXT PRIMARY KEY,
  owner_email TEXT NOT NULL,
  app_origin TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  verifier_ciphertext TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gmail_oauth_states_expiry
  ON gmail_oauth_states (expires_at);

CREATE TABLE IF NOT EXISTS gmail_sync_state (
  owner_email TEXT PRIMARY KEY,
  sync_mode TEXT NOT NULL DEFAULT 'INITIAL',
  history_id TEXT,
  page_token TEXT,
  sync_lock_until TEXT,
  sync_status TEXT NOT NULL DEFAULT 'IDLE',
  last_sync_started_at TEXT,
  last_successful_sync_at TEXT,
  last_error TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gmail_messages (
  owner_email TEXT NOT NULL,
  mailbox_email TEXT NOT NULL,
  message_id TEXT NOT NULL,
  thread_id TEXT,
  received_at TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  event_id TEXT,
  processed_at TEXT,
  error_code TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (owner_email, mailbox_email, message_id)
);

CREATE INDEX IF NOT EXISTS idx_gmail_messages_status
  ON gmail_messages (owner_email, mailbox_email, status);

CREATE TABLE IF NOT EXISTS interview_events (
  event_id TEXT PRIMARY KEY,
  owner_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'REVIEW',
  company_name TEXT,
  job_role TEXT,
  interview_date TEXT,
  interview_time TEXT,
  timezone TEXT,
  location TEXT,
  meeting_url TEXT,
  interview_type TEXT NOT NULL DEFAULT 'unknown',
  confidence REAL NOT NULL DEFAULT 0,
  delivery_channel TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_interview_events_owner
  ON interview_events (owner_email, status, interview_date);

CREATE TABLE IF NOT EXISTS interview_event_sources (
  event_id TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  mailbox_email TEXT NOT NULL,
  message_id TEXT NOT NULL,
  thread_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id, message_id),
  UNIQUE (owner_email, mailbox_email, message_id)
);

CREATE INDEX IF NOT EXISTS idx_interview_sources_owner
  ON interview_event_sources (owner_email, event_id);

CREATE TABLE IF NOT EXISTS interview_reminders (
  event_id TEXT NOT NULL,
  reminder_type TEXT NOT NULL,
  notification_id TEXT UNIQUE,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id, reminder_type)
);

CREATE TABLE IF NOT EXISTS user_settings (
  owner_email TEXT PRIMARY KEY,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gmail_rate_limits (
  rate_limit_key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0
);
