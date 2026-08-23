/**
 * Hand-authored to match supabase/migrations/*.sql exactly, in the same
 * shape `supabase gen types typescript` would produce. There is no live
 * project to generate these from yet — once one exists, regenerate with:
 *
 *   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
 *
 * and this file becomes redundant. Keep it in sync with the migrations
 * until then.
 *
 * Every table below carries `Relationships: []` (rather than real foreign
 * key metadata) because @supabase/postgrest-js's GenericTable type requires
 * that field to exist for its generics to resolve at all — without it,
 * every Row/Insert/Update collapses to `never`. Real codegen would populate
 * this with actual FK metadata for typed embedded-resource selects; hand
 * authoring that isn't worth it here since it's purely a type-level nicety.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type PlacementType =
  | 'category_leaderboard'
  | 'homepage_featured'
  | 'comparison_sponsor'
  | 'deal_spotlight'
  | 'global_sponsored'
export type BidStatus = 'active' | 'withdrawn'
export type CompanyRole = 'owner' | 'editor'
export type NotificationType = 'outbid' | 'bid_confirmed'
export type BattleSide = 'a' | 'b'
export type BillingStatus = 'inactive' | 'active'
export type BidPaymentStatus = 'pending' | 'succeeded' | 'cancelled'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          // Auto-generated, not user-editable this phase — see
          // generate_unique_username() in 20260822070000_public_profiles.sql.
          username: string
          bio: string | null
          avatar_path: string | null
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          username: string
          bio?: string | null
          avatar_path?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<{
          id: string
          display_name: string
          username: string
          bio: string | null
          avatar_path: string | null
          is_public: boolean
          created_at: string
          updated_at: string
        }>
        Relationships: []
      }
      companies: {
        Row: {
          id: string
          slug: string
          name: string
          initials: string
          logo_color: string
          tagline: string
          description: string
          website: string
          founded_year: number
          organic_votes_baseline: number
          is_seed: boolean
          // Nullable/possibly-absent in practice: this column shipped in a
          // migration added after this project's first push to staging, so
          // rows fetched before that migration is (re-)applied there won't
          // include it at all — PostgREST simply omits the key, which JS
          // sees as `undefined`, not `[]`. Widened here so the adapter in
          // lib/supabase/queries.ts is forced to handle it rather than the
          // type lying about a guarantee the live schema may not have yet.
          tags: string[] | null
          // Storage path within the company-logos bucket, e.g.
          // "<company_id>/<random>.png" — null means no logo uploaded yet
          // (fall back to the initials avatar). Never a full URL: the
          // frontend derives the public URL at read time.
          logo_path: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          initials: string
          logo_color: string
          tagline: string
          description: string
          website: string
          founded_year: number
          organic_votes_baseline?: number
          is_seed?: boolean
          tags?: string[] | null
          logo_path?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['companies']['Insert']>
        Relationships: []
      }
      company_members: {
        Row: {
          id: string
          company_id: string
          user_id: string
          role: CompanyRole
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          role: CompanyRole
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['company_members']['Insert']>
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          slug: string
          name: string
          icon: string
          description: string
          is_archived: boolean
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          icon: string
          description: string
          is_archived?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['categories']['Insert']>
        Relationships: []
      }
      company_categories: {
        Row: { company_id: string; category_id: string }
        Insert: { company_id: string; category_id: string }
        Update: Partial<{ company_id: string; category_id: string }>
        Relationships: []
      }
      placements: {
        Row: {
          id: string
          type: PlacementType
          category_id: string | null
          name: string
          max_sponsored_slots: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          type: PlacementType
          category_id?: string | null
          name: string
          max_sponsored_slots?: number
          is_active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['placements']['Insert']>
        Relationships: []
      }
      battles: {
        Row: {
          id: string
          company_a_id: string
          company_b_id: string
          criteria: Json
          is_seed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          company_a_id: string
          company_b_id: string
          criteria?: Json
          is_seed?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['battles']['Insert']>
        Relationships: []
      }
      deals: {
        Row: {
          id: string
          company_id: string
          title: string
          discount_label: string
          description: string
          expires_at: string
          claim_count_baseline: number
          is_seed: boolean
          // Bare domain/path, no protocol — same convention as
          // companies.website. Null means "use the company's own website."
          destination_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          title: string
          discount_label: string
          description: string
          expires_at: string
          claim_count_baseline?: number
          is_seed?: boolean
          destination_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['deals']['Insert']>
        Relationships: []
      }
      trends: {
        Row: {
          id: string
          title: string
          summary: string
          trend_score: number
          is_seed: boolean
          published_at: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          summary: string
          trend_score?: number
          is_seed?: boolean
          published_at?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['trends']['Insert']>
        Relationships: []
      }
      trend_companies: {
        Row: { trend_id: string; company_id: string }
        Insert: { trend_id: string; company_id: string }
        Update: Partial<{ trend_id: string; company_id: string }>
        Relationships: []
      }
      bids: {
        Row: {
          id: string
          company_id: string
          placement_id: string
          amount: number
          status: BidStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          placement_id: string
          amount: number
          status?: BidStatus
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['bids']['Insert']>
        Relationships: []
      }
      bid_history: {
        Row: {
          id: string
          bid_id: string
          company_id: string
          placement_id: string
          previous_amount: number | null
          new_amount: number
          changed_at: string
        }
        Insert: {
          id?: string
          bid_id: string
          company_id: string
          placement_id: string
          previous_amount?: number | null
          new_amount: number
          changed_at?: string
        }
        Update: Partial<Database['public']['Tables']['bid_history']['Insert']>
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          company_id: string
          type: NotificationType
          placement_id: string | null
          payload: Json
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          type: NotificationType
          placement_id?: string | null
          payload?: Json
          read_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
        Relationships: []
      }
      company_votes: {
        Row: { id: string; company_id: string; user_id: string; created_at: string }
        Insert: { id?: string; company_id: string; user_id: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['company_votes']['Insert']>
        Relationships: []
      }
      battle_votes: {
        Row: { id: string; battle_id: string; user_id: string; side: BattleSide; created_at: string }
        Insert: { id?: string; battle_id: string; user_id: string; side: BattleSide; created_at?: string }
        Update: Partial<Database['public']['Tables']['battle_votes']['Insert']>
        Relationships: []
      }
      reviews: {
        Row: {
          id: string
          company_id: string
          user_id: string
          rating: number
          title: string
          body: string
          author_display_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          user_id: string
          rating: number
          title: string
          body: string
          // Ignored by the DB even if sent — reviews_set_author_name always
          // overwrites it server-side from the author's own profile.
          author_display_name?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<{ rating: number; title: string; body: string; updated_at: string }>
        Relationships: []
      }
      saved_companies: {
        Row: { id: string; user_id: string; company_id: string; created_at: string }
        Insert: { id?: string; user_id: string; company_id: string; created_at?: string }
        Update: Partial<{ user_id: string; company_id: string; created_at: string }>
        Relationships: []
      }
      deal_claims: {
        Row: { id: string; deal_id: string; user_id: string; created_at: string }
        Insert: { id?: string; deal_id: string; user_id: string; created_at?: string }
        Update: Partial<{ deal_id: string; user_id: string; created_at: string }>
        Relationships: []
      }
      company_billing_profiles: {
        Row: {
          id: string
          company_id: string
          billing_email: string | null
          currency: string
          status: BillingStatus
          billing_provider_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          billing_email?: string | null
          currency?: string
          status?: BillingStatus
          billing_provider_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['company_billing_profiles']['Insert']>
        Relationships: []
      }
      // Read-only from the frontend's perspective: rows are created and
      // transitioned only by the create-bid-payment / stripe-webhook Edge
      // Functions (service role), never by the browser client. Insert/
      // Update are still typed, matching every other table here, but no
      // client code calls them — there is no RLS policy that would let it.
      bid_payments: {
        Row: {
          id: string
          company_id: string
          placement_id: string
          // Actual EUR amount charged by this payment (the delta above the
          // company's current active bid at request time, or the full
          // amount for a brand-new bid) — NOT the resulting bid amount.
          amount: number
          // The bid amount this payment establishes on success. Deliberately
          // a separate column from `amount` — see 20260822040000.
          target_bid_amount: number
          currency: string
          status: BidPaymentStatus
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          placement_id: string
          amount: number
          target_bid_amount: number
          currency?: string
          status?: BidPaymentStatus
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['bid_payments']['Insert']>
        Relationships: []
      }
      user_interests: {
        Row: { user_id: string; category_id: string; created_at: string }
        Insert: { user_id: string; category_id: string; created_at?: string }
        Update: Partial<{ user_id: string; category_id: string; created_at: string }>
        Relationships: []
      }
    }
    Views: {
      company_rating_summary: {
        Row: {
          company_id: string
          review_count: number
          average_rating: number
          rating_5_count: number
          rating_4_count: number
          rating_3_count: number
          rating_2_count: number
          rating_1_count: number
        }
        Relationships: []
      }
      deal_claim_counts: {
        Row: { deal_id: string; claim_count: number }
        Relationships: []
      }
    }
    Functions: {
      place_bid: {
        Args: { p_company_id: string; p_placement_id: string; p_amount: number }
        Returns: Database['public']['Tables']['bids']['Row']
      }
      withdraw_bid: {
        Args: { p_company_id: string; p_placement_id: string }
        Returns: Database['public']['Tables']['bids']['Row']
      }
      is_company_member: {
        Args: { p_company_id: string; p_roles?: CompanyRole[] }
        Returns: boolean
      }
      set_company_categories: {
        Args: { p_company_id: string; p_category_ids: string[] }
        Returns: undefined
      }
      create_report: {
        Args: { p_target_type: string; p_target_id: string; p_reason: string; p_description: string | null }
        Returns: {
          id: string
          reporter_user_id: string
          target_type: string
          target_id: string
          reason: string
          description: string | null
          status: string
          created_at: string
          reviewed_at: string | null
          reviewed_by: string | null
        }
      }
    }
    Enums: Record<string, never>
  }
}
