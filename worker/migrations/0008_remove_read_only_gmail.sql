DELETE FROM notifications
WHERE notification_id IN (
  SELECT notification_id FROM interview_reminders
)
AND status IN ('PENDING', 'PROCESSING');

DROP TABLE IF EXISTS interview_reminders;
DROP TABLE IF EXISTS interview_event_sources;
DROP TABLE IF EXISTS interview_events;
DROP TABLE IF EXISTS gmail_messages;
DROP TABLE IF EXISTS gmail_sync_state;
DROP TABLE IF EXISTS gmail_oauth_states;
DROP TABLE IF EXISTS gmail_connections;
DROP TABLE IF EXISTS gmail_rate_limits;
