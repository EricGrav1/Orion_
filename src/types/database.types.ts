// Database types for ORION
// Based on Supabase schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
        Relationships: [];
      };
      team_members: {
        Row: {
          team_id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          team_id: string;
          user_id: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          team_id?: string;
          user_id?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      team_invites: {
        Row: {
          id: string;
          team_id: string;
          email: string;
          role: string;
          status: string;
          invited_by: string;
          token: string;
          expires_at: string;
          created_at: string;
          accepted_at: string | null;
          email_delivery_status: string;
          email_sent_at: string | null;
          email_last_attempt_at: string | null;
          email_attempts: number;
          email_delivery_error: string | null;
        };
        Insert: {
          id?: string;
          team_id: string;
          email: string;
          role?: string;
          status?: string;
          invited_by: string;
          token: string;
          expires_at?: string;
          created_at?: string;
          accepted_at?: string | null;
          email_delivery_status?: string;
          email_sent_at?: string | null;
          email_last_attempt_at?: string | null;
          email_attempts?: number;
          email_delivery_error?: string | null;
        };
        Update: {
          id?: string;
          team_id?: string;
          email?: string;
          role?: string;
          status?: string;
          invited_by?: string;
          token?: string;
          expires_at?: string;
          created_at?: string;
          accepted_at?: string | null;
          email_delivery_status?: string;
          email_sent_at?: string | null;
          email_last_attempt_at?: string | null;
          email_attempts?: number;
          email_delivery_error?: string | null;
        };
        Relationships: [];
      };
      lms_integrations: {
        Row: {
          id: string;
          team_id: string;
          provider: string;
          config: Json;
          health_status: string;
          last_checked_at: string | null;
          last_error: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          provider: string;
          config?: Json;
          health_status?: string;
          last_checked_at?: string | null;
          last_error?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          provider?: string;
          config?: Json;
          health_status?: string;
          last_checked_at?: string | null;
          last_error?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lms_integration_credentials: {
        Row: {
          integration_id: string;
          encrypted_payload: string;
          iv: string;
          auth_tag: string;
          key_version: string;
          updated_at: string;
        };
        Insert: {
          integration_id: string;
          encrypted_payload: string;
          iv: string;
          auth_tag: string;
          key_version?: string;
          updated_at?: string;
        };
        Update: {
          integration_id?: string;
          encrypted_payload?: string;
          iv?: string;
          auth_tag?: string;
          key_version?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          user_id: string;
          full_name: string | null;
          avatar_url: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_tier: string;
          subscription_status: string;
          trial_ends_at: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_tier?: string;
          subscription_status?: string;
          trial_ends_at?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_tier?: string;
          subscription_status?: string;
          trial_ends_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          user_id: string;
          team_id: string | null;
          title: string;
          description: string | null;
          status: string;
          settings: Json;
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
          settings?: Json;
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
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      blocks: {
        Row: {
          id: string;
          course_id: string;
          type: string;
          content: Json;
          settings: Json;
          order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          type: string;
          content?: Json;
          settings?: Json;
          order: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          type?: string;
          content?: Json;
          settings?: Json;
          order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      course_share_events: {
        Row: {
          id: number;
          course_id: string;
          share_token: string;
          event_type: string;
          session_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: number;
          course_id: string;
          share_token: string;
          event_type?: string;
          session_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: number;
          course_id?: string;
          share_token?: string;
          event_type?: string;
          session_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Application-level types
export type Team = Database['public']['Tables']['teams']['Row'];
export type TeamMember = Database['public']['Tables']['team_members']['Row'];
export type TeamInvite = Database['public']['Tables']['team_invites']['Row'];
export type LmsIntegration = Database['public']['Tables']['lms_integrations']['Row'];
export type LmsIntegrationCredential = Database['public']['Tables']['lms_integration_credentials']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Course = Database['public']['Tables']['courses']['Row'];
export type Block = Database['public']['Tables']['blocks']['Row'];
export type CourseShareEvent = Database['public']['Tables']['course_share_events']['Row'];

export type InsertTeam = Database['public']['Tables']['teams']['Insert'];
export type InsertTeamMember = Database['public']['Tables']['team_members']['Insert'];
export type InsertTeamInvite = Database['public']['Tables']['team_invites']['Insert'];
export type InsertLmsIntegration = Database['public']['Tables']['lms_integrations']['Insert'];
export type InsertLmsIntegrationCredential = Database['public']['Tables']['lms_integration_credentials']['Insert'];
export type InsertProfile = Database['public']['Tables']['profiles']['Insert'];
export type InsertCourse = Database['public']['Tables']['courses']['Insert'];
export type InsertBlock = Database['public']['Tables']['blocks']['Insert'];
export type InsertCourseShareEvent = Database['public']['Tables']['course_share_events']['Insert'];

export type UpdateTeam = Database['public']['Tables']['teams']['Update'];
export type UpdateTeamMember = Database['public']['Tables']['team_members']['Update'];
export type UpdateTeamInvite = Database['public']['Tables']['team_invites']['Update'];
export type UpdateLmsIntegration = Database['public']['Tables']['lms_integrations']['Update'];
export type UpdateLmsIntegrationCredential = Database['public']['Tables']['lms_integration_credentials']['Update'];
export type UpdateProfile = Database['public']['Tables']['profiles']['Update'];
export type UpdateCourse = Database['public']['Tables']['courses']['Update'];
export type UpdateBlock = Database['public']['Tables']['blocks']['Update'];
export type UpdateCourseShareEvent = Database['public']['Tables']['course_share_events']['Update'];
