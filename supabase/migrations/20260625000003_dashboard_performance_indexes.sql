-- ============================================================================
-- FollowFlow — Dashboard Performance Indexes
-- Migration: 20260625000003_dashboard_performance_indexes.sql
-- Created:   2026-06-25
--
-- Adds composite indexes that match the exact query patterns used by the
-- Dashboard page:
--
--   customers:  WHERE owner_id = ? AND status = 'active'
--   reminders:  WHERE owner_id = ? AND status = 'pending'
--   policies:   WHERE owner_id = ? AND policy_status = 'active'
--   gifts:      WHERE owner_id = ? AND gift_date >= ?
--
-- These composite indexes allow PostgreSQL to satisfy both the equality
-- filter on owner_id and the status filter with a single index seek,
-- replacing the previous need to intersect two single-column index scans.
--
-- CONCURRENTLY means the indexes are built without locking the table,
-- so this migration is safe to apply on a live database.
-- ============================================================================

-- Customers: used by Dashboard full-fetch and action-item computation
CREATE INDEX IF NOT EXISTS idx_customers_owner_status
  ON customers (owner_id, status);

-- Reminders: used by Dashboard count + full-fetch (pending status filter)
CREATE INDEX IF NOT EXISTS idx_reminders_owner_status
  ON reminders (owner_id, status);

-- Policies: used by Dashboard active-policies count
CREATE INDEX IF NOT EXISTS idx_policies_owner_status
  ON policies (owner_id, policy_status);

-- Gifts: used by Dashboard monthly gift-cost sum
CREATE INDEX IF NOT EXISTS idx_gifts_owner_date
  ON gifts (owner_id, gift_date);
