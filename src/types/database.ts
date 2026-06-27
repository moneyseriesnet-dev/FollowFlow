export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_date: string
          activity_type: string
          created_at: string | null
          created_by: string | null
          customer_id: string
          id: string
          next_action_completed_at: string | null
          next_action_date: string | null
          next_action_status: string | null
          owner_id: string
          policy_id: string | null
          reminder_id: string | null
          result: string | null
          status_after_activity: string | null
          summary: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          activity_date?: string
          activity_type: string
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          id?: string
          next_action_completed_at?: string | null
          next_action_date?: string | null
          next_action_status?: string | null
          owner_id: string
          policy_id?: string | null
          reminder_id?: string | null
          result?: string | null
          status_after_activity?: string | null
          summary?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          activity_date?: string
          activity_type?: string
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          id?: string
          next_action_completed_at?: string | null
          next_action_date?: string | null
          next_action_status?: string | null
          owner_id?: string
          policy_id?: string | null
          reminder_id?: string | null
          result?: string | null
          status_after_activity?: string | null
          summary?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_levels: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          owner_id: string
          rule_config: Json | null
          rule_type: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          owner_id: string
          rule_config?: Json | null
          rule_type?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          owner_id?: string
          rule_config?: Json | null
          rule_type?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          ai_last_generated_at: string | null
          ai_suggested_actions: Json | null
          ai_suggested_level_id: string | null
          ai_suggested_level_reason: string | null
          ai_summary: string | null
          assigned_to: string | null
          birth_date: string | null
          created_at: string | null
          created_by: string | null
          customer_level_id: string | null
          email: string | null
          full_name: string
          id: string
          last_contact_date: string | null
          line_id: string | null
          needs_special_follow_up: boolean | null
          next_financial_review_date: string | null
          owner_id: string
          personal_note: string | null
          phone: string | null
          status: string | null
          team_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          ai_last_generated_at?: string | null
          ai_suggested_actions?: Json | null
          ai_suggested_level_id?: string | null
          ai_suggested_level_reason?: string | null
          ai_summary?: string | null
          assigned_to?: string | null
          birth_date?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_level_id?: string | null
          email?: string | null
          full_name: string
          id?: string
          last_contact_date?: string | null
          line_id?: string | null
          needs_special_follow_up?: boolean | null
          next_financial_review_date?: string | null
          owner_id: string
          personal_note?: string | null
          phone?: string | null
          status?: string | null
          team_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          ai_last_generated_at?: string | null
          ai_suggested_actions?: Json | null
          ai_suggested_level_id?: string | null
          ai_suggested_level_reason?: string | null
          ai_summary?: string | null
          assigned_to?: string | null
          birth_date?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_level_id?: string | null
          email?: string | null
          full_name?: string
          id?: string
          last_contact_date?: string | null
          line_id?: string | null
          needs_special_follow_up?: boolean | null
          next_financial_review_date?: string | null
          owner_id?: string
          personal_note?: string | null
          phone?: string | null
          status?: string | null
          team_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_ai_suggested_level_id_fkey"
            columns: ["ai_suggested_level_id"]
            isOneToOne: false
            referencedRelation: "customer_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_customer_level_id_fkey"
            columns: ["customer_level_id"]
            isOneToOne: false
            referencedRelation: "customer_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      gifts: {
        Row: {
          activity_id: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string
          gift_cost: number | null
          gift_date: string
          gift_name: string
          id: string
          note: string | null
          owner_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          activity_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          gift_cost?: number | null
          gift_date?: string
          gift_name: string
          id?: string
          note?: string | null
          owner_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          activity_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          gift_cost?: number | null
          gift_date?: string
          gift_name?: string
          id?: string
          note?: string | null
          owner_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gifts_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gifts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      google_credentials: {
        Row: {
          access_token: string
          calendar_id: string
          created_at: string | null
          expires_at: string
          google_email: string | null
          owner_id: string
          refresh_token: string
          updated_at: string | null
        }
        Insert: {
          access_token: string
          calendar_id?: string
          created_at?: string | null
          expires_at: string
          google_email?: string | null
          owner_id: string
          refresh_token: string
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          calendar_id?: string
          created_at?: string | null
          expires_at?: string
          google_email?: string | null
          owner_id?: string
          refresh_token?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      import_batches: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          owner_id: string
          source_company: string
          status: string | null
          total_images: number | null
          total_rows_detected: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          owner_id: string
          source_company: string
          status?: string | null
          total_images?: number | null
          total_rows_detected?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          owner_id?: string
          source_company?: string
          status?: string | null
          total_images?: number | null
          total_rows_detected?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      import_draft_rows: {
        Row: {
          ai_comment: string | null
          confidence_score: number | null
          created_at: string | null
          created_by: string | null
          detected_birth_date: string | null
          detected_company: string | null
          detected_customer_name: string | null
          detected_due_date: string | null
          detected_payment_frequency: string | null
          detected_plan_name: string | null
          detected_policy_number: string | null
          detected_premium_amount: number | null
          id: string
          import_batch_id: string
          import_image_id: string | null
          owner_id: string
          raw_ocr_text: string | null
          review_status: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          ai_comment?: string | null
          confidence_score?: number | null
          created_at?: string | null
          created_by?: string | null
          detected_birth_date?: string | null
          detected_company?: string | null
          detected_customer_name?: string | null
          detected_due_date?: string | null
          detected_payment_frequency?: string | null
          detected_plan_name?: string | null
          detected_policy_number?: string | null
          detected_premium_amount?: number | null
          id?: string
          import_batch_id: string
          import_image_id?: string | null
          owner_id: string
          raw_ocr_text?: string | null
          review_status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          ai_comment?: string | null
          confidence_score?: number | null
          created_at?: string | null
          created_by?: string | null
          detected_birth_date?: string | null
          detected_company?: string | null
          detected_customer_name?: string | null
          detected_due_date?: string | null
          detected_payment_frequency?: string | null
          detected_plan_name?: string | null
          detected_policy_number?: string | null
          detected_premium_amount?: number | null
          id?: string
          import_batch_id?: string
          import_image_id?: string | null
          owner_id?: string
          raw_ocr_text?: string | null
          review_status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_draft_rows_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_draft_rows_import_image_id_fkey"
            columns: ["import_image_id"]
            isOneToOne: false
            referencedRelation: "import_images"
            referencedColumns: ["id"]
          },
        ]
      }
      import_images: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          image_url: string
          import_batch_id: string
          ocr_status: string | null
          owner_id: string
          source_company: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url: string
          import_batch_id: string
          ocr_status?: string | null
          owner_id: string
          source_company: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url?: string
          import_batch_id?: string
          ocr_status?: string | null
          owner_id?: string
          source_company?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_images_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          assigned_to: string | null
          company: string
          created_at: string | null
          created_by: string | null
          customer_id: string
          id: string
          insured_name: string | null
          next_premium_due_date: string | null
          owner_id: string
          payer_name: string | null
          payment_frequency: string | null
          plan_name: string | null
          policy_note: string | null
          policy_number: string
          policy_start_date: string | null
          policy_status: string | null
          premium_amount: number | null
          source: string | null
          sum_assured: number | null
          team_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          assigned_to?: string | null
          company: string
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          id?: string
          insured_name?: string | null
          next_premium_due_date?: string | null
          owner_id: string
          payer_name?: string | null
          payment_frequency?: string | null
          plan_name?: string | null
          policy_note?: string | null
          policy_number: string
          policy_start_date?: string | null
          policy_status?: string | null
          premium_amount?: number | null
          source?: string | null
          sum_assured?: number | null
          team_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          assigned_to?: string | null
          company?: string
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          id?: string
          insured_name?: string | null
          next_premium_due_date?: string | null
          owner_id?: string
          payer_name?: string | null
          payment_frequency?: string | null
          plan_name?: string | null
          policy_note?: string | null
          policy_number?: string
          policy_start_date?: string | null
          policy_status?: string | null
          premium_amount?: number | null
          source?: string | null
          sum_assured?: number | null
          team_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policies_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string
          description: string | null
          due_date: string
          google_event_id: string | null
          google_sync_enabled: boolean | null
          google_sync_status: string | null
          id: string
          next_action_date: string | null
          owner_id: string
          policy_id: string | null
          priority: string | null
          reminder_offset_days: number | null
          reminder_type: string
          status: string | null
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          description?: string | null
          due_date: string
          google_event_id?: string | null
          google_sync_enabled?: boolean | null
          google_sync_status?: string | null
          id?: string
          next_action_date?: string | null
          owner_id: string
          policy_id?: string | null
          priority?: string | null
          reminder_offset_days?: number | null
          reminder_type: string
          status?: string | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          description?: string | null
          due_date?: string
          google_event_id?: string | null
          google_sync_enabled?: boolean | null
          google_sync_status?: string | null
          id?: string
          next_action_date?: string | null
          owner_id?: string
          policy_id?: string | null
          priority?: string | null
          reminder_offset_days?: number | null
          reminder_type?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
