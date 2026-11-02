CREATE TABLE IF NOT EXISTS bulk_campaigns (
  campaign_id TEXT PRIMARY KEY,
  owner_email TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  campaign_description TEXT NOT NULL DEFAULT '',
  organization_name TEXT NOT NULL,
  campaign_type TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  reply_to_email TEXT,
  campaign_date TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bulk_campaigns_owner
  ON bulk_campaigns (owner_email, created_at);

CREATE TABLE IF NOT EXISTS bulk_campaign_recipients (
  recipient_id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES bulk_campaigns (campaign_id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  candidate_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  recipient_data TEXT NOT NULL DEFAULT '{}',
  validation_status TEXT NOT NULL,
  validation_errors TEXT NOT NULL DEFAULT '[]',
  included INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bulk_recipients_campaign
  ON bulk_campaign_recipients (campaign_id, validation_status, row_number);
