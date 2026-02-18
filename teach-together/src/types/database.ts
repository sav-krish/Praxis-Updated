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
          created_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          created_at?: string
        }
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
          difficulty: 'easy' | 'hard' | 'challenge' | null
          estimated_minutes: number | null
          status: 'draft' | 'published'
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
          difficulty?: 'easy' | 'hard' | 'challenge' | null
          estimated_minutes?: number | null
          status?: 'draft' | 'published'
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
          difficulty?: 'easy' | 'hard' | 'challenge' | null
          estimated_minutes?: number | null
          status?: 'draft' | 'published'
          created_at?: string
          updated_at?: string
        }
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
      }
      sessions: {
        Row: {
          id: string
          simulation_id: string
          join_code: string
          status: 'lobby' | 'running' | 'complete'
          current_step: number
          started_at: string | null
          ended_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          simulation_id: string
          join_code: string
          status?: 'lobby' | 'running' | 'complete'
          current_step?: number
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          simulation_id?: string
          join_code?: string
          status?: 'lobby' | 'running' | 'complete'
          current_step?: number
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
        }
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
      }
      participants: {
        Row: {
          id: string
          session_id: string
          team_id: string | null
          name: string
          is_voter: boolean
          joined_at: string
        }
        Insert: {
          id?: string
          session_id: string
          team_id?: string | null
          name: string
          is_voter?: boolean
          joined_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          team_id?: string | null
          name?: string
          is_voter?: boolean
          joined_at?: string
        }
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
  }
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
