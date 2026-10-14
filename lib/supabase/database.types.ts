export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        {
          user_id: string;
          display_name: string;
          current_level_id: string | null;
          learning_goal: string;
          daily_goal_minutes: number;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          user_id: string;
          display_name?: string;
          current_level_id?: string | null;
          learning_goal?: string;
          daily_goal_minutes?: number;
          onboarding_completed?: boolean;
        },
        {
          display_name?: string;
          learning_goal?: string;
          daily_goal_minutes?: number;
          onboarding_completed?: boolean;
        }
      >;
      language_levels: Table<
        {
          id: string;
          language_id: string;
          code: string;
          title: string;
          sort_order: number;
          created_at: string;
        },
        {
          id?: string;
          language_id: string;
          code: string;
          title: string;
          sort_order: number;
        },
        {
          title?: string;
          sort_order?: number;
        }
      >;
      question_attempts: Table<
        {
          id: string;
          user_id: string;
          question_id: string;
          submitted_answer: string;
          is_correct: boolean;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          question_id: string;
          submitted_answer: string;
          is_correct: boolean;
        },
        never
      >;
      vocabulary_cards: Table<
        {
          id: string;
          level_id: string;
          front: string;
          back: string;
          pronunciation: string;
          sort_order: number;
          is_published: boolean;
        },
        {
          id?: string;
          level_id: string;
          front: string;
          back: string;
          pronunciation?: string;
          sort_order: number;
          is_published?: boolean;
        },
        never
      >;
    };
    Views: {
      published_lesson_questions: {
        Row: {
          lesson_id: string;
          lesson_slug: string;
          lesson_title: string;
          lesson_description: string;
          lesson_category: string;
          duration_minutes: number;
          lesson_sort_order: number;
          level_code: string;
          level_title: string;
          question_id: string;
          question_type: "multiple_choice" | "fill_blank" | "listening";
          prompt: string;
          choices: Json;
          audio_path: string | null;
          question_sort_order: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      complete_onboarding: {
        Args: {
          p_level_code: string;
          p_learning_goal: string;
          p_daily_goal_minutes: number;
        };
        Returns: undefined;
      };
      submit_question_answer: {
        Args: {
          p_question_id: string;
          p_submitted_answer: string;
        };
        Returns: {
          is_correct: boolean;
          explanation: string;
          level_advanced: boolean;
          wrong_attempts: number;
          hint: string | null;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
