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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      career_guidance: {
        Row: {
          created_at: string
          id: string
          result: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          result: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          result?: Json
          user_id?: string
        }
        Relationships: []
      }
      interviews: {
        Row: {
          answers: Json | null
          created_at: string
          feedback: Json | null
          id: string
          overall_score: number | null
          questions: Json
          role: string
          user_id: string
        }
        Insert: {
          answers?: Json | null
          created_at?: string
          feedback?: Json | null
          id?: string
          overall_score?: number | null
          questions: Json
          role: string
          user_id: string
        }
        Update: {
          answers?: Json | null
          created_at?: string
          feedback?: Json | null
          id?: string
          overall_score?: number | null
          questions?: Json
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          apply_url: string
          company: string
          created_at: string
          description: string
          eligibility: string
          experience: string
          id: string
          job_type: string
          location: string
          salary: string | null
          skills: string[]
          title: string
        }
        Insert: {
          apply_url: string
          company: string
          created_at?: string
          description: string
          eligibility: string
          experience?: string
          id?: string
          job_type?: string
          location: string
          salary?: string | null
          skills?: string[]
          title: string
        }
        Update: {
          apply_url?: string
          company?: string
          created_at?: string
          description?: string
          eligibility?: string
          experience?: string
          id?: string
          job_type?: string
          location?: string
          salary?: string | null
          skills?: string[]
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          branch: string | null
          career_goal: string | null
          cgpa: string | null
          college: string | null
          created_at: string
          degree: string | null
          email: string | null
          full_name: string | null
          graduation_year: number | null
          id: string
          interests: string[]
          location: string | null
          phone: string | null
          skills: string[]
          updated_at: string
        }
        Insert: {
          branch?: string | null
          career_goal?: string | null
          cgpa?: string | null
          college?: string | null
          created_at?: string
          degree?: string | null
          email?: string | null
          full_name?: string | null
          graduation_year?: number | null
          id: string
          interests?: string[]
          location?: string | null
          phone?: string | null
          skills?: string[]
          updated_at?: string
        }
        Update: {
          branch?: string | null
          career_goal?: string | null
          cgpa?: string | null
          college?: string | null
          created_at?: string
          degree?: string | null
          email?: string | null
          full_name?: string | null
          graduation_year?: number | null
          id?: string
          interests?: string[]
          location?: string | null
          phone?: string | null
          skills?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      resumes: {
        Row: {
          analysis: Json | null
          created_at: string
          file_name: string
          id: string
          job_description: string | null
          match_score: number | null
          resume_text: string
          user_id: string
        }
        Insert: {
          analysis?: Json | null
          created_at?: string
          file_name: string
          id?: string
          job_description?: string | null
          match_score?: number | null
          resume_text: string
          user_id: string
        }
        Update: {
          analysis?: Json | null
          created_at?: string
          file_name?: string
          id?: string
          job_description?: string | null
          match_score?: number | null
          resume_text?: string
          user_id?: string
        }
        Relationships: []
      }
      roadmaps: {
        Row: {
          completed: string[]
          created_at: string
          id: string
          plan: Json
          target_role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: string[]
          created_at?: string
          id?: string
          plan: Json
          target_role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: string[]
          created_at?: string
          id?: string
          plan?: Json
          target_role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_jobs: {
        Row: {
          created_at: string
          id: string
          job_id: string
          notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
