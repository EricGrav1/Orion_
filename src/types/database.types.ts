// Database types for ORION
// Auto-generated from Supabase schema

export interface Database {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          subscription_id: string | null;
          seat_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          subscription_id?: string | null;
          seat_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          subscription_id?: string | null;
          seat_count?: number;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          user_id: string;
          full_name: string | null;
          avatar_url: string | null;
          subscription_tier: string;
          subscription_status: string;
          trial_ends_at: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_tier?: string;
          subscription_status?: string;
          trial_ends_at?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_tier?: string;
          subscription_status?: string;
          trial_ends_at?: string | null;
          created_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          user_id: string;
          team_id: string | null;
          title: string;
          description: string | null;
          status: string;
          settings: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          team_id?: string | null;
          title?: string;
          description?: string | null;
          status?: string;
          settings?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          team_id?: string | null;
          title?: string;
          description?: string | null;
          status?: string;
          settings?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
      };
      blocks: {
        Row: {
          id: string;
          course_id: string;
          type: string;
          content: Record<string, any>;
          settings: Record<string, any>;
          order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          type: string;
          content?: Record<string, any>;
          settings?: Record<string, any>;
          order: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          type?: string;
          content?: Record<string, any>;
          settings?: Record<string, any>;
          order?: number;
          created_at?: string;
        };
      };
    };
  };
}

// Application-level types
export type Team = Database['public']['Tables']['teams']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Course = Database['public']['Tables']['courses']['Row'];
export type Block = Database['public']['Tables']['blocks']['Row'];

export type InsertTeam = Database['public']['Tables']['teams']['Insert'];
export type InsertProfile = Database['public']['Tables']['profiles']['Insert'];
export type InsertCourse = Database['public']['Tables']['courses']['Insert'];
export type InsertBlock = Database['public']['Tables']['blocks']['Insert'];

export type UpdateTeam = Database['public']['Tables']['teams']['Update'];
export type UpdateProfile = Database['public']['Tables']['profiles']['Update'];
export type UpdateCourse = Database['public']['Tables']['courses']['Update'];
export type UpdateBlock = Database['public']['Tables']['blocks']['Update'];
