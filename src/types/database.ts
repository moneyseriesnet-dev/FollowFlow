/**
 * FollowFlow — Database Type Definitions
 *
 * Hand-crafted to match the schema in:
 *   supabase/migrations/20260624000001_initial_schema.sql
 *
 * Run `npx supabase gen types typescript` to regenerate from the live
 * database if the schema changes. Then replace this file.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      customer_levels: {
        Row: {
          id: string
          owner_id: string
          created_by: string | null
          updated_by: string | null
          name: string
          description: string | null
          color: string | null
          rule_type: 'manual' | 'ai_suggested' | 'auto_detected' | null
          rule_config: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          created_by?: string | null
          updated_by?: string | null
          name: string
          description?: string | null
          color?: string | null
          rule_type?: 'manual' | 'ai_suggested' | 'auto_detected' | null
          rule_config?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          created_by?: string | null
          updated_by?: string | null
          name?: string
          description?: string | null
          color?: string | null
          rule_type?: 'manual' | 'ai_suggested' | 'auto_detected' | null
          rule_config?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }

      customers: {
        Row: {
          id: string
          owner_id: string
          created_by: string | null
          updated_by: string | null
          full_name: string
          phone: string | null
          email: string | null
          line_id: string | null
          birth_date: string | null
          address: string | null
          customer_level_id: string | null
          status: 'active' | 'inactive' | 'archived' | null
          personal_note: string | null
          last_contact_date: string | null
          next_financial_review_date: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          created_by?: string | null
          updated_by?: string | null
          full_name: string
          phone?: string | null
          email?: string | null
          line_id?: string | null
          birth_date?: string | null
          address?: string | null
          customer_level_id?: string | null
          status?: 'active' | 'inactive' | 'archived' | null
          personal_note?: string | null
          last_contact_date?: string | null
          next_financial_review_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          created_by?: string | null
          updated_by?: string | null
          full_name?: string
          phone?: string | null
          email?: string | null
          line_id?: string | null
          birth_date?: string | null
          address?: string | null
          customer_level_id?: string | null
          status?: 'active' | 'inactive' | 'archived' | null
          personal_note?: string | null
          last_contact_date?: string | null
          next_financial_review_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }

      policies: {
        Row: {
          id: string
          owner_id: string
          created_by: string | null
          updated_by: string | null
          customer_id: string
          company: 'AXA' | 'AIA' | 'OTHER'
          policy_number: string
          insured_name: string | null
          payer_name: string | null
          plan_name: string | null
          sum_assured: number | null
          premium_amount: number | null
          payment_frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | null
          policy_start_date: string | null
          next_premium_due_date: string | null
          policy_status: 'active' | 'lapsed' | 'cancelled' | 'matured' | 'pending' | null
          policy_note: string | null
          source: 'manual' | 'ocr_import' | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          created_by?: string | null
          updated_by?: string | null
          customer_id: string
          company: 'AXA' | 'AIA' | 'OTHER'
          policy_number: string
          insured_name?: string | null
          payer_name?: string | null
          plan_name?: string | null
          sum_assured?: number | null
          premium_amount?: number | null
          payment_frequency?: 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | null
          policy_start_date?: string | null
          next_premium_due_date?: string | null
          policy_status?: 'active' | 'lapsed' | 'cancelled' | 'matured' | 'pending' | null
          policy_note?: string | null
          source?: 'manual' | 'ocr_import' | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          created_by?: string | null
          updated_by?: string | null
          customer_id?: string
          company?: 'AXA' | 'AIA' | 'OTHER'
          policy_number?: string
          insured_name?: string | null
          payer_name?: string | null
          plan_name?: string | null
          sum_assured?: number | null
          premium_amount?: number | null
          payment_frequency?: 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | null
          policy_start_date?: string | null
          next_premium_due_date?: string | null
          policy_status?: 'active' | 'lapsed' | 'cancelled' | 'matured' | 'pending' | null
          policy_note?: string | null
          source?: 'manual' | 'ocr_import' | null
          created_at?: string | null
          updated_at?: string | null
        }
      }

      reminders: {
        Row: {
          id: string
          owner_id: string
          created_by: string | null
          updated_by: string | null
          customer_id: string
          policy_id: string | null
          reminder_type: 'premium_due' | 'birthday' | 'financial_review' | 'general' | 'follow_up'
          title: string
          description: string | null
          due_date: string
          reminder_offset_days: number | null
          status: 'pending' | 'done' | 'snoozed' | 'cancelled' | null
          priority: 'low' | 'normal' | 'high' | 'urgent' | null
          next_action_date: string | null
          completed_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          created_by?: string | null
          updated_by?: string | null
          customer_id: string
          policy_id?: string | null
          reminder_type: 'premium_due' | 'birthday' | 'financial_review' | 'general' | 'follow_up'
          title: string
          description?: string | null
          due_date: string
          reminder_offset_days?: number | null
          status?: 'pending' | 'done' | 'snoozed' | 'cancelled' | null
          priority?: 'low' | 'normal' | 'high' | 'urgent' | null
          next_action_date?: string | null
          completed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          created_by?: string | null
          updated_by?: string | null
          customer_id?: string
          policy_id?: string | null
          reminder_type?: 'premium_due' | 'birthday' | 'financial_review' | 'general' | 'follow_up'
          title?: string
          description?: string | null
          due_date?: string
          reminder_offset_days?: number | null
          status?: 'pending' | 'done' | 'snoozed' | 'cancelled' | null
          priority?: 'low' | 'normal' | 'high' | 'urgent' | null
          next_action_date?: string | null
          completed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }

      activities: {
        Row: {
          id: string
          owner_id: string
          created_by: string | null
          updated_by: string | null
          customer_id: string
          policy_id: string | null
          reminder_id: string | null
          activity_type: 'meeting' | 'phone_call' | 'line_chat' | 'email' | 'follow_up' | 'policy_delivery' | 'claim_support' | 'other'
          activity_date: string
          summary: string | null
          result: string | null
          status_after_activity: string | null
          next_action_date: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          created_by?: string | null
          updated_by?: string | null
          customer_id: string
          policy_id?: string | null
          reminder_id?: string | null
          activity_type: 'meeting' | 'phone_call' | 'line_chat' | 'email' | 'follow_up' | 'policy_delivery' | 'claim_support' | 'other'
          activity_date?: string
          summary?: string | null
          result?: string | null
          status_after_activity?: string | null
          next_action_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          created_by?: string | null
          updated_by?: string | null
          customer_id?: string
          policy_id?: string | null
          reminder_id?: string | null
          activity_type?: 'meeting' | 'phone_call' | 'line_chat' | 'email' | 'follow_up' | 'policy_delivery' | 'claim_support' | 'other'
          activity_date?: string
          summary?: string | null
          result?: string | null
          status_after_activity?: string | null
          next_action_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }

      gifts: {
        Row: {
          id: string
          owner_id: string
          created_by: string | null
          updated_by: string | null
          customer_id: string
          activity_id: string | null
          gift_name: string
          gift_cost: number | null
          gift_date: string
          note: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          created_by?: string | null
          updated_by?: string | null
          customer_id: string
          activity_id?: string | null
          gift_name: string
          gift_cost?: number | null
          gift_date?: string
          note?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          created_by?: string | null
          updated_by?: string | null
          customer_id?: string
          activity_id?: string | null
          gift_name?: string
          gift_cost?: number | null
          gift_date?: string
          note?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }

      import_batches: {
        Row: {
          id: string
          owner_id: string
          created_by: string | null
          updated_by: string | null
          source_company: 'AXA' | 'AIA'
          status: 'pending' | 'processing' | 'reviewing' | 'completed' | 'failed' | null
          total_images: number | null
          total_rows_detected: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          created_by?: string | null
          updated_by?: string | null
          source_company: 'AXA' | 'AIA'
          status?: 'pending' | 'processing' | 'reviewing' | 'completed' | 'failed' | null
          total_images?: number | null
          total_rows_detected?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          created_by?: string | null
          updated_by?: string | null
          source_company?: 'AXA' | 'AIA'
          status?: 'pending' | 'processing' | 'reviewing' | 'completed' | 'failed' | null
          total_images?: number | null
          total_rows_detected?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }

      import_images: {
        Row: {
          id: string
          owner_id: string
          created_by: string | null
          updated_by: string | null
          import_batch_id: string
          image_url: string
          source_company: 'AXA' | 'AIA'
          ocr_status: 'pending' | 'processing' | 'completed' | 'failed' | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          created_by?: string | null
          updated_by?: string | null
          import_batch_id: string
          image_url: string
          source_company: 'AXA' | 'AIA'
          ocr_status?: 'pending' | 'processing' | 'completed' | 'failed' | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          created_by?: string | null
          updated_by?: string | null
          import_batch_id?: string
          image_url?: string
          source_company?: 'AXA' | 'AIA'
          ocr_status?: 'pending' | 'processing' | 'completed' | 'failed' | null
          created_at?: string | null
          updated_at?: string | null
        }
      }

      import_draft_rows: {
        Row: {
          id: string
          owner_id: string
          created_by: string | null
          updated_by: string | null
          import_batch_id: string
          import_image_id: string | null
          raw_ocr_text: string | null
          detected_customer_name: string | null
          detected_policy_number: string | null
          detected_company: 'AXA' | 'AIA' | 'OTHER' | null
          detected_plan_name: string | null
          detected_premium_amount: number | null
          detected_payment_frequency: string | null
          detected_due_date: string | null
          detected_birth_date: string | null
          confidence_score: number | null
          review_status: 'pending' | 'approved' | 'rejected' | 'edited' | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          created_by?: string | null
          updated_by?: string | null
          import_batch_id: string
          import_image_id?: string | null
          raw_ocr_text?: string | null
          detected_customer_name?: string | null
          detected_policy_number?: string | null
          detected_company?: 'AXA' | 'AIA' | 'OTHER' | null
          detected_plan_name?: string | null
          detected_premium_amount?: number | null
          detected_payment_frequency?: string | null
          detected_due_date?: string | null
          detected_birth_date?: string | null
          confidence_score?: number | null
          review_status?: 'pending' | 'approved' | 'rejected' | 'edited' | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          created_by?: string | null
          updated_by?: string | null
          import_batch_id?: string
          import_image_id?: string | null
          raw_ocr_text?: string | null
          detected_customer_name?: string | null
          detected_policy_number?: string | null
          detected_company?: 'AXA' | 'AIA' | 'OTHER' | null
          detected_plan_name?: string | null
          detected_premium_amount?: number | null
          detected_payment_frequency?: string | null
          detected_due_date?: string | null
          detected_birth_date?: string | null
          confidence_score?: number | null
          review_status?: 'pending' | 'approved' | 'rejected' | 'edited' | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ---------------------------------------------------------------------------
// Convenient type aliases
// ---------------------------------------------------------------------------

/** Shorthand for extracting Row/Insert/Update types from a table */
type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]

export type CustomerLevel = Tables<'customer_levels'>['Row']
export type CustomerLevelInsert = Tables<'customer_levels'>['Insert']
export type CustomerLevelUpdate = Tables<'customer_levels'>['Update']

export type Customer = Tables<'customers'>['Row']
export type CustomerInsert = Tables<'customers'>['Insert']
export type CustomerUpdate = Tables<'customers'>['Update']

export type Policy = Tables<'policies'>['Row']
export type PolicyInsert = Tables<'policies'>['Insert']
export type PolicyUpdate = Tables<'policies'>['Update']

export type Reminder = Tables<'reminders'>['Row']
export type ReminderInsert = Tables<'reminders'>['Insert']
export type ReminderUpdate = Tables<'reminders'>['Update']

export type Activity = Tables<'activities'>['Row']
export type ActivityInsert = Tables<'activities'>['Insert']
export type ActivityUpdate = Tables<'activities'>['Update']

export type Gift = Tables<'gifts'>['Row']
export type GiftInsert = Tables<'gifts'>['Insert']
export type GiftUpdate = Tables<'gifts'>['Update']

export type ImportBatch = Tables<'import_batches'>['Row']
export type ImportBatchInsert = Tables<'import_batches'>['Insert']
export type ImportBatchUpdate = Tables<'import_batches'>['Update']

export type ImportImage = Tables<'import_images'>['Row']
export type ImportImageInsert = Tables<'import_images'>['Insert']
export type ImportImageUpdate = Tables<'import_images'>['Update']

export type ImportDraftRow = Tables<'import_draft_rows'>['Row']
export type ImportDraftRowInsert = Tables<'import_draft_rows'>['Insert']
export type ImportDraftRowUpdate = Tables<'import_draft_rows'>['Update']
