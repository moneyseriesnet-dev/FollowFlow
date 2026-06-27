-- Migration: Add Google Email to google_credentials
-- Created: 2026-06-27

ALTER TABLE google_credentials ADD COLUMN IF NOT EXISTS google_email text;
comment on column google_credentials.google_email is 'The email address of the connected Google account.';
