ALTER TABLE bulk_campaigns
  ADD COLUMN email_subject TEXT NOT NULL DEFAULT '';

ALTER TABLE bulk_campaigns
  ADD COLUMN email_body TEXT NOT NULL DEFAULT '';

ALTER TABLE bulk_campaigns
  ADD COLUMN document_title TEXT NOT NULL DEFAULT '';

ALTER TABLE bulk_campaigns
  ADD COLUMN document_body TEXT NOT NULL DEFAULT '';
