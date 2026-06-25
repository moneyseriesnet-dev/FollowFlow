-- Migration: AI-Assisted CRM and Placeholder Columns
-- Created: 2026-06-24

-- 1. Alter customers table to support AI cache and team placeholders
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_suggested_level_id uuid REFERENCES customer_levels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_suggested_level_reason text,
  ADD COLUMN IF NOT EXISTS ai_suggested_actions jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_last_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS needs_special_follow_up boolean DEFAULT false,
  -- Placeholders for future ownership & team roles
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team_id uuid;

COMMENT ON COLUMN customers.ai_summary IS 'AI generated description of customer account relationship.';
COMMENT ON COLUMN customers.ai_suggested_level_id IS 'AI recommended customer priority tier level.';
COMMENT ON COLUMN customers.assigned_to IS 'Owner/assignee identifier for future multi-user sales roles.';
COMMENT ON COLUMN customers.team_id IS 'Team collaboration identifier for shared customer management.';

-- 2. Alter policies table to support team placeholders
ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team_id uuid;

COMMENT ON COLUMN policies.assigned_to IS 'Sales agent owner of the policy for commissions & reviews.';
COMMENT ON COLUMN policies.team_id IS 'Team collaboration identifier for shared policy reviews.';
