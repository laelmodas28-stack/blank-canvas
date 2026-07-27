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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      produtos_analisados: {
        Row: {
          avaliacao_media: number | null
          avaliacoes: number
          categoria: string | null
          data_coleta: string
          estoque: number | null
          id: string
          itemid: number | null
          nome_loja: string | null
          plataforma: string
          preco: number
          score_oportunidade: number | null
          shopid: number | null
          titulo: string
          vendas: number
        }
        Insert: {
          avaliacao_media?: number | null
          avaliacoes?: number
          categoria?: string | null
          data_coleta?: string
          estoque?: number | null
          id?: string
          itemid?: number | null
          nome_loja?: string | null
          plataforma?: string
          preco?: number
          score_oportunidade?: number | null
          shopid?: number | null
          titulo: string
          vendas?: number
        }
        Update: {
          avaliacao_media?: number | null
          avaliacoes?: number
          categoria?: string | null
          data_coleta?: string
          estoque?: number | null
          id?: string
          itemid?: number | null
          nome_loja?: string | null
          plataforma?: string
          preco?: number
          score_oportunidade?: number | null
          shopid?: number | null
          titulo?: string
          vendas?: number
        }
        Relationships: []
      }
      shopee_analysis: {
        Row: {
          created_at: string
          data: Json
          id: string
          item_id: string | null
          shop_id: string | null
          url: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          item_id?: string | null
          shop_id?: string | null
          url: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          item_id?: string | null
          shop_id?: string | null
          url?: string
        }
        Relationships: []
      }
      strategy_alerts: {
        Row: {
          category: string
          created_at: string
          data: Json | null
          dismissed: boolean
          id: string
          message: string
          severity: string
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          data?: Json | null
          dismissed?: boolean
          id?: string
          message: string
          severity?: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          data?: Json | null
          dismissed?: boolean
          id?: string
          message?: string
          severity?: string
          title?: string
        }
        Relationships: []
      }
      strategy_imports: {
        Row: {
          created_at: string
          detected_type: string | null
          file_name: string
          file_type: string | null
          id: string
          normalized_data: Json
          row_count: number | null
          summary: Json | null
        }
        Insert: {
          created_at?: string
          detected_type?: string | null
          file_name: string
          file_type?: string | null
          id?: string
          normalized_data?: Json
          row_count?: number | null
          summary?: Json | null
        }
        Update: {
          created_at?: string
          detected_type?: string | null
          file_name?: string
          file_type?: string | null
          id?: string
          normalized_data?: Json
          row_count?: number | null
          summary?: Json | null
        }
        Relationships: []
      }
      strategy_recommendations: {
        Row: {
          category: string
          confidence: number | null
          created_at: string
          estimated_improvement: string | null
          financial_impact: number | null
          id: string
          import_id: string | null
          priority: number | null
          reason: string
          risk: string | null
          suggested_action: string
          title: string
        }
        Insert: {
          category: string
          confidence?: number | null
          created_at?: string
          estimated_improvement?: string | null
          financial_impact?: number | null
          id?: string
          import_id?: string | null
          priority?: number | null
          reason: string
          risk?: string | null
          suggested_action: string
          title: string
        }
        Update: {
          category?: string
          confidence?: number | null
          created_at?: string
          estimated_improvement?: string | null
          financial_impact?: number | null
          id?: string
          import_id?: string | null
          priority?: number | null
          reason?: string
          risk?: string | null
          suggested_action?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_recommendations_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "strategy_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_scores: {
        Row: {
          created_at: string
          dimensions: Json
          explanation: string | null
          id: string
          overall_score: number
        }
        Insert: {
          created_at?: string
          dimensions?: Json
          explanation?: string | null
          id?: string
          overall_score?: number
        }
        Update: {
          created_at?: string
          dimensions?: Json
          explanation?: string | null
          id?: string
          overall_score?: number
        }
        Relationships: []
      }
      strategy_simulations: {
        Row: {
          ai_interpretation: string | null
          created_at: string
          id: string
          inputs: Json
          results: Json
          scenario: string
        }
        Insert: {
          ai_interpretation?: string | null
          created_at?: string
          id?: string
          inputs?: Json
          results?: Json
          scenario: string
        }
        Update: {
          ai_interpretation?: string | null
          created_at?: string
          id?: string
          inputs?: Json
          results?: Json
          scenario?: string
        }
        Relationships: []
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
