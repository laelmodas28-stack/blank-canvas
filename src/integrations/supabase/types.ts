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
      finance_ads_campaigns: {
        Row: {
          campaign_name: string
          campaign_type: string | null
          clicks: number
          created_at: string
          end_date: string | null
          id: string
          impressions: number
          investment: number
          orders: number
          platform: string
          product_id: string | null
          product_name: string | null
          revenue: number
          start_date: string | null
        }
        Insert: {
          campaign_name: string
          campaign_type?: string | null
          clicks?: number
          created_at?: string
          end_date?: string | null
          id?: string
          impressions?: number
          investment?: number
          orders?: number
          platform?: string
          product_id?: string | null
          product_name?: string | null
          revenue?: number
          start_date?: string | null
        }
        Update: {
          campaign_name?: string
          campaign_type?: string | null
          clicks?: number
          created_at?: string
          end_date?: string | null
          id?: string
          impressions?: number
          investment?: number
          orders?: number
          platform?: string
          product_id?: string | null
          product_name?: string | null
          revenue?: number
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_ads_campaigns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "finance_products"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_fee_rules: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          platform: string
          rules: Json
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          platform?: string
          rules?: Json
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          platform?: string
          rules?: Json
        }
        Relationships: []
      }
      finance_imports: {
        Row: {
          created_at: string
          detected_type: string | null
          file_name: string
          file_type: string | null
          id: string
          row_count: number
          summary: Json | null
        }
        Insert: {
          created_at?: string
          detected_type?: string | null
          file_name: string
          file_type?: string | null
          id?: string
          row_count?: number
          summary?: Json | null
        }
        Update: {
          created_at?: string
          detected_type?: string | null
          file_name?: string
          file_type?: string | null
          id?: string
          row_count?: number
          summary?: Json | null
        }
        Relationships: []
      }
      finance_products: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          id: string
          manufacturing_cost: number
          name: string
          operational_cost: number
          packaging_cost: number
          platform: string
          sale_price: number
          sku: string | null
          supplier: string | null
          target_margin: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          id?: string
          manufacturing_cost?: number
          name: string
          operational_cost?: number
          packaging_cost?: number
          platform?: string
          sale_price?: number
          sku?: string | null
          supplier?: string | null
          target_margin?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          id?: string
          manufacturing_cost?: number
          name?: string
          operational_cost?: number
          packaging_cost?: number
          platform?: string
          sale_price?: number
          sku?: string | null
          supplier?: string | null
          target_margin?: number
          updated_at?: string
        }
        Relationships: []
      }
      finance_sales: {
        Row: {
          ads_cost: number
          commission: number
          created_at: string
          discount: number
          extra_fees: number
          gross_price: number
          id: string
          import_id: string | null
          net_profit: number
          net_revenue: number
          order_id: string | null
          platform: string
          product_cost: number
          product_id: string | null
          product_name: string
          quantity: number
          raw: Json | null
          sale_date: string
          shipping_cost: number
          sku: string | null
          source: string
          tax: number
        }
        Insert: {
          ads_cost?: number
          commission?: number
          created_at?: string
          discount?: number
          extra_fees?: number
          gross_price?: number
          id?: string
          import_id?: string | null
          net_profit?: number
          net_revenue?: number
          order_id?: string | null
          platform?: string
          product_cost?: number
          product_id?: string | null
          product_name: string
          quantity?: number
          raw?: Json | null
          sale_date?: string
          shipping_cost?: number
          sku?: string | null
          source?: string
          tax?: number
        }
        Update: {
          ads_cost?: number
          commission?: number
          created_at?: string
          discount?: number
          extra_fees?: number
          gross_price?: number
          id?: string
          import_id?: string | null
          net_profit?: number
          net_revenue?: number
          order_id?: string | null
          platform?: string
          product_cost?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
          raw?: Json | null
          sale_date?: string
          shipping_cost?: number
          sku?: string | null
          source?: string
          tax?: number
        }
        Relationships: [
          {
            foreignKeyName: "finance_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "finance_products"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_settings: {
        Row: {
          default_tax_percent: number
          id: string
          max_ads_percent: number
          min_margin: number
          min_roas: number
          monthly_profit_goal: number
          monthly_revenue_goal: number
          updated_at: string
        }
        Insert: {
          default_tax_percent?: number
          id?: string
          max_ads_percent?: number
          min_margin?: number
          min_roas?: number
          monthly_profit_goal?: number
          monthly_revenue_goal?: number
          updated_at?: string
        }
        Update: {
          default_tax_percent?: number
          id?: string
          max_ads_percent?: number
          min_margin?: number
          min_roas?: number
          monthly_profit_goal?: number
          monthly_revenue_goal?: number
          updated_at?: string
        }
        Relationships: []
      }
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
