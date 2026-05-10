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
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          invoice_id: string | null
          metadata: Json | null
          operator_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          operator_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          operator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_pusd: number
          corridor: string
          created_at: string
          delivered_at: string | null
          description: string | null
          force_failure: boolean
          id: string
          importer_id: string
          invoice_pda: string | null
          next_advance_at: string | null
          offramp_error: string | null
          offramp_fee_pusd: number
          offramp_provider: string | null
          offramp_reference: string | null
          on_chain_slot: number | null
          paid_at: string | null
          pay_tx_signature: string | null
          reference: string | null
          refund_tx_signature: string | null
          release_tx_signature: string | null
          sote_fee_pusd: number
          status: string
          total_pusd: number
          vendor_id: string | null
          vendor_snapshot: Json
        }
        Insert: {
          amount_pusd: number
          corridor: string
          created_at?: string
          delivered_at?: string | null
          description?: string | null
          force_failure?: boolean
          id?: string
          importer_id: string
          invoice_pda?: string | null
          next_advance_at?: string | null
          offramp_error?: string | null
          offramp_fee_pusd: number
          offramp_provider?: string | null
          offramp_reference?: string | null
          on_chain_slot?: number | null
          paid_at?: string | null
          pay_tx_signature?: string | null
          reference?: string | null
          refund_tx_signature?: string | null
          release_tx_signature?: string | null
          sote_fee_pusd: number
          status?: string
          total_pusd: number
          vendor_id?: string | null
          vendor_snapshot: Json
        }
        Update: {
          amount_pusd?: number
          corridor?: string
          created_at?: string
          delivered_at?: string | null
          description?: string | null
          force_failure?: boolean
          id?: string
          importer_id?: string
          invoice_pda?: string | null
          next_advance_at?: string | null
          offramp_error?: string | null
          offramp_fee_pusd?: number
          offramp_provider?: string | null
          offramp_reference?: string | null
          on_chain_slot?: number | null
          paid_at?: string | null
          pay_tx_signature?: string | null
          reference?: string | null
          refund_tx_signature?: string | null
          release_tx_signature?: string | null
          sote_fee_pusd?: number
          status?: string
          total_pusd?: number
          vendor_id?: string | null
          vendor_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      offramp_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          invoice_id: string
          payload: Json | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          invoice_id: string
          payload?: Json | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          invoice_id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "offramp_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_name: string | null
          created_at: string
          email: string | null
          id: string
          wallet_address: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          email?: string | null
          id: string
          wallet_address?: string | null
        }
        Update: {
          business_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          amount_usd: number
          consumed_at: string | null
          corridor: string
          created_at: string
          expires_at: string
          fee_breakdown: Json
          id: string
          importer_id: string
          total_pusd: number
        }
        Insert: {
          amount_usd: number
          consumed_at?: string | null
          corridor: string
          created_at?: string
          expires_at?: string
          fee_breakdown: Json
          id?: string
          importer_id: string
          total_pusd: number
        }
        Update: {
          amount_usd?: number
          consumed_at?: string | null
          corridor?: string
          created_at?: string
          expires_at?: string
          fee_breakdown?: Json
          id?: string
          importer_id?: string
          total_pusd?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          archived_at: string | null
          corridor: string
          created_at: string
          destination: Json
          display_name: string
          id: string
          importer_id: string
        }
        Insert: {
          archived_at?: string | null
          corridor: string
          created_at?: string
          destination: Json
          display_name: string
          id?: string
          importer_id: string
        }
        Update: {
          archived_at?: string | null
          corridor?: string
          created_at?: string
          destination?: Json
          display_name?: string
          id?: string
          importer_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advance_invoice: {
        Args: { _invoice_id: string }
        Returns: {
          amount_pusd: number
          corridor: string
          created_at: string
          delivered_at: string | null
          description: string | null
          force_failure: boolean
          id: string
          importer_id: string
          invoice_pda: string | null
          next_advance_at: string | null
          offramp_error: string | null
          offramp_fee_pusd: number
          offramp_provider: string | null
          offramp_reference: string | null
          on_chain_slot: number | null
          paid_at: string | null
          pay_tx_signature: string | null
          reference: string | null
          refund_tx_signature: string | null
          release_tx_signature: string | null
          sote_fee_pusd: number
          status: string
          total_pusd: number
          vendor_id: string | null
          vendor_snapshot: Json
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      grant_operator: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      operator_refund: {
        Args: { _invoice_id: string }
        Returns: {
          amount_pusd: number
          corridor: string
          created_at: string
          delivered_at: string | null
          description: string | null
          force_failure: boolean
          id: string
          importer_id: string
          invoice_pda: string | null
          next_advance_at: string | null
          offramp_error: string | null
          offramp_fee_pusd: number
          offramp_provider: string | null
          offramp_reference: string | null
          on_chain_slot: number | null
          paid_at: string | null
          pay_tx_signature: string | null
          reference: string | null
          refund_tx_signature: string | null
          release_tx_signature: string | null
          sote_fee_pusd: number
          status: string
          total_pusd: number
          vendor_id: string | null
          vendor_snapshot: Json
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      operator_retry: {
        Args: { _invoice_id: string }
        Returns: {
          amount_pusd: number
          corridor: string
          created_at: string
          delivered_at: string | null
          description: string | null
          force_failure: boolean
          id: string
          importer_id: string
          invoice_pda: string | null
          next_advance_at: string | null
          offramp_error: string | null
          offramp_fee_pusd: number
          offramp_provider: string | null
          offramp_reference: string | null
          on_chain_slot: number | null
          paid_at: string | null
          pay_tx_signature: string | null
          reference: string | null
          refund_tx_signature: string | null
          release_tx_signature: string | null
          sote_fee_pusd: number
          status: string
          total_pusd: number
          vendor_id: string | null
          vendor_snapshot: Json
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sign_and_pay: {
        Args: { _invoice_id: string }
        Returns: {
          amount_pusd: number
          corridor: string
          created_at: string
          delivered_at: string | null
          description: string | null
          force_failure: boolean
          id: string
          importer_id: string
          invoice_pda: string | null
          next_advance_at: string | null
          offramp_error: string | null
          offramp_fee_pusd: number
          offramp_provider: string | null
          offramp_reference: string | null
          on_chain_slot: number | null
          paid_at: string | null
          pay_tx_signature: string | null
          reference: string | null
          refund_tx_signature: string | null
          release_tx_signature: string | null
          sote_fee_pusd: number
          status: string
          total_pusd: number
          vendor_id: string | null
          vendor_snapshot: Json
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "importer" | "operator" | "vendor"
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
    Enums: {
      app_role: ["importer", "operator", "vendor"],
    },
  },
} as const
