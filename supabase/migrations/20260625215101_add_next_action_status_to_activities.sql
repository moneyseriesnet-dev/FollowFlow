-- Add next_action_status and next_action_completed_at to activities table
ALTER TABLE activities ADD COLUMN next_action_status text DEFAULT 'pending' CHECK (next_action_status IN ('pending', 'done'));
ALTER TABLE activities ADD COLUMN next_action_completed_at timestamptz;
