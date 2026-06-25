-- Migration: Google Calendar Sync Tables and Columns
-- Created: 2026-06-24

-- 1. Create google_credentials table
CREATE TABLE google_credentials (
  owner_id      uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token  text        NOT NULL,
  refresh_token text        NOT NULL,
  expires_at    timestamptz NOT NULL,
  calendar_id   text        DEFAULT 'primary' NOT NULL,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

COMMENT ON TABLE google_credentials IS 'Secure storage for Google Calendar OAuth tokens linked to each agent.';

-- 2. Enable RLS on google_credentials
ALTER TABLE google_credentials ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for google_credentials
CREATE POLICY "Select credentials" ON google_credentials FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Insert credentials" ON google_credentials FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Update credentials" ON google_credentials FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Delete credentials" ON google_credentials FOR DELETE USING (owner_id = auth.uid());

-- 4. Alter reminders table to support calendar event tracking
ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS google_event_id text,
  ADD COLUMN IF NOT EXISTS google_sync_status text DEFAULT 'unsynced' CHECK (google_sync_status IN ('unsynced', 'synced', 'failed')),
  ADD COLUMN IF NOT EXISTS google_sync_enabled boolean DEFAULT true;

-- 5. Add triggers for auto-updating updated_at on google_credentials
CREATE OR REPLACE TRIGGER update_google_credentials_updated_at
  BEFORE UPDATE ON google_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
