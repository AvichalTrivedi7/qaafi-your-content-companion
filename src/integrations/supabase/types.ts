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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          company_id: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          reference_id: string | null
          reference_type: Database["public"]["Enums"]["reference_type"] | null
          type: Database["public"]["Enums"]["activity_type"]
        }
        Insert: {
          company_id: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: Database["public"]["Enums"]["reference_type"] | null
          type: Database["public"]["Enums"]["activity_type"]
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: Database["public"]["Enums"]["reference_type"] | null
          type?: Database["public"]["Enums"]["activity_type"]
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          access_code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          type: Database["public"]["Enums"]["company_type"]
          updated_at: string
        }
        Insert: {
          access_code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          type: Database["public"]["Enums"]["company_type"]
          updated_at?: string
        }
        Update: {
          access_code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          type?: Database["public"]["Enums"]["company_type"]
          updated_at?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          available_stock: number
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_deleted: boolean
          low_stock_threshold: number
          name: string
          reserved_stock: number
          sku: string
          unit: string
          updated_at: string
        }
        Insert: {
          available_stock?: number
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_deleted?: boolean
          low_stock_threshold?: number
          name: string
          reserved_stock?: number
          sku: string
          unit?: string
          updated_at?: string
        }
        Update: {
          available_stock?: number
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_deleted?: boolean
          low_stock_threshold?: number
          name?: string
          reserved_stock?: number
          sku?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiation_offers: {
        Row: {
          action: Database["public"]["Enums"]["offer_action"]
          created_at: string
          id: string
          message: string | null
          negotiation_id: string
          offered_by: string
          offered_by_company_id: string
          price: number | null
        }
        Insert: {
          action: Database["public"]["Enums"]["offer_action"]
          created_at?: string
          id?: string
          message?: string | null
          negotiation_id: string
          offered_by: string
          offered_by_company_id: string
          price?: number | null
        }
        Update: {
          action?: Database["public"]["Enums"]["offer_action"]
          created_at?: string
          id?: string
          message?: string | null
          negotiation_id?: string
          offered_by?: string
          offered_by_company_id?: string
          price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_offers_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_offers_offered_by_company_id_fkey"
            columns: ["offered_by_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiations: {
        Row: {
          accepted_at: string | null
          accepted_price: number | null
          buyer_company_id: string
          created_at: string
          current_offer_by: string | null
          current_offer_expires_at: string | null
          current_offer_price: number | null
          id: string
          max_price: number
          min_price: number
          negotiation_quantity: number
          offer_expiry_minutes: number
          rfq_id: string
          seller_company_id: string
          status: Database["public"]["Enums"]["negotiation_status"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_price?: number | null
          buyer_company_id: string
          created_at?: string
          current_offer_by?: string | null
          current_offer_expires_at?: string | null
          current_offer_price?: number | null
          id?: string
          max_price: number
          min_price: number
          negotiation_quantity?: number
          offer_expiry_minutes?: number
          rfq_id: string
          seller_company_id: string
          status?: Database["public"]["Enums"]["negotiation_status"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_price?: number | null
          buyer_company_id?: string
          created_at?: string
          current_offer_by?: string | null
          current_offer_expires_at?: string | null
          current_offer_price?: number | null
          id?: string
          max_price?: number
          min_price?: number
          negotiation_quantity?: number
          offer_expiry_minutes?: number
          rfq_id?: string
          seller_company_id?: string
          status?: Database["public"]["Enums"]["negotiation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "negotiations_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: true
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          agreed_price: number
          buyer_company_id: string
          created_at: string
          id: string
          negotiation_id: string
          product_name: string
          quantity: number
          rfq_id: string
          seller_company_id: string
          shipment_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          unit: string
          updated_at: string
        }
        Insert: {
          agreed_price: number
          buyer_company_id: string
          created_at?: string
          id?: string
          negotiation_id: string
          product_name: string
          quantity: number
          rfq_id: string
          seller_company_id: string
          shipment_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          unit: string
          updated_at?: string
        }
        Update: {
          agreed_price?: number
          buyer_company_id?: string
          created_at?: string
          id?: string
          negotiation_id?: string
          product_name?: string
          quantity?: number
          rfq_id?: string
          seller_company_id?: string
          shipment_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: true
            referencedRelation: "negotiations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: true
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          email: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          company_id: string
          created_at: string
          id: string
          inventory_item_id: string
          quantity: number
          shipment_id: string
          status: Database["public"]["Enums"]["reservation_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          inventory_item_id: string
          quantity: number
          shipment_id: string
          status?: Database["public"]["Enums"]["reservation_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          inventory_item_id?: string
          quantity?: number
          shipment_id?: string
          status?: Database["public"]["Enums"]["reservation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      rfqs: {
        Row: {
          buyer_company_id: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_locked: boolean
          max_price: number
          min_price: number
          product_description: string | null
          product_name: string
          quantity: number
          reserved_quantity: number
          seller_company_id: string
          status: Database["public"]["Enums"]["rfq_status"]
          unit: string
          updated_at: string
        }
        Insert: {
          buyer_company_id: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_locked?: boolean
          max_price: number
          min_price: number
          product_description?: string | null
          product_name: string
          quantity: number
          reserved_quantity?: number
          seller_company_id: string
          status?: Database["public"]["Enums"]["rfq_status"]
          unit?: string
          updated_at?: string
        }
        Update: {
          buyer_company_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_locked?: boolean
          max_price?: number
          min_price?: number
          product_description?: string | null
          product_name?: string
          quantity?: number
          reserved_quantity?: number
          seller_company_id?: string
          status?: Database["public"]["Enums"]["rfq_status"]
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfqs_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          company_id: string
          created_at: string
          customer_name: string
          delivered_at: string | null
          destination: string
          id: string
          items: Json
          movement_type: Database["public"]["Enums"]["movement_type"]
          proof_of_delivery: string | null
          shipment_number: string
          status: Database["public"]["Enums"]["shipment_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_name: string
          delivered_at?: string | null
          destination: string
          id?: string
          items?: Json
          movement_type?: Database["public"]["Enums"]["movement_type"]
          proof_of_delivery?: string | null
          shipment_number: string
          status?: Database["public"]["Enums"]["shipment_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_name?: string
          delivered_at?: string | null
          destination?: string
          id?: string
          items?: Json
          movement_type?: Database["public"]["Enums"]["movement_type"]
          proof_of_delivery?: string | null
          shipment_number?: string
          status?: Database["public"]["Enums"]["shipment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_negotiation: { Args: { _negotiation_id: string }; Returns: string }
      create_and_assign_company: {
        Args: {
          company_name: string
          company_type: Database["public"]["Enums"]["company_type"]
        }
        Returns: string
      }
      expire_negotiations: { Args: never; Returns: string[] }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      start_negotiation:
        | { Args: { _rfq_id: string }; Returns: string }
        | { Args: { _quantity?: number; _rfq_id: string }; Returns: string }
      submit_offer: {
        Args: {
          _action?: string
          _negotiation_id: string
          _offer_price?: number
        }
        Returns: Json
      }
    }
    Enums: {
      activity_type:
        | "INVENTORY_IN"
        | "INVENTORY_OUT"
        | "SHIPMENT_CREATED"
        | "SHIPMENT_UPDATED"
        | "SHIPMENT_DELIVERED"
        | "SHIPMENT_CANCELLED"
        | "RESERVATION_CREATED"
        | "RESERVATION_RELEASED"
        | "INVENTORY_UPDATED"
        | "COMPANY_CREATED"
        | "NEGOTIATION_STARTED"
        | "OFFER_MADE"
        | "OFFER_COUNTERED"
        | "OFFER_ACCEPTED"
        | "OFFER_REJECTED"
        | "OFFER_EXPIRED"
        | "ORDER_CREATED"
      app_role:
        | "admin"
        | "user"
        | "logistics"
        | "retailer"
        | "pending"
        | "wholesaler"
      company_type: "supplier" | "wholesaler" | "retailer" | "manufacturer"
      movement_type: "inbound" | "outbound"
      negotiation_status:
        | "open"
        | "offer_made"
        | "counter_offered"
        | "accepted"
        | "expired"
        | "rejected"
      offer_action: "initial_offer" | "counter_offer" | "accept" | "reject"
      order_status:
        | "confirmed"
        | "in_production"
        | "shipped"
        | "delivered"
        | "cancelled"
      reference_type:
        | "inventory"
        | "shipment"
        | "reservation"
        | "negotiation"
        | "order"
        | "rfq"
      reservation_status: "active" | "fulfilled" | "cancelled"
      rfq_status: "open" | "negotiating" | "accepted" | "expired" | "cancelled"
      shipment_status: "pending" | "in_transit" | "delivered" | "cancelled"
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
      activity_type: [
        "INVENTORY_IN",
        "INVENTORY_OUT",
        "SHIPMENT_CREATED",
        "SHIPMENT_UPDATED",
        "SHIPMENT_DELIVERED",
        "SHIPMENT_CANCELLED",
        "RESERVATION_CREATED",
        "RESERVATION_RELEASED",
        "INVENTORY_UPDATED",
        "COMPANY_CREATED",
        "NEGOTIATION_STARTED",
        "OFFER_MADE",
        "OFFER_COUNTERED",
        "OFFER_ACCEPTED",
        "OFFER_REJECTED",
        "OFFER_EXPIRED",
        "ORDER_CREATED",
      ],
      app_role: [
        "admin",
        "user",
        "logistics",
        "retailer",
        "pending",
        "wholesaler",
      ],
      company_type: ["supplier", "wholesaler", "retailer", "manufacturer"],
      movement_type: ["inbound", "outbound"],
      negotiation_status: [
        "open",
        "offer_made",
        "counter_offered",
        "accepted",
        "expired",
        "rejected",
      ],
      offer_action: ["initial_offer", "counter_offer", "accept", "reject"],
      order_status: [
        "confirmed",
        "in_production",
        "shipped",
        "delivered",
        "cancelled",
      ],
      reference_type: [
        "inventory",
        "shipment",
        "reservation",
        "negotiation",
        "order",
        "rfq",
      ],
      reservation_status: ["active", "fulfilled", "cancelled"],
      rfq_status: ["open", "negotiating", "accepted", "expired", "cancelled"],
      shipment_status: ["pending", "in_transit", "delivered", "cancelled"],
    },
  },
} as const
