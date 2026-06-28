-- Add amount_paid column to activities table
ALTER TABLE activities ADD COLUMN amount_paid numeric(10,2);

-- Update check constraint on activities.activity_type to include 'premium_payment'
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_activity_type_check;
ALTER TABLE activities ADD CONSTRAINT activities_activity_type_check CHECK (activity_type IN ('meeting', 'phone_call', 'line_chat', 'email', 'follow_up', 'policy_delivery', 'claim_support', 'premium_payment', 'other'));
