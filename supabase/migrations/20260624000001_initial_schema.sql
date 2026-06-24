-- ============================================================================
-- FollowFlow — Initial Database Schema
-- Migration: 20260624000001_initial_schema.sql
-- Created:   2026-06-24
--
-- Insurance CRM for Thai insurance agents.
-- All tables enforce row-level security via owner_id = auth.uid().
-- ============================================================================


-- ============================================================================
-- 1. CUSTOMER LEVELS
-- Tiered classification for customers (e.g. VIP, Gold, Standard).
-- Supports manual assignment or AI-suggested/auto-detected rules.
-- ============================================================================

CREATE TABLE customer_levels (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_by  uuid        REFERENCES auth.users ON DELETE SET NULL,
  updated_by  uuid        REFERENCES auth.users ON DELETE SET NULL,

  name        text        NOT NULL,
  description text,
  color       text        DEFAULT '#6B7280',
  rule_type   text        DEFAULT 'manual'
                          CHECK (rule_type IN ('manual', 'ai_suggested', 'auto_detected')),
  rule_config jsonb       DEFAULT '{}',

  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),

  UNIQUE (owner_id, name)
);

COMMENT ON TABLE customer_levels IS 'Customer tier/segment definitions owned by each agent.';


-- ============================================================================
-- 2. CUSTOMERS
-- Core contact records for insured individuals.
-- ============================================================================

CREATE TABLE customers (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                  uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_by                uuid        REFERENCES auth.users ON DELETE SET NULL,
  updated_by                uuid        REFERENCES auth.users ON DELETE SET NULL,

  full_name                 text        NOT NULL,
  phone                     text,
  email                     text,
  line_id                   text,
  birth_date                date,
  address                   text,

  customer_level_id         uuid        REFERENCES customer_levels ON DELETE SET NULL,
  status                    text        DEFAULT 'active'
                                        CHECK (status IN ('active', 'inactive', 'archived')),

  personal_note             text,
  last_contact_date         timestamptz,
  next_financial_review_date timestamptz,

  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);

COMMENT ON TABLE customers IS 'Insurance customer contacts owned by each agent.';


-- ============================================================================
-- 3. POLICIES
-- Insurance policy records linked to a customer.
-- ============================================================================

CREATE TABLE policies (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id             uuid          NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_by           uuid          REFERENCES auth.users ON DELETE SET NULL,
  updated_by           uuid          REFERENCES auth.users ON DELETE SET NULL,

  customer_id          uuid          NOT NULL REFERENCES customers ON DELETE CASCADE,

  company              text          NOT NULL
                                     CHECK (company IN ('AXA', 'AIA', 'OTHER')),
  policy_number        text          NOT NULL,
  insured_name         text,
  payer_name           text,
  plan_name            text,

  sum_assured          numeric(15,2),
  premium_amount       numeric(15,2),
  payment_frequency    text          DEFAULT 'monthly'
                                     CHECK (payment_frequency IN ('monthly', 'quarterly', 'semi_annual', 'annual')),

  policy_start_date    date,
  next_premium_due_date date,
  policy_status        text          DEFAULT 'active'
                                     CHECK (policy_status IN ('active', 'lapsed', 'cancelled', 'matured', 'pending')),

  policy_note          text,
  source               text          DEFAULT 'manual'
                                     CHECK (source IN ('manual', 'ocr_import')),

  created_at           timestamptz   DEFAULT now(),
  updated_at           timestamptz   DEFAULT now(),

  UNIQUE (owner_id, policy_number)
);

COMMENT ON TABLE policies IS 'Insurance policies per customer, supporting AXA/AIA/OTHER companies.';


-- ============================================================================
-- 4. REMINDERS
-- Scheduled follow-ups tied to customers and optionally to policies.
-- ============================================================================

CREATE TABLE reminders (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id             uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_by           uuid        REFERENCES auth.users ON DELETE SET NULL,
  updated_by           uuid        REFERENCES auth.users ON DELETE SET NULL,

  customer_id          uuid        NOT NULL REFERENCES customers ON DELETE CASCADE,
  policy_id            uuid        REFERENCES policies ON DELETE SET NULL,

  reminder_type        text        NOT NULL
                                   CHECK (reminder_type IN ('premium_due', 'birthday', 'financial_review', 'general', 'follow_up')),
  title                text        NOT NULL,
  description          text,

  due_date             date        NOT NULL,
  reminder_offset_days integer     DEFAULT 0,
  status               text        DEFAULT 'pending'
                                   CHECK (status IN ('pending', 'done', 'snoozed', 'cancelled')),
  priority             text        DEFAULT 'normal'
                                   CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  next_action_date     date,
  completed_at         timestamptz,

  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

COMMENT ON TABLE reminders IS 'Scheduled reminders for premium payments, birthdays, reviews, etc.';


-- ============================================================================
-- 5. ACTIVITIES
-- Interaction log entries (calls, meetings, chats) linked to customers.
-- ============================================================================

CREATE TABLE activities (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_by              uuid        REFERENCES auth.users ON DELETE SET NULL,
  updated_by              uuid        REFERENCES auth.users ON DELETE SET NULL,

  customer_id             uuid        NOT NULL REFERENCES customers ON DELETE CASCADE,
  policy_id               uuid        REFERENCES policies ON DELETE SET NULL,
  reminder_id             uuid        REFERENCES reminders ON DELETE SET NULL,

  activity_type           text        NOT NULL
                                      CHECK (activity_type IN (
                                        'meeting', 'phone_call', 'line_chat', 'email',
                                        'follow_up', 'policy_delivery', 'claim_support', 'other'
                                      )),
  activity_date           timestamptz NOT NULL DEFAULT now(),
  summary                 text,
  result                  text,
  status_after_activity   text,
  next_action_date        date,

  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

COMMENT ON TABLE activities IS 'Log of all agent–customer interactions.';


-- ============================================================================
-- 6. GIFTS
-- Gift records tied to customers and optionally to an activity.
-- ============================================================================

CREATE TABLE gifts (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid          NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_by    uuid          REFERENCES auth.users ON DELETE SET NULL,
  updated_by    uuid          REFERENCES auth.users ON DELETE SET NULL,

  customer_id   uuid          NOT NULL REFERENCES customers ON DELETE CASCADE,
  activity_id   uuid          REFERENCES activities ON DELETE SET NULL,

  gift_name     text          NOT NULL,
  gift_cost     numeric(10,2) DEFAULT 0,
  gift_date     date          NOT NULL DEFAULT CURRENT_DATE,
  note          text,

  created_at    timestamptz   DEFAULT now(),
  updated_at    timestamptz   DEFAULT now()
);

COMMENT ON TABLE gifts IS 'Gifts given to customers, optionally linked to an activity.';


-- ============================================================================
-- 7. IMPORT BATCHES
-- A batch of OCR-imported policy images from AXA or AIA agent portals.
-- ============================================================================

CREATE TABLE import_batches (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_by          uuid        REFERENCES auth.users ON DELETE SET NULL,
  updated_by          uuid        REFERENCES auth.users ON DELETE SET NULL,

  source_company      text        NOT NULL
                                  CHECK (source_company IN ('AXA', 'AIA')),
  status              text        DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'processing', 'reviewing', 'completed', 'failed')),
  total_images        integer     DEFAULT 0,
  total_rows_detected integer     DEFAULT 0,

  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

COMMENT ON TABLE import_batches IS 'OCR import batch headers for bulk policy ingestion.';


-- ============================================================================
-- 8. IMPORT IMAGES
-- Individual images within an import batch, each processed by OCR.
-- ============================================================================

CREATE TABLE import_images (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_by      uuid        REFERENCES auth.users ON DELETE SET NULL,
  updated_by      uuid        REFERENCES auth.users ON DELETE SET NULL,

  import_batch_id uuid        NOT NULL REFERENCES import_batches ON DELETE CASCADE,

  image_url       text        NOT NULL,
  source_company  text        NOT NULL
                              CHECK (source_company IN ('AXA', 'AIA')),
  ocr_status      text        DEFAULT 'pending'
                              CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed')),

  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

COMMENT ON TABLE import_images IS 'Individual uploaded images within an import batch.';


-- ============================================================================
-- 9. IMPORT DRAFT ROWS
-- OCR-detected policy data rows pending human review before committing.
-- ============================================================================

CREATE TABLE import_draft_rows (
  id                        uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                  uuid          NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_by                uuid          REFERENCES auth.users ON DELETE SET NULL,
  updated_by                uuid          REFERENCES auth.users ON DELETE SET NULL,

  import_batch_id           uuid          NOT NULL REFERENCES import_batches ON DELETE CASCADE,
  import_image_id           uuid          REFERENCES import_images ON DELETE SET NULL,

  raw_ocr_text              text,
  detected_customer_name    text,
  detected_policy_number    text,
  detected_company          text
                            CHECK (detected_company IN ('AXA', 'AIA', 'OTHER')),
  detected_plan_name        text,
  detected_premium_amount   numeric(15,2),
  detected_payment_frequency text,
  detected_due_date         date,
  detected_birth_date       date,
  confidence_score          numeric(5,2),

  review_status             text          DEFAULT 'pending'
                                          CHECK (review_status IN ('pending', 'approved', 'rejected', 'edited')),

  created_at                timestamptz   DEFAULT now(),
  updated_at                timestamptz   DEFAULT now()
);

COMMENT ON TABLE import_draft_rows IS 'OCR-extracted policy rows awaiting human review.';


-- ============================================================================
-- INDEXES
-- Performance indexes on foreign keys, status columns, and date columns.
-- ============================================================================

-- customer_levels
CREATE INDEX idx_customer_levels_owner_id ON customer_levels (owner_id);

-- customers
CREATE INDEX idx_customers_owner_id          ON customers (owner_id);
CREATE INDEX idx_customers_status            ON customers (status);
CREATE INDEX idx_customers_customer_level_id ON customers (customer_level_id);

-- policies
CREATE INDEX idx_policies_owner_id              ON policies (owner_id);
CREATE INDEX idx_policies_customer_id           ON policies (customer_id);
CREATE INDEX idx_policies_policy_status         ON policies (policy_status);
CREATE INDEX idx_policies_next_premium_due_date ON policies (next_premium_due_date);

-- reminders
CREATE INDEX idx_reminders_owner_id    ON reminders (owner_id);
CREATE INDEX idx_reminders_customer_id ON reminders (customer_id);
CREATE INDEX idx_reminders_policy_id   ON reminders (policy_id);
CREATE INDEX idx_reminders_status      ON reminders (status);
CREATE INDEX idx_reminders_due_date    ON reminders (due_date);

-- activities
CREATE INDEX idx_activities_owner_id    ON activities (owner_id);
CREATE INDEX idx_activities_customer_id ON activities (customer_id);
CREATE INDEX idx_activities_policy_id   ON activities (policy_id);

-- gifts
CREATE INDEX idx_gifts_owner_id    ON gifts (owner_id);
CREATE INDEX idx_gifts_customer_id ON gifts (customer_id);
CREATE INDEX idx_gifts_gift_date   ON gifts (gift_date);

-- import_batches
CREATE INDEX idx_import_batches_owner_id ON import_batches (owner_id);
CREATE INDEX idx_import_batches_status   ON import_batches (status);

-- import_images
CREATE INDEX idx_import_images_owner_id        ON import_images (owner_id);
CREATE INDEX idx_import_images_import_batch_id ON import_images (import_batch_id);
CREATE INDEX idx_import_images_ocr_status      ON import_images (ocr_status);

-- import_draft_rows
CREATE INDEX idx_import_draft_rows_owner_id        ON import_draft_rows (owner_id);
CREATE INDEX idx_import_draft_rows_import_batch_id ON import_draft_rows (import_batch_id);
CREATE INDEX idx_import_draft_rows_review_status   ON import_draft_rows (review_status);


-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- Automatically sets updated_at = now() on every UPDATE.
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to every table
CREATE TRIGGER trg_customer_levels_updated_at
  BEFORE UPDATE ON customer_levels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_policies_updated_at
  BEFORE UPDATE ON policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_gifts_updated_at
  BEFORE UPDATE ON gifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_import_batches_updated_at
  BEFORE UPDATE ON import_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_import_images_updated_at
  BEFORE UPDATE ON import_images
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_import_draft_rows_updated_at
  BEFORE UPDATE ON import_draft_rows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Every table is locked down so users can only access their own rows.
-- ============================================================================

-- ---- customer_levels -------------------------------------------------------
ALTER TABLE customer_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_levels_select" ON customer_levels
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "customer_levels_insert" ON customer_levels
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "customer_levels_update" ON customer_levels
  FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "customer_levels_delete" ON customer_levels
  FOR DELETE USING (owner_id = auth.uid());

-- ---- customers -------------------------------------------------------------
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_select" ON customers
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "customers_insert" ON customers
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "customers_update" ON customers
  FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "customers_delete" ON customers
  FOR DELETE USING (owner_id = auth.uid());

-- ---- policies --------------------------------------------------------------
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "policies_select" ON policies
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "policies_insert" ON policies
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "policies_update" ON policies
  FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "policies_delete" ON policies
  FOR DELETE USING (owner_id = auth.uid());

-- ---- reminders -------------------------------------------------------------
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reminders_select" ON reminders
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "reminders_insert" ON reminders
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "reminders_update" ON reminders
  FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "reminders_delete" ON reminders
  FOR DELETE USING (owner_id = auth.uid());

-- ---- activities ------------------------------------------------------------
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activities_select" ON activities
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "activities_insert" ON activities
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "activities_update" ON activities
  FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "activities_delete" ON activities
  FOR DELETE USING (owner_id = auth.uid());

-- ---- gifts -----------------------------------------------------------------
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gifts_select" ON gifts
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "gifts_insert" ON gifts
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "gifts_update" ON gifts
  FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "gifts_delete" ON gifts
  FOR DELETE USING (owner_id = auth.uid());

-- ---- import_batches --------------------------------------------------------
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "import_batches_select" ON import_batches
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "import_batches_insert" ON import_batches
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "import_batches_update" ON import_batches
  FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "import_batches_delete" ON import_batches
  FOR DELETE USING (owner_id = auth.uid());

-- ---- import_images ---------------------------------------------------------
ALTER TABLE import_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "import_images_select" ON import_images
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "import_images_insert" ON import_images
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "import_images_update" ON import_images
  FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "import_images_delete" ON import_images
  FOR DELETE USING (owner_id = auth.uid());

-- ---- import_draft_rows -----------------------------------------------------
ALTER TABLE import_draft_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "import_draft_rows_select" ON import_draft_rows
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "import_draft_rows_insert" ON import_draft_rows
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "import_draft_rows_update" ON import_draft_rows
  FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "import_draft_rows_delete" ON import_draft_rows
  FOR DELETE USING (owner_id = auth.uid());


-- ============================================================================
-- STORAGE BUCKET: ocr-imports
-- Used by the OCR import feature to store uploaded policy screenshots.
--
-- Create this bucket via the Supabase Dashboard or with:
--   INSERT INTO storage.buckets (id, name, public) VALUES ('ocr-imports', 'ocr-imports', false);
--
-- Recommended storage policies (apply via Dashboard > Storage > Policies):
--
--   SELECT  — owner can read their own files:
--     bucket_id = 'ocr-imports' AND auth.uid()::text = (storage.foldername(name))[1]
--
--   INSERT  — owner can upload to their own folder:
--     bucket_id = 'ocr-imports' AND auth.uid()::text = (storage.foldername(name))[1]
--
--   DELETE  — owner can delete their own files:
--     bucket_id = 'ocr-imports' AND auth.uid()::text = (storage.foldername(name))[1]
--
-- File path convention: ocr-imports/{user_id}/{batch_id}/{filename}
-- ============================================================================
