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
      professors: {
        Row: {
          id: string
          email: string
          name: string | null
          active_role: 'professor' | 'student'
          is_admin: boolean
          created_at: string
          tutorial_completed_at: string | null
          library_show_display_name: boolean
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          active_role?: 'professor' | 'student'
          is_admin?: boolean
          created_at?: string
          tutorial_completed_at?: string | null
          library_show_display_name?: boolean
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          active_role?: 'professor' | 'student'
          is_admin?: boolean
          created_at?: string
          tutorial_completed_at?: string | null
          library_show_display_name?: boolean
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          user_id: string
          first_name: string
          last_name: string
          school: string
          graduation_year: number | null
          major: string | null
          career_interests: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          first_name?: string
          last_name?: string
          school?: string
          graduation_year?: number | null
          major?: string | null
          career_interests?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          first_name?: string
          last_name?: string
          school?: string
          graduation_year?: number | null
          major?: string | null
          career_interests?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      simulations: {
        Row: {
          id: string
          professor_id: string
          title: string
          course_topic: string
          goal: string | null
          target_decisions: string | null
          background_content: string | null
          ai_notes: string | null
          mode: 'individual' | 'teams'
          team_size: number | null
          team_assignment: 'auto' | 'self' | null
          justification_type: 'written' | 'video' | 'video_or_text'
          difficulty: 'easy' | 'hard' | 'challenge' | null
          estimated_minutes: number | null
          status: 'draft' | 'published'
          preferences: Json
          is_public: boolean
          favorite_count: number
          hidden_profiles_enabled: boolean
          is_pinned: boolean
          pinned_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          professor_id: string
          title: string
          course_topic?: string
          goal?: string | null
          target_decisions?: string | null
          background_content?: string | null
          ai_notes?: string | null
          mode?: 'individual' | 'teams'
          team_size?: number | null
          team_assignment?: 'auto' | 'self' | null
          justification_type?: 'written' | 'video' | 'video_or_text'
          difficulty?: 'easy' | 'hard' | 'challenge' | null
          estimated_minutes?: number | null
          status?: 'draft' | 'published'
          preferences?: Json
          is_public?: boolean
          favorite_count?: number
          hidden_profiles_enabled?: boolean
          is_pinned?: boolean
          pinned_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          professor_id?: string
          title?: string
          course_topic?: string
          goal?: string | null
          target_decisions?: string | null
          background_content?: string | null
          ai_notes?: string | null
          mode?: 'individual' | 'teams'
          team_size?: number | null
          team_assignment?: 'auto' | 'self' | null
          justification_type?: 'written' | 'video' | 'video_or_text'
          difficulty?: 'easy' | 'hard' | 'challenge' | null
          estimated_minutes?: number | null
          status?: 'draft' | 'published'
          preferences?: Json
          is_public?: boolean
          favorite_count?: number
          hidden_profiles_enabled?: boolean
          is_pinned?: boolean
          pinned_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulations_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "professors"
            referencedColumns: ["id"]
          }
        ]
      }
      decisions: {
        Row: {
          id: string
          simulation_id: string
          order_num: number
          prompt: string
          created_at: string
        }
        Insert: {
          id?: string
          simulation_id: string
          order_num: number
          prompt: string
          created_at?: string
        }
        Update: {
          id?: string
          simulation_id?: string
          order_num?: number
          prompt?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisions_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations"
            referencedColumns: ["id"]
          }
        ]
      }
      options: {
        Row: {
          id: string
          decision_id: string
          label: 'A' | 'B' | 'C'
          title: string
          description: string | null
          consequence: string | null
          score: number
          created_at: string
        }
        Insert: {
          id?: string
          decision_id: string
          label: 'A' | 'B' | 'C'
          title: string
          description?: string | null
          consequence?: string | null
          score?: number
          created_at?: string
        }
        Update: {
          id?: string
          decision_id?: string
          label?: 'A' | 'B' | 'C'
          title?: string
          description?: string | null
          consequence?: string | null
          score?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "options_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          }
        ]
      }
      reflection_questions: {
        Row: {
          id: string
          simulation_id: string
          order_num: number
          question: string
          created_at: string
        }
        Insert: {
          id?: string
          simulation_id: string
          order_num: number
          question: string
          created_at?: string
        }
        Update: {
          id?: string
          simulation_id?: string
          order_num?: number
          question?: string
          created_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          id: string
          simulation_id: string
          join_code: string
          response_gallery_access_code: string
          status: 'lobby' | 'running' | 'complete'
          current_step: number
          started_at: string | null
          ended_at: string | null
          debrief_guide: Json | null
          video_gallery_share_id: string
          is_preview: boolean
          created_at: string
        }
        Insert: {
          id?: string
          simulation_id: string
          join_code: string
          response_gallery_access_code?: string
          status?: 'lobby' | 'running' | 'complete'
          current_step?: number
          started_at?: string | null
          ended_at?: string | null
          debrief_guide?: Json | null
          video_gallery_share_id?: string
          is_preview?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          simulation_id?: string
          join_code?: string
          response_gallery_access_code?: string
          status?: 'lobby' | 'running' | 'complete'
          current_step?: number
          started_at?: string | null
          ended_at?: string | null
          debrief_guide?: Json | null
          video_gallery_share_id?: string
          is_preview?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations"
            referencedColumns: ["id"]
          }
        ]
      }
      teams: {
        Row: {
          id: string
          session_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      team_decision_submissions: {
        Row: {
          id: string
          session_id: string
          team_id: string
          decision_id: string
          option_id: string
          submitted_by_participant_id: string | null
          submitted_at: string
        }
        Insert: {
          id?: string
          session_id: string
          team_id: string
          decision_id: string
          option_id: string
          submitted_by_participant_id?: string | null
          submitted_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          team_id?: string
          decision_id?: string
          option_id?: string
          submitted_by_participant_id?: string | null
          submitted_at?: string
        }
        Relationships: []
      }
      participants: {
        Row: {
          id: string
          session_id: string
          team_id: string | null
          user_id: string | null
          profile_id: string | null
          name: string
          is_voter: boolean
          joined_at: string
        }
        Insert: {
          id?: string
          session_id: string
          team_id?: string | null
          user_id?: string | null
          profile_id?: string | null
          name: string
          is_voter?: boolean
          joined_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          team_id?: string | null
          user_id?: string | null
          profile_id?: string | null
          name?: string
          is_voter?: boolean
          joined_at?: string
        }
        Relationships: []
      }
      student_simulation_assignments: {
        Row: {
          id: string
          student_id: string
          simulation_id: string
          assigned_by_professor_id: string | null
          due_date: string | null
          assigned_at: string
        }
        Insert: {
          id?: string
          student_id: string
          simulation_id: string
          assigned_by_professor_id?: string | null
          due_date?: string | null
          assigned_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          simulation_id?: string
          assigned_by_professor_id?: string | null
          due_date?: string | null
          assigned_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_simulation_assignments_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations"
            referencedColumns: ["id"]
          }
        ]
      }
      student_simulation_attempts: {
        Row: {
          id: string
          student_id: string
          simulation_id: string
          session_id: string
          participant_id: string | null
          assignment_id: string | null
          source: 'classroom' | 'explore'
          status: 'in_progress' | 'completed'
          score: number | null
          started_at: string
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          simulation_id: string
          session_id: string
          participant_id?: string | null
          assignment_id?: string | null
          source?: 'classroom' | 'explore'
          status?: 'in_progress' | 'completed'
          score?: number | null
          started_at?: string
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          simulation_id?: string
          session_id?: string
          participant_id?: string | null
          assignment_id?: string | null
          source?: 'classroom' | 'explore'
          status?: 'in_progress' | 'completed'
          score?: number | null
          started_at?: string
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_simulation_attempts_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_simulation_attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          }
        ]
      }
      simulation_profiles: {
        Row: {
          id: string
          simulation_id: string
          profile_name: string
          private_briefing: string
          order_num: number
          created_at: string
        }
        Insert: {
          id?: string
          simulation_id: string
          profile_name: string
          private_briefing: string
          order_num: number
          created_at?: string
        }
        Update: {
          id?: string
          simulation_id?: string
          profile_name?: string
          private_briefing?: string
          order_num?: number
          created_at?: string
        }
        Relationships: []
      }
      responses: {
        Row: {
          id: string
          session_id: string
          participant_id: string | null
          team_id: string | null
          decision_id: string
          option_id: string
          justification: string | null
          submitted_at: string
        }
        Insert: {
          id?: string
          session_id: string
          participant_id?: string | null
          team_id?: string | null
          decision_id: string
          option_id: string
          justification?: string | null
          submitted_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          participant_id?: string | null
          team_id?: string | null
          decision_id?: string
          option_id?: string
          justification?: string | null
          submitted_at?: string
        }
        Relationships: []
      }
      response_videos: {
        Row: {
          id: string
          response_id: string
          session_id: string
          simulation_id: string
          decision_id: string
          option_id: string
          participant_id: string
          storage_path: string
          mime_type: string
          file_size_bytes: number
          duration_seconds: number | null
          created_at: string
        }
        Insert: {
          id?: string
          response_id: string
          session_id: string
          simulation_id: string
          decision_id: string
          option_id: string
          participant_id: string
          storage_path: string
          mime_type: string
          file_size_bytes: number
          duration_seconds?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          response_id?: string
          session_id?: string
          simulation_id?: string
          decision_id?: string
          option_id?: string
          participant_id?: string
          storage_path?: string
          mime_type?: string
          file_size_bytes?: number
          duration_seconds?: number | null
          created_at?: string
        }
        Relationships: []
      }
      simulation_scenario_images: {
        Row: {
          id: string
          simulation_id: string
          storage_path: string
          alt_text: string | null
          order_num: number
          created_at: string
        }
        Insert: {
          id?: string
          simulation_id: string
          storage_path: string
          alt_text?: string | null
          order_num: number
          created_at?: string
        }
        Update: {
          id?: string
          simulation_id?: string
          storage_path?: string
          alt_text?: string | null
          order_num?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_scenario_images_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations"
            referencedColumns: ["id"]
          }
        ]
      }
      simulation_data_blocks: {
        Row: {
          id: string
          simulation_id: string
          order_num: number
          block_type: string
          title: string | null
          data: Json
          created_at: string
        }
        Insert: {
          id?: string
          simulation_id: string
          order_num: number
          block_type: string
          title?: string | null
          data: Json
          created_at?: string
        }
        Update: {
          id?: string
          simulation_id?: string
          order_num?: number
          block_type?: string
          title?: string | null
          data?: Json
          created_at?: string
        }
        Relationships: []
      }
      simulation_uploaded_files: {
        Row: {
          id: string
          simulation_id: string
          storage_path: string
          original_name: string
          created_at: string
        }
        Insert: {
          id?: string
          simulation_id: string
          storage_path: string
          original_name: string
          created_at?: string
        }
        Update: {
          id?: string
          simulation_id?: string
          storage_path?: string
          original_name?: string
          created_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string
          stripe_subscription_id: string
          stripe_price_id: string
          plan_name: string
          status: string
          current_period_start: string
          current_period_end: string
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id: string
          stripe_subscription_id: string
          stripe_price_id: string
          plan_name: string
          status: string
          current_period_start: string
          current_period_end: string
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          stripe_price_id?: string
          plan_name?: string
          status?: string
          current_period_start?: string
          current_period_end?: string
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      reflection_responses: {
        Row: {
          id: string
          session_id: string
          participant_id: string | null
          team_id: string | null
          question_id: string
          response: string
          submitted_at: string
        }
        Insert: {
          id?: string
          session_id: string
          participant_id?: string | null
          team_id?: string | null
          question_id: string
          response: string
          submitted_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          participant_id?: string | null
          team_id?: string | null
          question_id?: string
          response?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reflection_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "reflection_questions"
            referencedColumns: ["id"]
          }
        ]
      }
      feedback: {
        Row: {
          id: string
          simulation_id: string
          session_id: string | null
          user_id: string | null
          participant_id: string | null
          feedback_type: 'post_generation' | 'post_session'
          role: 'professor' | 'student'
          checked_items: string[]
          freeform_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          simulation_id: string
          session_id?: string | null
          user_id?: string | null
          participant_id?: string | null
          feedback_type: 'post_generation' | 'post_session'
          role: 'professor' | 'student'
          checked_items?: string[]
          freeform_text?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          simulation_id?: string
          session_id?: string | null
          user_id?: string | null
          participant_id?: string | null
          feedback_type?: 'post_generation' | 'post_session'
          role?: 'professor' | 'student'
          checked_items?: string[]
          freeform_text?: string | null
          created_at?: string
        }
        Relationships: []
      }
      knowledge_chunks: {
        Row: {
          id: string
          subject: string
          source_filename: string
          chunk_index: number
          content: string
          embedding: string | null
          created_at: string
        }
        Insert: {
          id?: string
          subject: string
          source_filename: string
          chunk_index: number
          content: string
          embedding?: string | number[] | null
          created_at?: string
        }
        Update: {
          id?: string
          subject?: string
          source_filename?: string
          chunk_index?: number
          content?: string
          embedding?: string | number[] | null
          created_at?: string
        }
        Relationships: []
      }
      simulation_sources: {
        Row: {
          id: string
          simulation_id: string
          label: string
          url: string | null
          source_type: string
          created_at: string
        }
        Insert: {
          id?: string
          simulation_id: string
          label: string
          url?: string | null
          source_type?: string
          created_at?: string
        }
        Update: {
          id?: string
          simulation_id?: string
          label?: string
          url?: string | null
          source_type?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_sources_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations"
            referencedColumns: ["id"]
          }
        ]
      }
      simulation_favorites: {
        Row: {
          id: string
          simulation_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          simulation_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          simulation_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      session_metrics_v: {
        Row: {
          session_id: string
          simulation_id: string
          participant_count: number | null
          response_count: number | null
          reflection_participant_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_session_counts_by_simulation: {
        Args: Record<string, never>
        Returns: {
          simulation_id: string
          session_count: number | string
        }[]
      }
      match_knowledge_chunks: {
        Args: {
          query_embedding: string
          match_count?: number
          filter_subject?: string
        }
        Returns: {
          content: string
          subject: string
          source_filename: string
          similarity: number
        }[]
      }
      library_author_display_names: {
        Args: { prof_ids: string[] }
        Returns: {
          professor_id: string
          display_name: string | null
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export interface SimulationSource {
  id: string;
  simulation_id: string;
  label: string;
  url?: string | null;
  source_type: "file" | "url" | "text" | "manual";
  created_at: string;
}

// Helper types for easier usage
export type Professor = Database['public']['Tables']['professors']['Row']
export type Simulation = Database['public']['Tables']['simulations']['Row']
export type Decision = Database['public']['Tables']['decisions']['Row']
export type Option = Database['public']['Tables']['options']['Row']
export type ReflectionQuestion = Database['public']['Tables']['reflection_questions']['Row']
export type Session = Database['public']['Tables']['sessions']['Row']
export type Team = Database['public']['Tables']['teams']['Row']
export type Participant = Database['public']['Tables']['participants']['Row']
export type Response = Database['public']['Tables']['responses']['Row']
export type ReflectionResponse = Database['public']['Tables']['reflection_responses']['Row']
export type Feedback = Database['public']['Tables']['feedback']['Row']
export type SimulationFavorite = Database['public']['Tables']['simulation_favorites']['Row']
export type SimulationProfile = Database['public']['Tables']['simulation_profiles']['Row']
export type SimulationScenarioImage = Database['public']['Tables']['simulation_scenario_images']['Row']

// Extended types with relations
export type SimulationWithDecisions = Simulation & {
  decisions: (Decision & {
    options: Option[]
  })[]
  reflection_questions: ReflectionQuestion[]
}

export type SessionWithParticipants = Session & {
  participants: Participant[]
  teams: Team[]
  simulation: Simulation
}
